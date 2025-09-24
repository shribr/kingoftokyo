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
import { cardsReducer } from '../core/reducers/cards.reducer.js';
import { uiReducer } from '../core/reducers/ui.reducer.js';
import { monstersReducer } from '../core/reducers/monsters.reducer.js';
import { effectQueueReducer } from '../core/reducers/effectQueue.reducer.js';
import { yieldDecisionReducer } from '../core/reducers/yieldDecision.reducer.js';
import { targetSelectionReducer } from '../core/reducers/targetSelection.reducer.js';
import { monstersLoaded } from '../core/actions.js';
import { createPlayer } from '../domain/player.js';
import { createLogger } from '../services/logger.js';
import { initCards } from '../services/cardsService.js';
import { settingsReducer } from '../core/reducers/settings.reducer.js';
import { metaReducer } from '../core/reducers/meta.reducer.js';
import { createTurnService } from '../services/turnService.js';
import { createEffectEngine } from '../services/effectEngine.js';
import '../ui/devPanel.js';
import '../ui/a11yOverlays.js';
import { loadSettings, bindSettingsPersistence, loadLogCollapse } from '../services/settingsService.js';
import { bindAIDecisionCapture } from '../services/aiDecisionService.js';

// Placeholder reducers until implemented
function placeholderReducer(state = {}, _action) { return state; }

const baseReducer = combineReducers({
  players: playersReducer,
  dice: diceReducer,
  tokyo: tokyoReducer,
  cards: cardsReducer,
  phase: phaseReducer,
  log: logReducer,
  ui: uiReducer,
  ai: (s = {}) => s,
  meta: metaReducer,
  monsters: monstersReducer
  , effectQueue: effectQueueReducer
  , settings: settingsReducer
  , yield: yieldDecisionReducer
  , targetSelection: targetSelectionReducer
});

function rootReducer(state, action) {
  if (action.type === 'GAME_STATE_IMPORTED') {
    const snapshot = action.payload.snapshot;
    const current = state || createInitialState();
    // Replace only provided slices; keep others (like ui) untouched
    const merged = { ...current };
    Object.assign(merged, snapshot.slices || {});
    return baseReducer(merged, { type: '@@PERSIST/HYDRATED' });
  }
  return baseReducer(state, action);
}

export const store = createStore(rootReducer, createInitialState());
export const logger = createLogger(store);

// Example diagnostic wiring
if (typeof window !== 'undefined') {
  const turnService = createTurnService(store, logger);
  const effectEngine = createEffectEngine(store, logger);
  window.__KOT_NEW__ = { store, eventBus, logger, turnService, effectEngine };
  // Provide logger reference for AI utilities lacking direct injection
  store._logger = logger;
  eventBus.emit('bootstrap/ready', {});
  // Load persisted settings before UI mounts
  loadSettings(store);
  loadLogCollapse(store);
  bindSettingsPersistence(store);
  bindAIDecisionCapture(store);
  // Demo data
  store.dispatch(playerJoined(createPlayer({ id: 'p1', name: 'Alpha', monsterId: 'king' })));
  store.dispatch(playerJoined(createPlayer({ id: 'p2', name: 'Beta', monsterId: 'alien' })));
  logger.system('Bootstrap complete. Players seeded.');
  // Load monsters from root config.json (fallback minimal set).
  fetch('./config.json').then(r => r.json()).then(cfg => {
    const monsters = Object.values(cfg.monsters || {}).map(m => ({ id: m.id, name: m.name, image: m.image, description: m.description, personality: m.personality || {}, color: m.color }));
    store.dispatch(monstersLoaded(monsters));
  }).catch(() => {
    store.dispatch(monstersLoaded([
      { id: 'king', name: 'The King', image: '', description: 'A mighty ape', personality: { aggression: 5, strategy: 2, risk: 3 }, color: '#444' }
    ]));
  });
  initCards(store, logger);
  // Start first turn lifecycle explicitly
  turnService.startGameIfNeeded();
  // Load component config dynamically
  fetch('./new/components.config.json')
    .then(r => r.json())
    .then(cfg => mountRoot(cfg));
}
