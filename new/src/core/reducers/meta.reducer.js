import { NEXT_TURN, PLAYER_JOINED } from '../actions.js';

const initial = { turn: 0, activePlayerIndex: 0 };

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
      return { ...state, turn: state.turn + 1, activePlayerIndex: nextIdx };
    }
    default:
      return state;
  }
}