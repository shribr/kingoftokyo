import { createStore, combineReducers } from '../core/store.js';
import { playersReducer } from '../core/reducers/players.reducer.js';
import { cardsReducer } from '../core/reducers/cards.reducer.js';
import { playerJoined } from '../core/actions.js';
import { createPlayer } from '../domain/player.js';
import { initCards, purchaseCard } from '../services/cardsService.js';
import { createLogger } from '../services/logger.js';

function assert(cond, msg){ if(!cond) throw new Error(msg); }

export function testCardsFlow() {
  const root = combineReducers({ players: playersReducer, cards: cardsReducer });
  const store = createStore(root, { players: { order: [], byId: {} }, cards: { deck: [], discard: [], shop: [] } });
  const logger = createLogger(store);
  initCards(store, logger, () => 0.42); // deterministic-ish
  let st = store.getState();
  assert(st.cards.shop.length === 3, 'Shop should have 3 cards after init');
  store.dispatch(playerJoined(createPlayer({ id: 'p1', name: 'Alpha', monsterId: 'king' })));
  // Give player some energy directly (test shortcut)
  st.players.byId['p1'].energy = 10;
  const firstCard = st.cards.shop[0];
  purchaseCard(store, logger, 'p1', firstCard.id);
  st = store.getState();
  assert(!st.cards.shop.find(c => c.id === firstCard.id), 'Purchased card removed from shop');
  assert(st.players.byId['p1'].cards.find(c => c.id === firstCard.id), 'Player owns purchased card');
  return 'cards_flow tests passed';
}

try { if (typeof window !== 'undefined') window.__TEST_RESULTS__.push(testCardsFlow()); } catch(e) {}
