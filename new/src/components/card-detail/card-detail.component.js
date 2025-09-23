/** card-detail.component.js */
import { store } from '../../bootstrap/index.js';
import { selectUICardDetail, selectShopCards, selectActivePlayer, selectCardsState } from '../../core/selectors.js';
import { uiCardDetailClose } from '../../core/actions.js';
import { purchaseCard } from '../../services/cardsService.js';
import { logger } from '../../bootstrap/index.js';

export function build({ selector, emit }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' card-detail-modal hidden';
  root.innerHTML = `<div class="card-detail-frame" data-frame>
    <div class="cd-cost" data-cost></div>
    <div class="cd-name" data-name></div>
    <div class="cd-text" data-text></div>
    <div class="cd-actions" data-actions></div>
  </div>`;

  root.addEventListener('click', (e) => {
    if (e.target.matches('[data-action="close"]')) {
      store.dispatch(uiCardDetailClose());
    } else if (e.target.matches('[data-action="purchase"]')) {
      const detail = selectUICardDetail(store.getState());
      const active = selectActivePlayer(store.getState());
      if (!detail.cardId || !active) return;
      purchaseCard(store, logger, active.id, detail.cardId);
      // If purchase succeeded, the shop no longer has it; we can leave open showing owned state.
      // Re-render will adjust buttons.
    }
  });

  return { root, update: (props) => update(root, props), destroy: () => root.remove() };
}

export function update(root) {
  const state = store.getState();
  const detail = selectUICardDetail(state);
  if (!detail.cardId) {
    root.classList.add('hidden');
    return;
  }
  root.classList.remove('hidden');
  const shopCards = selectShopCards(state);
  const active = selectActivePlayer(state);
  const allDeckCards = [...shopCards, ...state.cards.discard, ...state.cards.deck];
  const candidate = shopCards.find(c => c.id === detail.cardId) || active?.cards.find(c => c.id === detail.cardId) || allDeckCards.find(c => c.id === detail.cardId);
  if (!candidate) {
    // Card disappeared (edge case) close.
    store.dispatch(uiCardDetailClose());
    return;
  }
  root.querySelector('[data-cost]').innerHTML = costBadge(candidate.cost);
  root.querySelector('[data-name]').textContent = candidate.name.toUpperCase();
  root.querySelector('[data-text]').innerHTML = formatCardText(candidate.text || candidate.description || '');
  const actionsEl = root.querySelector('[data-actions]');
  actionsEl.innerHTML = renderActions(candidate, detail, active, shopCards);
}

function renderActions(card, detail, active, shopCards) {
  const phase = store.getState().phase;
  const inShop = !!shopCards.find(c => c.id === card.id) && detail.source === 'shop';
  const canPurchase = inShop && phase === 'RESOLVE' && active && active.energy >= card.cost;
  const needResolve = inShop && phase !== 'RESOLVE';
  const insufficient = inShop && phase === 'RESOLVE' && active && active.energy < card.cost;
  let leftBtn = '';
  if (inShop) {
    if (canPurchase) {
      leftBtn = `<button data-action="purchase" class="btn primary">BUY ⚡${card.cost}</button>`;
    } else if (needResolve) {
      leftBtn = `<button class="btn disabled" disabled>RESOLVE DICE FIRST</button>`;
    } else if (insufficient) {
      const diff = card.cost - active.energy;
      leftBtn = `<button class="btn disabled" disabled>NEED ${diff}⚡</button>`;
    }
  }
  const closeBtn = `<button data-action="close" class="btn danger">CLOSE</button>`;
  return `${leftBtn}${closeBtn}`;
}

function costBadge(cost) {
  return `<div class="cost-badge">⚡ ${cost}</div>`;
}

function formatCardText(txt) {
  return txt
    .replace(/VP/gi, '★')
    .replace(/victory points?/gi, '★')
    .replace(/energy/gi, '⚡');
}
