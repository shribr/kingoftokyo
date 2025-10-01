// phaseMachine.js
// Enhanced finite state machine with guard predicates & metadata reasons.
// This augments the existing phaseFSM/phaseController with richer semantics.
// Can later replace phaseFSM, but kept separate for incremental adoption.

import { Phases } from './phaseFSM.js';

// Transition configuration: fromPhase -> array of objects { to, event?, guard?, reason? }
// guard(context) should return true to allow. Context provided by createPhaseMachine.
const TRANSITIONS = Object.freeze({
  [Phases.SETUP]: [ { to: Phases.ROLL, event: 'GAME_START', reason: 'game_start' } ],
  [Phases.ROLL]: [
    { to: Phases.RESOLVE, event: 'ROLL_COMPLETE', reason: 'dice_sequence_complete', guard: (ctx) => ctx.diceSequenceComplete() }
  ],
  [Phases.RESOLVE]: [
    { to: Phases.GAME_OVER, event: 'GAME_OVER', reason: 'victory_condition_met', guard: (ctx) => ctx.victoryConditionMet() },
    { to: Phases.YIELD_DECISION, event: 'NEEDS_YIELD_DECISION', reason: 'tokyo_attack_requires_yield', guard: (ctx) => ctx.yieldRequired() },
    { to: Phases.BUY, event: 'RESOLUTION_COMPLETE', reason: 'resolution_complete', guard: (ctx) => ctx.resolutionComplete() }
  ],
  [Phases.YIELD_DECISION]: [
    { to: Phases.BUY, event: 'YIELD_DECISION_MADE', reason: 'yield_decisions_resolved', guard: (ctx)=> ctx.yieldDecisionsResolved() },
    { to: Phases.RESOLVE, event: 'REENTER_RESOLUTION', reason: 'reenter_resolution', guard: (ctx)=> ctx.reenterNeeded() }
  ],
  [Phases.BUY]: [
    { to: Phases.BUY_WAIT, event: 'PURCHASE_WITH_FOLLOWUP', reason: 'post_purchase_effects', guard: (ctx)=> ctx.postPurchaseFollowupsPending() },
    { to: Phases.CLEANUP, event: 'BUY_COMPLETE', reason: 'buy_window_closed', guard: (ctx)=> ctx.buyWindowClosed() }
  ],
  [Phases.BUY_WAIT]: [
    { to: Phases.CLEANUP, event: 'POST_PURCHASE_RESOLVED', reason: 'post_purchase_idle', guard: (ctx)=> ctx.postPurchaseDone() }
  ],
  [Phases.CLEANUP]: [
    { to: Phases.ROLL, event: 'TURN_READY', reason: 'turn_advance', guard: (ctx)=> ctx.turnAdvanceReady() }
  ],
  [Phases.GAME_OVER]: []
});

export function listTransitions(from) {
  return TRANSITIONS[from] ? [...TRANSITIONS[from]] : [];
}

export function canTransition(from, to, context) {
  if (from === to) return true;
  const defs = TRANSITIONS[from] || [];
  for (const def of defs) {
    if (def.to === to) {
      if (def.guard) {
        try { return !!def.guard(context); } catch(_) { return false; }
      }
      return true;
    }
  }
  return false;
}

export function findByEvent(from, eventName) {
  const defs = TRANSITIONS[from] || [];
  return defs.find(d => d.event === eventName) || null;
}

