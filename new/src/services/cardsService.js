/** services/cardsService.js
 * Orchestrates deck build & initial / refill shop.
 */
import { buildBaseCatalog, buildDeck, draw } from '../domain/cards.js';
import { cardsDeckBuilt, cardsShopFilled, cardPurchased, playerSpendEnergy, playerCardGained, cardDiscarded, cardShopFlushed, uiPeekShow, uiPeekHide } from '../core/actions.js';
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

// Peek at next top card if player owns a card with effect.kind==='peek'. Cost defaults to 1 energy.
export function peekTopCard(store, logger, playerId, cost = 1) {
  const state = store.getState();
  const player = state.players.byId[playerId];
  if (!player) return false;
  const hasPeek = player.cards.some(c => c.effect?.kind === 'peek');
  if (!hasPeek) return false;
  if (player.energy < cost) return false;
  if (!state.cards.deck.length) return false;
  const top = state.cards.deck[0];
  store.dispatch(playerSpendEnergy(playerId, cost));
  store.dispatch(uiPeekShow(top));
  logger.info(`${playerId} peeks at top card: ${top.name}`);
  // Auto hide after 3 seconds
  setTimeout(() => {
    store.dispatch(uiPeekHide());
  }, 3000);
  return true;
}

// Flush / clear current shop for a cost (official baseline: 2 energy)
export function flushShop(store, logger, playerId, cost = 2) {
  const state = store.getState();
  const player = state.players.byId[playerId];
  if (!player) return { success: false, reason: 'NO_PLAYER' };
  if (player.energy < cost) return { success: false, reason: 'INSUFFICIENT_ENERGY' };
  // Spend energy
  store.dispatch(playerSpendEnergy(playerId, cost));
  const oldCards = [...state.cards.shop];
  // Move old shop cards to discard (semantic choice; could optionally just rotate without discarding)
  for (const c of oldCards) {
    store.dispatch(cardDiscarded(c));
  }
  // Draw 3 fresh cards (reuse refill logic partially)
  const nextState = store.getState();
  const { drawn, rest } = draw(nextState.cards.deck, 3);
  store.dispatch(cardsDeckBuilt(rest));
  store.dispatch(cardShopFlushed(playerId, oldCards, drawn, cost));
  logger.system(`${playerId} flushed shop for ${cost} energy.`);
  return { success: true, oldCards, newCards: drawn };
}
