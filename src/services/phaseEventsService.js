// phaseEventsService.js
// Central dispatcher translating domain-level events into FSM phase transitions.
// Provides publish(eventName, meta) used instead of calling phaseChanged directly in scattered locations.

import { Phases, nextForEvent } from '../core/phaseFSM.js';
import { createPhaseController } from '../core/phaseController.js';

export function createPhaseEventsService(store, logger) {
  const phaseCtrl = createPhaseController(store, logger);
  function publish(eventName, meta = {}) {
    const state = store.getState();
    const current = state.phase;
    const target = nextForEvent(current, eventName);
    if (target && target !== current) {
      logger.system(`Phase Event '${eventName}' -> ${current} → ${target}`, { kind: 'phase-event', event: eventName, from: current, to: target });
      phaseCtrl.to(target, { reason: `phase_event:${eventName}` });
    } else {
      if (process?.env?.NODE_ENV !== 'production') {
        logger.debug?.(`[phaseEvents] No transition for event ${eventName} in phase ${current}`);
      }
    }
  }
  return { publish };
}

// Optional global accessor (dev convenience)
if (typeof window !== 'undefined') {
  window.__KOT_PHASE_EVENTS__ = {
    publish: (...args) => {
      try {
        const svc = window.__KOT_NEW__?.phaseEventsService;
        if (svc) svc.publish(...args);
      } catch(_) {}
    }
  };
}
