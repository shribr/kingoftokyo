import { createStore, combineReducers } from '../../core/store.js';
import { playersReducer } from '../../core/reducers/players.reducer.js';
import { effectQueueReducer } from '../../core/reducers/effectQueue.reducer.js';
import { createPlayer } from '../../domain/player.js';
import { playerJoined } from '../../core/actions.js';
import { createEffectEngine } from '../../services/effectEngine.js';
import { cardsReducer } from '../../core/reducers/cards.reducer.js';

function rootReducer(state, action) {
  const combined = combineReducers({ players: playersReducer, effectQueue: effectQueueReducer, cards: cardsReducer });
  return combined(state, action);
}

export function runEffectEngineTest() {
  const store = createStore(rootReducer, { players: { order: [], byId: {} }, effectQueue: { queue: [], processing: null, history: [] }, cards: { deck: [], discard: [], shop: [] } });
  const logger = { info: ()=>{}, warn: ()=>{}, error: console.error, system: ()=>{} };
  store.dispatch(playerJoined(createPlayer({ id: 't1', name: 'Tester', monsterId: 'king' })));
  const engine = createEffectEngine(store, logger);
  engine.enqueueImmediate({ id: 'tmp-card', effect: { kind: 'energy_gain', value: 3 } }, 't1');
  // allow async microtasks
  return new Promise(resolve => setTimeout(() => {
    const state = store.getState();
    resolve({ energy: state.players.byId['t1'].energy, history: state.effectQueue.history.length });
  }, 10));
}

// rudimentary self-invoke for manual running in browser dev console context
if (typeof window !== 'undefined' && window.location.hash.includes('runEffectEngineTest')) {
  runEffectEngineTest().then(r => console.log('effectEngine test result', r));
}
