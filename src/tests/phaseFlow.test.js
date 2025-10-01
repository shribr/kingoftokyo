// phaseFlow.test.js
// Lightweight harness placeholder (framework not yet defined). This is a pseudo-test illustrating
// expected phase transitions. Replace with actual test runner wiring when available.

import { Phases, validateTransition } from '../core/phaseFSM.js';

function assert(condition, msg) { if (!condition) throw new Error(msg); }

export function runPhaseFlowSelfTest() {
  // Validate critical edges
  assert(validateTransition(Phases.SETUP, Phases.ROLL), 'SETUP -> ROLL should be valid');
  assert(validateTransition(Phases.ROLL, Phases.RESOLVE), 'ROLL -> RESOLVE should be valid');
  assert(validateTransition(Phases.RESOLVE, Phases.BUY), 'RESOLVE -> BUY should be valid');
  assert(!validateTransition(Phases.ROLL, Phases.BUY), 'ROLL -> BUY should be invalid directly');
  return true;
}

// Auto-run if loaded in browser test harness
try { if (typeof window !== 'undefined') { window.__KOT_FSM_SELFTEST__ = runPhaseFlowSelfTest(); } } catch(_) {}
