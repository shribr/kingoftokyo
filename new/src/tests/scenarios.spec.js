import { createStore, combineReducers } from '../core/store.js';
import { playersReducer } from '../core/reducers/players.reducer.js';
import { settingsReducer } from '../core/reducers/settings.reducer.js';
import { metaReducer } from '../core/reducers/meta.reducer.js';
import { playerJoined } from '../core/actions.js';
import { createPlayer } from '../domain/player.js';
import { applyScenarios } from '../services/scenarioService.js';
import { listScenarios, ScenarioIds } from '../scenarios/catalog.js';

(function testScenarioAlmostWin(){
  const store = createStore(combineReducers({ players: playersReducer, settings: settingsReducer, meta: metaReducer }), { players: { order:[], byId:{} }, settings:{}, meta:{} });
  const p = createPlayer({ id:'p1', name:'Test', monsterId:'king' });
  store.dispatch(playerJoined(p));
  applyScenarios(store, { assignments: [{ playerId:'p1', scenarioIds:[ScenarioIds.ALMOST_WIN] }] });
  const st = store.getState();
  const updated = st.players.byId['p1'];
  if (updated.victoryPoints < 18) throw new Error('Scenario ALMOST_WIN did not set VP >= 18');
})();

(function testScenarioNearDeath(){
  const store = createStore(combineReducers({ players: playersReducer, settings: settingsReducer, meta: metaReducer }), { players: { order:[], byId:{} }, settings:{}, meta:{} });
  const p = createPlayer({ id:'p1', name:'Test', monsterId:'king' });
  store.dispatch(playerJoined(p));
  applyScenarios(store, { assignments: [{ playerId:'p1', scenarioIds:[ScenarioIds.NEAR_DEATH] }] });
  const st = store.getState();
  const updated = st.players.byId['p1'];
  if (updated.health !== 1) throw new Error('Scenario NEAR_DEATH did not set health to 1');
})();

console.log('[test] scenarios.spec OK');
