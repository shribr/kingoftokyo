import { UI_CARD_DETAIL_OPEN, UI_CARD_DETAIL_CLOSE, UI_PLAYER_CARDS_OPEN, UI_PLAYER_CARDS_CLOSE, UI_MONSTER_PROFILES_OPEN, UI_MONSTER_PROFILES_CLOSE, UI_MONSTER_PROFILE_OPEN, UI_MONSTER_PROFILE_CLOSE, UI_SPLASH_HIDE, UI_POSITION_SET, UI_POSITIONS_RESET, UI_SETTINGS_OPEN, UI_SETTINGS_CLOSE, UI_AI_DECISION_OPEN, UI_AI_DECISION_CLOSE, UI_GAME_LOG_OPEN, UI_GAME_LOG_CLOSE, UI_GAME_LOG_COLLAPSE_STATE, UI_PEEK_SHOW, UI_PEEK_HIDE, UI_ATTACK_PULSE, UI_VP_FLASH, UI_ENERGY_FLASH, UI_HEALTH_FLASH, UI_MONSTER_SELECTION_OPEN, UI_MONSTER_SELECTION_CLOSE, UI_INSTRUCTIONS_OPEN, UI_INSTRUCTIONS_CLOSE, UI_CONFIRM_OPEN, UI_CONFIRM_CLOSE, UI_ABOUT_OPEN, UI_ABOUT_CLOSE, UI_ROLL_FOR_FIRST_OPEN, UI_ROLL_FOR_FIRST_CLOSE, UI_ROLL_FOR_FIRST_RESOLVED } from '../actions.js';

const initial = {
  cardDetail: { cardId: null, source: null },
  playerCards: { playerId: null },
  positions: {},
  monsterProfiles: { open: false, source: null },
  monsterSelection: { open: false },
  settings: { open: false },
  singleMonster: { monsterId: null },
  splash: { visible: true },
  flags: { showProbabilities: false },
  peek: { card: null },
  attackPulse: { ts: 0, playerIds: [] },
  vpFlash: { ts: 0, playerId: null, amount: 0 },
  energyFlash: { ts: 0, playerId: null, amount: 0 },
  healthFlash: { ts: 0, playerId: null, amount: 0 }
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
      const source = action.payload?.source || null;
      return { ...state, monsterProfiles: { open: true, source }, singleMonster: { monsterId: null } };
    }
    case UI_MONSTER_PROFILES_CLOSE: {
      const wasFromSelection = state.monsterProfiles?.source === 'selection';
      // If opened from selection, restore selection modal on close (only if not already open)
      if (wasFromSelection) {
        return { ...state, monsterProfiles: { open: false, source: null }, monsterSelection: { open: true } };
      }
      return { ...state, monsterProfiles: { open: false, source: null } };
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
    case UI_MONSTER_SELECTION_OPEN: {
      const next = { ...state, monsterSelection: { open: true } };
      if (typeof window !== 'undefined' && window.console) console.debug('[ui.reducer] MONSTER_SELECTION_OPEN ->', next.monsterSelection);
      return next;
    }
    case UI_MONSTER_SELECTION_CLOSE: {
      const next = { ...state, monsterSelection: { open: false } };
      if (typeof window !== 'undefined' && window.console) console.debug('[ui.reducer] MONSTER_SELECTION_CLOSE ->', next.monsterSelection);
      return next;
    }
    case UI_POSITION_SET: {
      const { componentName, x, y } = action.payload;
      return { ...state, positions: { ...state.positions, [componentName]: { x, y } } };
    }
    case UI_POSITIONS_RESET: {
      return { ...state, positions: {} };
    }
    case UI_SETTINGS_OPEN: {
      if (typeof window !== 'undefined' && window.console) console.debug('[ui.reducer] Settings OPEN');
      return { ...state, settings: { open: true } };
    }
    case UI_SETTINGS_CLOSE: return { ...state, settings: { open: false } };
    case UI_AI_DECISION_OPEN: return { ...state, aiDecision: { open: true } };
    case UI_AI_DECISION_CLOSE: return { ...state, aiDecision: { open: false } };
    case UI_GAME_LOG_OPEN: return { ...state, gameLog: { ...(state.gameLog||{}), open: true } };
    case UI_GAME_LOG_CLOSE: return { ...state, gameLog: { ...(state.gameLog||{}), open: false } };
    case UI_GAME_LOG_COLLAPSE_STATE: {
      const partial = action.payload.partial || {};
      const existing = state.gameLog?.collapse || { rounds: {}, turns: {} };
      const kinds = partial.kinds ? partial.kinds : state.gameLog?.kinds;
      return { ...state, gameLog: { ...(state.gameLog||{}), kinds, collapse: { rounds: { ...existing.rounds, ...(partial.rounds||{}) }, turns: { ...existing.turns, ...(partial.turns||{}) } } } };
    }
    case UI_INSTRUCTIONS_OPEN: return { ...state, instructions: { open: true } };
    case UI_INSTRUCTIONS_CLOSE: return { ...state, instructions: { open: false } };
    case UI_CONFIRM_OPEN: {
      const { confirmId, message, confirmLabel, cancelLabel } = action.payload;
      return { ...state, confirm: { open: true, confirmId, message, confirmLabel, cancelLabel } };
    }
    case UI_CONFIRM_CLOSE: return { ...state, confirm: { open: false } };
    case UI_ABOUT_OPEN: return { ...state, about: { open: true } };
    case UI_ABOUT_CLOSE: return { ...state, about: { open: false } };
  case UI_ROLL_FOR_FIRST_OPEN: return { ...state, rollForFirst: { ...(state.rollForFirst||{}), open: true } };
  case UI_ROLL_FOR_FIRST_CLOSE: return { ...state, rollForFirst: { ...(state.rollForFirst||{}), open: false } };
  case UI_ROLL_FOR_FIRST_RESOLVED: return { ...state, rollForFirst: { ...(state.rollForFirst||{}), open: false, resolved: true } };
    case UI_PEEK_SHOW: {
      return { ...state, peek: { card: action.payload.card } };
    }
    case UI_PEEK_HIDE: {
      return { ...state, peek: { card: null } };
    }
    case UI_ATTACK_PULSE: {
      const { playerIds, ts } = action.payload;
      return { ...state, attackPulse: { playerIds, ts } };
    }
    case UI_VP_FLASH: {
      const { playerId, amount, ts } = action.payload;
      return { ...state, vpFlash: { playerId, amount, ts } };
    }
    case UI_ENERGY_FLASH: {
      const { playerId, amount, ts } = action.payload;
      return { ...state, energyFlash: { playerId, amount, ts } };
    }
    case UI_HEALTH_FLASH: {
      const { playerId, amount, ts } = action.payload;
      return { ...state, healthFlash: { playerId, amount, ts } };
    }
    default:
      if (typeof window !== 'undefined' && window.__KOT_DEBUG_ALL) {
        try { console.debug('[ui.reducer] passthrough action', action.type); } catch(_) {}
      }
      return state;
  }
}
