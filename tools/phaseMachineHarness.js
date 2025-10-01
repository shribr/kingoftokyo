// phaseMachineHarness.js
// Ad-hoc harness to verify phaseMachine transitions & guard evaluation skeleton.

import { createStore, combineReducers } from 'redux';
import { phaseTransitionReducer, createPhaseMachine } from '../src/core/phaseMachine.js';
import { Phases } from '../src/core/phaseFSM.js';

function makeStore() {
  const root = combineReducers({ phaseMachine: phaseTransitionReducer, meta: (s={ turnCycleId:1 }, a)=> s, phase: (s=Phases.SETUP)=> s });
  return createStore(root);
}

function run() {
  const store = makeStore();
  const pm = createPhaseMachine(store, console, {
    diceSequenceComplete: ()=> true,
    resolutionComplete: ()=> true,
    yieldRequired: ()=> false,
    victoryConditionMet: ()=> false,
    yieldDecisionsResolved: ()=> true,
    postPurchaseFollowupsPending: ()=> false,
    buyWindowClosed: ()=> true,
    postPurchaseDone: ()=> true,
    turnAdvanceReady: ()=> true
  });

  const seq = [
    ()=> pm.to(Phases.ROLL, { reason:'start_turn' }),
    ()=> pm.event('ROLL_COMPLETE'),
    ()=> pm.event('RESOLUTION_COMPLETE'),
    ()=> pm.event('BUY_COMPLETE'),
    ()=> pm.event('TURN_READY')
  ];

  const results = seq.map(fn => fn());
  return { results, history: store.getState().phaseMachine.history };
}

try {
  const out = run();
  if (typeof window !== 'undefined') {
    window.__PHASE_MACHINE_HARNESS__ = out;
  } else {
    console.log('[phaseMachineHarness] history:', out.history);
  }
} catch (e) {
  console.error('phaseMachineHarness error', e);
}
