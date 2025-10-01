import { createStore, combineReducers } from '../core/store.js';
import { settingsReducer } from '../core/reducers/settings.reducer.js';
import { settingsUpdated, logAppended } from '../core/actions.js';
import { logReducer } from '../core/reducers/log.reducer.js';
import { buildLogTree } from '../services/logTree.js';

describe('settings + log tree', () => {
  it('updates settings', () => {
    const store = createStore(combineReducers({ settings: settingsReducer }), {});
    store.dispatch(settingsUpdated({ cpuSpeed: 'fast' }));
    const state = store.getState();
    if (state.settings.cpuSpeed !== 'fast') throw new Error('cpuSpeed not updated');
  });

  it('builds hierarchical log tree', () => {
    const store = createStore(combineReducers({ log: logReducer }), {});
    store.dispatch(logAppended({ entry: { message: 'Start', round: 1, turn: 0 } }));
    store.dispatch(logAppended({ entry: { message: 'Action A', round: 1, turn: 0 } }));
    store.dispatch(logAppended({ entry: { message: 'Turn change', round: 1, turn: 1 } }));
    const entries = store.getState().log.entries;
    const tree = buildLogTree(entries);
    if (tree.length !== 1) throw new Error('Expected 1 round');
    if (tree[0].turns.length !== 2) throw new Error('Expected 2 turns');
  });
});