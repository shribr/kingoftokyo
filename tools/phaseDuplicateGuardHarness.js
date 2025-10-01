#!/usr/bin/env node
/** phaseDuplicateGuardHarness.js
 * Simulates multiple turn cycles under phase machine to ensure no duplicate contiguous PHASE_TRANSITION entries.
 * Usage: node tools/phaseDuplicateGuardHarness.js [--turns=50]
 */
import { store } from '../src/bootstrap/nodeBootstrap.js';
import { createPhaseMachine } from '../src/core/phaseMachine.js';
import { Phases } from '../src/core/phaseFSM.js';

const turnsArg = process.argv.find(a=>a.startsWith('--turns='));
const TURNS = turnsArg ? parseInt(turnsArg.split('=')[1],10) : 30;

// Enable phase machine semantics by constructing a local machine (node bootstrap does not attach automatically)
const pm = createPhaseMachine(store, console, {
  diceSequenceComplete: () => true,
  resolutionComplete: () => true,
  yieldRequired: () => false,
  victoryConditionMet: () => false,
  yieldDecisionsResolved: () => true,
  postPurchaseFollowupsPending: () => false,
  buyWindowClosed: () => true,
  postPurchaseDone: () => true,
  turnAdvanceReady: () => true,
  // Disable min duration gating for harness determinism
  minDurations: { ROLL:0, RESOLVE:0, BUY:0, BUY_WAIT:0 }
});

pm.recordStart(Phases.SETUP);
// Kick off first turn (SETUP -> ROLL)
pm.to(Phases.ROLL, { reason:'harness_game_start' });

function advanceOneTurn(i){
  // Simulate end of roll -> resolve -> buy -> cleanup -> next roll
  const seq = [
    ['ROLL_COMPLETE','ROLL->RESOLVE'],
    ['RESOLUTION_COMPLETE','RESOLVE->BUY'],
    ['BUY_COMPLETE','BUY->CLEANUP'],
    ['TURN_READY','CLEANUP->ROLL']
  ];
  for (const [evt,label] of seq) {
    const before = store.getState().phase;
    const r = pm.event(evt);
    const after = store.getState().phase;
    if (!r.ok && !r.deferred) {
      console.warn(`[TURN ${i}] Event ${evt} did not transition (phase stayed ${before})`);
    }
    if (after === before) {
      // If transition expected but not occurred, log for diagnosis (guards may have blocked)
      // In this harness all guards return true, so this indicates a structural issue.
      console.debug(`[TURN ${i}] No phase change for ${label}`);
    }
  }
}

function run(){
  for (let i=0;i<TURNS;i++) advanceOneTurn(i);
  const history = store.getState().phaseMachine?.history || [];
  if (!history.length) {
    console.error('[PHASE_DUP_GUARD] ERROR: No transitions recorded. Check phaseMachine reducer integration.');
    process.exit(1);
  }
  for (let i=1;i<history.length;i++){
    if (history[i].to === history[i-1].to) {
      console.error('Duplicate contiguous transition detected', history[i-1], history[i]);
      process.exit(1);
    }
  }
  console.log(`[PHASE_DUP_GUARD] Completed ${TURNS} turns with ${history.length} transitions; no duplicates.`);
}
run();
