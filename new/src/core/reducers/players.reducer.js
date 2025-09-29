import { PLAYER_JOINED, PLAYER_DAMAGE_APPLIED, PLAYER_HEALED, PLAYER_GAINED_ENERGY, PLAYER_SPENT_ENERGY, PLAYER_ENTERED_TOKYO, PLAYER_LEFT_TOKYO, PLAYER_CARD_GAINED, PLAYER_VP_GAINED } from '../actions.js';
import { applyDamage, healPlayer, addEnergy, spendEnergy, enterTokyo, leaveTokyo, addVictoryPoints, recalcModifiers } from '../../domain/player.js';

const initial = { order: [], byId: {} };

export function playersReducer(state = initial, action) {
  switch (action.type) {
    case PLAYER_JOINED: {
      const p = action.payload.player;
      if (state.byId[p.id]) return state; // ignore duplicate
      return {
        order: [...state.order, p.id],
        byId: { ...state.byId, [p.id]: p }
      };
    }
    case PLAYER_DAMAGE_APPLIED: {
      const { playerId, amount } = action.payload;
      const existing = state.byId[playerId];
      if (!existing) return state;
      const updated = applyDamage(existing, amount);
      return { ...state, byId: { ...state.byId, [playerId]: updated } };
    }
    case PLAYER_HEALED: {
      const { playerId, amount } = action.payload;
      const existing = state.byId[playerId];
      if (!existing) return state;
      const updated = healPlayer(existing, amount);
      return { ...state, byId: { ...state.byId, [playerId]: updated } };
    }
    case PLAYER_GAINED_ENERGY: {
      const { playerId, amount } = action.payload;
      const existing = state.byId[playerId];
      if (!existing) return state;
      const updated = addEnergy(existing, amount);
      console.log(`⚡ REDUCER: ${existing.name} gained ${amount} energy (${existing.energy} -> ${updated.energy})`);
      return { ...state, byId: { ...state.byId, [playerId]: updated } };
    }
    case PLAYER_SPENT_ENERGY: {
      const { playerId, amount } = action.payload;
      const existing = state.byId[playerId];
      if (!existing) return state;
      const updated = spendEnergy(existing, amount);
      return { ...state, byId: { ...state.byId, [playerId]: updated } };
    }
    case PLAYER_ENTERED_TOKYO: {
      const { playerId } = action.payload;
      const existing = state.byId[playerId];
      if (!existing) return state;
      const updated = enterTokyo(existing);
      return { ...state, byId: { ...state.byId, [playerId]: updated } };
    }
    case PLAYER_LEFT_TOKYO: {
      const { playerId } = action.payload;
      const existing = state.byId[playerId];
      if (!existing) return state;
      const updated = leaveTokyo(existing);
      return { ...state, byId: { ...state.byId, [playerId]: updated } };
    }
    case PLAYER_CARD_GAINED: {
      const { playerId, card } = action.payload;
      const existing = state.byId[playerId];
      if (!existing || !card) return state;
      const withCard = { ...existing, cards: [...existing.cards, card] };
      const recalced = recalcModifiers(withCard);
      return { ...state, byId: { ...state.byId, [playerId]: recalced } };
    }
    case PLAYER_VP_GAINED: {
      const { playerId, amount } = action.payload;
      const existing = state.byId[playerId];
      if (!existing || !amount) return state;
      const updated = addVictoryPoints(existing, amount);
      console.log(`🏆 REDUCER: ${existing.name} gained ${amount} VP (${existing.victoryPoints} -> ${updated.victoryPoints})`);
      return { ...state, byId: { ...state.byId, [playerId]: updated } };
    }
    default:
      return state;
  }
}
