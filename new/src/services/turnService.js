/** services/turnService.js
 * Turn orchestration for both human and CPU players.
 * Lifecycle:
 *   startTurn() -> phase ROLL
 *     - Human: UI drives roll/reroll/keep and clicks End Turn to resolve
 *     - CPU: this service auto-plays the entire turn (roll -> rerolls -> resolve)
 *   resolve() -> applies dice effects, checks win, then enters BUY -> CLEANUP -> next turn
 */
import { phaseChanged, nextTurn, diceRollStarted, diceRolled, diceRerollUsed, playerEnteredTokyo, tokyoOccupantSet, playerVPGained, uiVPFlash, diceRollResolved, diceRollCompleted, diceResultsAccepted } from '../core/actions.js';
import { createCpuTurnController } from './cpuTurnController.js';
import { forceAIDiceKeepIfPending } from './aiDecisionService.js';
import { Phases } from '../core/phaseFSM.js';
import { rollDice } from '../domain/dice.js';
import { resolveDice, awardStartOfTurnTokyoVP, checkGameOver } from './resolutionService.js';
import { selectTokyoCityOccupant, selectTokyoBayOccupant } from '../core/selectors.js';
import { DICE_ANIM_MS, AI_POST_ANIM_DELAY_MS, CPU_TURN_START_MS, CPU_DECISION_DELAY_MS } from '../constants/uiTimings.js';
import { eventBus } from '../core/eventBus.js';

function computeDelay(settings) {
  const speed = settings?.cpuSpeed || 'normal';
  switch (speed) {
    case 'slow': return 800;
    case 'fast': return 150;
    default: return 400;
  }
}

function wait(ms) { return new Promise(res => setTimeout(res, ms)); }

function waitUnlessPaused(store, ms) {
  return new Promise(resolve => {
    const checkPause = () => {
      const state = store.getState();
      if (state.game?.isPaused) {
        // If paused, wait 100ms and check again
        setTimeout(checkPause, 100);
      } else {
        // Not paused, proceed with normal wait
        setTimeout(resolve, ms);
      }
    };
    checkPause();
  });
}

// --- CPU WATCHDOG ----------------------------------------------------------
// Helps prevent stalls where CPU never advances (e.g., missed heuristic, dice phase stuck).
const cpuTurnWatchdogs = new Map(); // key: turnCycleId -> timer
function scheduleCpuWatchdog(store, turnCycleId, label) {
  if (cpuTurnWatchdogs.has(turnCycleId)) {
    try { clearTimeout(cpuTurnWatchdogs.get(turnCycleId)); } catch(_) {}
  }
  const id = setTimeout(() => {
    cpuTurnWatchdogs.delete(turnCycleId);
    try {
      const st = store.getState();
      if (st.meta.turnCycleId !== turnCycleId) return; // different turn now
      if (st.phase === 'ROLL') {
        const dice = st.dice;
        const facesStr = (dice.faces||[]).map(f=> f.value + (f.kept?'*':'')).join(',');
        console.warn(`🛠 CPU Watchdog (${label}) firing: phase=ROLL dicePhase=${dice.phase} rerolls=${dice.rerollsRemaining} faces=[${facesStr}] -> forcing resolution.`);
        // Force resolution path
        try { store.dispatch(diceRollResolved()); } catch(_) {}
        try { resolve(); } catch(err) { console.error('⚠️ CPU Watchdog resolve() error', err); }
      }
    } catch(err) { console.error('CPU Watchdog internal error', err); }
  }, 5000); // 5s idle threshold
  cpuTurnWatchdogs.set(turnCycleId, id);
}
function clearCpuWatchdog(turnCycleId) {
  if (cpuTurnWatchdogs.has(turnCycleId)) {
    try { clearTimeout(cpuTurnWatchdogs.get(turnCycleId)); } catch(_) {}
    cpuTurnWatchdogs.delete(turnCycleId);
  }
}

