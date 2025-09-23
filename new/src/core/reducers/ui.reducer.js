import { UI_CARD_DETAIL_OPEN, UI_CARD_DETAIL_CLOSE, UI_PLAYER_CARDS_OPEN, UI_PLAYER_CARDS_CLOSE, UI_MONSTER_PROFILES_OPEN, UI_MONSTER_PROFILES_CLOSE, UI_MONSTER_PROFILE_OPEN, UI_MONSTER_PROFILE_CLOSE, UI_SPLASH_HIDE, UI_POSITION_SET, UI_POSITIONS_RESET } from '../actions.js';

const initial = {
  cardDetail: { cardId: null, source: null },
  playerCards: { playerId: null },
  positions: {},
  monsterProfiles: { open: false },
  singleMonster: { monsterId: null },
  splash: { visible: true },
  flags: { showProbabilities: false }
};

export function uiReducer(state = initial, action) {
  switch (action.type) {
    case UI_CARD_DETAIL_OPEN: {
      const { cardId, source } = action.payload;
      return { ...state, cardDetail: { cardId, source } };
    }
    case UI_CARD_DETAIL_CLOSE: {
      return { ...state, cardDetail: { cardId: null, source: null } };
    }
    case UI_PLAYER_CARDS_OPEN: {
      const { playerId } = action.payload;
      return { ...state, playerCards: { playerId } };
    }
    case UI_PLAYER_CARDS_CLOSE: {
      return { ...state, playerCards: { playerId: null } };
    }
    case UI_MONSTER_PROFILES_OPEN: {
      return { ...state, monsterProfiles: { open: true }, singleMonster: { monsterId: null } };
    }
    case UI_MONSTER_PROFILES_CLOSE: {
      return { ...state, monsterProfiles: { open: false } };
    }
    case UI_MONSTER_PROFILE_OPEN: {
      const { monsterId } = action.payload;
      return { ...state, singleMonster: { monsterId }, monsterProfiles: { open: false } };
    }
    case UI_MONSTER_PROFILE_CLOSE: {
      return { ...state, singleMonster: { monsterId: null } };
    }
    case UI_SPLASH_HIDE: {
      return { ...state, splash: { visible: false } };
    }
    case UI_POSITION_SET: {
      const { componentName, x, y } = action.payload;
      return { ...state, positions: { ...state.positions, [componentName]: { x, y } } };
    }
    case UI_POSITIONS_RESET: {
      return { ...state, positions: {} };
    }
    default:
      return state;
  }
}
