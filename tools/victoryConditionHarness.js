#!/usr/bin/env node
/** victoryConditionHarness.js
 * Validates that the phase machine can transition RESOLVE -> GAME_OVER when a player reaches 20 VP.
 * Usage: node tools/victoryConditionHarness.js [--player=p1]
 */
import { store } from '../src/bootstrap/nodeBootstrap.js';
import { createPhaseMachine } from '../src/core/phaseMachine.js';
import { Phases } from '../src/core/phaseFSM.js';

const playerArg = process.argv.find(a=>a.startsWith('--player='));
const PLAYER_ID = playerArg ? playerArg.split('=')[1] : 'p1';

function getPlayer(){
  const st = store.getState();
  return st.players.byId[PLAYER_ID];
}

const pm = createPhaseMachine(store, console, {
  diceSequenceComplete: () => true,
  resolutionComplete: () => true,
  yieldRequired: () => false,
  victoryConditionMet: () => {
    try { return store.getState().meta?.winner != null; } catch(_) { return false; }
  },
  yieldDecisionsResolved: () => true,
  postPurchaseFollowupsPending: () => false,
  buyWindowClosed: () => true,
  postPurchaseDone: () => true,
  turnAdvanceReady: () => true,
  minDurations: { ROLL:0, RESOLVE:0, BUY:0, BUY_WAIT:0 }
});

pm.recordStart(Phases.SETUP);
pm.to(Phases.ROLL, { reason:'harness_game_start' });
pm.event('ROLL_COMPLETE'); // ROLL -> RESOLVE

// Award VP directly & set winner meta
store.dispatch({ type:'PLAYER_VP_GAINED', payload:{ playerId: PLAYER_ID, amount: 20 } });
store.dispatch({ type:'META_WINNER_SET', payload:{ winnerId: PLAYER_ID } });
const p = getPlayer();
if (!p || p.victoryPoints < 20 || store.getState().meta?.winner !== PLAYER_ID) {
  console.error('[VICTORY_HARNESS] Failed to set winner state correctly.');
  process.exit(1);
}

// Attempt GAME_OVER transition
const before = store.getState().phase;
const res = pm.event('GAME_OVER');
const after = store.getState().phase;
const history = store.getState().phaseMachine?.history || [];

if (!res.ok || after !== Phases.GAME_OVER) {
  console.error('[VICTORY_HARNESS] Transition to GAME_OVER failed. Phase before/after:', before, after);
  console.error('History:', history.map(h=>h.to).join(' -> '));
  process.exit(1);
}

console.log(`[VICTORY_HARNESS] PASS. Player ${PLAYER_ID} reached ${p.victoryPoints} VP. History: ${history.map(h=>h.to).join(' -> ')}`);
