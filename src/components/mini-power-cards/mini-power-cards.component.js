/**
 * Mini Power Cards Component
 * Compact power card display for mobile UI
 * Shows available shop cards for purchase along bottom of screen (Catan-style)
 * Features: One card at a time with navigation buttons for full name visibility
 */
import { store } from '../../bootstrap/index.js';
import { uiCardDetailOpen } from '../../core/actions.js';
import { buildBaseCatalog } from '../../domain/cards.js';

// Build catalog once at module load
const CARD_CATALOG = buildBaseCatalog();

export function build({ selector }) {
  const container = document.createElement('div');
  container.className = 'cmp-mini-power-cards';
  container.setAttribute('data-mini-power-cards', 'true');
  
  let currentIndex = 0;
  let shopCards = [];
  let prevBtnEl = null;
  let nextBtnEl = null;
  let cardDisplayEl = null;
  
  const sync = () => {
    const st = store.getState();
    
    // Get shop cards (the 3 cards available for purchase)
    shopCards = st.cards?.shop || [];
    
    // If no shop cards, show empty state
    if (!shopCards || shopCards.length === 0) {
      container.innerHTML = '<div class="mpc-empty-state">No Cards Available</div>';
      return;
    }
    
    // Reset index if out of bounds
    if (currentIndex >= shopCards.length) {
      currentIndex = 0;
    }
    
    // Build structure with indicator outside on left, then card display and nav buttons
    container.innerHTML = '';
    
    // Card indicator on the left (outside the main card container)
    if (shopCards.length > 1) {
      const indicatorEl = document.createElement('div');
      indicatorEl.className = 'mpc-indicator';
      indicatorEl.textContent = `${currentIndex + 1} / ${shopCards.length}`;
      container.appendChild(indicatorEl);
    }
    
    // Previous button
    prevBtnEl = document.createElement('button');
    prevBtnEl.className = 'mpc-page-btn';
    prevBtnEl.innerHTML = '◀';
    prevBtnEl.setAttribute('aria-label', 'Previous card');
    container.appendChild(prevBtnEl);
    
    // Single card display area
    cardDisplayEl = document.createElement('div');
    cardDisplayEl.className = 'mpc-card-display';
    container.appendChild(cardDisplayEl);
    
    // Next button
    nextBtnEl = document.createElement('button');
    nextBtnEl.className = 'mpc-page-btn';
    nextBtnEl.innerHTML = '▶';
    nextBtnEl.setAttribute('aria-label', 'Next card');
    container.appendChild(nextBtnEl);
    
    // Setup navigation
    setupNavigation();
    
    // Display current card
    displayCard();
  };
  
  const setupNavigation = () => {
    if (!prevBtnEl || !nextBtnEl) return;
    
    // Handle previous button click
    prevBtnEl.addEventListener('click', () => {
      currentIndex = (currentIndex - 1 + shopCards.length) % shopCards.length;
      displayCard();
      updateButtons();
    });
    
    // Handle next button click
    nextBtnEl.addEventListener('click', () => {
      currentIndex = (currentIndex + 1) % shopCards.length;
      displayCard();
      updateButtons();
    });
    
    updateButtons();
  };
  
  const updateButtons = () => {
    if (!prevBtnEl || !nextBtnEl) return;
    
    // Always enable both buttons when there are multiple cards
    if (shopCards.length <= 1) {
      prevBtnEl.classList.add('disabled');
      nextBtnEl.classList.add('disabled');
    } else {
      prevBtnEl.classList.remove('disabled');
      nextBtnEl.classList.remove('disabled');
    }
  };
  
  const displayCard = () => {
    if (!cardDisplayEl || !shopCards[currentIndex]) return;
    
    const card = shopCards[currentIndex];
    const miniCard = createMiniShopCard(card, currentIndex);
    cardDisplayEl.innerHTML = '';
    cardDisplayEl.appendChild(miniCard);
    
    // Update the indicator text if it exists (update the existing one, don't create a new one)
    const indicatorEl = container.querySelector('.mpc-indicator');
    if (indicatorEl && shopCards.length > 1) {
      indicatorEl.textContent = `${currentIndex + 1} / ${shopCards.length}`;
    }
  };
  
  // Subscribe to state changes
  store.subscribe(sync);
  sync();
  
  return { root: container, update: sync };
}

function createMiniShopCard(card, index) {
  const cardEl = document.createElement('div');
  cardEl.className = 'mini-power-card';
  cardEl.setAttribute('data-card-index', index);
  cardEl.setAttribute('data-card-id', card.id);
  
  const cardName = card.name || card.id;
  const cardCost = card.cost || 0;
  const emoji = card.emoji || '';
  const isLight = card.lightEmoji || false;
  
  cardEl.innerHTML = `
    <div class="mpc-card-inner">
      <div class="mpc-card-name">${cardName}</div>
      <div class="mpc-card-cost">${cardCost}⚡</div>
    </div>
  `;
  
  // Add emoji badge outside the card (similar to active player indicator)
  if (emoji) {
    const emojiEl = document.createElement('div');
    emojiEl.className = 'mpc-card-emoji' + (isLight ? ' mpc-emoji-light' : '');
    emojiEl.innerHTML = emoji;
    cardEl.appendChild(emojiEl);
  }
  
  // Click to open card detail modal
  cardEl.addEventListener('click', () => {
    store.dispatch(uiCardDetailOpen(card.id, 'shop'));
  });
  
  return cardEl;
}

// Legacy function - now emojis come from card data
function getCardEmoji(card) {
  return card.emoji || '';
}

export function update() {
  // Component auto-syncs via store subscription
}

