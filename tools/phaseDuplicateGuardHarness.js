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
  minDurations: { ROLL:50, RESOLVE:50, BUY:50, BUY_WAIT:50 }
});

pm.recordStart(Phases.SETUP);

function advanceOneTurn(i){
  // Begin turn: SETUP -> ROLL
  pm.to(Phases.ROLL, { reason:'start_turn_'+i });
  pm.event('ROLL_COMPLETE');
  pm.event('RESOLUTION_COMPLETE');
  // Skip BUY_WAIT in harness
  pm.event('BUY_COMPLETE');
  pm.event('TURN_READY');
}

function run(){
  for (let i=0;i<TURNS;i++) advanceOneTurn(i);
  const history = store.getState().phaseMachine?.history || [];
  for (let i=1;i<history.length;i++){
    if (history[i].to === history[i-1].to) {
      console.error('Duplicate contiguous transition detected', history[i-1], history[i]);
      process.exit(1);
    }
  }
  console.log(`[PHASE_DUP_GUARD] Completed ${TURNS} turns with ${history.length} transitions; no duplicates.`);
}
run();
