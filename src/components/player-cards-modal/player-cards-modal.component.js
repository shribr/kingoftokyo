/** player-power-cards-modal.component.js */
import { store } from '../../bootstrap/index.js';
import { selectUIPlayerPowerCards, selectPlayerById } from '../../core/selectors.js';
import { uiPlayerPowerCardsClose, uiCardDetailOpen } from '../../core/actions.js';
import { generatePowerCard } from '../power-cards/power-card-generator.js';
import { buildBaseCatalog } from '../../domain/cards.js';

// Build catalog once at module load
const CARD_CATALOG = buildBaseCatalog();

export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' player-power-cards-modal hidden';
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
    
    // Backdrop click to close
    if (e.target === root) {
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

  // Function to check if we're on mobile
  const isMobile = () => {
    return window.innerWidth <= 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  };

  header.addEventListener('mousedown', (e) => {
    // Skip dragging on mobile devices
    if (isMobile()) return;
    if (e.target.matches('[data-action="close"]')) return;
    isDragging = true;
    initialX = e.clientX - (frame.offsetLeft || 0);
    initialY = e.clientY - (frame.offsetTop || 0);
    root.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging || isMobile()) return;
    e.preventDefault();
    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;
    frame.style.left = `${currentX}px`;
    frame.style.top = `${currentY}px`;
    frame.style.transform = 'none';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging && !isMobile()) {
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
  
  if (!player.cards.length) {
    body.innerHTML = `<div class="ppcm-empty">You currently have no power cards.<br/><span>Buy cards from the shop to gain special abilities.</span></div>`;
  } else {
    // Look up full card data from catalog by ID
    const fullCards = player.cards.map(cardRef => {
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
      </div>
    `;
    
    // Initialize carousel functionality
    initializeCarousel(root, fullCards, player.energy || 0);
  }
}

function initializeCarousel(root, cards, playerEnergy) {
  if (!cards.length) return;
  
  let currentIndex = 0;
  const carousel = root.querySelector('[data-carousel]');
  const cardContainer = root.querySelector('[data-carousel-card]');
  const counter = root.querySelector('[data-card-counter]');
  const prevBtn = root.querySelector('[data-carousel-prev]');
  const nextBtn = root.querySelector('[data-carousel-next]');
  
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
