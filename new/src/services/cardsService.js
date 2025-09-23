/** services/cardsService.js
 * Orchestrates deck build & initial / refill shop.
 */
import { buildBaseCatalog, buildDeck, draw } from '../domain/cards.js';
import { cardsDeckBuilt, cardsShopFilled, cardPurchased, playerSpendEnergy, playerCardGained } from '../core/actions.js';

export function initCards(store, logger, rng = Math.random) {
  const catalog = buildBaseCatalog();
  const deck = buildDeck(catalog, rng);
  store.dispatch(cardsDeckBuilt(deck));
  refillShop(store, logger);
  logger.system('Card deck built & shop filled.');
}

export function refillShop(store, logger) {
  const state = store.getState();
  const needed = Math.max(0, 3 - state.cards.shop.length);
  if (needed === 0) return;
  const { drawn, rest } = draw(state.cards.deck, needed);
  store.dispatch(cardsShopFilled([...state.cards.shop, ...drawn]));
  store.dispatch(cardsDeckBuilt(rest)); // reuse action to update remaining deck
  logger.info(`Shop refilled with ${drawn.length} card(s).`);
}

export function purchaseCard(store, logger, playerId, cardId) {
  const state = store.getState();
  const card = state.cards.shop.find(c => c.id === cardId);
  if (!card) return false;
  const player = state.players.byId[playerId];
  if (!player || player.energy < card.cost) return false;
  store.dispatch(playerSpendEnergy(playerId, card.cost));
  store.dispatch(cardPurchased(playerId, card));
  store.dispatch(playerCardGained(playerId, card));
  logger.system(`${playerId} purchased ${card.name} for ${card.cost} energy`);
  refillShop(store, logger);
  return true;
}
