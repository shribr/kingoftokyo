import { CARDS_DECK_BUILT, CARDS_SHOP_FILLED, CARD_PURCHASED, CARD_DISCARDED, CARD_SHOP_FLUSHED } from '../actions.js';

const initial = { deck: [], discard: [], shop: [] };

export function cardsReducer(state = initial, action) {
  switch (action.type) {
    case CARDS_DECK_BUILT: {
      return { ...state, deck: action.payload.deck, discard: [], shop: [] };
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
