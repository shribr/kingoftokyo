/** services/logger.js
 * Structured logging utility that dispatches entries into the store log slice.
 */
import { logAppended } from '../core/actions.js';
import { getLastAIRollId } from './aiDecisionService.js';

let nextId = 1;

export function createLogger(store) {
  function substitutePlayerNames(raw) {
    try {
      if (typeof raw !== 'string') return raw;
      const st = store.getState();
      const order = st.players?.order || [];
      if (!order.length) return raw;
      let out = raw;
      // Build map from p1,p2 style ids to actual player names if pattern matches
      const idToName = {};
      order.forEach((pid, idx) => {
        const canonical = 'p' + (idx + 1);
        const player = st.players.byId[pid];
        if (player && player.name && canonical !== player.name) {
          idToName[canonical] = player.name;
        }
      });
      // Replace only whole-word occurrences (word boundary) to avoid partial collisions
      Object.entries(idToName).forEach(([pid, name]) => {
        const re = new RegExp(`\\b${pid}\\b`, 'g');
        out = out.replace(re, name);
      });
      return out;
    } catch(_) { return raw; }
  }
  function append(type, message, meta = {}) {
    const state = store.getState();
    const entry = {
      id: nextId++,
      ts: Date.now(),
      type,
      message: substitutePlayerNames(message),
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
    system: (msg, meta) => append('system', msg, meta || {}),
    combat: (msg, meta) => append('combat', msg, { ...(meta||{}), kind: 'damage' })
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
