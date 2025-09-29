import { GAME_PAUSED, GAME_RESUMED } from '../actions.js';

// State shape: { isPaused: false, pausedAt: null, totalPausedTime: 0, pauseContext: null }
const initial = { 
  isPaused: false, 
  pausedAt: null, 
  totalPausedTime: 0, 
  pauseContext: null 
};

export function gameReducer(state = initial, action) {
  switch (action.type) {
    case GAME_PAUSED: {
      const { pausedAt, context } = action.payload;
      return {
        ...state,
        isPaused: true,
        pausedAt,
        pauseContext: context
      };
    }
    case GAME_RESUMED: {
      const { resumedAt, totalPausedTime } = action.payload;
      return {
        ...state,
        isPaused: false,
        pausedAt: null,
        pauseContext: null,
        totalPausedTime: state.totalPausedTime + totalPausedTime
      };
    }
    default:
      return state;
  }
}