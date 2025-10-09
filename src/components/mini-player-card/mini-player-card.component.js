/**
 * Mini Player Card Component
 */
import { store } from '../../bootstrap/index.js';
import { selectMonsterById, selectActivePlayer } from '../../core/selectors.js';
import { uiPlayerPowerCardsOpen } from '../../core/actions.js';

/**
 * Check which scenario categories affect a player
 * Returns object with boolean flags and arrays of scenario names
 */
function getPlayerScenarioCategories(state, playerId) {
  const result = {
    hasHealth: false,
    hasEnergy: false,
    hasVP: false,
    hasCards: false,
    healthScenarios: [],
    energyScenarios: [],
    vpScenarios: [],
    cardsScenarios: []
  };
  
  try {
    const assignments = state.settings?.scenarioConfig?.assignments || [];
    
    // DEBUG: Log scenario assignment data
    if (window.__KOT_DEBUG__?.logComponentUpdates && assignments.length) {
      console.log('[MiniPlayerCard] Scenario assignments found:', assignments);
    }
    
    if (!assignments.length) return result;
    
    // Get player info
    const order = state.players?.order || [];
    const byId = state.players?.byId || {};
    const player = byId[playerId];
    if (!player) return result;
    
    const humanId = order.find(pid => !byId[pid]?.isCPU);
    const cpuIds = order.filter(pid => byId[pid]?.isCPU);
    const isCPU = player.isCPU || player.isAi || player.type === 'ai';
    
    // Simple scenario definitions (health/energy/vp/cards effects)
    const scenarioEffects = {
      'energy-hoarder': { energy: true },
      'glass-cannon': { health: true, energy: true },
      'fortified': { health: true },
      'point-rush': { vp: true },
      'collector': { cards: true }
    };
    
    // Collect all scenario IDs that apply to this player
    for (const assignment of assignments) {
      const mode = assignment.mode || 'HUMAN';
      const cpuCount = assignment.cpuCount || 0;
      
      let isTargeted = false;
      if (mode === 'HUMAN' && playerId === humanId) isTargeted = true;
      if (mode === 'CPUS' && isCPU) {
        const cpuIndex = cpuIds.indexOf(playerId);
        if (cpuIndex !== -1 && cpuIndex < cpuCount) isTargeted = true;
      }
      if (mode === 'BOTH') {
        if (playerId === humanId) isTargeted = true;
        if (isCPU) {
          const cpuIndex = cpuIds.indexOf(playerId);
          if (cpuIndex !== -1 && cpuIndex < cpuCount) isTargeted = true;
        }
      }
      
      if (isTargeted && assignment.scenarioIds) {
        for (const scId of assignment.scenarioIds) {
          const effects = scenarioEffects[scId] || {};
          const scName = scId.replace(/-/g, ' ').toUpperCase();
          
          if (effects.health) {
            result.hasHealth = true;
            result.healthScenarios.push(scName);
          }
          if (effects.energy) {
            result.hasEnergy = true;
            result.energyScenarios.push(scName);
          }
          if (effects.vp) {
            result.hasVP = true;
            result.vpScenarios.push(scName);
          }
          if (effects.cards) {
            result.hasCards = true;
            result.cardsScenarios.push(scName);
          }
        }
      }
    }
  } catch (error) {
    console.warn('[MiniPlayerCard] Error checking scenarios:', error);
  }
  
  return result;
}

