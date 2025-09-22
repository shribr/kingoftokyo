/**
 * eventBus.js
 * Minimal pub/sub event bus.
 * Layer: core
 * Dependencies: none (only utilities if needed later)
 */
export function createEventBus() {
  const listeners = new Map(); // event -> Set(callback)
  const wildcard = '*';

  function on(event, cb) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(cb);
    return () => off(event, cb);
  }

  function off(event, cb) {
    const set = listeners.get(event);
    if (set) {
      set.delete(cb);
      if (!set.size) listeners.delete(event);
    }
  }

  function emit(event, payload) {
    // Exact listeners
    const exact = listeners.get(event);
    if (exact) exact.forEach(fn => safeInvoke(fn, event, payload));
    // Wildcard listeners
    const any = listeners.get(wildcard);
    if (any) any.forEach(fn => safeInvoke(fn, event, payload));
  }

  function safeInvoke(fn, event, payload) {
    try { fn(payload, event); } catch (err) { /* eslint-disable no-console */ console.warn('[eventBus] listener error', event, err); }
  }

  return { on, off, emit };
}

export const eventBus = createEventBus();
