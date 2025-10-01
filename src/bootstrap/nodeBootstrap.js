/** nodeBootstrap.js
 * Minimal bootstrap for Node-based harness scripts (no DOM / window dependencies).
 */
import { createInitialState } from '../core/stateShape.js';
import { createStore, combineReducers } from '../core/store.js';
import { diceReducer } from '../core/reducers/dice.reducer.js';
import { playersReducer } from '../core/reducers/players.reducer.js';
import { phaseReducer } from '../core/reducers/phase.reducer.js';
import { logReducer } from '../core/reducers/log.reducer.js';
import { tokyoReducer } from '../core/reducers/tokyo.reducer.js';
import { cardsReducer } from '../core/reducers/cards.reducer.js';
import { uiReducer } from '../core/reducers/ui.reducer.js';
import { monstersReducer } from '../core/reducers/monsters.reducer.js';
import { effectQueueReducer } from '../core/reducers/effectQueue.reducer.js';
import { yieldDecisionReducer } from '../core/reducers/yieldDecision.reducer.js';
import { targetSelectionReducer } from '../core/reducers/targetSelection.reducer.js';
import { gameReducer } from '../core/reducers/game.reducer.js';
import { settingsReducer } from '../core/reducers/settings.reducer.js';
import { metaReducer } from '../core/reducers/meta.reducer.js';
import { createLogger } from '../services/logger.js';
import { initCards } from '../services/cardsService.js';
import { createTurnService } from '../services/turnService.js';
import { createEffectEngine } from '../services/effectEngine.js';
import { createPhaseEventsService } from '../services/phaseEventsService.js';
import { createPlayer } from '../domain/player.js';

const reducer = combineReducers({
  players: playersReducer,
  dice: diceReducer,
  tokyo: tokyoReducer,
  cards: cardsReducer,
  phase: phaseReducer,
  log: logReducer,
  ui: uiReducer,
  ai: (s = {}) => s,
  meta: metaReducer,
  monsters: monstersReducer,
  effectQueue: effectQueueReducer,
  settings: settingsReducer,
  yield: yieldDecisionReducer,
  targetSelection: targetSelectionReducer,
  game: gameReducer
});

export const store = createStore(reducer, createInitialState());
export const logger = createLogger(store);

// Initialize minimal card deck/shop so purchases function
initCards(store, logger, Math.random, { darkEdition: false });

// Feature flags (enable via env or process args)
const args = process.argv || [];
const envFlags = {
  USE_PHASE_MACHINE: process.env.KOT_USE_PHASE_MACHINE === '1' || args.includes('--use-phase-machine'),
  USE_BUY_WAIT: process.env.KOT_USE_BUY_WAIT === '1' || args.includes('--use-buy-wait')
};
globalThis.window = globalThis.window || {}; // minimal shim
globalThis.window.__KOT_FLAGS__ = Object.assign({}, globalThis.window.__KOT_FLAGS__ || {}, envFlags);

// Seed two players for harness operations if none exist
function ensurePlayers(){
  const st = store.getState();
  if (!st.players.order.length) {
    const p1 = createPlayer({ id:'p1', name:'HarnessOne', monsterId:'the_king' });
    const p2 = createPlayer({ id:'p2', name:'HarnessTwo', monsterId:'alienoid' });
    store.dispatch({ type:'PLAYER_JOINED', payload:{ player: p1 }});
    store.dispatch({ type:'PLAYER_JOINED', payload:{ player: p2 }});
  }
}
ensurePlayers();

// Provide services (some harness scripts may leverage effect engine or events service)
export const turnService = createTurnService(store, logger);
export const effectEngine = createEffectEngine(store, logger);
export const phaseEventsService = createPhaseEventsService(store, logger);

// Expose globals for consistency with browser harness assumptions (guarded)
globalThis.__KOT_NEW__ = { store, logger, turnService, effectEngine, phaseEventsService };