export function build({ selector }) {
  const container = document.createElement('div');
  container.className = 'cmp-mini-player-cards';
  container.setAttribute('data-mini-cards-container', 'true');
  
  const sync = () => {
    const state = store.getState();
    
    // Guard: Don't sync if players haven't been initialized yet
    if (!state.players || !state.players.order || !state.players.byId) {
      return;
    }
    
    const playerOrder = state.players.order || [];
    const playersById = state.players.byId || {};
    const playerArray = playerOrder.map(id => playersById[id]).filter(Boolean);
    
    // Safe active player lookup
    let activePlayerId = null;
    try {
      const activePlayer = selectActivePlayer(state);
      activePlayerId = activePlayer?.id;
    } catch (e) {
      // selectActivePlayer can fail if state isn't fully initialized
      console.warn('[MiniPlayerCard] Could not get active player in sync:', e);
    }
    
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

export function update(state) {
  // Re-render all cards when state changes
  const container = document.querySelector('.cmp-mini-player-cards');
  if (!container) return;
  
  // Guard: Don't update if players haven't been initialized yet
  if (!state.players || !state.players.order || !state.players.byId) {
    return;
  }
  
  const playerOrder = state.players.order || [];
  const playersById = state.players.byId || {};
  const playerArray = playerOrder.map(id => playersById[id]).filter(Boolean);
  
  // Safe active player lookup
  let activePlayerId = null;
  try {
    const activePlayer = selectActivePlayer(state);
    activePlayerId = activePlayer?.id;
  } catch (e) {
    // selectActivePlayer can fail if state isn't fully initialized
    console.warn('[MiniPlayerCard] Could not get active player:', e);
  }
  
  container.innerHTML = '';
  const positions = ['top-left', 'top-left-title', 'top-right-title', 'top-right', 'bottom-left', 'bottom-right'];
  
  for (let i = 0; i < 6; i++) {
    const player = playerArray[i];
    const position = positions[i];
    const card = createMiniCard(player, position, activePlayerId, i, state);
    container.appendChild(card);
  }
}

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
    
    // Check for scenario indicators
    const scenarioCategories = getPlayerScenarioCategories(state, player.id);
    
    // DEBUG: Log scenario detection
    if (window.__KOT_DEBUG__?.logComponentUpdates) {
      console.log('[MiniPlayerCard] Scenario check for', playerName, scenarioCategories);
    }
    
    // Build scenario indicator HTML (red asterisks)
    const healthIndicator = scenarioCategories.hasHealth ? '<span class="mpc-scenario-indicator" title="Scenario affects Health">*</span>' : '';
    const energyIndicator = scenarioCategories.hasEnergy ? '<span class="mpc-scenario-indicator" title="Scenario affects Energy">*</span>' : '';
    const vpIndicator = scenarioCategories.hasVP ? '<span class="mpc-scenario-indicator" title="Scenario affects VP">*</span>' : '';
    const cardsIndicator = scenarioCategories.hasCards ? '<span class="mpc-scenario-indicator" title="Scenario affects Cards">*</span>' : '';
    
    card.innerHTML = 
      '<div class="mpc-card-inner" style="background: #000 !important">' +
        '<div class="mpc-profile" style="background-image: url(\'' + monsterImage + '\')"></div>' +
        '<div class="mpc-stats-bar">' +
          '<div class="mpc-stat"><span class="mpc-stat-icon">❤️</span><span class="mpc-stat-value">' + health + '</span>' + healthIndicator + '</div>' +
          '<div class="mpc-stat"><span class="mpc-stat-icon">⚡</span><span class="mpc-stat-value">' + energy + '</span>' + energyIndicator + '</div>' +
          '<div class="mpc-stat"><span class="mpc-stat-icon">⭐</span><span class="mpc-stat-value">' + vp + '</span>' + vpIndicator + '</div>' +
          '<div class="mpc-stat"><span class="mpc-stat-icon">🃏</span><span class="mpc-stat-value">' + cards + '</span>' + cardsIndicator + '</div>' +
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
  
  // Add click handler to show mobile power cards wallet
  if (player && player.id) {
    // Add data attribute to prevent monsters panel mobile slide behavior
    card.setAttribute('data-ignore-flip', 'true');
    container.setAttribute('data-ignore-flip', 'true');
    
    const clickHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation(); // Stop all event propagation
      
      console.log('[MiniPlayerCard] Click detected for player:', player.id, player.name);
      
      // Close any expanded monsters panel cards first
      const expandedCards = document.querySelectorAll('.cmp-player-profile-card[data-expanded="true"]');
      expandedCards.forEach(card => card.removeAttribute('data-expanded'));
      
      // Hide monsters panel backdrop if visible
      const mpBackdrop = document.querySelector('.mp-mobile-backdrop');
      if (mpBackdrop) {
        mpBackdrop.classList.remove('visible');
      }
      
      // Use the unified player-power-cards-modal (handles both desktop and mobile automatically)
      store.dispatch(uiPlayerPowerCardsOpen(player.id));
    };
    
    card.addEventListener('click', clickHandler, { capture: true });
    container.addEventListener('click', clickHandler, { capture: true });
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
