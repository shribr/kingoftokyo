// turnGuards.js
// Provides helpers to guard async callbacks against stale turnCycleId execution.

export function makeTurnGuard(store) {
  return function guardCallback(callback, label = 'guarded') {
    const startCycle = store.getState().meta?.turnCycleId;
    return (...args) => {
      const current = store.getState().meta?.turnCycleId;
      if (current !== startCycle) {
        // Silently ignore stale callback
        if (process?.env?.NODE_ENV !== 'production') {
          try { console.warn(`[turnGuard] Dropped stale callback (${label}) start=${startCycle} current=${current}`); } catch(_) {}
        }
        return;
      }
      return callback(...args);
    };
  };
}

export function guardedTimeout(store, fn, ms, label) {
  const wrapped = makeTurnGuard(store)(fn, label);
  return setTimeout(wrapped, ms);
}
