/** player-power-cards-modal.component.js */
import { store } from '../../bootstrap/index.js';
import { selectUIPlayerPowerCards, selectPlayerById } from '../../core/selectors.js';
import { uiPlayerPowerCardsClose, uiCardDetailOpen } from '../../core/actions.js';
import { generatePowerCard } from '../power-cards/power-card-generator.js';
import { buildBaseCatalog } from '../../domain/cards.js';

// Build catalog once at module load
const CARD_CATALOG = buildBaseCatalog();

// Function to check if we're on mobile
const isMobileDevice = () => {
  return window.innerWidth <= 1024 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export function build({ selector }) {
  const root = document.createElement('div');
  // Detect mobile and use appropriate class (don't add selector on mobile since we have a dedicated mobile class)
  const modalClass = isMobileDevice() ? 'cmp-player-power-cards-modal-mobile' : selector.slice(1);
  root.className = modalClass + ' hidden';
  
  // IMPORTANT: Append modal directly to body, not to the mountPoint
  // Modals should always be at the top level to avoid z-index and overflow issues
  document.body.appendChild(root);
  
  root.innerHTML = `<div class="ppcm-frame" data-frame>
    <div class="ppcm-header" data-header>
      <h2 data-player-name></h2>
      <button data-action="close" aria-label="Close">×</button>
    </div>
    <div class="ppcm-body cmp-power-cards-panel" data-body></div>
  </div>`;

  root.addEventListener('click', (e) => {
    if (e.target.matches('[data-action="close"]')) {
      store.dispatch(uiPlayerPowerCardsClose());
      return;
    }
    
    // Handle info button clicks to show card details
    if (e.target.matches('[data-info]') || e.target.closest('[data-info]')) {
      const infoBtn = e.target.matches('[data-info]') ? e.target : e.target.closest('[data-info]');
      const cardId = infoBtn.getAttribute('data-card-id');
      if (cardId) {
        store.dispatch(uiCardDetailOpen(cardId, 'owned'));
      }
      return;
    }
    
    // Backdrop click to close - only if clicking directly on the modal backdrop (not the frame)
    if (e.target === root || e.target.classList.contains('cmp-player-power-cards-modal') || e.target.classList.contains('cmp-player-power-cards-modal-mobile')) {
      store.dispatch(uiPlayerPowerCardsClose());
    }
  });

  // Add draggability (desktop only)
  const frame = root.querySelector('[data-frame]');
  const header = root.querySelector('[data-header]');
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;

  header.addEventListener('mousedown', (e) => {
    // Skip dragging on mobile devices
    if (isMobileDevice()) return;
    if (e.target.matches('[data-action="close"]')) return;
    isDragging = true;
    initialX = e.clientX - (frame.offsetLeft || 0);
    initialY = e.clientY - (frame.offsetTop || 0);
    root.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging || isMobileDevice()) return;
    e.preventDefault();
    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;
    frame.style.left = `${currentX}px`;
    frame.style.top = `${currentY}px`;
    frame.style.transform = 'none';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging && !isMobileDevice()) {
      isDragging = false;
      root.style.cursor = 'move';
    }
  });

  return { 
    root, 
    update: () => update(root), 
    destroy: () => {
      // Cleanup carousel event listeners
      if (root._carouselCleanup) {
        root._carouselCleanup();
      }
      root.remove();
    }
  };
}

