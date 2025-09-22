/** services/logger.js
 * Structured logging utility that dispatches entries into the store log slice.
 */
import { logAppended } from '../core/actions.js';

let nextId = 1;

export function createLogger(store) {
  function append(type, message, meta = {}) {
    const entry = {
      id: nextId++,
      ts: Date.now(),
      type,
      message,
      meta
    };
    store.dispatch(logAppended(entry));
    return entry.id;
  }

  return {
    info: (msg, meta) => append('info', msg, meta),
    warn: (msg, meta) => append('warn', msg, meta),
    error: (msg, meta) => append('error', msg, meta),
    system: (msg, meta) => append('system', msg, meta)
  };
}
