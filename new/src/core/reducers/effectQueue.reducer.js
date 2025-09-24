import { CARD_EFFECT_ENQUEUED, CARD_EFFECT_PROCESSING, CARD_EFFECT_FAILED, CARD_EFFECT_RESOLVED, TARGET_SELECTION_CONFIRMED } from '../actions.js';

const initial = { queue: [], processing: null, history: [] };

// queue: array of entries { id, cardId, playerId, effect, status }
// processing: current entry id
// history: resolved / failed entries for auditing

export function effectQueueReducer(state = initial, action) {
  switch (action.type) {
    case CARD_EFFECT_ENQUEUED: {
      const { entry } = action.payload;
      if (!entry || !entry.id) return state;
      return { ...state, queue: [...state.queue, { ...entry, status: 'queued' }] };
    }
    case CARD_EFFECT_PROCESSING: {
      const { entryId } = action.payload;
      return {
        ...state,
        processing: entryId,
        queue: state.queue.map(e => e.id === entryId ? { ...e, status: 'processing' } : e)
      };
    }
    case CARD_EFFECT_RESOLVED: {
      const { card, effect } = action.payload;
      // find first matching queued entry with same card id & effect kind not yet resolved
      const idx = state.queue.findIndex(e => e.cardId === card.id && e.effect.kind === effect.kind && e.status !== 'resolved');
      if (idx === -1) return state;
      const entry = { ...state.queue[idx], status: 'resolved', resolvedAt: Date.now() };
      const newQueue = state.queue.slice(); newQueue.splice(idx, 1);
      return { ...state, queue: newQueue, processing: state.processing === entry.id ? null : state.processing, history: [...state.history, entry] };
    }
    case CARD_EFFECT_FAILED: {
      const { entryId, reason } = action.payload;
      const idx = state.queue.findIndex(e => e.id === entryId);
      if (idx === -1) return state;
      // Special case: PENDING_SELECTION -> keep entry in queue but mark waiting
      if (reason === 'PENDING_SELECTION') {
        return {
          ...state,
            queue: state.queue.map(e => e.id === entryId ? { ...e, status: 'waiting_selection' } : e),
            processing: null
        };
      }
      const entry = { ...state.queue[idx], status: 'failed', reason, resolvedAt: Date.now() };
      const newQueue = state.queue.slice(); newQueue.splice(idx, 1);
      return { ...state, queue: newQueue, processing: state.processing === entryId ? null : state.processing, history: [...state.history, entry] };
    }
    case TARGET_SELECTION_CONFIRMED: {
      // Attach selectedIds onto matching waiting entry (if present)
      const { requestId, selectedIds } = action.payload;
      return {
        ...state,
        queue: state.queue.map(e => e.id === requestId ? { ...e, selectedIds, status: 'queued' } : e)
      };
    }
    default:
      return state;
  }
}
