// phaseNoLegacyDispatchHarness.js
// Ensures no PHASE_CHANGED actions are dispatched when USE_PHASE_MACHINE flag is active.

import { store } from '../src/bootstrap/nodeBootstrap.js';
import { Phases } from '../src/core/phaseFSM.js';

async function run() {
  try { global.window = global.window || {}; } catch(_) {}
  window.__KOT_FLAGS__ = { ...(window.__KOT_FLAGS__||{}), USE_PHASE_MACHINE: true };
  const legacyActions = [];
  store.subscribe((state, action) => {
    if (action.type === 'PHASE_CHANGED') legacyActions.push(action);
  });
  // Drive a couple of turns via harness style transitions
  let cycles = 0;
  while (cycles < 3) {
    // Force start if still in SETUP
    const st = store.getState();
    if (st.phaseMachine?.current === Phases.SETUP || st.phase === Phases.SETUP) {
      store.dispatch({ type:'PHASE_TRANSITION', payload:{ from:'SETUP', to:'ROLL', ts:Date.now(), reason:'harness_start' }});
    }
    // Simulate end of roll -> resolve
    store.dispatch({ type:'PHASE_TRANSITION', payload:{ from:'ROLL', to:'RESOLVE', ts:Date.now(), reason:'harness_roll_complete' }});
    // Simulate resolution complete -> BUY
    store.dispatch({ type:'PHASE_TRANSITION', payload:{ from:'RESOLVE', to:'BUY', ts:Date.now(), reason:'harness_resolution_complete' }});
    // Simulate buy skip -> CLEANUP
    store.dispatch({ type:'PHASE_TRANSITION', payload:{ from:'BUY', to:'CLEANUP', ts:Date.now(), reason:'harness_buy_complete' }});
    // Next turn -> ROLL
    store.dispatch({ type:'PHASE_TRANSITION', payload:{ from:'CLEANUP', to:'ROLL', ts:Date.now(), reason:'harness_turn_advance' }});
    cycles++;
  }
  if (legacyActions.length) {
    console.error('[PHASE_NO_LEGACY_DISPATCH] FAIL. PHASE_CHANGED dispatched:', legacyActions.length);
    process.exitCode = 1;
  } else {
    console.log('[PHASE_NO_LEGACY_DISPATCH] PASS. No PHASE_CHANGED actions observed.');
  }
}

run();
