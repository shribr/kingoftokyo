/** services/cardsService.js
 * Orchestrates deck build & initial / refill shop.
 */
import { buildBaseCatalog, buildDeck, draw } from '../domain/cards.js';
import { cardsDeckBuilt, cardsShopFilled, cardPurchased, playerSpendEnergy, playerCardGained, cardDiscarded } from '../core/actions.js';
import { createEffectEngine } from './effectEngine.js';

export function initCards(store, logger, rng = Math.random, opts = {}) {
  const catalog = buildBaseCatalog();
  // Dark Edition forward‑compatibility: filter / augment deck based on future mode flag
  // opts.darkEdition === true will eventually:
  //  - include dark-only cards (marked with card.dark === true)
  //  - possibly exclude some base set cards
  //  - inject progression / Wickness scale related event cards
  // For now: no-op; placeholder logic below.
  const activeCatalog = opts.darkEdition ? catalog /* future: catalog.filter(c => !c.excludeInDark) */ : catalog;
  const deck = buildDeck(catalog, rng);
  store.dispatch(cardsDeckBuilt(deck));
  refillShop(store, logger);
  logger.system('Card deck built & shop filled.');
  if (typeof window !== 'undefined') {
    if (!window.__KOT_NEW__) window.__KOT_NEW__ = {};
    if (!window.__KOT_NEW__.effectEngine) {
      window.__KOT_NEW__.effectEngine = createEffectEngine(store, logger);
    }
  }
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
  const effectEngine = typeof window !== 'undefined' ? window.__KOT_NEW__?.effectEngine : null;
  if (card.type === 'discard') {
    // move card straight to discard pile & enqueue effect
    store.dispatch(cardDiscarded(card));
    logger.system(`${playerId} purchased & discarded ${card.name}`);
    if (effectEngine) effectEngine.enqueueImmediate(card, playerId);
  } else {
    store.dispatch(playerCardGained(playerId, card));
    logger.system(`${playerId} purchased ${card.name} (keep)`);
    // Optionally enqueue immediate keep effects that are instantaneous
    if (effectEngine && ['vp_gain','energy_gain'].includes(card.effect?.kind)) {
      effectEngine.enqueueImmediate(card, playerId);
    }
  }
  refillShop(store, logger);
  return true;
}
