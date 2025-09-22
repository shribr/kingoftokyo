import { createStore } from '../core/store.js';

function reducer(state = { count: 0 }, action) {
  switch (action.type) {
    case 'INC': return { count: state.count + 1 };
    default: return state;
  }
}

(function testStoreDispatch() {
  const store = createStore(reducer);
  let observed;
  store.subscribe((s,a) => { observed = a.type; });
  store.dispatch({ type: 'INC' });
  if (store.getState().count !== 1) throw new Error('Expected count 1');
  if (observed !== 'INC') throw new Error('Listener did not observe action');
})();

console.log('[test] store.spec OK');
