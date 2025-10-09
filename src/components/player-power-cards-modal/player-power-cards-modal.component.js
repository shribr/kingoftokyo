/** player-power-cards-modal.component.js */
import { store } from '../../bootstrap/index.js';
import { selectUIPlayerPowerCards, selectPlayerById } from '../../core/selectors.js';
import { uiPlayerPowerCardsClose, uiCardDetailOpen } from '../../core/actions.js';
import { generatePowerCard } from '../power-cards/power-card-generator.js';
import { buildBaseCatalog } from '../../domain/cards.js';

// Build catalog once at module load
const CARD_CATALOG = buildBaseCatalog();

// Simple mobile check for disabling drag on touch devices
const isMobileDevice = () => {
  return window.innerWidth <= 1024 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export function build({ selector }) {
  const root = document.createElement('div');
  // Always use mobile class since it works for both desktop and mobile
  root.className = 'cmp-player-power-cards-modal-mobile hidden';
  
  console.log('[PlayerPowerCardsModal] BUILD - Creating modal element');
  console.log('[PlayerPowerCardsModal] BUILD - Initial className:', root.className);
  console.log('[PlayerPowerCardsModal] BUILD - isMobileDevice:', isMobileDevice());
  
  // Note: mountPoint is set to "body" in components.config.json, so mountRoot will append this to body
  // We don't need to manually append here
  
  root.innerHTML = `<div class="ppcm-frame" data-frame>
    <div class="ppcm-header" data-header>
      <h2 data-player-name></h2>
      <button data-action="close" aria-label="Close">×</button>
    </div>
    <div class="ppcm-body" data-body></div>
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

  // Initial update
  update(root);

  console.log('[PlayerPowerCardsModal] BUILD - Component built, returning instance');
  console.log('[PlayerPowerCardsModal] BUILD - Root element parent:', root.parentElement?.tagName || 'NONE');
  console.log('[PlayerPowerCardsModal] BUILD - Root element classes:', root.className);

  return { 
    root, 
    update: (props) => {
      console.log('[PlayerPowerCardsModal] UPDATE WRAPPER - Called with props:', props);
      console.log('[PlayerPowerCardsModal] UPDATE WRAPPER - Root parent:', root.parentElement?.tagName || 'NONE');
      console.log('[PlayerPowerCardsModal] UPDATE WRAPPER - Root classes before:', root.className);
      update(root);
      console.log('[PlayerPowerCardsModal] UPDATE WRAPPER - Root classes after:', root.className);
    }, 
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
  
  console.log('[PlayerPowerCardsModal] UPDATE - Called');
  console.log('[PlayerPowerCardsModal] UPDATE - Root element:', root);
  console.log('[PlayerPowerCardsModal] UPDATE - Root parent:', root.parentElement?.tagName || 'NONE');
  console.log('[PlayerPowerCardsModal] UPDATE - Root classes:', root.className);
  console.log('[PlayerPowerCardsModal] UPDATE - UI state:', ui);
  console.log('[PlayerPowerCardsModal] UPDATE - Computed style display:', window.getComputedStyle(root).display);
  console.log('[PlayerPowerCardsModal] UPDATE - Computed style visibility:', window.getComputedStyle(root).visibility);
  console.log('[PlayerPowerCardsModal] UPDATE - Computed style position:', window.getComputedStyle(root).position);
  
  if (!ui || !ui.playerId) {
    console.log('[PlayerPowerCardsModal] UPDATE - No UI state or playerId, hiding modal');
    root.classList.add('hidden');
    return;
  }
  const player = selectPlayerById(state, ui.playerId);
  console.log('[PlayerPowerCardsModal] UPDATE - Player found:', player);
  
  if (!player) {
    console.log('[PlayerPowerCardsModal] UPDATE - Player not found, hiding modal');
    root.classList.add('hidden');
    return;
  }
  root.classList.remove('hidden');
  console.log('[PlayerPowerCardsModal] UPDATE - Modal shown for player:', player.name);
  console.log('[PlayerPowerCardsModal] UPDATE - After removing hidden - classes:', root.className);
  console.log('[PlayerPowerCardsModal] UPDATE - After removing hidden - display:', window.getComputedStyle(root).display);
  root.querySelector('[data-player-name]').textContent = `${player.name}'s Power Cards`.toUpperCase();
  
  // Reset frame position to ensure proper centering
  const frame = root.querySelector('[data-frame]');
  if (frame) {
    frame.style.left = '';
    frame.style.top = '';
    frame.style.transform = '';
  }
  
  const body = root.querySelector('[data-body]');
  
  // Debug: Log player's power cards
  console.log('[PlayerPowerCardsModal] Player:', player.name);
  console.log('[PlayerPowerCardsModal] PowerCards:', player.powerCards);
  console.log('[PlayerPowerCardsModal] PowerCards type:', typeof player.powerCards);
  console.log('[PlayerPowerCardsModal] PowerCards length:', player.powerCards?.length);
  
  if (!player.powerCards || !player.powerCards.length) {
    // Show empty state with structure
    const isMobile = isMobileDevice();
    if (isMobile) {
      body.innerHTML = `
        <div class="ppcm-carousel" data-carousel>
          <div class="ppcm-empty">You currently have no power cards.<br/><span>Buy cards from the shop to gain special abilities.</span></div>
          <div class="ppcm-card-info-panel">
            <div class="ppcm-strategy-section">
              <h3>💡 STRATEGY</h3>
              <p class="ppcm-strategy-text">No cards yet. Visit the shop to buy power cards!</p>
            </div>
            <div class="ppcm-combo-section">
              <h3>🔗 COMBO TIPS</h3>
              <p class="ppcm-combo-text">Combos will appear when you own multiple cards.</p>
            </div>
          </div>
        </div>
      `;
    } else {
      body.innerHTML = `<div class="ppcm-empty">You currently have no power cards.<br/><span>Buy cards from the shop to gain special abilities.</span></div>`;
    }
  } else {
    // Look up full card data from catalog by ID
    const fullCards = player.powerCards.map((cardRef) => {
      const cardId = typeof cardRef === 'string' ? cardRef : cardRef.id;
      return CARD_CATALOG.find(c => c.id === cardId);
    }).filter(Boolean);
    
    console.log('[PlayerPowerCardsModal] Full cards found:', fullCards.length, fullCards.map(c => c.name));
    
    // Helper to generate strategy text
    const getStrategyText = (card) => {
      if (card.strategy) return card.strategy;
      if (card.type === 'keep') return 'Keep this card for ongoing benefits throughout the game.';
      if (card.type === 'discard') return 'Use this card for an immediate powerful effect, then discard.';
      return 'Use strategically to maximize your advantage.';
    };
    
    // Helper to generate combo text
    const getCombosText = (card, allCards) => {
      if (card.combos) return card.combos;
      
      // Generate basic combo suggestions based on owned cards
      const cardTypes = allCards.map(c => c.type);
      if (cardTypes.filter(t => t === 'keep').length > 2) {
        return 'Combine with other Keep cards for stacking bonuses.';
      }
      return 'Synergizes well with victory point and energy generation cards.';
    };
    
    // Generate HTML for grid view (desktop) - with strategy/combo sections
    const cardsHtml = fullCards.map(fullCard => {
      const cardHtml = generatePowerCard(fullCard, { 
        playerEnergy: player.energy || 0, 
        showBuy: false,
        showFooter: false,
        infoButton: false
      });
      
      // For desktop grid, inject strategy/combo sections into the card HTML
      // The card HTML ends with closing </div>, so we insert before that
      const cardWithSections = cardHtml.replace(
        /<\/div>\s*$/,
        `<div class="ppcm-card-strategy">
          <h4>💡 Strategy</h4>
          <p>${getStrategyText(fullCard)}</p>
        </div>
        <div class="ppcm-card-combos">
          <h4>🔗 Combos</h4>
          <p>${getCombosText(fullCard, fullCards)}</p>
        </div>
      </div>`
      );
      
      return cardWithSections;
    }).join('');
    
    console.log('[PlayerPowerCardsModal] Total cards HTML length:', cardsHtml.length);
    
    // Create both grid and carousel views
    body.innerHTML = `
      <div class="ppcm-cards-grid">${cardsHtml}</div>
      <div class="ppcm-carousel" data-carousel>
        <div class="ppcm-carousel-card" data-carousel-card></div>
        <div class="ppcm-carousel-controls">
          <button class="ppcm-carousel-btn ppcm-carousel-prev" data-carousel-prev aria-label="Previous card">‹</button>
          <div class="ppcm-card-counter" data-card-counter>1 of ${fullCards.length}</div>
          <button class="ppcm-carousel-btn ppcm-carousel-next" data-carousel-next aria-label="Next card">›</button>
        </div>
        <div class="ppcm-tabs">
          <button class="ppcm-tab ppcm-tab-active" data-tab="strategy">💡 Strategy</button>
          <button class="ppcm-tab" data-tab="combos">🔗 Combos</button>
        </div>
        <div class="ppcm-tab-content">
          <div class="ppcm-tab-panel ppcm-tab-panel-active" data-panel="strategy">
            <p class="ppcm-strategy-text" data-strategy-text></p>
          </div>
          <div class="ppcm-tab-panel" data-panel="combos">
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
  
  // Tab functionality
  const tabs = root.querySelectorAll('.ppcm-tab');
  const panels = root.querySelectorAll('.ppcm-tab-panel');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetPanel = tab.dataset.tab;
      
      // Update active tab
      tabs.forEach(t => t.classList.remove('ppcm-tab-active'));
      tab.classList.add('ppcm-tab-active');
      
      // Update active panel
      panels.forEach(p => p.classList.remove('ppcm-tab-panel-active'));
      root.querySelector(`[data-panel="${targetPanel}"]`).classList.add('ppcm-tab-panel-active');
    });
  });
  
  function updateCarousel() {
    // Generate HTML for current card
    const currentCard = cards[currentIndex];
    const cardHtml = generatePowerCard(currentCard, { 
      playerEnergy, 
      showBuy: false,
      showFooter: false,
      infoButton: false
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
    c.effect?.kind === 'energy' ||
    c.description?.toLowerCase().includes('energy')
  );
  
  const attackCards = otherCards.filter(c => 
    c.name?.toUpperCase().includes('ATTACK') || 
    c.name?.toUpperCase().includes('CLAW') ||
    c.effect?.kind === 'damage' ||
    c.description?.toLowerCase().includes('damage')
  );
  
  const healthCards = otherCards.filter(c => 
    c.name?.toUpperCase().includes('HEALTH') || 
    c.name?.toUpperCase().includes('HEAL') ||
    c.effect?.kind === 'heal' ||
    c.description?.toLowerCase().includes('heal')
  );
  
  // Generate combo suggestions
  const combos = [];
  
  if (card.name?.includes('ENERGY') && attackCards.length > 0) {
    const names = attackCards.slice(0, 2).map(c => c.name).join(', ');
    combos.push(`Pair with ${names} for sustained offense.`);
  }
  
  if ((card.effect?.kind === 'damage' || card.description?.toLowerCase().includes('damage')) && energyCards.length > 0) {
    const names = energyCards.slice(0, 2).map(c => c.name).join(', ');
    combos.push(`Combine with ${names} to fuel repeated attacks.`);
  }
  
  if (healthCards.length > 0 && (card.effect?.kind === 'tokyo' || card.description?.toLowerCase().includes('tokyo'))) {
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