export function createTurnService(store, logger, rng = Math.random) {
  // Watch for completion of YIELD_DECISION phase (all prompts resolved) to advance to BUY automatically
  store.subscribe((state, action) => {
    try {
      // Auto-accept dice results after final roll (sequence complete) if not already accepted
      if (state.phase === Phases.ROLL && (state.dice.phase === 'resolved' || state.dice.phase === 'sequence-complete')) {
        const d = state.dice;
        if (!d.accepted && d.rerollsRemaining === 0) {
          // Apply effects silently so player can buy cards
          try { acceptDiceResults(); } catch(e) { /* non-fatal */ }
        }
      }
      if (state.phase === Phases.YIELD_DECISION) {
        const pending = state.yield?.prompts?.some(p => p.decision == null);
        if (!pending) {
          markPhaseEnd('YIELD_DECISION');
          logger.system('Phase: BUY (yield decisions resolved)', { kind:'phase' });
          const phaseEvents = typeof window !== 'undefined' ? window.__KOT_NEW__?.phaseEventsService : null;
          if (phaseEvents) phaseEvents.publish('YIELD_DECISION_MADE'); else { store.dispatch(phaseChanged(Phases.BUY)); markPhaseStart('BUY'); }
        }
      }
      // BUY_WAIT auto-advance: once effectQueue idle, proceed to CLEANUP
      if (state.phase === Phases.BUY_WAIT) {
        const q = state.effectQueue?.queue || [];
        const anyProcessing = state.effectQueue?.processing;
        const anyWaiting = q.some(e => e.status !== 'resolved' && e.status !== 'failed');
        if (!anyProcessing && !anyWaiting) {
          markPhaseEnd('BUY_WAIT');
          logger.system('Phase: CLEANUP (post-purchase effects resolved)', { kind:'phase' });
          const phaseEvents = typeof window !== 'undefined' ? window.__KOT_NEW__?.phaseEventsService : null;
          if (phaseEvents) phaseEvents.publish('POST_PURCHASE_RESOLVED'); else { store.dispatch(phaseChanged(Phases.CLEANUP)); markPhaseStart('CLEANUP'); }
            // immediately call cleanup since we bypassed resolve() path
            cleanup();
        }
      }
    } catch(_) {}
  });
  function startGameIfNeeded() {
    const st = store.getState();
    if (st.phase === Phases.SETUP) {
      store.dispatch(phaseChanged(Phases.ROLL)); // initial direct transition allowed
      startTurn();
    }
  }

  function startTurn() {
    // Start-of-turn bonuses (Tokyo VP if occupying City at turn start)
    awardStartOfTurnTokyoVP(store, logger);
  logger.system('Phase: ROLL', { kind: 'phase' });
  store.dispatch(phaseChanged(Phases.ROLL)); // ROLL is explicit start-of-turn
    markPhaseStart('ROLL');
    // If active player is CPU, run automated turn logic
    try {
      const st = store.getState();
      const order = st.players.order;
      if (order.length) {
        const activeId = order[st.meta.activePlayerIndex % order.length];
        const active = st.players.byId[activeId];
        const isCPU = !!(active && (active.isCPU || active.isAi || active.type === 'ai' || active.isAI));
        console.log(`🎯 Starting turn for ${active?.name} (${isCPU ? 'CPU' : 'Human'}) - Index: ${st.meta.activePlayerIndex}`);
        if (isCPU) {
          // Add delay at start of CPU turn for clarity AND to allow card movement
          console.log(`🤖 CPU turn will start in ${CPU_TURN_START_MS}ms...`);
          waitUnlessPaused(store, CPU_TURN_START_MS).then(() => {
            const currentState = store.getState();
            // Double-check we're still in the right state and not paused
            if (currentState.phase === 'ROLL' && !currentState.game?.isPaused) {
              playCpuTurn(activeId);
            }
          });
        }
      }
    } catch(_) {}
  }

  async function performRoll() {
    // Dispatches DICE_ROLL_STARTED and then DICE_ROLLED with new faces
    const st = store.getState();
    const order = st.players.order;
    let activeId = null;
    let diceSlots = 6;
    if (order.length) {
      activeId = order[st.meta.activePlayerIndex % order.length];
      diceSlots = st.players.byId[activeId]?.modifiers?.diceSlots || 6;
    }
    console.log(`🎲 Starting dice roll for ${st.players.byId[activeId]?.name || 'unknown'}`);
    store.dispatch(diceRollStarted());
    const faces = rollDice({ currentFaces: st.dice.faces, count: diceSlots, rng });
    // Simulate AI pacing delay (human players later could bypass)
    const delay = computeDelay(store.getState().settings);
    if (delay) await wait(delay);
    store.dispatch(diceRolled(faces));
  }

  async function reroll() {
    const st = store.getState();
    if (st.dice.rerollsRemaining <= 0) return;
    store.dispatch(diceRerollUsed());
    await performRoll();
    const after = store.getState();
    if (after.dice.rerollsRemaining === 0) {
      // sequence complete will trigger resolve externally or via explicit call
    }
    // Decrement reroll count exactly once per completed reroll (faces now resolved)
    store.dispatch(diceRollCompleted());
  }

  async function resolve() {
    markPhaseEnd('ROLL');
    logger.system('Phase: RESOLVE', { kind: 'phase' });
    {
      const phaseEvents = typeof window !== 'undefined' ? window.__KOT_NEW__?.phaseEventsService : null;
      if (phaseEvents) phaseEvents.publish('ROLL_COMPLETE'); else store.dispatch(phaseChanged(Phases.RESOLVE));
    }
    markPhaseStart('RESOLVE');
    // If dice already accepted (effects applied), skip duplicate resolution
    try {
      const pre = store.getState();
      if (!pre.dice?.accepted) {
        resolveDice(store, logger);
      } else {
        logger.debug && logger.debug('[turnService] Skipping resolveDice (already accepted)');
      }
    } catch(_) { resolveDice(store, logger); }
    
    // Critical: Wait briefly for Redux state to update with dice results (energy, VP, health)
    // This ensures the player can afford power cards with newly gained energy before BUY phase
    await waitUnlessPaused(store, 200);
    
    // Refresh card affordability after dice resolution
    eventBus.emit('ui/cards/refreshAffordability');
    
    // End-of-turn Tokyo entry: if Tokyo is empty after dice resolution, active player must enter
    const postResolution = store.getState();
    const order = postResolution.players.order;
    const activeId = order[postResolution.meta.activePlayerIndex % order.length];
    const cityOcc = selectTokyoCityOccupant(postResolution);
    const bayOcc = selectTokyoBayOccupant(postResolution);
    const playerCount = order.length;
    const bayAllowed = playerCount >= 5;
    const active = postResolution.players.byId[activeId];
    
    // Rule: If no one is in Tokyo after dice resolution, current player must enter
    if (!cityOcc && !active?.inTokyo) {
      store.dispatch(playerEnteredTokyo(activeId));
      store.dispatch(tokyoOccupantSet(activeId, playerCount));
      logger.system(`${activeId} enters Tokyo City (end-of-turn mandatory)`, { kind:'tokyo', slot:'city' });
      store.dispatch(playerVPGained(activeId, 1, 'enterTokyo'));
      store.dispatch(uiVPFlash(activeId, 1));
      logger.info(`${activeId} gains 1 VP for entering Tokyo`);
    } 
    // Rule: If Tokyo City is occupied but Bay is empty (5+ players), current player must enter Bay
    else if (bayAllowed && cityOcc && !bayOcc && !active?.inTokyo) {
      store.dispatch(playerEnteredTokyo(activeId));
      store.dispatch(tokyoOccupantSet(activeId, playerCount));
      logger.system(`${activeId} enters Tokyo Bay (end-of-turn mandatory)`, { kind:'tokyo', slot:'bay' });
      store.dispatch(playerVPGained(activeId, 1, 'enterTokyo'));
      store.dispatch(uiVPFlash(activeId, 1));
      logger.info(`${activeId} gains 1 VP for entering Tokyo`);
    }
    
    const winner = checkGameOver(store, logger);
    if (winner) {
      markPhaseEnd('RESOLVE');
      logger.system('Phase: GAME_OVER', { kind: 'phase' });
      // Build some drama: wait 2s before transitioning to GAME_OVER
      await waitUnlessPaused(store, 2000);
  const phaseEvents = typeof window !== 'undefined' ? window.__KOT_NEW__?.phaseEventsService : null;
  if (phaseEvents) phaseEvents.publish('PLAYER_WON'); else store.dispatch(phaseChanged(Phases.GAME_OVER));
      return;
    }
    // New: BUY phase window for shop interactions
    markPhaseEnd('RESOLVE');
  logger.system('Phase: BUY', { kind: 'phase' });
  {
    const phaseEvents = typeof window !== 'undefined' ? window.__KOT_NEW__?.phaseEventsService : null;
    if (phaseEvents) phaseEvents.publish('RESOLUTION_COMPLETE'); else store.dispatch(phaseChanged(Phases.BUY));
  }
    markPhaseStart('BUY');
    // Provide a short pause for UI interactions; can be adjusted via settings later
    const delay = Math.min(1500, Math.max(400, computeDelay(store.getState().settings) * 3));
    await waitUnlessPaused(store, delay);
    // Proceed to CLEANUP
    markPhaseEnd('BUY');
  logger.system('Phase: CLEANUP', { kind: 'phase' });
  {
    const phaseEvents = typeof window !== 'undefined' ? window.__KOT_NEW__?.phaseEventsService : null;
    if (phaseEvents) phaseEvents.publish('BUY_COMPLETE'); else store.dispatch(phaseChanged(Phases.CLEANUP));
  }
    markPhaseStart('CLEANUP');
    await cleanup();
  }

  async function cleanup() {
    // Reset dice slice will happen automatically when new ROLL phase starts
    await endTurn();
  }

  async function endTurn() {
    // Pause briefly at the end of each player's turn to build drama
    // Longer pause for CPU turns to show completion clearly
    const state = store.getState();
    const order = state.players.order;
    const activeId = order[state.meta.activePlayerIndex % order.length];
    const active = state.players.byId[activeId];
    const isCPU = !!(active && (active.isCPU || active.isAi || active.type === 'ai' || active.isAI));
    const delay = isCPU ? 2000 : 1000; // 2s for CPU, 1s for human
    await waitUnlessPaused(store, delay);
    markPhaseEnd('CLEANUP');
    store.dispatch(nextTurn());
    // CRITICAL: Wait for card to move to active dock before starting next turn
    await waitUnlessPaused(store, 600); // Allow time for card animation to complete
    startTurn();
  }

  /**
   * CPU auto-turn: performs initial roll, applies AI keep heuristic (bound via aiDecisionService),
   * performs rerolls while there are unkept dice and rerolls remain, then resolves the dice.
   * Uses pacing based on settings.cpuSpeed.
   */
  async function playCpuTurn(forcedActiveId = null) {
    // Feature toggle: if settings indicate controller mode, use new state machine and return.
    try {
      const st0 = store.getState();
      const enableController = st0.settings?.cpuTurnMode === 'controller';
      if (enableController) {
        const controller = createCpuTurnController(store, enhancedEngineProxy(), store._logger || console, {});
        controller.start();
        return; // controller handles resolution -> resolveDice via diceRollResolved dispatch; resolve path continues via subscription
      }
    } catch(_) {}
    // Initial roll
    const _st0 = store.getState();
    const activeOrder = _st0.players.order;
    const activeIdx = _st0.meta.activePlayerIndex % (activeOrder.length || 1);
    const activeId = forcedActiveId || activeOrder[activeIdx];
    console.log('🤖 CPU Turn: Starting with initial roll for', activeId, 'phase=', _st0.phase, 'dicePhase=', _st0.dice.phase);
    if (_st0.phase !== 'ROLL') {
      console.warn('⚠️ Aborting CPU turn start: phase is not ROLL');
      return;
    }
  const startingCycle = _st0.meta.turnCycleId;
  scheduleCpuWatchdog(store, startingCycle, 'post-initial');
  await performRoll();
  scheduleCpuWatchdog(store, startingCycle, 'after-initial-roll');
    
    // Safety counter to prevent infinite rerolls (max 3 total rolls: initial + 2 rerolls)
    let rollsCompleted = 1;
    const MAX_TOTAL_ROLLS = 3;
    
    // Rerolls loop with proper limiting
    while (rollsCompleted < MAX_TOTAL_ROLLS) {
      const st = store.getState();
      if (st.meta.turnCycleId !== startingCycle) {
        console.warn('⛔ Aborting CPU reroll loop due to turnCycleId change (stale async)');
        return;
      }
      const dice = st.dice;
      
      console.log(`🤖 CPU Turn: Roll ${rollsCompleted} - Rerolls remaining: ${dice.rerollsRemaining}, Phase: ${dice.phase}`);
      
      // Wait until dice animation + AI keep delay have passed before evaluating reroll
      if (dice.phase !== 'resolved') { 
        await waitUnlessPaused(store, 120); 
        // Add safety counter to prevent infinite loops
        let waitCount = 0;
        while (dice.phase !== 'resolved' && waitCount < 50) {
          await waitUnlessPaused(store, 100);
          waitCount++;
          const newState = store.getState();
          if (newState.dice.phase === 'resolved') break;
        }
        if (waitCount >= 50) {
          console.warn('🚨 CPU Turn: Dice phase stuck, forcing resolution');
          break;
        }
        continue; 
      }
      
      // Check if we should reroll
      const currentState = store.getState();
      const currentDice = currentState.dice;
      
      if (currentDice.rerollsRemaining <= 0) {
        console.log('🤖 CPU Turn: No rerolls remaining, ending roll phase');
        break;
      }
      
      // Small extra pacing to allow AI keep scheduling to fire (dice-tray anim + post-anim delay)
      await waitUnlessPaused(store, DICE_ANIM_MS + AI_POST_ANIM_DELAY_MS);
      
      // Attempt safeguard keep if heuristic timer hasn't fired yet
      const forced = forceAIDiceKeepIfPending(store);
      if (forced) {
        console.log('🤖 CPU Turn: Forced keep heuristic applied to avoid empty reroll.');
      }
      const anyUnkept = (store.getState().dice.faces || []).some(f => f && !f.kept);
      console.log(`🤖 CPU Turn: Unkept dice found: ${anyUnkept} (forcedKeep=${forced})`);
      
      // Only reroll if we have rerolls remaining AND there are unkept dice
      if (currentDice.rerollsRemaining > 0 && anyUnkept) {
        console.log(`🤖 CPU Turn: Performing reroll ${rollsCompleted + 1}`);
        await reroll();
        rollsCompleted++;
        scheduleCpuWatchdog(store, startingCycle, `after-reroll-${rollsCompleted}`);
        continue;
      }
      
      console.log('🤖 CPU Turn: All dice kept or no rerolls left, ending roll phase');
      break;
    }
    
    if (rollsCompleted >= MAX_TOTAL_ROLLS) {
      console.warn('🚨 CPU Turn: Hit max roll limit, forcing resolution');
    }
    // Resolve outcomes and advance the game
    console.log('🤖 CPU Turn: Starting resolution phase');
    store.dispatch(diceRollResolved());
    const afterResolve = store.getState();
    if (afterResolve.phase === 'ROLL') {
      console.warn('⚠️ CPU Turn: Phase still ROLL after diceRollResolved dispatch (expected RESOLVE). Forcing phase change.');
      store.dispatch(phaseChanged(Phases.RESOLVE));
    }
    clearCpuWatchdog(startingCycle);
    try {
      await resolve();
      console.log('🤖 CPU Turn: Resolution complete');
    } catch(err) {
      console.error('🚨 CPU Turn: Error during resolve()', err);
      try { store.dispatch(phaseChanged(Phases.BUY)); } catch(_) {}
    }
  }

  // New: Accept dice results (apply effects without advancing out of ROLL phase yet)
  async function acceptDiceResults(){
    const st = store.getState();
    if (st.phase !== 'ROLL') return; // only relevant during roll phase
    if (!st.dice || (st.dice.phase !== 'resolved' && st.dice.phase !== 'sequence-complete')) return;
    if (st.dice.accepted) return; // idempotent
    // Reentrancy guard: mark accepted first so any nested subscription-triggered calls short-circuit
    store.dispatch(diceResultsAccepted());
    try {
      resolveDice(store, logger); // apply effects silently
    } catch(err) {
      logger.warn && logger.warn('acceptDiceResults resolveDice error', err);
    }
    try { eventBus.emit('ui/cards/refreshAffordability'); } catch(_) {}
  }

  return { startGameIfNeeded, startTurn, performRoll, reroll, resolve, cleanup, endTurn, playCpuTurn, acceptDiceResults };
}

