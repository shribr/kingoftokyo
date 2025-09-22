/**
 * store.js
 * Minimal state store with reducer composition support.
 * Layer: core
 */

const INIT = '@@INIT';

export function createStore(rootReducer, preloadedState) {
  let state = preloadedState === undefined ? rootReducer(undefined, { type: INIT }) : preloadedState;
  const listeners = new Set();
  let dispatching = false;

  function getState() { return state; }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function dispatch(action) {
    if (!action || typeof action.type === 'undefined') {
      throw new Error('Action must be an object with a type.');
    }
    if (dispatching) {
      throw new Error('Reducers may not dispatch actions.');
    }
    try {
      dispatching = true;
      const next = rootReducer(state, action);
      if (next !== state) {
        state = next;
        listeners.forEach(l => l(state, action));
      }
    } finally {
      dispatching = false;
    }
    return action;
  }

  return { getState, subscribe, dispatch };
}

export function combineReducers(reducers) {
  const keys = Object.keys(reducers);
  return function combination(state = {}, action) {
    let hasChanged = false;
    const nextState = {};
    for (const key of keys) {
      const reducer = reducers[key];
      const previous = state[key];
      const next = reducer(previous, action);
      nextState[key] = next;
      if (next !== previous) hasChanged = true;
    }
    return hasChanged ? nextState : state;
  };
}
