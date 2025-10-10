/** power-cards-panel.component.js
 * Clean implementation using exact same structure as monsters-panel.
 * Left side panel showing available power cards for purchase.
 */
import { store } from '../../bootstrap/index.js';
import { selectActivePlayer } from '../../core/selectors.js';
import { initSidePanel } from '../side-panel/side-panel.js';
import { purchaseCard, flushShop } from '../../services/cardsService.js';
import { logger } from '../../bootstrap/index.js';
import { generatePowerCard } from '../power-cards/power-card-generator.js';
import { uiConfirmOpen } from '../../core/actions.js';

// Track pending purchase for confirmation
let pendingPurchase = null;

export function build({ selector }) {
  const root = document.createElement('div');
  root.id = 'power-cards-panel';
  root.className = 'cmp-power-cards-panel cmp-side-panel k-panel';
  root.setAttribute('data-side','left');
  root.innerHTML = panelTemplate();
  
  // Use exact same pattern as monsters panel but mirrored for left side
  initSidePanel(root, {
    side:'left',
    expandedArrow:'◄',  // Points left (toward collapse direction)
    collapsedArrow:'▲',  // Points up (toward expand direction)
    bodyClassExpanded:'panels-expanded-left'
  });
  
  // Listen for confirmation events
  window.addEventListener('ui.confirm.accepted', (e) => {
    if (e.detail.confirmId === 'purchase-card-panel' && pendingPurchase) {
      const { playerId, cardId } = pendingPurchase;
      console.log('✅ Card purchase confirmed (panel):', { playerId, cardId });
      purchaseCard(store, logger, playerId, cardId);
      pendingPurchase = null;
    }
  });
  
  return { root, update: () => update(root), destroy: () => destroy(root) };
}

function panelTemplate() {
  return `
  <div class="mp-header k-panel__header" data-toggle role="button" aria-expanded="true" tabindex="0">
    <h2 class="mp-title" data-toggle><span class="mp-arrow" data-arrow-dir data-toggle>◄</span> Power Cards</h2>
  </div>
  <div class="mp-body k-panel__body" data-panel-body>
    <div class="mp-player-cards" data-power-cards-content></div>
  </div>`;
}

function destroy(root) {
  root.remove();
}
export function update(root) {
  const state = store.getState();
  const shopCards = state.cards?.shop || [];
  const deckCards = state.cards?.deck || [];
  const activePlayer = selectActivePlayer(state);
  const container = root.querySelector('[data-power-cards-content]');
  
  if (!container) return;
  
  // Apply theme based on settings
  const theme = state.settings?.powerCardTheme || 'original';
  if (theme !== 'original') {
    root.setAttribute('data-theme', theme);
  } else {
    root.removeAttribute('data-theme');
  }
  
  // Show placeholder if no active player
  if (!activePlayer) {
    container.innerHTML = `
      <div class="pc-empty-frame">
        <h3>Power Card Shop</h3>
        <p>Purchase power cards with energy to gain special abilities.</p>
        <p class="hint">Start the game to access the shop.</p>
      </div>
    `;
    return;
  }
  
  // Show shop with cards (energy display removed, flush moved to action menu)
  const energy = activePlayer.energy || 0;
  const deckEmpty = deckCards.length === 0;
  
  const shopHTML = `
    <div class="pc-shop">
      <div class="pc-shop-cards">
        ${shopCards.map(card => renderPowerCard(card, energy)).join('')}
        ${renderDeckCard(deckEmpty, deckCards.length)}
      </div>
    </div>
  `;
  
  container.innerHTML = shopHTML;
  
  // Add event listeners
  addShopEventListeners(container, activePlayer);
}

function renderPowerCard(card, playerEnergy) {
  return generatePowerCard(card, { playerEnergy, showBuy: true, showFooter: true, infoButton: true });
}

function renderDeckCard(isEmpty, remaining) {
  return `
    <div class="power-card-deck ${isEmpty ? 'is-empty' : ''}" data-deck-card>
      <img src="images/king-of-tokyo-logo.png" alt="King of Tokyo" class="deck-logo">
      <span class="deck-label">DECK</span>
    </div>
  `;
}

// getRarity and getCardDescription now handled in generator

function addShopEventListeners(container, activePlayer) {
  // Buy card buttons - now with confirmation modal
  const buyButtons = container.querySelectorAll('[data-buy]');
  
  buyButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cardId = e.target.dataset.cardId;
      if (cardId && activePlayer) {
        // Get card details for confirmation message
        const state = store.getState();
        const card = [...(state.cards?.shop || []), ...(state.cards?.deck || [])].find(c => c.id === cardId);
        if (card) {
          pendingPurchase = { playerId: activePlayer.id, cardId: cardId };
          
          // Format card effect description
          let effectDesc = '';
          if (card.effect) {
            if (card.effect.kind === 'victory_points') {
              effectDesc = `Gain ${card.effect.value} Victory Points`;
            } else if (card.effect.kind === 'extra_die') {
              effectDesc = `Roll an extra die`;
            } else if (card.effect.kind === 'extra_reroll') {
              effectDesc = `Get an extra reroll each turn`;
            } else if (card.effect.kind === 'cheaper_cards') {
              effectDesc = `Cards cost ${card.effect.value} less energy`;
            } else {
              effectDesc = card.description || 'Special ability';
            }
          }
          
          const message = `Purchase "${card.name}" for ${card.cost}⚡?\n\n${effectDesc}`;
          store.dispatch(uiConfirmOpen('purchase-card-panel', message, 'Buy Card', 'Cancel'));
        }
      }
    });
  });

  // Info buttons for card details
  container.querySelectorAll('[data-info]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const cardId = e.target.closest('[data-info]').dataset.cardId;
      if (cardId) {
        const state = store.getState();
        const card = [...(state.cards?.shop || []), ...(state.cards?.deck || [])].find(c => c.id === cardId);
        if (card) {
          // FIX: Previously dispatched the whole card as { card } which the reducer ignored (expects { cardId, source }).
          // This resulted in ui.cardDetail.cardId remaining null so the modal never opened.
          store.dispatch({ type: 'UI_CARD_DETAIL_OPEN', payload: { cardId: card.id, source: 'shop' } });
        }
      }
    });
  });

  // Deck card click - show All Power Cards catalog
  const deckCard = container.querySelector('[data-deck-card]');
  if (deckCard) {
    deckCard.addEventListener('click', () => {
      import('../settings-modal/settings-modal.component.js').then(({ createAllPowerCardsModal }) => {
        createAllPowerCardsModal();
      });
    });
  }
}

