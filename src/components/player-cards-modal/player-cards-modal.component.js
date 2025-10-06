/** player-power-cards-modal.component.js */
import { store } from '../../bootstrap/index.js';
import { selectUIPlayerPowerCards, selectPlayerById } from '../../core/selectors.js';
import { uiPlayerPowerCardsClose } from '../../core/actions.js';
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
    }
    // Clicking cards intentionally does nothing now (details already shown inline)
  });

  // Add draggability
  const frame = root.querySelector('[data-frame]');
  const header = root.querySelector('[data-header]');
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;

  header.addEventListener('mousedown', (e) => {
    if (e.target.matches('[data-action="close"]')) return;
    isDragging = true;
    initialX = e.clientX - (frame.offsetLeft || 0);
    initialY = e.clientY - (frame.offsetTop || 0);
    root.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;
    frame.style.left = `${currentX}px`;
    frame.style.top = `${currentY}px`;
    frame.style.transform = 'none';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      root.style.cursor = 'move';
    }
  });

  return { root, update: () => update(root), destroy: () => root.remove() };
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
  const body = root.querySelector('[data-body]');
  if (!player.cards.length) {
    body.innerHTML = `<div class="ppcm-empty">You currently have no power cards.<br/><span>Buy cards from the shop to gain special abilities.</span></div>`;
  } else {
    // Look up full card data from catalog by ID
    const cardsHtml = player.cards.map(cardRef => {
      // cardRef might be just an ID string, or an object with an 'id' property
      const cardId = typeof cardRef === 'string' ? cardRef : cardRef.id;
      
      // Look up the full card data from the catalog
      const fullCard = CARD_CATALOG.find(c => c.id === cardId);
      
      if (!fullCard) {
        console.warn('Card not found in catalog:', cardId, cardRef);
        return ''; // Skip cards not in catalog
      }
      
      return generatePowerCard(fullCard, { 
        playerEnergy: player.energy || 0, 
        showBuy: false,  // Don't show buy button for owned cards
        showFooter: true, // Keep footer to show cost badge at bottom
        infoButton: true // Show info button to see card details
      });
    }).filter(html => html).join(''); // Filter out empty strings
    
    body.innerHTML = `<div class="ppcm-cards-grid">${cardsHtml}</div>`;
  }
}
