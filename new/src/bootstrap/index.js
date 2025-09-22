/** bootstrap/index.js */
import { createInitialState } from '../core/stateShape.js';
import { createStore, combineReducers } from '../core/store.js';
import { eventBus } from '../core/eventBus.js';
import { diceReducer } from '../core/reducers/dice.reducer.js';
import { playersReducer } from '../core/reducers/players.reducer.js';
import { mountRoot } from '../ui/mountRoot.js';
import '../ui/eventsToActions.js';
import { playerJoined, phaseChanged } from '../core/actions.js';
import { phaseReducer } from '../core/reducers/phase.reducer.js';
import { logReducer } from '../core/reducers/log.reducer.js';
import { tokyoReducer } from '../core/reducers/tokyo.reducer.js';
import { createPlayer } from '../domain/player.js';
import { createLogger } from '../services/logger.js';

// Placeholder reducers until implemented
function placeholderReducer(state = {}, _action) { return state; }

const rootReducer = combineReducers({
  players: playersReducer,
  dice: diceReducer,
  tokyo: tokyoReducer,
  cards: (s = { deck: [], discard: [], shop: [] }) => s,
  phase: phaseReducer,
  log: logReducer,
  ui: (s = { modal: { open: false }, flags: { showProbabilities: false } }) => s,
  ai: (s = {}) => s,
  meta: (s = { seed: Date.now(), turn: 0 }) => s
});

export const store = createStore(rootReducer, createInitialState());
export const logger = createLogger(store);

// Example diagnostic wiring
if (typeof window !== 'undefined') {
  window.__KOT_NEW__ = { store, eventBus, logger };
  eventBus.emit('bootstrap/ready', {});
  // Demo data
  store.dispatch(playerJoined(createPlayer({ id: 'p1', name: 'Alpha', monsterId: 'king' })));
  store.dispatch(playerJoined(createPlayer({ id: 'p2', name: 'Beta', monsterId: 'alien' })));
  logger.system('Bootstrap complete. Players seeded.');
  store.dispatch(phaseChanged('ROLL'));
  // Load component config dynamically
  fetch('./new/components.config.json')
    .then(r => r.json())
    .then(cfg => mountRoot(cfg));
}
