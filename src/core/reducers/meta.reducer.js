import { NEXT_TURN, PLAYER_JOINED, META_ACTIVE_PLAYER_SET, META_WINNER_SET } from '../actions.js';

// Internal action (not yet exported in actions.js) forwarded by instrumentation
const META_PHASE_SPAN_UPDATE = 'META_PHASE_SPAN_UPDATE';

// Forward-compat fields (dark edition scaffolding):
// gameMode: 'classic' | 'dark'
// wickness: tracked externally later; kept out of meta to avoid bloating state watchers now.
const initial = { turn: 0, activePlayerIndex: 0, round: 1, gameMode: 'classic', turnCycleId: 0, lastPhase: 'SETUP' };

export function metaReducer(state = initial, action, rootStateRef) {
  switch (action.type) {
    case PLAYER_JOINED: {
      // do not mutate turn or active index here; order handled in players reducer
      return state;
    }
    case NEXT_TURN: {
      const order = rootStateRef.players.order;
      if (!order.length) return state;
      const nextIdx = (state.activePlayerIndex + 1) % order.length;
      const wrapped = nextIdx === 0; // completed a full cycle
      return { ...state, turn: state.turn + 1, activePlayerIndex: nextIdx, round: wrapped ? state.round + 1 : state.round, turnCycleId: state.turnCycleId + 1 };
    }
    case 'PHASE_TRANSITION': {
      const to = action.payload?.to;
      if (!to) return state;
      return { ...state, lastPhase: to };
    }
    case META_ACTIVE_PLAYER_SET: {
      const idx = action.payload.index;
      if (typeof idx !== 'number' || idx < 0) return state;
      return { ...state, activePlayerIndex: idx };
    }
    case META_PHASE_SPAN_UPDATE: {
      const spans = action.payload?.spans;
      if (!spans || typeof spans !== 'object') return state;
      // Merge shallowly to avoid losing prior data
      return { ...state, phaseSpans: { ...(state.phaseSpans||{}), ...spans } };
    }
    case META_WINNER_SET: {
      const winnerId = action.payload?.winnerId;
      if (!winnerId) return state;
      return { ...state, winner: winnerId };
    }
    default:
      return state;
  }
}