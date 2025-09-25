/** card-shop.component.js
 * Renders current shop cards + flush/peek actions.
 * LEGACY GLOBAL STYLE DEPENDENCY (FOR FUTURE LEGACY REMOVAL)
 * Relies on legacy selectors: .cards-area, .collapsible-panel, .card-shop-panel, .cards-collapsed, .shop-card, .btn
 * Source: css/legacy/layout.css (panel shell, grid, collapse header) & css/legacy/base.css (button styles)
 * Transition Plan:
 *   1. Extract card shop visual rules to css/components.card-shop.css (card grid, footer actions, responsive wrap).
 *   2. Introduce design tokens for spacing, border radius, color accents; remove coupling to legacy .cards-area.
 *   3. Replace global .btn usage with scoped .k-button or utility composition.
 *   4. Remove legacy class additions in build(); use data attributes & scoped root class only.
 *   5. Delete related selectors from legacy CSS after all dependent components refactored.
 */
import { store } from '../../bootstrap/index.js';
import { selectShopCards, selectActivePlayer } from '../../core/selectors.js';
import { uiCardDetailOpen } from '../../core/actions.js';
import { purchaseCard, flushShop, peekTopCard } from '../../services/cardsService.js';
import { logger } from '../../bootstrap/index.js';
import { createPositioningService } from '../../services/positioningService.js';

export function build({ selector }) {
  const root = document.createElement('div');
  // Add legacy class hooks (cards-area, collapsible-panel) for existing layout + transition period.
  root.className = `${selector.slice(1)} cmp-panel-root`;
  root.setAttribute('data-panel','card-shop');
  root.innerHTML = `
    <h3 class="panel-header" data-toggle>
      <span class="header-text"><span class="toggle-arrow"><</span> Power Cards</span>
    </h3>
    <div class="panel-content">
      <div class="shop-cards" data-cards></div>
      <div class="shop-actions" data-actions></div>
    </div>`;
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-toggle]')) {
      const willCollapse = root.getAttribute('data-collapsed') !== 'true';
      if (willCollapse) {
        root.setAttribute('data-collapsed','true');
      } else {
        root.removeAttribute('data-collapsed');
      }
    }
  });

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

  // Draggable (persisted) positioning
  try { createPositioningService(store).makeDraggable(root, 'cardShopPanel', { grid:4 }); } catch(_) {}

  return { root, update: () => update(root) };
}

export function update(root) {
  const state = store.getState();
  const cards = selectShopCards(state);
  const active = selectActivePlayer(state);
  const phase = state.phase;
  const canBuyPhase = phase === 'BUY' || phase === 'RESOLVE';
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
  <button data-action="detail" class="k-btn k-btn--secondary k-btn--small">DETAILS</button>
  <button data-action="buy" class="k-btn k-btn--primary k-btn--small" ${canBuy? '' : 'disabled'}>BUY</button>
    </div>
  </div>`;
}

function renderActions(active, phase) {
  const canFlush = !!active && active.energy >= 2 && (phase === 'BUY' || phase === 'RESOLVE');
  const flushLabel = 'FLUSH SHOP (2⚡)';
  const hasPeek = !!active && active.cards?.some(c => c.effect?.kind === 'peek');
  const canPeek = hasPeek && active.energy >= 1 && (phase === 'BUY' || phase === 'RESOLVE');
  return `<div class="shop-footer">
    <div class="shop-footer-row">
  <button data-action="flush-shop" class="k-btn k-btn--warning k-btn--small" ${canFlush? '' : 'disabled'}>${flushLabel}</button>
  <button data-action="peek-top" class="k-btn k-btn--secondary k-btn--small" ${canPeek? '' : 'disabled'}>PEEK (1⚡)</button>
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