export function update(root) {
  const state = store.getState();
  const ui = selectUIPlayerPowerCards(state);
  if (!ui || !ui.playerId) {
    root.classList.add('hidden');
    return;
  }
  const player = selectPlayerById(state, ui.playerId);
  if (!player) {
    root.classList.add('hidden');
    return;
  }
  root.classList.remove('hidden');
  root.querySelector('[data-player-name]').textContent = `${player.name}'s Power Cards`.toUpperCase();
  
  // Reset frame position to ensure proper centering
  const frame = root.querySelector('[data-frame]');
  if (frame) {
    frame.style.left = '';
    frame.style.top = '';
    frame.style.transform = '';
  }
  
  const body = root.querySelector('[data-body]');
  
  if (!player.powerCards || !player.powerCards.length) {
    body.innerHTML = `<div class="ppcm-empty">You currently have no power cards.<br/><span>Buy cards from the shop to gain special abilities.</span></div>`;
  } else {
    // Look up full card data from catalog by ID
    const fullCards = player.powerCards.map(cardRef => {
      // cardRef might be just an ID string, or an object with an 'id' property
      const cardId = typeof cardRef === 'string' ? cardRef : cardRef.id;
      
      // Look up the full card data from the catalog
      const fullCard = CARD_CATALOG.find(c => c.id === cardId);
      
      if (!fullCard) {
        console.warn('Card not found in catalog:', cardId, cardRef);
        return null; // Skip cards not in catalog
      }
      
      return fullCard;
    }).filter(Boolean); // Filter out null values
    
    // Generate HTML for grid view
    const cardsHtml = fullCards.map(fullCard => {
      return generatePowerCard(fullCard, { 
        playerEnergy: player.energy || 0, 
        showBuy: false,  // Don't show buy button for owned cards
        showFooter: true, // Keep footer to show cost badge at bottom
        infoButton: true // Show info button to see card details
      });
    }).join('');
    
    // Create both grid and carousel views
    body.innerHTML = `
      <div class="ppcm-cards-grid">${cardsHtml}</div>
      <div class="ppcm-carousel" data-carousel>
        <div class="ppcm-carousel-nav">
          <button class="ppcm-carousel-btn" data-carousel-prev>‹</button>
          <div class="ppcm-card-counter" data-card-counter>1 of ${fullCards.length}</div>
          <button class="ppcm-carousel-btn" data-carousel-next>›</button>
        </div>
        <div class="ppcm-carousel-card" data-carousel-card></div>
        <div class="ppcm-card-info-panel">
          <div class="ppcm-strategy-section">
            <h3>💡 STRATEGY</h3>
            <p class="ppcm-strategy-text" data-strategy-text></p>
          </div>
          <div class="ppcm-combo-section">
            <h3>🔗 COMBO TIPS</h3>
            <p class="ppcm-combo-text" data-combo-text></p>
          </div>
        </div>
      </div>
    `;
    
    // Initialize carousel functionality
    initializeCarousel(root, fullCards, player.energy || 0, player.powerCards);
  }
}

function initializeCarousel(root, cards, playerEnergy, allPlayerCards = []) {
  if (!cards.length) return;
  
  let currentIndex = 0;
  const carousel = root.querySelector('[data-carousel]');
  const cardContainer = root.querySelector('[data-carousel-card]');
  const counter = root.querySelector('[data-card-counter]');
  const prevBtn = root.querySelector('[data-carousel-prev]');
  const nextBtn = root.querySelector('[data-carousel-next]');
  const strategyText = root.querySelector('[data-strategy-text]');
  const comboText = root.querySelector('[data-combo-text]');
  
  function updateCarousel() {
    // Generate HTML for current card
    const currentCard = cards[currentIndex];
    const cardHtml = generatePowerCard(currentCard, { 
      playerEnergy, 
      showBuy: false,
      showFooter: true,
      infoButton: true
    });
    
    cardContainer.innerHTML = cardHtml;
    counter.textContent = `${currentIndex + 1} of ${cards.length}`;
    
    // Update strategy and combo tips
    if (strategyText && comboText) {
      strategyText.textContent = generateStrategyText(currentCard);
      comboText.textContent = generateComboTips(currentCard, cards);
    }
    
    // Update button states
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === cards.length - 1;
  }
  
  function goToPrev() {
    if (currentIndex > 0) {
      currentIndex--;
      updateCarousel();
    }
  }
  
  function goToNext() {
    if (currentIndex < cards.length - 1) {
      currentIndex++;
      updateCarousel();
    }
  }
  
  // Add event listeners
  prevBtn.addEventListener('click', goToPrev);
  nextBtn.addEventListener('click', goToNext);
  
  // Keyboard navigation
  const keyHandler = (e) => {
    if (root.classList.contains('hidden')) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goToPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goToNext();
    }
  };
  
  document.addEventListener('keydown', keyHandler);
  
  // Touch/swipe support for mobile
  let touchStartX = null;
  let touchEndX = null;
  
  const touchStart = (e) => {
    touchStartX = e.changedTouches[0].screenX;
  };
  
  const touchEnd = (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  };
  
  const handleSwipe = () => {
    if (!touchStartX || !touchEndX) return;
    
    const swipeDistance = Math.abs(touchStartX - touchEndX);
    const minSwipeDistance = 50; // Minimum swipe distance
    
    if (swipeDistance >= minSwipeDistance) {
      if (touchStartX > touchEndX) {
        // Swipe left - next card
        goToNext();
      } else {
        // Swipe right - previous card
        goToPrev();
      }
    }
    
    touchStartX = null;
    touchEndX = null;
  };
  
  cardContainer.addEventListener('touchstart', touchStart);
  cardContainer.addEventListener('touchend', touchEnd);
  
  // Cleanup function
  root._carouselCleanup = () => {
    document.removeEventListener('keydown', keyHandler);
    cardContainer.removeEventListener('touchstart', touchStart);
    cardContainer.removeEventListener('touchend', touchEnd);
  };
  
  // Initialize first card
  updateCarousel();
}

