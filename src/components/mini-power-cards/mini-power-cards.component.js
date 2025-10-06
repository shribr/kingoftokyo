/**
 * Mini Power Cards Component
 * Compact power card display for radial-menu mobile UI
 * Shows active player's power cards along bottom of screen (Catan-style)
 */
import { store } from '../../bootstrap/index.js';
import { eventBus } from '../../core/eventBus.js';

export function build({ selector }) {
  const container = document.createElement('div');
  container.className = 'cmp-mini-power-cards';
  container.setAttribute('data-mini-power-cards', 'true');
  
  const sync = () => {
    const st = store.getState();
    const activePlayerId = st.activePlayer;
    const players = st.players || [];
    const playerArray = Array.isArray(players) ? players : (players.allIds || []).map(id => players.byId?.[id]).filter(Boolean);
    
    const activePlayer = playerArray.find(p => p && p.id === activePlayerId);
    
    if (!activePlayer || !activePlayer.powerCards || activePlayer.powerCards.length === 0) {
      container.innerHTML = '<div class="mpc-empty-state">No Power Cards</div>';
      return;
    }
    
    // Render mini power cards
    container.innerHTML = '';
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'mpc-cards-container';
    
    activePlayer.powerCards.forEach((card, index) => {
      const miniCard = createMiniPowerCard(card, index);
      cardsContainer.appendChild(miniCard);
    });
    
    container.appendChild(cardsContainer);
  };
  
  // Subscribe to state changes
  store.subscribe(sync);
  sync();
  
  return { root: container, update: sync };
}

function createMiniPowerCard(card, index) {
  const cardEl = document.createElement('div');
  cardEl.className = 'mini-power-card';
  cardEl.setAttribute('data-card-index', index);
  cardEl.setAttribute('data-card-type', card.type || 'keep');
  
  // Determine card color/theme based on type
  const cardTheme = getCardTheme(card);
  
  // Get card cost and effects
  const cost = card.cost || 0;
  const hasVP = card.effects?.some(e => e.type === 'victory_points');
  const hasEnergy = card.effects?.some(e => e.type === 'energy');
  const hasAttack = card.effects?.some(e => e.type === 'damage' || e.type === 'attack');
  const hasHealing = card.effects?.some(e => e.type === 'heal');
  
  cardEl.innerHTML = `
    <div class="mpc-card-inner" style="background: ${cardTheme.bg}; border-color: ${cardTheme.border}">
      <div class="mpc-card-cost">${cost}</div>
      <div class="mpc-card-name">${card.name}</div>
      <div class="mpc-card-icons">
        ${hasVP ? '<span title="Victory Points">⭐</span>' : ''}
        ${hasEnergy ? '<span title="Energy">⚡</span>' : ''}
        ${hasAttack ? '<span title="Attack">⚔️</span>' : ''}
        ${hasHealing ? '<span title="Healing">❤️</span>' : ''}
      </div>
    </div>
  `;
  
  // Click to show full card modal
  cardEl.addEventListener('click', () => {
    showPowerCardModal(card);
  });
  
  return cardEl;
}

function getCardTheme(card) {
  const type = card.type || 'keep';
  
  const themes = {
    keep: {
      bg: 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)',
      border: '#357abd'
    },
    discard: {
      bg: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
      border: '#c0392b'
    },
    evolution: {
      bg: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
      border: '#8e44ad'
    }
  };
  
  return themes[type] || themes.keep;
}

function showPowerCardModal(card) {
  eventBus.emit('showPowerCardDetail', { card });
}

export function update() {
  // Component auto-syncs via store subscription
}
