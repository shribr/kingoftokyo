/** services/turnService.js
 * Turn orchestration for both human and CPU players.
 * Lifecycle:
 *   startTurn() -> phase ROLL
 *     - Human: UI drives roll/reroll/keep and clicks End Turn to resolve
 *     - CPU: this service auto-plays the entire turn (roll -> rerolls -> resolve)
 *   resolve() -> applies dice effects, checks win, then enters BUY -> CLEANUP -> next turn
 */
import { phaseChanged, nextTurn, diceRollStarted, diceRolled, diceRerollUsed, playerEnteredTokyo, tokyoOccupantSet, playerVPGained, uiVPFlash, diceRollResolved, diceRollCompleted, diceResultsAccepted, DICE_ROLL_RESOLVED } from '../core/actions.js';
import { createCpuTurnController } from './cpuTurnController.js';
import { forceAIDiceKeepIfPending } from './aiDecisionService.js';
import { Phases } from '../core/phaseFSM.js';
import { createPhaseController } from '../core/phaseController.js';
import { createPhaseMachine } from '../core/phaseMachine.js';
import { rollDice } from '../domain/dice.js';
import { isDeterministicMode, deriveRngForTurn, combineSeed } from '../core/rng.js';
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

// Legacy CPU watchdog + polling removed (event-driven dice resolution via DICE_ROLL_RESOLVED).

