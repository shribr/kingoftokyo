// phaseController.js
// High-level phase transition utilities wrapping the lower-level FSM helpers.
// Goals:
// 1. Provide a single authoritative API for phase changes (reason + validation).
// 2. Offer event-driven transitions with structured logging.
// 3. Supply a lightweight turn-based concurrency guard (turnCycleId snapshot).
// 4. Non-invasive: existing direct phaseChanged dispatches continue to work; this controller
//    can be adopted incrementally and will warn (non-prod) on invalid transitions.

// phaseController.js
// Updated to proxy through phaseMachine when enabled, phasing out direct PHASE_CHANGED usage.
import { Phases, validateTransition, nextForEvent } from './phaseFSM.js';
import { createPhaseMachine } from './phaseMachine.js';

export function createPhaseController(store, logger = console) {
  const usePhaseMachine = (typeof window !== 'undefined' && window.__KOT_FLAGS__?.USE_PHASE_MACHINE) || false;
  // Lazy-init machine only if flag enabled
  let machine = null;
  function ensureMachine() {
    if (!machine) {
      machine = createPhaseMachine(store, logger, { resolutionComplete: ()=> true });
    }
    return machine;
  }
  function current() { 
    if (usePhaseMachine) {
      return (store.getState().phaseMachine?.current) || store.getState().phase;
    }
    return store.getState().phase; 
  }

  function to(next, meta = {}) {
    const cur = current();
    if (cur === next) return { ok: true, skipped: true, phase: cur };
    const ok = validateTransition(cur, next);
    if (!ok) {
      warnInvalid(cur, next, meta.reason || 'direct');
      return { ok: false, phase: cur };
    }
    logger.system?.(`Phase: ${next}` , { kind: 'phase', from: cur, to: next, reason: meta.reason || 'direct' });
    if (usePhaseMachine) {
      ensureMachine().to(next, { reason: meta.reason || 'legacy_controller' });
      return { ok: true, phase: next };
    } else {
      // Legacy path: directly mutate via PHASE_CHANGED for now.
      store.dispatch({ type:'PHASE_CHANGED', payload:{ phase: next } });
      return { ok: true, phase: next };
    }
  }

  function event(eventName, meta = {}) {
    const cur = current();
    const next = nextForEvent(cur, eventName);
    if (!next) {
      if (process?.env?.NODE_ENV !== 'production') {
        logger.debug?.(`[phaseController] No transition for event '${eventName}' in phase ${cur}`);
      }
      return { ok: false, phase: cur };
    }
    return to(next, { ...meta, reason: `event:${eventName}` });
  }

  function can(next) { return validateTransition(current(), next); }

  function guardTurn() {
    const startId = store.getState().meta.turnCycleId;
    return () => store.getState().meta.turnCycleId === startId;
  }

  function isStale(startId) {
    return store.getState().meta.turnCycleId !== startId;
  }

  function warnInvalid(from, to, reason) {
    const msg = `Invalid phase transition blocked: ${from} -> ${to} (reason=${reason})`;
    if (process?.env?.NODE_ENV !== 'production') {
      console.warn(msg);
    }
    logger.warn?.(msg);
  }

  return { current, to, event, can, guardTurn, isStale };
}

// Optional global helper (dev tooling)
if (typeof window !== 'undefined') {
  try { window.__KOT_PHASE_CTRL__ = { createPhaseController }; } catch(_) {}
}

export { Phases };
