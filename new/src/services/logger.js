/** services/logger.js
 * Structured logging utility that dispatches entries into the store log slice.
 */
import { logAppended } from '../core/actions.js';
import { getLastAIRollId } from './aiDecisionService.js';

let nextId = 1;

export function createLogger(store) {
  function append(type, message, meta = {}) {
    const state = store.getState();
    const entry = {
      id: nextId++,
      ts: Date.now(),
      type,
      message,
      meta,
      // Promote semantic fields for tree grouping / filtering
      kind: meta.kind || inferKind(type, message, meta),
      round: state.meta?.round,
      turn: state.meta?.turn,
      phase: state.phase,
      aiNodeId: meta && meta.aiLink ? getLastAIRollId() : undefined
    };
    store.dispatch(logAppended(entry));
    return entry.id;
  }

  return {
    info: (msg, meta) => append('info', msg, meta || {}),
    warn: (msg, meta) => append('warn', msg, meta || {}),
    error: (msg, meta) => append('error', msg, meta || {}),
    system: (msg, meta) => append('system', msg, meta || {})
  };
}

function inferKind(type, message, meta) {
  if (meta.kind) return meta.kind;
  if (/enters Tokyo|takes Tokyo|yields Tokyo/i.test(message)) return 'tokyo';
  if (/wins/i.test(message)) return 'game';
  if (/gains .* VP/i.test(message)) return 'vp';
  if (/claws/i.test(message)) return 'damage';
  if (/heals/i.test(message)) return 'heal';
  if (/energy/i.test(message)) return 'energy';
  if (/phase/i.test(meta?.tag || '')) return 'phase';
  return type === 'system' ? 'system' : 'info';
}