export function createTurnService(store, logger, rng = Math.random) {
  const phaseCtrl = createPhaseController(store, logger);
  const usePhaseMachine = (typeof window !== 'undefined' && window.__KOT_FLAGS__?.USE_PHASE_MACHINE) || false;
  const phaseMachine = usePhaseMachine ? createPhaseMachine(store, logger, {
    minDurations: {
      ROLL: 300,
      RESOLVE: 180,
      BUY: 350,
      BUY_WAIT: 280
    },
    diceSequenceComplete: () => {
      const st = store.getState();
      return st.dice?.phase === 'sequence-complete' || st.dice?.phase === 'resolved';
    },
    resolutionComplete: () => {
      // Require dice accepted AND no unresolved yield prompts AND effect queue not processing
      const st = store.getState();
      const diceOk = !!st.dice?.accepted;
      const yieldClear = !(st.yield?.prompts?.some(p => p.decision == null));
      const q = st.effectQueue?.queue || [];
      const anyProcessing = st.effectQueue?.processing;
      const anyWaiting = q.some(e => e.status !== 'resolved' && e.status !== 'failed');
      const effectsIdle = !anyProcessing && !anyWaiting;
      return diceOk && yieldClear && effectsIdle;
    },
    yieldRequired: () => {
      const st = store.getState();
      return !!st.yield?.prompts?.length;
    },
    victoryConditionMet: () => {
      try { const st = store.getState(); return st.meta?.winner != null; } catch(_) { return false; }
    },
    yieldDecisionsResolved: () => {
      const st = store.getState();
      return !(st.yield?.prompts?.some(p => p.decision == null));
    },
    postPurchaseFollowupsPending: () => {
      const st = store.getState();
      const q = st.effectQueue?.queue || [];
      return q.some(e => e.status !== 'resolved' && e.status !== 'failed');
    },
    buyWindowClosed: () => true,
    postPurchaseDone: () => {
      const st = store.getState();
      const q = st.effectQueue?.queue || [];
      const anyProcessing = st.effectQueue?.processing;
      const anyWaiting = q.some(e => e.status !== 'resolved' && e.status !== 'failed');
      return !anyProcessing && !anyWaiting;
    },
    turnAdvanceReady: () => true
  }) : null;
  // Phase timing instrumentation (scoped to service to allow store access)
  const __phaseTimings = { active: null, spans: [] };
  function markPhaseStart(phase) {
    __phaseTimings.active = { phase, start: performance.now() };
    try {
      const st = store.getState();
      const spans = (st.meta?.phaseSpans && { ...st.meta.phaseSpans }) || {};
      spans[phase] = spans[phase] || {};
      spans[phase].lastStart = performance.now();
      store.dispatch({ type:'META_PHASE_SPAN_UPDATE', payload:{ spans } });
    } catch(_) {}
  }
  function markPhaseEnd(expectedPhase) {
    if (!__phaseTimings.active) return;
    if (__phaseTimings.active.phase !== expectedPhase) return; // avoid mismatched end
    const end = performance.now();
    const span = { phase: __phaseTimings.active.phase, start: __phaseTimings.active.start, end, dur: end - __phaseTimings.active.start };
    __phaseTimings.spans.push(span);
    if (__phaseTimings.spans.length > 25) __phaseTimings.spans.shift();
    try { if (window?.__KOT_METRICS__) { window.__KOT_METRICS__.phaseSpans = [...__phaseTimings.spans]; } } catch(_) {}
    try {
      const st = store.getState();
      const spans = (st.meta?.phaseSpans && { ...st.meta.phaseSpans }) || {};
      const rec = spans[expectedPhase];
      if (rec?.lastStart) {
        const dur = end - rec.lastStart;
        rec.lastDuration = dur;
        rec.accumulated = (rec.accumulated||0) + dur;
        rec.count = (rec.count||0) + 1;
        spans[expectedPhase] = rec;
        store.dispatch({ type:'META_PHASE_SPAN_UPDATE', payload:{ spans } });
        logger.system?.(`PhaseSpan: ${expectedPhase} ${dur.toFixed(1)}ms`, { kind:'metrics', phase: expectedPhase, duration: dur });
      }
    } catch(_) {}
    __phaseTimings.active = null;
  }
  // Watch for completion of YIELD_DECISION phase (all prompts resolved) to advance to BUY automatically
  store.subscribe((state, action) => {
    try {
      // Event-driven resolution: when DICE_ROLL_RESOLVED fires, accept + transition.
      if (action.type === DICE_ROLL_RESOLVED) {
        if (state.phase === Phases.ROLL) {
          try { acceptDiceResults(); } catch(_) {}
          // Begin full resolution phase immediately (no polling / watchdog)
          resolve();
        }
      }
      if (state.phase === Phases.YIELD_DECISION) {
        const pending = state.yield?.prompts?.some(p => p.decision == null);
        if (!pending) {
          markPhaseEnd('YIELD_DECISION');
          logger.system('Phase: BUY (yield decisions resolved)', { kind:'phase' });
          const phaseEvents = typeof window !== 'undefined' ? window.__KOT_NEW__?.phaseEventsService : null;
          if (phaseEvents) phaseEvents.publish('YIELD_DECISION_MADE'); else {
            if (usePhaseMachine && phaseMachine) {
              phaseMachine.event('YIELD_DECISION_MADE');
            } else {
              phaseCtrl.to(Phases.BUY, { reason: 'yield_decisions_resolved' });
            }
            markPhaseStart('BUY');
          }
          // BUY phase pacing: immediately transition to BUY_WAIT if we require a post-purchase interaction window
          try {
            const st2 = store.getState();
            const activeId = st2.players.order[st2.meta.activePlayerIndex % st2.players.order.length];
            const active = st2.players.byId[activeId];
            const human = !(active.isCPU || active.isAI);
            if (human) {
              // Defer transition a tick to allow any immediate card effects to enqueue
              setTimeout(()=>{
                if (store.getState().phase === Phases.BUY) {
                  markPhaseEnd('BUY');
                  logger.system('Phase: BUY_WAIT (human buy window)', { kind:'phase' });
                  if (usePhaseMachine && phaseMachine) phaseMachine.to(Phases.BUY_WAIT, { reason: 'human_buy_window' }); else phaseCtrl.to(Phases.BUY_WAIT, { reason: 'human_buy_window' });
                  markPhaseStart('BUY_WAIT');
                }
              }, 0);
            } else {
              // CPUs skip straight through unless effects force wait (future)
              setTimeout(()=>{
                if (store.getState().phase === Phases.BUY) {
                  markPhaseEnd('BUY');
                  logger.system('Phase: CLEANUP (cpu auto skip buy)', { kind:'phase' });
                  if (usePhaseMachine && phaseMachine) phaseMachine.to(Phases.CLEANUP, { reason: 'cpu_no_buy' }); else phaseCtrl.to(Phases.CLEANUP, { reason: 'cpu_no_buy' });
                  markPhaseStart('CLEANUP');
                  cleanup();
                }
              }, 0);
            }
          } catch(_) {}
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
          if (phaseEvents) phaseEvents.publish('POST_PURCHASE_RESOLVED'); else {
            if (usePhaseMachine && phaseMachine) {
              phaseMachine.event('POST_PURCHASE_RESOLVED');
            } else {
              phaseCtrl.to(Phases.CLEANUP, { reason: 'post_purchase_idle' });
            }
            markPhaseStart('CLEANUP');
          }
            // immediately call cleanup since we bypassed resolve() path
            cleanup();
        }
      }
    } catch(_) {}
  });
  function startGameIfNeeded() {
    const st = store.getState();
    if (st.phase === Phases.SETUP) {
      if (usePhaseMachine && phaseMachine) phaseMachine.to(Phases.ROLL, { reason: 'game_start' }); else phaseCtrl.to(Phases.ROLL, { reason: 'game_start' });
      startTurn();
    }
  }

  function startTurn() {
    __rollIndex = 0; // reset per new turn (defined later)
    // Start-of-turn bonuses (Tokyo VP if occupying City at turn start)
    awardStartOfTurnTokyoVP(store, logger);
  logger.system('Phase: ROLL', { kind: 'phase' });
  if (usePhaseMachine && phaseMachine) phaseMachine.to(Phases.ROLL, { reason: 'turn_start' }); else phaseCtrl.to(Phases.ROLL, { reason: 'turn_start' });
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
          // Always use controller (legacy polling removed)
          waitUnlessPaused(store, CPU_TURN_START_MS).then(() => {
            const currentState = store.getState();
            if (currentState.phase === 'ROLL' && !currentState.game?.isPaused) {
              playCpuTurn(activeId);
            }
          });
        }
      }
    } catch(_) {}
  }

  let __rollIndex = 0; // per-turn roll counter
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
    let useRng = rng;
    let meta = null;
    let currentRollIndex = __rollIndex;
    if (isDeterministicMode()) {
      const seed = combineSeed('KOT_DICE', st.meta.turnCycleId, currentRollIndex, activeId || '');
      useRng = deriveRngForTurn(seed, st.meta.turnCycleId, currentRollIndex);
      meta = { seed, rollIndex: currentRollIndex, turnCycleId: st.meta.turnCycleId, activeId };
    }
    const faces = rollDice({ currentFaces: st.dice.faces, count: diceSlots, rng: useRng });
    __rollIndex++;
    // Simulate AI pacing delay (human players later could bypass)
    const delay = computeDelay(store.getState().settings);
    if (delay) await wait(delay);
  if (meta) store.dispatch(diceRolled(faces, meta)); else store.dispatch(diceRolled(faces));
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
  if (usePhaseMachine && phaseMachine) phaseMachine.event('ROLL_COMPLETE'); else phaseCtrl.event('ROLL_COMPLETE');
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
    // (playCpuTurn defined outside resolve)

    // Winner check & transition (retained from legacy path)
    const winner = checkGameOver(store, logger);
    if (winner) {
      markPhaseEnd('RESOLVE');
      logger.system('Phase: GAME_OVER', { kind:'phase' });
      await waitUnlessPaused(store, 2000);
      if (usePhaseMachine && phaseMachine) phaseMachine.event('GAME_OVER'); else phaseCtrl.event('PLAYER_WON');
      return;
    }

    // Transition to BUY phase window
    markPhaseEnd('RESOLVE');
  logger.system('Phase: BUY', { kind:'phase' });
  if (usePhaseMachine && phaseMachine) phaseMachine.event('RESOLUTION_COMPLETE'); else phaseCtrl.event('RESOLUTION_COMPLETE');
    markPhaseStart('BUY');
    const buyDelay = Math.min(1500, Math.max(400, computeDelay(store.getState().settings) * 3));
    await waitUnlessPaused(store, buyDelay);
    markPhaseEnd('BUY');
  logger.system('Phase: CLEANUP', { kind:'phase' });
  if (usePhaseMachine && phaseMachine) phaseMachine.event('BUY_COMPLETE'); else phaseCtrl.event('BUY_COMPLETE');
    markPhaseStart('CLEANUP');
    await cleanup();
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

  async function playCpuTurn(forcedActiveId = null) {
    // Always delegate to controller (legacy loop removed)
    try {
      const controller = createCpuTurnController(store, enhancedEngineProxy(), store._logger || console, {});
      controller.start();
    } catch(err) {
      console.error('🤖 CPU Controller start failed', err);
    }
  }

  // Minimal cleanup implementation (advance to next turn)
  async function cleanup() {
    try {
      markPhaseEnd('CLEANUP');
    } catch(_) {}
    try {
      // Advance active player index
      const st = store.getState();
      const order = st.players.order;
      if (order.length) {
        const nextIndex = (st.meta.activePlayerIndex + 1) % order.length;
        store.dispatch({ type:'NEXT_TURN', payload:{ prev: st.meta.activePlayerIndex, next: nextIndex }});
        store.dispatch({ type:'META_ACTIVE_PLAYER_SET', payload:{ index: nextIndex }});
      }
      if (usePhaseMachine && phaseMachine) phaseMachine.to(Phases.ROLL, { reason:'cleanup_complete' }); else phaseCtrl.to(Phases.ROLL, { reason:'cleanup_complete' });
      markPhaseStart('ROLL');
    } catch(err) { logger.warn && logger.warn('cleanup error', err); }
  }

  async function endTurn() {
    // Alias to cleanup for now (placeholder until richer logic restored)
    return cleanup();
  }

  return { startGameIfNeeded, startTurn, performRoll, reroll, resolve, cleanup, endTurn, playCpuTurn, acceptDiceResults };
}

// Lightweight proxy fetch for enhanced engine from aiDecisionService scope (non-breaking placeholder)
function enhancedEngineProxy(){
  try { return (typeof window !== 'undefined' && window.__KOT_NEW__?.enhancedEngine) || (globalThis.enhancedEngine) || { makeRollDecision(){ return { action:'endRoll', keepDice:[], confidence:0.2, reason:'engine missing'}; } }; }
  catch(_) { return { makeRollDecision(){ return { action:'endRoll', keepDice:[], confidence:0.2, reason:'engine error'}; } }; }
}