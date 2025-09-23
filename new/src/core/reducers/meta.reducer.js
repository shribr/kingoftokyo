import { NEXT_TURN, PLAYER_JOINED } from '../actions.js';

// Forward-compat fields (dark edition scaffolding):
// gameMode: 'classic' | 'dark'
// wickness: tracked externally later; kept out of meta to avoid bloating state watchers now.
const initial = { turn: 0, activePlayerIndex: 0, round: 1, gameMode: 'classic' };

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
      return { ...state, turn: state.turn + 1, activePlayerIndex: nextIdx, round: wrapped ? state.round + 1 : state.round };
    }
    default:
      return state;
  }
}