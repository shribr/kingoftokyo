/** services/turnService.js
 * Turn orchestration for both human and CPU players.
 * Lifecycle:
 *   startTurn() -> phase ROLL
 *     - Human: UI drives roll/reroll/keep and clicks End Turn to resolve
 *     - CPU: this service auto-plays the entire turn (roll -> rerolls -> resolve)
 *   resolve() -> applies dice effects, checks win, then enters BUY -> CLEANUP -> next turn
 */
import { phaseChanged, nextTurn, diceRollStarted, diceRolled, diceRerollUsed, playerEnteredTokyo, tokyoOccupantSet, playerVPGained, uiVPFlash, diceRollResolved, diceRollCompleted, diceResultsAccepted, DICE_ROLL_RESOLVED, metaWinnerSet } from '../core/actions.js';
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
import { recordOrCompareDeterminism } from '../core/determinism.js';

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
    // Internal guarded state (closure-scoped). These vars are hoisted above via JS function scope when first executed.
    // Guard rationale (2025-10-01): Multiple bootstrap/store subscriptions (skipIntro path, selection close,
    // roll-for-first resolution) could call startGameIfNeeded synchronously while phase remained SETUP,
    // causing rapid recursive attempts and perceived infinite loop / runaway dispatch. We introduce
    // idempotent flags (__starting, __started) plus a capped retry counter to ensure only the first
    // successful transition advances the phase and all subsequent calls become no-ops.
    if (!startGameIfNeeded.__init) {
      startGameIfNeeded.__init = true;
      startGameIfNeeded.__attempts = 0;
      startGameIfNeeded.__starting = false;
      startGameIfNeeded.__started = false;
    }
    // If we already left SETUP at some point, mark started (covers external phase changes) and bail.
    if (st.phase !== Phases.SETUP) {
  try { console.log('[turnService] startGameIfNeeded: phase no longer SETUP (current=' + st.phase + ')'); } catch(_) {}
      if (!startGameIfNeeded.__started) startGameIfNeeded.__started = true;
      return;
    }
    // Prevent reentrancy / tight loop (multiple store.subscribe callers all invoking this while still synchronously in SETUP)
    if (startGameIfNeeded.__starting || startGameIfNeeded.__started) return;
    startGameIfNeeded.__starting = true;
    startGameIfNeeded.__attempts++;
    try {
      logger.system && logger.system(`[turnService] Game start attempt #${startGameIfNeeded.__attempts}`);
      if (startGameIfNeeded.__attempts === 1) {
        try { console.log('[turnService] Initial activePlayerIndex:', st.meta?.activePlayerIndex, 'players:', st.players?.order); } catch(_) {}
      }
      if (usePhaseMachine && phaseMachine) {
        phaseMachine.to(Phases.ROLL, { reason: 'game_start' });
      } else {
        phaseCtrl.to(Phases.ROLL, { reason: 'game_start' });
      }
      startTurn();
      startGameIfNeeded.__started = true;
      if (typeof window !== 'undefined') {
        try { window.__KOT_GAME_STARTED = true; } catch(_) {}
      }
    } catch(err) {
      logger.warn && logger.warn('[turnService] startGameIfNeeded failed', err);
      // Allow limited retries if phase still SETUP. After 3 failures, lock to avoid infinite loop spam.
      if (startGameIfNeeded.__attempts >= 3) {
        logger.error && logger.error('[turnService] Aborting further start attempts after 3 failures');
        startGameIfNeeded.__started = true; // hard stop to break potential infinite loop
        try {
          const still = store.getState();
          if (still.phase === Phases.SETUP) {
            console.warn('[turnService] Forced fallback PHASE_TRANSITION to ROLL after failed attempts');
            store.dispatch({ type:'PHASE_TRANSITION', payload:{ from: 'SETUP', to: 'ROLL', reason:'forced_fallback', ts: Date.now() }});
            startTurn();
          }
        } catch(_) {}
      } else {
        // Release starting flag so a later call can retry
        startGameIfNeeded.__starting = false;
      }
      return;
    }
    // Mark done
    startGameIfNeeded.__starting = false;
  }

  function startTurn() {
    __rollIndex = 0; // reset per new turn (defined later)
  try { console.log('[turnService] startTurn invoked, activePlayerIndex=', store.getState().meta?.activePlayerIndex); } catch(_) {}
    // Start-of-turn bonuses (Tokyo VP if occupying City at turn start)
    awardStartOfTurnTokyoVP(store, logger);
  logger.system('Phase: ROLL', { kind: 'phase' });
  if (usePhaseMachine && phaseMachine) phaseMachine.to(Phases.ROLL, { reason: 'turn_start' }); else phaseCtrl.to(Phases.ROLL, { reason: 'turn_start' });
    markPhaseStart('ROLL');
    // Guard against duplicate startTurn within same activePlayerIndex + phase frame
    try {
      const stGuard = store.getState();
      const activeIdx = stGuard.meta?.activePlayerIndex;
      if (startTurn.__activeIndexStarted === activeIdx && startTurn.__inProgress) {
  try { console.log('[turnService] startTurn re-entry ignored (active index)', activeIdx); } catch(_) {}
        return;
      }
      startTurn.__activeIndexStarted = activeIdx;
      startTurn.__inProgress = true;
      setTimeout(()=>{ startTurn.__inProgress = false; }, 0); // release next tick
    } catch(_) {}
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
          // Immediate kickoff attempt (before UI subscription based triggers) to avoid missing first roll
          const attemptImmediate = () => {
            try {
              const cs = store.getState();
              if (cs.phase === 'ROLL' && cs.dice?.phase === 'idle' && (!cs.dice.faces || cs.dice.faces.length === 0)) {
                try { console.log('[turnService] CPU immediate kickoff start'); } catch(_) {}
                playCpuTurn(activeId);
                return true;
              }
            } catch(_) {}
            return false;
          };
          if (!attemptImmediate()) {
            let tries = 0; const MAX_TRIES = 5;
            const retry = () => { if (attemptImmediate()) return; if (++tries < MAX_TRIES) setTimeout(retry, 40); };
            setTimeout(retry, 40);
          }
          // Always use controller (legacy polling removed)
          waitUnlessPaused(store, CPU_TURN_START_MS).then(() => {
            const currentState = store.getState();
            if (currentState.phase === 'ROLL' && !currentState.game?.isPaused) {
              playCpuTurn(activeId);
            }
          });
          // Watchdog: if after 1.2s still no faces rolled, force start
          setTimeout(()=> {
            try {
              const ws = store.getState();
              if (ws.phase === 'ROLL' && ws.dice?.faces?.length === 0 && ws.dice.phase === 'idle') {
                try { console.warn('[turnService] CPU kickoff watchdog firing (forcing playCpuTurn)'); } catch(_) {}
                playCpuTurn(activeId);
              }
            } catch(_) {}
          }, 1200);
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
    // diceRollCompleted is dispatched by eventsToActions.js handleRollRequested
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
      // Determinism snapshot capture (only active under test/deterministic mode)
      try { recordOrCompareDeterminism(store); } catch(_) {}
    } catch(_) { resolveDice(store, logger); }
    
    // Critical: Wait briefly for Redux state to update with dice results (energy, VP, health)
    // This ensures the player can afford power cards with newly gained energy before BUY phase
    await waitUnlessPaused(store, 200);
    
    // Refresh card affordability after dice resolution
    eventBus.emit('ui/cards/refreshAffordability');
    
    // Winner check & transition (perform early to avoid being blocked by pending yield decisions)
    try {
      const maybeWinner = checkGameOver(store, logger);
      if (maybeWinner) {
        try { store.dispatch(metaWinnerSet(maybeWinner)); } catch(_) {}
        markPhaseEnd('RESOLVE');
        logger.system('Phase: GAME_OVER', { kind:'phase' });
        try { (async () => { const mod = await import('./autoArchiveTempService.js'); mod.autoArchiveOnGameOver(store); })(); } catch(_){ }
        await waitUnlessPaused(store, 2000);
        if (usePhaseMachine && phaseMachine) phaseMachine.event('GAME_OVER'); else phaseCtrl.event('PLAYER_WON');
        return;
      }
    } catch(_) {}
    
    // If yield decisions are pending, stop here and let the YIELD_DECISION phase own progression.
    // This prevents advancing to BUY/CLEANUP before humans decide to stay/leave Tokyo.
    try {
      const stAfterResolve = store.getState();
      const hasPendingYield = !!stAfterResolve.yield?.prompts?.some(p => p.decision == null);
      if (stAfterResolve.phase === Phases.YIELD_DECISION || hasPendingYield) {
        // Ensure phase is YIELD_DECISION when required
        if (hasPendingYield && stAfterResolve.phase !== Phases.YIELD_DECISION) {
          if (usePhaseMachine && phaseMachine) {
            phaseMachine.event('NEEDS_YIELD_DECISION');
          } else {
            phaseCtrl.event('NEEDS_YIELD_DECISION');
          }
        }
        // End RESOLVE timing span now; subsequent phases will be handled by YIELD_DECISION watcher
        markPhaseEnd('RESOLVE');
        return;
      }
    } catch(_) {}
    
    // End-of-turn Tokyo entry: if Tokyo is empty after dice resolution, active player must enter
    const postResolution = store.getState();
    const order = postResolution.players.order;
    const activeId = order[postResolution.meta.activePlayerIndex % order.length];
    const cityOcc = selectTokyoCityOccupant(postResolution);
    const bayOcc = selectTokyoBayOccupant(postResolution);
    const activePlayer = postResolution.players.byId[activeId];
    
    // If Tokyo is empty and active player is not already in Tokyo, they must enter
    if (!cityOcc && !bayOcc && activePlayer && !activePlayer.inTokyo && activePlayer.status.alive) {
      const playerCount = postResolution.players.order.length;
      store.dispatch(playerEnteredTokyo(activeId));
      store.dispatch(tokyoOccupantSet(activeId, playerCount));
      logger.system(`${activeId} enters Tokyo City (automatic)`, { kind:'tokyo', slot:'city' });
      store.dispatch(playerVPGained(activeId, 1, 'enterTokyo'));
      store.dispatch(uiVPFlash(activeId, 1));
      logger.info(`${activeId} gains 1 VP for entering Tokyo`);
    }

    // Winner check & transition (retained from legacy path)
    const winner = checkGameOver(store, logger);
    if (winner) {
      // Record winner in meta slice for phaseMachine victory guard & external observers
      try { store.dispatch(metaWinnerSet(winner)); } catch(_) {}
      markPhaseEnd('RESOLVE');
      logger.system('Phase: GAME_OVER', { kind:'phase' });
      // Auto-archive logs if configured
      try { (async () => { const mod = await import('./autoArchiveTempService.js'); mod.autoArchiveOnGameOver(store); })(); } catch(_){ }
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
      const stPre = store.getState();
      const activeIdLog = forcedActiveId || (stPre.players.order[stPre.meta.activePlayerIndex % stPre.players.order.length]);
  try { console.log('[turnService] playCpuTurn invoked for', activeIdLog); } catch(_) {}
      const controller = createCpuTurnController(store, enhancedEngineProxy(), store._logger || console, {});
      controller.start();
      setTimeout(()=> {
        try {
          const ds = store.getState().dice;
          if (store.getState().phase === 'ROLL' && ds.faces.length === 0 && ds.phase === 'idle') {
            try { console.warn('[turnService] playCpuTurn post-start check: still idle (faces empty)'); } catch(_) {}
          }
        } catch(_) {}
      }, 300);
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
        logger.system && logger.system(`[turnService] Advancing to next turn index ${nextIndex}`);
      }
      // Delegate to startTurn so that start-of-turn hooks & CPU automation always run
      startTurn();
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