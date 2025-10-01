#!/usr/bin/env node
/** turnParityHarness.js
 * Drives deterministic synthetic turns through the phase machine verifying ordering.
 * Expected per turn sequence (excluding initial SETUP->ROLL): ROLL -> RESOLVE -> BUY -> CLEANUP -> ROLL
 * Usage: node tools/turnParityHarness.js [--turns=10]
 */
import { store } from '../src/bootstrap/nodeBootstrap.js';
import { createPhaseMachine } from '../src/core/phaseMachine.js';
import { Phases } from '../src/core/phaseFSM.js';

const turnsArg = process.argv.find(a=>a.startsWith('--turns='));
const TURNS = turnsArg ? parseInt(turnsArg.split('=')[1],10) : 5;

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
  minDurations: { ROLL:0, RESOLVE:0, BUY:0, BUY_WAIT:0 }
});

pm.recordStart(Phases.SETUP);
pm.to(Phases.ROLL, { reason:'harness_game_start' });

const EXPECT_PATTERN = [Phases.ROLL, Phases.RESOLVE, Phases.BUY, Phases.CLEANUP, Phases.ROLL];

function driveOneTurn(turnIndex) {
  const startHistoryLen = (store.getState().phaseMachine?.history||[]).length;
  const events = ['ROLL_COMPLETE','RESOLUTION_COMPLETE','BUY_COMPLETE','TURN_READY'];
  for (const evt of events) {
    const r = pm.event(evt);
    if (!r.ok && !r.deferred) {
      console.error(`[TURN_PARITY] Turn ${turnIndex} event ${evt} failed to transition.`);
      process.exit(1);
    }
  }
  // Gather phases for this cycle
  const history = store.getState().phaseMachine?.history || [];
  const slice = history.slice(startHistoryLen).map(h=>h.to);
  // For first turn slice expect RESOLVE, BUY, CLEANUP, ROLL (ROLL already accounted for earlier) but we normalize by prepending current phase at startHistoryLen-1
  const lastBefore = history[startHistoryLen-1];
  const derived = lastBefore ? [lastBefore.to, ...slice] : slice;
  if (derived.length < EXPECT_PATTERN.length) {
    console.error(`[TURN_PARITY] Turn ${turnIndex} insufficient phases:`, derived.join(' -> '));
    process.exit(1);
  }
  const windowPhases = derived.slice(-EXPECT_PATTERN.length);
  for (let i=0;i<EXPECT_PATTERN.length;i++) {
    if (windowPhases[i] !== EXPECT_PATTERN[i]) {
      console.error(`[TURN_PARITY] Turn ${turnIndex} pattern mismatch at index ${i}. Expected ${EXPECT_PATTERN[i]} got ${windowPhases[i]}. Sequence: ${windowPhases.join(' -> ')}`);
      process.exit(1);
    }
  }
}

for (let t=0;t<TURNS;t++) driveOneTurn(t);

const finalHistory = store.getState().phaseMachine?.history || [];
console.log(`[TURN_PARITY] PASS. Turns=${TURNS}. Final history: ${finalHistory.map(h=>h.to).join(' -> ')}`);
