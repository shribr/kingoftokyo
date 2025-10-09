/**
 * Mini Power Cards Collection Component
 * A mobile-optimized modal for viewing a player's owned power cards in carousel format
 */
import { store } from '../../bootstrap/index.js';
import { selectPlayerById, selectMonsterById } from '../../core/selectors.js';
import { uiPlayerPowerCardsClose, uiPlayerPowerCardsOpen } from '../../core/actions.js';
import { buildBaseCatalog } from '../../domain/cards.js';

// Build catalog once at module load
const CARD_CATALOG = buildBaseCatalog();

export function build({ selector }) {
  // Clean up any leftover backdrop from previous session
  const existingBackdrop = document.querySelector('#mini-power-cards-backdrop');
  if (existingBackdrop) {
    console.log('[MiniPowerCardsCollection] Removing existing backdrop on build');
    existingBackdrop.remove();
  }
  
  // Clean up any leftover modal from previous session
  const existingModal = document.querySelector('#mini-power-cards-modal');
  if (existingModal) {
    console.log('[MiniPowerCardsCollection] Removing existing modal on build');
    existingModal.remove();
  }
  
  // BACKDROP DISABLED FOR NOW - will re-enable once modal is working properly
  // Create backdrop separately
  // const backdrop = document.createElement('div');
  // backdrop.className = 'mpcc-backdrop hidden';
  // backdrop.id = 'mini-power-cards-backdrop';
  // document.body.appendChild(backdrop);
  
  // Create modal container
  const root = document.createElement('div');
  root.className = 'cmp-mini-power-cards-collection hidden';
  root.id = 'mini-power-cards-modal';
  
  // Append directly to body to ensure it's on top of everything
  document.body.appendChild(root);
  
  // console.log('[MiniPowerCardsCollection] Component built and appended to body'); // DISABLED - init logging
  
  root.innerHTML = `
    <div class="mpcc-modal">
      <div class="mpcc-header">
        <h2 class="mpcc-title" data-title></h2>
        <button class="mpcc-close" data-action="close" aria-label="Close">×</button>
      </div>
      <div class="mpcc-content">
        <div class="mpcc-card-display">
          <div class="mpcc-card-container" data-card-container>
            <!-- Card will be inserted here -->
          </div>
        </div>
        <div class="mpcc-info-panel">
          <div class="mpcc-strategy">
            <h3>STRATEGY</h3>
            <p class="mpcc-strategy-text" data-strategy-text></p>
          </div>
          <div class="mpcc-combo-tips">
            <h3>💡 COMBO TIPS</h3>
            <p class="mpcc-combo-text" data-combo-text></p>
          </div>
        </div>
        <div class="mpcc-navigation">
          <button class="mpcc-nav-btn mpcc-prev" data-nav="prev" aria-label="Previous card">‹</button>
          <div class="mpcc-counter" data-counter></div>
          <button class="mpcc-nav-btn mpcc-next" data-nav="next" aria-label="Next card">›</button>
        </div>
      </div>
    </div>
  `;

  let currentPlayer = null;
  let currentCards = [];
  let currentIndex = 0;

  // BACKDROP EVENT HANDLERS DISABLED - backdrop is disabled for now
  // Event handlers on backdrop
  // backdrop.addEventListener('click', () => {
  //   close();
  // });
  
  // Event handlers on modal
  root.addEventListener('click', (e) => {
    if (e.target.matches('[data-action="close"]')) {
      close();
      return;
    }

    if (e.target.matches('[data-nav="prev"]')) {
      navigateCard(-1);
      return;
    }

    if (e.target.matches('[data-nav="next"]')) {
      navigateCard(1);
      return;
    }
  });

  // Touch/swipe support
  let startX = 0;
  let startY = 0;
  const cardContainer = root.querySelector('[data-card-container]');

  cardContainer.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  cardContainer.addEventListener('touchend', (e) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = startX - endX;
    const diffY = startY - endY;

    // Only handle horizontal swipes (minimum 50px distance)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0 && currentIndex < currentCards.length - 1) {
        // Swipe left - next card
        navigateCard(1);
      } else if (diffX < 0 && currentIndex > 0) {
        // Swipe right - previous card
        navigateCard(-1);
      }
    }
  }, { passive: true });

  function close() {
    root.classList.add('hidden');
    // backdrop.classList.add('hidden'); // BACKDROP DISABLED
    currentPlayer = null;
    currentCards = [];
    currentIndex = 0;
    store.dispatch(uiPlayerPowerCardsClose());
  }

  function navigateCard(direction) {
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < currentCards.length) {
      currentIndex = newIndex;
      renderCurrentCard();
    }
  }

  function renderCurrentCard() {
    if (!currentCards.length) {
      renderEmptyState();
      return;
    }

    const card = currentCards[currentIndex];
    const cardContainer = root.querySelector('[data-card-container]');
    const counter = root.querySelector('[data-counter]');
    const strategyText = root.querySelector('[data-strategy-text]');
    const comboText = root.querySelector('[data-combo-text]');
    const prevBtn = root.querySelector('[data-nav="prev"]');
    const nextBtn = root.querySelector('[data-nav="next"]');

    // Render the power card
    cardContainer.innerHTML = '';
    const cardElement = createPowerCardElement(card);
    cardContainer.appendChild(cardElement);

    // Update counter
    counter.textContent = `${currentIndex + 1} of ${currentCards.length}`;

    // Update navigation buttons
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === currentCards.length - 1;

    // Update strategy and combo tips
    updateCardInfo(card);
  }

  function renderEmptyState() {
    const cardContainer = root.querySelector('[data-card-container]');
    const counter = root.querySelector('[data-counter]');
    const strategyText = root.querySelector('[data-strategy-text]');
    const comboText = root.querySelector('[data-combo-text]');

    cardContainer.innerHTML = '<div class="mpcc-empty">No Power Cards</div>';
    counter.textContent = '0 of 0';
    strategyText.textContent = 'This player has no power cards yet.';
    comboText.textContent = 'Power cards will appear here as they are purchased.';
  }

  function createPowerCardElement(card) {
    const cardDef = CARD_CATALOG[card.id];
    if (!cardDef) {
      return document.createElement('div');
    }

    const element = document.createElement('div');
    element.className = 'mpcc-power-card';
    
    element.innerHTML = `
      <div class="mpcc-card-header">
        <div class="mpcc-card-name">${cardDef.name}</div>
        <div class="mpcc-card-cost">${cardDef.cost}⚡</div>
      </div>
      <div class="mpcc-card-body">
        <div class="mpcc-card-text">${cardDef.description || cardDef.effect || 'No description available.'}</div>
      </div>
    `;

    return element;
  }

  function updateCardInfo(card) {
    const cardDef = CARD_CATALOG[card.id];
    const strategyText = root.querySelector('[data-strategy-text]');
    const comboText = root.querySelector('[data-combo-text]');

    if (!cardDef) {
      strategyText.textContent = 'Card information not available.';
      comboText.textContent = 'No combo information available.';
      return;
    }

    // Generate strategy text based on card properties
    let strategy = generateStrategyText(cardDef);
    strategyText.textContent = strategy;

    // Generate combo tips based on card synergies
    let comboTips = generateComboTips(cardDef, currentCards);
    comboText.textContent = comboTips;
  }

  function generateStrategyText(cardDef) {
    // Generate contextual strategy based on card type and effects
    if (cardDef.name === 'SKYSCRAPER') {
      return 'Evaluate timing: buy when its effect aligns with your immediate plan (heuristic generated).';
    }

    // Default strategy generation based on card properties
    if (cardDef.cost <= 3) {
      return 'Low-cost card: Consider early purchase for immediate benefit and board presence.';
    } else if (cardDef.cost <= 6) {
      return 'Mid-cost card: Evaluate timing based on current game state and energy availability.';
    } else {
      return 'High-cost card: Save for late game when you have abundant energy and need powerful effects.';
    }
  }

  function generateComboTips(cardDef, allCards) {
    if (!allCards.length || allCards.length === 1) {
      return 'No obvious combos found with available cards.';
    }

    // Look for synergies between this card and other owned cards
    const otherCards = allCards.filter(c => c.id !== cardDef.id);
    
    // Simple combo detection based on card names/types
    const comboCards = otherCards.filter(c => {
      const otherDef = CARD_CATALOG[c.id];
      return otherDef && (
        otherDef.name.includes('ENERGY') || 
        otherDef.name.includes('ATTACK') || 
        otherDef.name.includes('HEALTH')
      );
    });

    if (comboCards.length > 0) {
      const comboNames = comboCards.map(c => CARD_CATALOG[c.id]?.name).join(', ');
      return `Potential synergy with: ${comboNames}`;
    }

    return 'No obvious combos found with available cards.';
  }

  function show(playerId) {
    if (window.__KOT_DEBUG__?.logModals) {
      console.log('[MiniPowerCardsCollection] Show called for player:', playerId);
    }
    
    // Dispatch action to update Redux state
    store.dispatch(uiPlayerPowerCardsOpen(playerId));
    
    const state = store.getState();
    const player = selectPlayerById(state, playerId);
    
    if (!player) {
      console.warn('[MiniPowerCardsCollection] Player not found:', playerId);
      return;
    }

    if (window.__KOT_DEBUG__?.logModals) {
      console.log('[MiniPowerCardsCollection] Player found:', player.name, 'with', player.powerCards?.length || 0, 'power cards');
    }

    const monster = selectMonsterById(state, player.monsterId);
    currentPlayer = player;
    currentCards = player.powerCards || [];
    currentIndex = 0;

    // Update title
    const title = root.querySelector('[data-title]');
    title.textContent = `${monster?.name?.toUpperCase() || 'UNKNOWN'}'S POWER CARDS`;

    if (window.__KOT_DEBUG__?.logModals) {
      console.log('[MiniPowerCardsCollection] Showing modal with title:', title.textContent);
      console.log('[MiniPowerCardsCollection] Before show - root classes:', root.className);
    }
    
    // backdrop.classList.remove('hidden'); // BACKDROP DISABLED
    root.classList.remove('hidden');
    
    if (window.__KOT_DEBUG__?.logModals) {
      console.log('[MiniPowerCardsCollection] After show - root classes:', root.className);
    }

    // Render first card
    renderCurrentCard();
  }

  function update() {
    const state = store.getState();
    const uiState = state.ui?.playerPowerCards;
    
    // Check if we're on mobile
    const isMobile = window.innerWidth <= 1024 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (uiState?.playerId && isMobile) {
      // Show mobile wallet when Redux action is dispatched on mobile
      if (root.classList.contains('hidden')) {
        show(uiState.playerId);
      } else {
        // Update current player data if modal is already open
        const player = selectPlayerById(state, uiState.playerId);
        if (player) {
          currentPlayer = player;
          currentCards = player.powerCards || [];
          
          // Ensure current index is still valid
          if (currentIndex >= currentCards.length) {
            currentIndex = Math.max(0, currentCards.length - 1);
          }
          
          renderCurrentCard();
        }
      }
    } else if (!uiState?.playerId) {
      // Close modal if no player selected
      root.classList.add('hidden');
      // backdrop.classList.add('hidden'); // BACKDROP DISABLED
    }
  }

  // Subscribe to store updates
  store.subscribe(update);
  
  // Ensure modal is hidden on initialization (backdrop disabled)
  root.classList.add('hidden');
  // backdrop.classList.add('hidden'); // BACKDROP DISABLED
  console.log('[MiniPowerCardsCollection] Initial state set - modal hidden');

  // Store instance reference on DOM element for external access
  const instance = { 
    root, 
    update,
    show // Expose show method for external use
  };
  
  root._componentInstance = instance;
  
  console.log('[MiniPowerCardsCollection] Component built and instance stored');

  return instance;
}