export function createPhaseMachine(store, logger = console, hooks = {}) {
  // hooks provide guard context evaluation functions
  const ctx = {
    diceSequenceComplete: hooks.diceSequenceComplete || (()=> false),
    yieldRequired: hooks.yieldRequired || (()=> false),
    resolutionComplete: hooks.resolutionComplete || (()=> false),
    victoryConditionMet: hooks.victoryConditionMet || (()=> false),
    yieldDecisionsResolved: hooks.yieldDecisionsResolved || (()=> false),
    reenterNeeded: hooks.reenterNeeded || (()=> false),
    postPurchaseFollowupsPending: hooks.postPurchaseFollowupsPending || (()=> false),
    buyWindowClosed: hooks.buyWindowClosed || (()=> false),
    postPurchaseDone: hooks.postPurchaseDone || (()=> false),
    turnAdvanceReady: hooks.turnAdvanceReady || (()=> true)
  };

  function current() { return store.getState().phase; }

  // Min durations (ms) default; can override via hooks.minDurations
  const minDurations = Object.assign({
    [Phases.ROLL]: 250,
    [Phases.RESOLVE]: 150,
    [Phases.BUY]: 300
  }, hooks.minDurations || {});
  const phaseStartTimes = {};

  function recordStart(phase){ phaseStartTimes[phase] = performance.now ? performance.now() : Date.now(); }
  function hasMinElapsed(phase){
    const min = minDurations[phase];
    if (!min) return true;
    const start = phaseStartTimes[phase];
    if (start == null) return true; // not recorded yet
    const now = performance.now ? performance.now() : Date.now();
    return (now - start) >= min;
  }

  function stepTo(target, meta = {}) {
    const from = current();
    if (from === target) return { ok: true, skipped: true, phase: from };
    const ok = canTransition(from, target, ctx);
    if (!ok) {
      logInvalid(from, target, meta.reason || 'direct');
      return { ok: false, phase: from };
    }
    if (!hasMinElapsed(from)) {
      const msg = `Min duration not yet met for phase ${from}, blocking transition to ${target}`;
      logger.debug?.(msg);
      store.dispatch({ type:'PHASE_TRANSITION_DEFERRED', payload:{ from, to: target, reason:'min_duration', ts: Date.now() } });
      return { ok:false, deferred:true, phase: from };
    }
    logger.system?.(`Phase: ${target}`, { kind:'phase', from, to: target, reason: meta.reason || 'direct' });
    store.dispatch({ type:'PHASE_TRANSITION', payload: buildPayload(from, target, meta) });
    recordStart(target);
    return { ok: true, phase: target };
  }

  function event(eventName, meta = {}) {
    const from = current();
    const def = findByEvent(from, eventName);
    if (!def) {
      logger.debug?.(`[phaseMachine] No transition for event '${eventName}' in phase ${from}`);
      return { ok:false, phase: from };
    }
    return stepTo(def.to, { ...meta, reason: def.reason || `event:${eventName}`, event: eventName });
  }

  function buildPayload(from, to, meta) {
    const ts = Date.now();
    const turnCycleId = store.getState().meta?.turnCycleId;
    return { from, to, ts, turnCycleId, reason: meta.reason, event: meta.event || null };
  }

  function logInvalid(from, to, reason) {
    const msg = `Invalid phase transition blocked: ${from} -> ${to} (reason=${reason})`;
    if (process?.env?.NODE_ENV !== 'production') console.warn(msg);
    logger.warn?.(msg);
    const payload = { from, to, reason, ts: Date.now() };
    store.dispatch({ type:'PHASE_TRANSITION_INVALID', payload });
    try {
      if (typeof window !== 'undefined') {
        window.__KOT_PHASE_WARN__ = (window.__KOT_PHASE_WARN__||0) + 1;
        if (window.__KOT_TELEMETRY__) {
          window.__KOT_TELEMETRY__.push({ type:'phase.invalid', payload });
        }
      }
    } catch(_) {}
  }

  return { current, to: stepTo, event, listTransitions, ctx, recordStart };
}

// Reducer helper (optional integration)
export function phaseTransitionReducer(state = { current: 'SETUP', previous: null, history: [] }, action) {
  switch(action.type) {
    case 'PHASE_TRANSITION': {
      const { from, to, ts, reason, turnCycleId, event } = action.payload;
      if (state.current === to) {
        // Duplicate contiguous transition attempt; emit telemetry for diagnostics
        try {
          if (typeof window !== 'undefined') {
            window.__KOT_DUP_PHASE__ = (window.__KOT_DUP_PHASE__||0) + 1;
            if (window.__KOT_TELEMETRY__) {
              window.__KOT_TELEMETRY__.push({ type:'phase.duplicate', payload:{ from, to, ts, reason, turnCycleId, event } });
            }
          }
        } catch(_) {}
        return state;
      }
      const entry = { from, to, ts, reason, turnCycleId, event };
      const history = [...state.history, entry];
      if (history.length > 100) history.shift();
      return { current: to, previous: from, history };
    }
    default:
      return state;
  }
}

// Selector utilities
export function lastTransition(state) {
  return state.phaseMachine?.history?.[state.phaseMachine.history.length - 1] || null;
}