// Lightweight proxy fetch for enhanced engine from aiDecisionService scope (non-breaking placeholder)
function enhancedEngineProxy(){
  try { return (typeof window !== 'undefined' && window.__KOT_NEW__?.enhancedEngine) || (globalThis.enhancedEngine) || { makeRollDecision(){ return { action:'endRoll', keepDice:[], confidence:0.2, reason:'engine missing'}; } }; }
  catch(_) { return { makeRollDecision(){ return { action:'endRoll', keepDice:[], confidence:0.2, reason:'engine error'}; } }; }
}

// Simple in-memory instrumentation store (could later be moved to a metrics slice)
const __phaseTimings = { active: null, spans: [] };
function markPhaseStart(phase) {
  __phaseTimings.active = { phase, start: performance.now() };
}
function markPhaseEnd(expectedPhase) {
  if (!__phaseTimings.active) return;
  if (__phaseTimings.active.phase !== expectedPhase) return; // avoid mismatched end
  const end = performance.now();
  const span = { phase: __phaseTimings.active.phase, start: __phaseTimings.active.start, end, dur: end - __phaseTimings.active.start };
  __phaseTimings.spans.push(span);
  if (__phaseTimings.spans.length > 25) __phaseTimings.spans.shift();
  try { if (window?.__KOT_METRICS__) { window.__KOT_METRICS__.phaseSpans = [...__phaseTimings.spans]; } } catch(_) {}
  __phaseTimings.active = null;
}