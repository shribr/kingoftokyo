/** power-cards-panel.component.js
 * Clean implementation using exact same structure as monsters-panel.
 * Left side panel showing available power cards for purchase.
 */
import { store } from '../../bootstrap/index.js';
import { selectActivePlayer } from '../../core/selectors.js';
import { initSidePanel } from '../side-panel/side-panel.js';
import { purchaseCard, flushShop } from '../../services/cardsService.js';
import { logger } from '../../bootstrap/index.js';

export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' cmp-power-cards-panel cmp-side-panel k-panel';
  root.setAttribute('data-side','left');
  root.innerHTML = panelTemplate();
  
  // Use exact same pattern as monsters panel but mirrored for left side
  initSidePanel(root, {
    side:'left',
    expandedArrow:'◄',  // Points left (toward collapse direction)
    collapsedArrow:'▲',  // Points up (toward expand direction)
    bodyClassExpanded:'panels-expanded-left'
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
  const canAfford = playerEnergy >= (card.cost || 0);
  const rarity = getRarity(card);
  const isDarkEdition = card.darkEdition || false;
  
  return `
    <div class="pc-card" data-card-id="${card.id}" data-rarity="${rarity}" ${isDarkEdition ? 'data-dark-edition="true"' : ''}>
      <div class="pc-card-header">
        <h4 class="pc-card-name">${card.name}${isDarkEdition ? ' ⚫' : ''}</h4>
        <div class="pc-card-cost pc-card-cost--header">${card.cost}⚡</div>
      </div>
      <div class="pc-card-description">${getCardDescription(card)}</div>
      <div class="pc-card-cost pc-card-cost--footer">${card.cost}⚡</div>
      <div class="pc-card-footer">
        <button class="k-btn k-btn--xs k-btn--primary" 
                data-buy data-card-id="${card.id}" 
                ${!canAfford ? 'disabled' : ''}>
          Buy
        </button>
      </div>
    </div>
  `;
}

function renderDeckCard(isEmpty, remaining) {
  return `
    <div class="power-card-deck ${isEmpty ? 'is-empty' : ''}" data-deck-card>
      <img src="images/king-of-tokyo-logo.png" alt="King of Tokyo" class="deck-logo">
      <span class="deck-label">DECK</span>
    </div>
  `;
}

function getRarity(card) {
  const cost = card.cost || 0;
  if (cost >= 7) return 'epic';
  if (cost >= 5) return 'rare';
  return 'common';
}

function getCardDescription(card) {
  if (card.description) return card.description;
  
  const effect = card.effect;
  if (!effect) return 'Special power card';
  
  switch(effect.kind) {
    case 'vp_gain': return `Gain ${effect.value} Victory Points`;
    case 'energy_gain': return `Gain ${effect.value} Energy`;
    case 'dice_slot': return `Add ${effect.value} extra die`;
    case 'reroll_bonus': return `+${effect.value} reroll per turn`;
    case 'heal_all': return `All monsters heal ${effect.value} damage`;
    case 'heal_self': return `Heal ${effect.value} damage`;
    case 'energy_steal': return `Steal ${effect.value} energy from all players`;
    case 'vp_steal': return `Steal ${effect.value} VP from all players`;
    case 'damage_all': return `Deal ${effect.value} damage to all monsters`;
    case 'damage_tokyo_only': return `Deal ${effect.value} damage to monsters in Tokyo`;
    default: return 'Special effect';
  }
}

function addShopEventListeners(container, activePlayer) {
  // Buy card buttons
  container.querySelectorAll('[data-buy]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cardId = e.target.dataset.cardId;
      if (cardId && activePlayer) {
        purchaseCard(store, logger, activePlayer.id, cardId);
      }
    });
  });
}

