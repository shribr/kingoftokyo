/** card-shop.component.js
 * Renders current shop cards + flush button (2 energy) in rewrite path.
 */
import { store } from '../../bootstrap/index.js';
import { selectShopCards, selectActivePlayer } from '../../core/selectors.js';
import { uiCardDetailOpen } from '../../core/actions.js';
import { purchaseCard, flushShop, peekTopCard } from '../../services/cardsService.js';
import { logger } from '../../bootstrap/index.js';

export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' card-shop-panel';
  root.innerHTML = `<div class="shop-cards" data-cards></div>
  <div class="shop-actions" data-actions></div>`;

  root.addEventListener('click', (e) => {
    const cardEl = e.target.closest('[data-card-id]');
    if (cardEl && e.target.matches('[data-action="detail"]')) {
      const id = cardEl.getAttribute('data-card-id');
      store.dispatch(uiCardDetailOpen(id, 'shop'));
    } else if (cardEl && e.target.matches('[data-action="buy"]')) {
      const id = cardEl.getAttribute('data-card-id');
      const active = selectActivePlayer(store.getState());
      if (active) purchaseCard(store, logger, active.id, id);
    } else if (e.target.matches('[data-action="flush-shop"]')) {
      const active = selectActivePlayer(store.getState());
      if (active) flushShop(store, logger, active.id, 2);
      } else if (e.target.matches('[data-action="peek-top"]')) {
        const active = selectActivePlayer(store.getState());
        if (active) peekTopCard(store, logger, active.id, 1);
    }
  });

  return { root, update: () => update(root) };
}

export function update(root) {
  const state = store.getState();
  const cards = selectShopCards(state);
  const active = selectActivePlayer(state);
  const phase = state.phase;
  const canBuyPhase = phase === 'RESOLVE';
  const listEl = root.querySelector('[data-cards]');
  listEl.innerHTML = cards.map(c => renderCard(c, active, canBuyPhase)).join('');
  const actionsEl = root.querySelector('[data-actions]');
  actionsEl.innerHTML = renderActions(active, phase);
}

function renderCard(card, active, canBuyPhase) {
  const affordable = active && active.energy >= card.cost;
  const canBuy = affordable && canBuyPhase;
  return `<div class="shop-card" data-card-id="${card.id}">
    <div class="sc-header">
      <span class="sc-name">${card.name}</span>
      <span class="sc-cost">⚡${card.cost}</span>
    </div>
    <div class="sc-effect">${formatCardText(card.effect)}</div>
    <div class="sc-actions">
      <button data-action="detail" class="btn sm">DETAILS</button>
      <button data-action="buy" class="btn sm ${canBuy ? 'primary' : 'disabled'}" ${canBuy? '' : 'disabled'}>BUY</button>
    </div>
  </div>`;
}

function renderActions(active, phase) {
  const canFlush = !!active && active.energy >= 2 && phase === 'RESOLVE';
  const flushLabel = 'FLUSH SHOP (2⚡)';
  const hasPeek = !!active && active.cards?.some(c => c.effect?.kind === 'peek');
  const canPeek = hasPeek && active.energy >= 1 && phase === 'RESOLVE';
  return `<div class="shop-footer">
    <div class="shop-footer-row">
      <button data-action="flush-shop" class="btn ${canFlush ? 'warning' : 'disabled'}" ${canFlush? '' : 'disabled'}>${flushLabel}</button>
      <button data-action="peek-top" class="btn ${canPeek ? 'secondary' : 'disabled'}" ${canPeek? '' : 'disabled'}>PEEK (1⚡)</button>
    </div>
  </div>`;
}

function formatCardText(effect) {
  if (!effect) return '';
  switch (effect.kind) {
    case 'vp_gain': return `Gain ${effect.value}★`;
    case 'energy_gain': return `Gain ${effect.value}⚡`;
    case 'heal_all': return `All monsters heal ${effect.value}`;
    case 'dice_slot': return `+${effect.value} Die Slot`;
    case 'reroll_bonus': return `+${effect.value} Reroll`;
    default: return effect.kind;
  }
}
