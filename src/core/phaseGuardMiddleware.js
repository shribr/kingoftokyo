// phaseGuardMiddleware.js
// Intercepts direct PHASE_CHANGED actions when phaseMachine flag enabled to maintain single authority.

import { PHASE_CHANGED } from './actions.js';
import { createPhaseMachine } from './phaseMachine.js';
import { Phases } from './phaseFSM.js';

export function createPhaseGuardMiddleware(logger = console) {
  let machine = null;
  return store => next => action => {
    if (action.type === PHASE_CHANGED) {
      const flag = (typeof window !== 'undefined') && window.__KOT_FLAGS__?.USE_PHASE_MACHINE;
      if (flag) {
        if (!machine) {
          machine = createPhaseMachine(store, logger, { resolutionComplete: ()=> true });
        }
  const target = action.payload?.phase;
  const from = store.getState().phaseMachine?.current || store.getState().phase;
        if (from === target) return next(action); // no-op
        const ok = machine.to(target, { reason:'legacy_direct_dispatch' });
        if (!ok.ok) {
          logger.warn?.(`[phaseGuardMiddleware] Blocked legacy PHASE_CHANGED ${from} -> ${target}`);
        }
        return; // swallow original action to avoid double bookkeeping
      }
    }
    return next(action);
  };
}
