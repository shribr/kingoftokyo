import { createStore, combineReducers } from '../core/store.js';
import { settingsReducer } from '../core/reducers/settings.reducer.js';
import { uiReducer } from '../core/reducers/ui.reducer.js';
import { logReducer } from '../core/reducers/log.reducer.js';
import { settingsUpdated, logAppended, uiGameLogCollapseState } from '../core/actions.js';

function assert(c,m){ if(!c) throw new Error(m); }

describe('thought bubble + log filters', () => {
  it('settings toggle persisted', () => {
    const store = createStore(combineReducers({ settings: settingsReducer }), {});
    store.dispatch(settingsUpdated({ showThoughtBubbles: false }));
    assert(store.getState().settings.showThoughtBubbles === false, 'Toggle false');
    store.dispatch(settingsUpdated({ showThoughtBubbles: true }));
    assert(store.getState().settings.showThoughtBubbles === true, 'Toggle true');
  });

  it('log filter kinds stored via uiGameLogCollapseState', () => {
    const store = createStore(combineReducers({ ui: uiReducer, log: logReducer }), {});
    // seed some log kinds
    store.dispatch(logAppended({ id:1, ts:Date.now(), type:'info', message:'Phase start', kind:'phase' }));
    store.dispatch(logAppended({ id:2, ts:Date.now(), type:'info', message:'Damage dealt', kind:'damage' }));
    store.dispatch(uiGameLogCollapseState({ kinds: ['phase'] }));
    const ui = store.getState().ui;
    assert(Array.isArray(ui.gameLog.kinds) && ui.gameLog.kinds.length === 1 && ui.gameLog.kinds[0]==='phase', 'Kinds filter incorrect');
  });
});

try { if (typeof window !== 'undefined') console.log('[spec] thought_bubble_and_filters OK'); } catch(_) {}