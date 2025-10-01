import { CARDS_DECK_BUILT, CARDS_SHOP_FILLED, CARD_PURCHASED, CARD_DISCARDED, CARD_SHOP_FLUSHED } from '../actions.js';

const initial = { deck: [], discard: [], shop: [] };

export function cardsReducer(state = initial, action) {
  switch (action.type) {
    case CARDS_DECK_BUILT: {
      // Initial build: state.deck empty -> reset discard & shop.
      // Subsequent rebuild (used to update remaining deck after draws): preserve current shop & discard.
      if (state.deck.length === 0 && state.shop.length === 0 && state.discard.length === 0) {
        return { ...state, deck: action.payload.deck, discard: [], shop: [] };
      }
      return { ...state, deck: action.payload.deck };
    }
    case CARDS_SHOP_FILLED: {
      return { ...state, shop: action.payload.cards };
    }
    case CARD_PURCHASED: {
      const { card } = action.payload;
      return { ...state, shop: state.shop.filter(c => c.id !== card.id) };
    }
    case CARD_DISCARDED: {
      const { card } = action.payload;
      return { ...state, discard: [...state.discard, card] };
    }
    case CARD_SHOP_FLUSHED: {
      const { newCards } = action.payload;
      return { ...state, shop: newCards };
    }
    default:
      return state;
  }
}
