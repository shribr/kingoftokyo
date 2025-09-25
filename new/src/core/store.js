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
    let next;
    try {
      dispatching = true;
      next = rootReducer(state, action);
    } finally {
      dispatching = false;
    }
    if (next !== state) {
      state = next;
      // Snapshot listeners to avoid issues if a listener unsubscribes during iteration
      const currentListeners = Array.from(listeners);
      for (const l of currentListeners) {
        try { l(state, action); } catch (e) { console.error('Listener error:', e); }
      }
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
      // Provide root state reference as third arg for cross-slice aware reducers
      const next = reducer(previous, action, state);
      nextState[key] = next;
      if (next !== previous) hasChanged = true;
    }
    return hasChanged ? nextState : state;
  };
}
