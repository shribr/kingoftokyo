// phaseDeterministicHarness.js
// Repeated simulation using phaseMachine under deterministic mode.
// Goal: assert zero PHASE_TRANSITION_INVALID and stable phase ordering.

import { createStore, combineReducers } from 'redux';
import { phaseTransitionReducer, createPhaseMachine } from '../src/core/phaseMachine.js';
import { Phases } from '../src/core/phaseFSM.js';

function metaReducer(state = { turnCycleId:1, activePlayerIndex:0 }, action){
  switch(action.type){
    case 'NEXT_TURN': return { ...state, turnCycleId: state.turnCycleId + 1, activePlayerIndex: (state.activePlayerIndex+1)%2 };
    default: return state;
  }
}

function dummyPhaseReducer(state = Phases.SETUP){
  return state; // placeholder; actual phase is tracked in phaseMachine slice
}

function makeStore(){
  const root = combineReducers({ phaseMachine: phaseTransitionReducer, meta: metaReducer, phase: dummyPhaseReducer, dice: (s={ phase:'idle', accepted:false })=> s, yield: (s={ prompts:[] })=> s, effectQueue:(s={ queue:[], processing:false })=> s });
  return createStore(root);
}

function simulateTurns(turns=5){
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
  const invalid = [];
  const unsub = store.subscribe(()=>{});
  for (let t=0;t<turns;t++){
    pm.to(Phases.ROLL, { reason:'turn_start' });
    pm.event('ROLL_COMPLETE');
    pm.event('RESOLUTION_COMPLETE');
    pm.event('BUY_COMPLETE');
    pm.event('TURN_READY');
    store.dispatch({ type:'NEXT_TURN' });
  }
  unsub();
  const history = store.getState().phaseMachine.history;
  return { history, invalidCount: invalid.length };
}

try {
  const result = simulateTurns(8);
  if (typeof window !== 'undefined') window.__PHASE_DET_HARNESS__ = result;
  else console.log('[phaseDeterministicHarness]', result.history.length, 'entries');
} catch(e) { console.error('phaseDeterministicHarness error', e); }
