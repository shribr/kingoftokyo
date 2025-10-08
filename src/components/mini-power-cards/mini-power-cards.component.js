/**
 * Mini Power Cards Component
 * Compact power card display for mobile UI
 * Shows active player's power cards along bottom of screen (Catan-style)
 */
import { store } from '../../bootstrap/index.js';
import { uiCardDetailOpen, uiPlayerPowerCardsOpen } from '../../core/actions.js';
import { buildBaseCatalog } from '../../domain/cards.js';

// Build catalog once at module load
const CARD_CATALOG = buildBaseCatalog();

export function build({ selector }) {
  const container = document.createElement('div');
  container.className = 'cmp-mini-power-cards';
  container.setAttribute('data-mini-power-cards', 'true');
  
  const sync = () => {
    const st = store.getState();
    const activePlayerId = st.activePlayer;
    const players = st.players || {};
    
    // Handle both array and object formats
    const playerArray = Array.isArray(players) 
      ? players 
      : (players.allIds || players.order || []).map(id => players.byId?.[id] || players[id]).filter(Boolean);
    
    const activePlayer = playerArray.find(p => p && p.id === activePlayerId);
    
    // Check for cards - players have a 'cards' property (array of card IDs)
    if (!activePlayer || !activePlayer.cards || activePlayer.cards.length === 0) {
      container.innerHTML = '<div class="mpc-empty-state">No Power Cards</div>';
      return;
    }
    
    // Render mini power cards
    container.innerHTML = '';
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'mpc-cards-container';
    
    activePlayer.cards.forEach((cardId, index) => {
      const miniCard = createMiniPowerCard(cardId, index, activePlayer.id);
      cardsContainer.appendChild(miniCard);
    });
    
    container.appendChild(cardsContainer);
  };
  
  // Subscribe to state changes
  store.subscribe(sync);
  sync();
  
  return { root: container, update: sync };
}

function createMiniPowerCard(cardId, index, playerId) {
  const cardEl = document.createElement('div');
  cardEl.className = 'mini-power-card';
  cardEl.setAttribute('data-card-index', index);
  cardEl.setAttribute('data-card-id', cardId);
  
  // Look up card in catalog
  const cardData = CARD_CATALOG.find(c => c.id === cardId);
  const cardName = cardData?.name || cardId;
  
  cardEl.innerHTML = `
    <div class="mpc-card-inner">
      <div class="mpc-card-name">${cardName}</div>
    </div>
  `;
  
  // Click to open player power cards modal
  cardEl.addEventListener('click', () => {
    store.dispatch(uiPlayerPowerCardsOpen(playerId));
  });
  
  return cardEl;
}

export function update() {
  // Component auto-syncs via store subscription
}
