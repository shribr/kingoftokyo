/**
 * Mini Player Card Component
 */
import { store } from '../../bootstrap/index.js';
import { selectMonsterById, selectActivePlayer } from '../../core/selectors.js';
import { uiPlayerPowerCardsOpen } from '../../core/actions.js';

export function build({ selector }) {
  const container = document.createElement('div');
  container.className = 'cmp-mini-player-cards';
  container.setAttribute('data-mini-cards-container', 'true');
  
  const sync = () => {
    const state = store.getState();
    const playerOrder = state.players?.order || [];
    const playersById = state.players?.byId || {};
    const playerArray = playerOrder.map(id => playersById[id]).filter(Boolean);
    const activePlayer = selectActivePlayer(state);
    const activePlayerId = activePlayer?.id;
    
    container.innerHTML = '';
    const positions = ['top-left', 'top-left-title', 'top-right-title', 'top-right', 'bottom-left', 'bottom-right'];
    
    for (let i = 0; i < 6; i++) {
      const player = playerArray[i];
      const position = positions[i];
      const card = createMiniCard(player, position, activePlayerId, i, state);
      container.appendChild(card);
    }
  };
  
  store.subscribe(sync);
  sync();
  return { root: container, update: sync };
}

export function update() {}

function createMiniCard(player, position, activePlayerId, slotIndex, state) {
  // Create a container for card + name label
  const container = document.createElement('div');
  container.className = 'mini-player-card-container mini-player-card-container--' + position;
  
  const card = document.createElement('div');
  card.className = 'mini-player-card mini-player-card--' + position;
  card.setAttribute('data-slot-index', slotIndex);
  
  // Create name label element
  const nameLabel = document.createElement('div');
  nameLabel.className = 'mini-player-card-name';
  
  if (player) {
    card.setAttribute('data-player-id', player.id);
    const isActive = activePlayerId === player.id;
    if (isActive) card.classList.add('mini-player-card--active');
    
    const cards = player.powerCards?.length || 0;
    const energy = player.energy || 0;
    const vp = player.victoryPoints || 0;
    const health = player.health || 0;
    const monster = selectMonsterById(state, player.monsterId);
    const monsterImage = monster?.image || 'images/characters/king_of_tokyo_gigazaur.png';
    
    // Add monster data attribute for CSS theming
    if (monster?.id) {
      card.setAttribute('data-monster', monster.id);
    }
    
    const playerName = player.name || 'P' + player.id;
    const isCPU = player.isCPU || false;
    
    card.innerHTML = 
      '<div class="mpc-card-inner" style="background: #000 !important">' +
        '<div class="mpc-profile" style="background-image: url(\'' + monsterImage + '\')"></div>' +
        '<div class="mpc-stats-bar">' +
          '<div class="mpc-stat"><span class="mpc-stat-icon">❤️</span><span class="mpc-stat-value">' + health + '</span></div>' +
          '<div class="mpc-stat"><span class="mpc-stat-icon">⚡</span><span class="mpc-stat-value">' + energy + '</span></div>' +
          '<div class="mpc-stat"><span class="mpc-stat-icon">⭐</span><span class="mpc-stat-value">' + vp + '</span></div>' +
          '<div class="mpc-stat"><span class="mpc-stat-icon">🃏</span><span class="mpc-stat-value">' + cards + '</span></div>' +
        '</div>' +
      '</div>';
    
    // Set player name in the external label with CPU indicator
    nameLabel.innerHTML = playerName + (isCPU ? ' <span class="cpu-label">(CPU)</span>' : '');
    nameLabel.classList.add('mini-player-card-name--active');
    
    // Create active indicator as separate element if player is active
    if (isActive) {
      const activeIndicator = document.createElement('div');
      activeIndicator.className = 'mpc-active-indicator';
      container.appendChild(activeIndicator);
    }
  } else {
    card.classList.add('mini-player-card--empty');
    card.innerHTML = 
      '<div class="mpc-card-inner">' +
        '<div class="mpc-profile"></div>' +
        '<div class="mpc-stats-bar">' +
          '<div class="mpc-stat"><span class="mpc-stat-icon">❤️</span><span class="mpc-stat-value">-</span></div>' +
          '<div class="mpc-stat"><span class="mpc-stat-icon">⚡</span><span class="mpc-stat-value">-</span></div>' +
          '<div class="mpc-stat"><span class="mpc-stat-icon">⭐</span><span class="mpc-stat-value">-</span></div>' +
          '<div class="mpc-stat"><span class="mpc-stat-icon">🃏</span><span class="mpc-stat-value">-</span></div>' +
        '</div>' +
      '</div>';
    
    // Set empty label
    nameLabel.textContent = 'Empty';
    nameLabel.classList.add('mini-player-card-name--empty');
  }
  
  // Assemble container with card and name
  container.appendChild(card);
  container.appendChild(nameLabel);
  
  // Add click handler to show player profile modal with owned power cards
  if (player && player.id) {
    const clickHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Dispatch action to open player power cards modal
      store.dispatch(uiPlayerPowerCardsOpen(player.id));
    };
    card.addEventListener('click', clickHandler);
    card.style.cursor = 'pointer';
  }
  
  return container;
}

function adjustBrightness(hexColor, percent) {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const newR = Math.max(0, Math.min(255, r + (r * percent / 100)));
  const newG = Math.max(0, Math.min(255, g + (g * percent / 100)));
  const newB = Math.max(0, Math.min(255, b + (b * percent / 100)));
  const toHex = (n) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + toHex(newR) + toHex(newG) + toHex(newB);
}
