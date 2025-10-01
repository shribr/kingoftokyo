// startGameGuard.test.js
// Pseudo-test to ensure startGameIfNeeded cannot loop infinitely.
// This is a minimal harness (no external test runner) that simulates repeated calls.

import { createStore } from '../core/store.js';
import { createTurnService } from '../services/turnService.js';
import { Phases } from '../core/phaseFSM.js';

function assert(cond, msg){ if(!cond) throw new Error(msg); }

export function runStartGameGuardTest(){
  const store = createStore();
  const logger = { system(){}, warn(){}, error(){} };
  const turn = createTurnService(store, logger, Math.random);
  // Force phase to SETUP explicitly (store defaults may already be SETUP)
  store.dispatch({ type:'PHASE_FORCE', payload:{ phase: Phases.SETUP }});
  for (let i=0;i<25;i++) {
    try { turn.startGameIfNeeded(); } catch(e) { /* swallow */ }
  }
  const st = store.getState();
  assert(st.phase !== Phases.SETUP, 'Phase should have advanced out of SETUP');
  // Ensure internal guard flags set so further calls no-op
  const before = st.phase;
  for (let i=0;i<5;i++) turn.startGameIfNeeded();
  const after = store.getState().phase;
  assert(before === after, 'Phase should not regress or re-trigger start');
  return true;
}

try { if (typeof window !== 'undefined') { window.__KOT_START_GUARD_TEST__ = runStartGameGuardTest(); } } catch(_) {}