/**
 * Generate contextual strategy text based on card properties
 */
function generateStrategyText(card) {
  if (!card) return 'Card information not available.';
  
  // Card-specific strategies
  const strategies = {
    'SKYSCRAPER': 'Evaluate timing: buy when its effect aligns with your immediate plan.',
    'ENERGY_HOARDER': 'Maximize value by accumulating energy before spending on expensive cards.',
    'FIRE_BREATHING': 'Best used when you need extra damage output against opponents.',
    'HEALING_RAY': 'Keep for emergencies when your health is low.',
    'ARMOR_PLATING': 'Strong defensive card for long-term survivability.',
  };
  
  if (strategies[card.id]) {
    return strategies[card.id];
  }
  
  // Default strategy generation based on card cost
  const cost = card.cost || 0;
  
  if (cost <= 3) {
    return 'Low-cost card: Consider early purchase for immediate benefit and board presence.';
  } else if (cost <= 6) {
    return 'Mid-cost card: Evaluate timing based on current game state and energy availability.';
  } else {
    return 'High-cost card: Save for late game when you have abundant energy and need powerful effects.';
  }
}

/**
 * Generate combo tips based on card synergies with other owned cards
 */
function generateComboTips(card, allCards) {
  if (!card || !allCards || allCards.length <= 1) {
    return 'No obvious combos found with available cards.';
  }
  
  // Look for synergies between this card and other owned cards
  const otherCards = allCards.filter(c => c.id !== card.id);
  
  // Simple combo detection based on card names/types/effects
  const energyCards = otherCards.filter(c => 
    c.name?.toUpperCase().includes('ENERGY') || 
    c.effect?.toLowerCase().includes('energy')
  );
  
  const attackCards = otherCards.filter(c => 
    c.name?.toUpperCase().includes('ATTACK') || 
    c.name?.toUpperCase().includes('CLAW') ||
    c.effect?.toLowerCase().includes('damage')
  );
  
  const healthCards = otherCards.filter(c => 
    c.name?.toUpperCase().includes('HEALTH') || 
    c.name?.toUpperCase().includes('HEAL') ||
    c.effect?.toLowerCase().includes('heal')
  );
  
  // Generate combo suggestions
  const combos = [];
  
  if (card.name?.includes('ENERGY') && attackCards.length > 0) {
    const names = attackCards.slice(0, 2).map(c => c.name).join(', ');
    combos.push(`Pair with ${names} for sustained offense.`);
  }
  
  if (card.effect?.toLowerCase().includes('damage') && energyCards.length > 0) {
    const names = energyCards.slice(0, 2).map(c => c.name).join(', ');
    combos.push(`Combine with ${names} to fuel repeated attacks.`);
  }
  
  if (healthCards.length > 0 && card.effect?.toLowerCase().includes('tokyo')) {
    const names = healthCards.slice(0, 2).map(c => c.name).join(', ');
    combos.push(`Use ${names} to stay in Tokyo longer.`);
  }
  
  // Generic combo based on shared keywords
  if (combos.length === 0 && otherCards.length > 0) {
    const similarCards = otherCards.filter(c => {
      const cardWords = (card.name + ' ' + card.effect).toLowerCase().split(/\s+/);
      const otherWords = (c.name + ' ' + (c.effect || '')).toLowerCase().split(/\s+/);
      return cardWords.some(word => word.length > 4 && otherWords.includes(word));
    });
    
    if (similarCards.length > 0) {
      const names = similarCards.slice(0, 2).map(c => c.name).join(', ');
      return `Potential synergy with: ${names}`;
    }
  }
  
  return combos.length > 0 ? combos.join(' ') : 'Explore different combinations to discover synergies!';
}
