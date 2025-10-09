/** player-profile-card.component.js
 * Player Profile Card component scaffold (rewrite track).          console.log('🃏 PLAYER CARD Resize Detected:');
          console.log('  📍 Source: Player Profile Card Component');
          console.log('  👤 Player ID:', playerId);
          console.log('  🎯 In Active Dock:', isActive);
          console.log('  ⭐ Is Active Player:', isActivePlayer);
          console.log('  📐 Dimensions:', { width, height });
          console.log('  ⏰ Time:', new Date().toISOString());
          console.log('  🎯 Element:', entry.target);
          console.log('  📊 Stack trace:', new Error().stack); single namespace class (.cmp-player-profile-card) – legacy term 'player-dashboard' replaced.
 * - Pure build/update contract.
 * - Owned cards miniature lane placeholder.
 * - No external side-effects; relies only on selectors + store.
 */
import { store } from '../../bootstrap/index.js';
import { selectPlayerById, selectActivePlayer, selectPlayerPowerCards, selectMonsterById } from '../../core/selectors.js';
import { uiCardDetailOpen, uiPlayerPowerCardsOpen } from '../../core/actions.js';
import { uiPeekShow } from '../../core/actions.js';
import { createPositioningService } from '../../services/positioningService.js';
import { getScenario } from '../../scenarios/catalog.js';

/** Build a single player profile card root */
export function build({ selector, playerId }) {
  const root = document.createElement('div');
  // Single class namespace (legacy term 'player-dashboard' deprecated)
  root.className = `cmp-player-profile-card`;
  root.setAttribute('data-player-id', playerId);
  root.innerHTML = baseTemplate();
  // Handle card interactions
  root.addEventListener('click', (e) => {
    // Cards stat tile click -> open player power cards modal
    const cardsStat = e.target.closest('[data-cards]');
    if (cardsStat) {
      e.preventDefault();
      e.stopPropagation();
      console.log('[PlayerProfileCard] Cards tile clicked for player:', playerId);
      // Always open the modal, even if no cards (will show empty state)
      try { 
        console.log('[PlayerProfileCard] Dispatching uiPlayerPowerCardsOpen with playerId:', playerId);
        store.dispatch(uiPlayerPowerCardsOpen(playerId)); 
      } catch(err) {
        console.error('[PlayerProfileCard] Error dispatching uiPlayerPowerCardsOpen:', err);
      }
      return;
    }
    
    // Owned card mini click -> open card detail modal (new unified path)
    const mini = e.target.closest('.ppc-card-mini[data-card-id]');
    if (mini) {
      const cid = mini.getAttribute('data-card-id');
      if (cid) {
        try { store.dispatch(uiCardDetailOpen(cid, 'owned')); } catch(_) {}
      }
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    // Handle avatar click to show monster profile modal (editable traits)
    if (e.target.closest('[data-avatar]')) {
      e.preventDefault();
      e.stopPropagation();
      const state = store.getState();
      const player = selectPlayerById(state, playerId);
      if (player && player.monsterId) {
        // Dispatch action to open monster profile modal with editable traits
        store.dispatch({
          type: 'UI_MONSTER_PROFILE_OPEN',
          payload: { monsterId: player.monsterId }
        });
      }
      return;
    }

    // Handle expand/collapse toggle in list view
    if (e.target.closest('[data-expand-toggle]')) {
      e.preventDefault();
      e.stopPropagation();
      root.toggleAttribute('data-expanded');
      const icon = root.querySelector('.ppc-expand-icon');
      if (icon) {
        // Rotate SVG arrow: down arrow (0deg) when collapsed, up arrow (180deg) when expanded
        icon.style.transform = root.hasAttribute('data-expanded') ? 'rotate(180deg)' : 'rotate(0deg)';
      }
      return;
    }

    // Flip on tap (mobile): toggles between front (stats) and back (owned cards)
    const isTouch = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
    if (!isTouch) return;
    // Avoid flipping when clicking links/buttons in future
    if (e.target.closest('button,a,[data-ignore-flip]')) return;
    root.toggleAttribute('data-flipped');
  });
  // Defer draggable assignment until update determines active player to avoid all cards being movable.
  let draggableApplied = false;
  function ensureDraggableIfActive() {
    try {
      const state = store.getState();
      const active = selectActivePlayer(state);
      if (active && active.id === playerId && !draggableApplied) {
        const positioning = createPositioningService(store);
        positioning.hydrate();
        positioning.makeDraggable(root, `playerCard_${playerId}`, { snapEdges: true, snapThreshold: 12 });
        draggableApplied = true;
        root.setAttribute('data-draggable','true');
      } else if (!active || active.id !== playerId) {
        // Ensure non-active player cards are not draggable
        root.setAttribute('data-draggable','false');
        root.setAttribute('data-nodrag','true');
        // Remove pointer handlers if they were attached
        root.style.touchAction = '';
      }
    } catch(_) {}
  }
  ensureDraggableIfActive();

  // DISABLED: ResizeObserver temporarily disabled for troubleshooting
  // TODO: Re-enable when animation issues are resolved
  /*
  if (window.ResizeObserver) {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const isActive = entry.target.hasAttribute('data-in-active-dock');
        const isActivePlayer = entry.target.closest('[data-active="true"]') || entry.target.hasAttribute('data-active');
        
        // Log for active player cards or any card in active dock
        if (isActive || isActivePlayer) {
          console.log('� PLAYER CARD Resize Detected:');
          console.log('  📍 Source: Player Profile Card Component');
          console.log('  👤 Player ID:', playerId);
          console.log('  🎯 In Active Dock:', isActive);
          console.log('  ⭐ Is Active Player:', isActivePlayer);
          console.log('  📐 Dimensions:', { width, height });
          console.log('  ⏰ Time:', new Date().toISOString());
          console.log('  🎯 Element:', entry.target);
          console.log('  📊 Stack trace:');
          console.trace('Player card resize triggered from:');
          
          // Additional debugging info
          const styles = getComputedStyle(entry.target);
          console.log('  🎨 Computed styles:', {
            position: styles.position,
            display: styles.display,
            transform: styles.transform,
            width: styles.width,
            height: styles.height
          });
        }
      }
    });
    
    resizeObserver.observe(root);
    
    // Store observer for cleanup if needed
    root._resizeObserver = resizeObserver;
  }
  */

  return { root, update: (props) => { update(root, { ...props, playerId }); ensureDraggableIfActive(); }, destroy: () => root.remove() };
}

function baseTemplate() {
  return `
    <div class="ppc-header">
      <div class="ppc-avatar" data-avatar data-ignore-flip title="View monster profile"></div>
      <div class="ppc-meta">
        <div class="ppc-name" data-name>
          <span class="ppc-name-text" data-name-text></span>
        </div>
        <div class="ppc-status-line">
          <span class="ppc-active-indicator" data-active-indicator></span>
        </div>
      </div>
    </div>
    <button class="ppc-expand-toggle" data-expand-toggle title="Show/Hide Details" aria-label="Toggle card details">
      <svg class="ppc-expand-icon" width="16" height="10" viewBox="0 0 16 10" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(0deg);">
        <path d="M2 2L8 8L14 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <div class="ppc-stats" data-stats>
      <div class="ppc-stat cards" data-cards>
        <span class="label">CARDS</span>
        <span class="value" data-cards-count>0</span>
        <span class="scenario-indicator" data-scenario-cards>*</span>
      </div>
      <div class="ppc-stat energy" data-energy data-kind="energy">
        <span class="label">ENERGY</span>
        <span class="value" data-energy-value></span>
        <div class="energy-bolt" data-energy-bolt>⚡</div>
        <span class="scenario-indicator" data-scenario-energy>*</span>
      </div>
      <div class="ppc-stat vp" data-vp data-kind="vp">
        <span class="label">POINTS</span>
        <span class="value" data-vp-value></span>
        <div class="vp-coin" data-vp-coin>★</div>
        <span class="scenario-indicator" data-scenario-vp>*</span>
      </div>
    </div>
    <div class="ppc-health-block" data-health-block>
      <div class="ppc-health-label" data-health-label>
        HEALTH <span data-hp-value></span>/10
        <span class="scenario-indicator scenario-indicator-health" data-scenario-health>*</span>
      </div>
      <div class="ppc-health-bar" data-health-bar><div class="fill" data-health-fill></div></div>
    </div>
    <div class="ppc-owned-cards" data-owned-cards hidden>
      <div class="ppc-owned-cards-label" data-owned-label>OWNED</div>
      <div class="ppc-owned-cards-strip" data-cards-strip></div>
    </div>
  `;
}

/** Update cycle */
export function update(root, { playerId }) {
  if (window.__KOT_DEBUG__?.logComponentUpdates) {
    console.log(`🔄 PLAYER CARD UPDATE CALLED for player ${playerId}`);
  }
  if (!playerId) return;
  const state = store.getState();
  const player = selectPlayerById(state, playerId);
  if (!player) return;
  // Monster color theming
  try {
    const monster = selectMonsterById(state, player.monsterId);
    if (monster && monster.color) {
      root.style.setProperty('--ppc-accent', monster.color);
      // Derive readable accent text color
      try {
        const hex = monster.color.replace('#','');
        if (hex.length === 3) {
          const r = parseInt(hex[0]+hex[0],16), g = parseInt(hex[1]+hex[1],16), b = parseInt(hex[2]+hex[2],16);
          setAccentText(root, r,g,b);
        } else if (hex.length === 6) {
          const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
          setAccentText(root, r,g,b);
        }
        // Avatar image mapping (best effort based on monster name / provided image)
        try {
          const avatarEl = root.querySelector('[data-avatar]');
          if (avatarEl) {
            const baseName = (monster.imageBase || monster.name || '').toLowerCase().replace(/\s+/g,'_');
            const candidates = [];
            if (monster.image) candidates.push(monster.image);
            if (baseName) {
              candidates.push(`images/characters/${baseName}.png`);
              candidates.push(`images/characters/king_of_tokyo_${baseName}.png`);
            }
            const chosen = candidates.find(Boolean);
            if (chosen) {
              avatarEl.style.backgroundImage = `url(${chosen})`;
              avatarEl.dataset.avatarSrc = chosen;
            }
          }
        } catch(_) {}
      } catch(_) {}
    }
  } catch(_) {}

  // Basic fields
  root.setAttribute('data-monster-id', player.monsterId || '');
  // Name text isolated in its own span so layout of badge/indicator cannot stretch container
  const nameTextEl = root.querySelector('[data-name-text]');
  if (nameTextEl && nameTextEl.textContent !== player.name) {
    nameTextEl.textContent = player.name;
  }
  // CPU indicator appended after name text (idempotent)
  try {
    const nameEl = root.querySelector('[data-name]');
    if (nameEl) {
      const isCPU = player.isCPU || player.isAi || player.type === 'ai';
      let cpuEl = nameEl.querySelector('.ppc-cpu');
      if (isCPU) {
        if (!cpuEl) {
          cpuEl = document.createElement('span');
          cpuEl.className = 'ppc-cpu';
          cpuEl.textContent = ' (CPU)';
          cpuEl.setAttribute('aria-label','Computer controlled player');
          nameEl.appendChild(cpuEl);
        }
      } else if (cpuEl) {
        cpuEl.remove();
      }
    }
  } catch(_) {}
  
  // Scenario indicators - show asterisks on affected stat tiles
  try {
    const scenarioCategories = getPlayerScenarioCategories(state, playerId);
    
    if (window.__KOT_DEBUG__?.logComponentUpdates) {
      console.log('[PlayerProfileCard] Scenario categories for', playerId, ':', scenarioCategories);
    }
    
    const healthIndicator = root.querySelector('[data-scenario-health]');
    const energyIndicator = root.querySelector('[data-scenario-energy]');
    const vpIndicator = root.querySelector('[data-scenario-vp]');
    const cardsIndicator = root.querySelector('[data-scenario-cards]');
    
    if (healthIndicator) {
      healthIndicator.style.display = scenarioCategories.hasHealth ? 'inline' : 'none';
      if (scenarioCategories.hasHealth) {
        healthIndicator.setAttribute('title', `Scenarios affecting Health:\n${scenarioCategories.healthScenarios.join('\n')}`);
      }
    }
    if (energyIndicator) {
      energyIndicator.style.display = scenarioCategories.hasEnergy ? 'inline' : 'none';
      if (scenarioCategories.hasEnergy) {
        energyIndicator.setAttribute('title', `Scenarios affecting Energy:\n${scenarioCategories.energyScenarios.join('\n')}`);
      }
    }
    if (vpIndicator) {
      vpIndicator.style.display = scenarioCategories.hasVP ? 'inline' : 'none';
      if (scenarioCategories.hasVP) {
        vpIndicator.setAttribute('title', `Scenarios affecting Victory Points:\n${scenarioCategories.vpScenarios.join('\n')}`);
      }
    }
    if (cardsIndicator) {
      cardsIndicator.style.display = scenarioCategories.hasCards ? 'inline' : 'none';
      if (scenarioCategories.hasCards) {
        cardsIndicator.setAttribute('title', `Scenarios affecting Cards:\n${scenarioCategories.cardsScenarios.join('\n')}`);
      }
    }
  } catch(_) {}
  
  const hpValEl = root.querySelector('[data-hp-value]');
  if (hpValEl) hpValEl.textContent = player.health;
  
  // Debug: Log stats updates
  const energyEl = root.querySelector('[data-energy-value]');
  const vpEl = root.querySelector('[data-vp-value]');
  if (energyEl) {
    const currentEnergy = energyEl.textContent;
    if (currentEnergy !== String(player.energy) && window.__KOT_DEBUG__?.logComponentUpdates) {
      console.log(`🔋 Energy Update for ${player.name} (${player.isCPU ? 'CPU' : 'Human'}): ${currentEnergy} -> ${player.energy}`);
    }
    energyEl.textContent = player.energy;
  }
  if (vpEl) {
    const currentVP = vpEl.textContent;
    if (currentVP !== String(player.victoryPoints) && window.__KOT_DEBUG__?.logComponentUpdates) {
      console.log(`🏆 VP Update for ${player.name} (${player.isCPU ? 'CPU' : 'Human'}): ${currentVP} -> ${player.victoryPoints}`);
    }
    vpEl.textContent = player.victoryPoints;
  }
  
  // Force update check for human players (first player might have timing issues)
  const isHuman = !player.isCPU && !player.isAi && player.type !== 'ai';
  if (isHuman) {
    // IMMEDIATE: Force update regardless of current value for humans
    console.log(`👤 Human player ${player.name} stat update - Energy: ${player.energy}, VP: ${player.victoryPoints}`);
    if (energyEl) {
      energyEl.textContent = player.energy;
    }
    if (vpEl) {
      vpEl.textContent = player.victoryPoints;
    }
    
    // Multiple delayed updates to overcome any race conditions
    [100, 300, 500].forEach(delay => {
      setTimeout(() => {
        if (energyEl) energyEl.textContent = player.energy;
        if (vpEl) vpEl.textContent = player.victoryPoints;
        if (window.__KOT_DEBUG__?.logComponentUpdates) {
          console.log(`🔄 ${delay}ms update for ${player.name}: Energy ${player.energy}, VP ${player.victoryPoints}`);
        }
      }, delay);
    });
  }

  const tokyoEl = root.querySelector('[data-tokyo]');
  // Dynamic Tokyo badge creation/removal to eliminate layout stretching issues
  try {
    let tokyoEl = root.querySelector('[data-tokyo-badge]');
    if (player.inTokyo) {
      if (!tokyoEl) {
        tokyoEl = document.createElement('div');
        tokyoEl.setAttribute('data-tokyo-badge','');
        tokyoEl.className = 'ppc-tokyo-indicator';
        const meta = root.querySelector('.ppc-meta');
        if (meta) meta.appendChild(tokyoEl);
      }
      const cityOccupant = state.tokyo?.city;
      const bayOccupant = state.tokyo?.bay;
      let tokyoLabel = '';
      if (cityOccupant === playerId) tokyoLabel = 'in tokyo city';
      else if (bayOccupant === playerId) tokyoLabel = 'in tokyo bay';
      if (!tokyoLabel) tokyoLabel = 'in tokyo city';
      if (tokyoEl.textContent !== tokyoLabel) tokyoEl.textContent = tokyoLabel;
      root.setAttribute('data-in-tokyo','true');
      // Debug: log bounding box to investigate stretching
      try {
        const rect = tokyoEl.getBoundingClientRect();
        console.log('[TokyoBadgeDebug] size', { h: rect.height, w: rect.width, text: tokyoEl.textContent, player: playerId });
      } catch(_) {}
      tokyoEl.classList.add('is-in');
    } else if (tokyoEl) {
      tokyoEl.remove();
      root.removeAttribute('data-in-tokyo');
    }
  } catch(_) {}

  // Active indicator (placeholder: will style via .is-active later)
  const activeIndicator = root.querySelector('[data-active-indicator]');
  if (player.status?.active) {
    root.classList.add('is-active');
    activeIndicator.textContent = '●';
    root.setAttribute('data-active','true');
  } else {
    root.classList.remove('is-active');
    activeIndicator.textContent = '';
    root.removeAttribute('data-active');
  }

  // Owned cards miniature lane
  const cards = selectPlayerPowerCards(state, playerId) || [];
  const cardsStat = root.querySelector('[data-cards]');
  const cardsCountEl = cardsStat ? cardsStat.querySelector('.value[data-cards-count]') : null;
  if (cardsCountEl) {
    const prevCount = parseInt(cardsCountEl.textContent||'0',10);
    cardsCountEl.textContent = cards.length;
    // Update data attribute on parent tile for CSS styling (0 cards = dimmed/not clickable)
    if (cardsStat) {
      cardsStat.setAttribute('data-cards-count', cards.length);
    }
    if (cards.length > prevCount) {
      announceA11y(`${player.name} acquired a power card. Now owns ${cards.length}.`);
    }
  }
  
  // Hide OWNED label for human players
  const ownedLabelEl = root.querySelector('[data-owned-label]');
  if (ownedLabelEl) {
    const isHuman = !(player.isCPU || player.isAi || player.type === 'ai');
    ownedLabelEl.style.display = isHuman ? 'none' : 'block';
  }
  // Health bar fill
  const healthBar = root.querySelector('[data-health-bar]');
  const healthFill = root.querySelector('[data-health-fill]');
  if (healthBar && healthFill) {
    const pct = (player.health / 10) * 100;
    healthFill.style.width = pct + '%';
    if (player.health <= 3) healthBar.setAttribute('data-low','true'); else healthBar.removeAttribute('data-low');
  }
  const strip = root.querySelector('[data-cards-strip]');
  if (strip) strip.innerHTML = cards.map(c => `<span class="ppc-card-mini" data-card-id="${c.id}" title="${c.name}">${c.name.slice(0,8)}</span>`).join('');

  // Visual pulses on resource deltas (compare with previous snapshot)
  try {
    const prev = root._prevStats || { vp: player.victoryPoints, energy: player.energy, health: player.health, inTokyo: player.inTokyo };
    // VP gain
    if (player.victoryPoints > prev.vp) {
      root.setAttribute('data-vp-gain','true');
      // Trigger coin spin animation
      const coin = root.querySelector('[data-vp-coin]');
      if (coin) {
        coin.classList.remove('spin'); // Reset animation
        void coin.offsetWidth; // Force reflow
        coin.classList.add('spin');
        setTimeout(() => { 
          try { 
            coin.classList.remove('spin');
          } catch(_){} 
        }, 1000);
      }
      setTimeout(() => { try { root.removeAttribute('data-vp-gain'); } catch(_){} }, 1000);
    }
    // Energy gain
    if (player.energy > prev.energy) {
      root.setAttribute('data-energy-gain','true');
      // Trigger energy bolt animation
      const bolt = root.querySelector('[data-energy-bolt]');
      if (bolt) {
        bolt.classList.remove('spark'); // Reset animation
        void bolt.offsetWidth; // Force reflow
        bolt.classList.add('spark');
        setTimeout(() => { 
          try { 
            bolt.classList.remove('spark');
          } catch(_){} 
        }, 1000);
      }
      setTimeout(() => { try { root.removeAttribute('data-energy-gain'); } catch(_){} }, 1000);
    }
    // Health gain (heals)
    if (player.health > prev.health) {
      root.setAttribute('data-health-gain','true');
      setTimeout(() => { try { root.removeAttribute('data-health-gain'); } catch(_){} }, 1000);
    }
    // Tokyo entry flourish
    if (!prev.inTokyo && player.inTokyo) {
      root.setAttribute('data-entered-tokyo','true');
      setTimeout(() => { try { root.removeAttribute('data-entered-tokyo'); } catch(_){} }, 1200);
    }
    root._prevStats = { vp: player.victoryPoints, energy: player.energy, health: player.health, inTokyo: player.inTokyo };
  } catch(_) {}
}

function setAccentText(root, r,g,b) {
  // Always use consistent yellow/gold color for stat values
  root.style.setProperty('--ppc-accent-text', '#ffd400');
}

function announceA11y(message) {
  try {
    let live = document.querySelector('[data-live-region]');
    if (!live) {
      live = document.createElement('div');
      live.setAttribute('data-live-region','');
      live.setAttribute('aria-live','polite');
      live.className = 'sr-only';
      document.body.appendChild(live);
    }
    live.textContent = message;
  } catch(_) {}
}

// Get categories of stats affected by player's scenarios
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
    if (!assignments.length) return result;
    
    // Get player info
    const order = state.players?.order || [];
    const byId = state.players?.byId || {};
    const player = byId[playerId];
    if (!player) return result;
    
    const humanId = order.find(pid => !byId[pid]?.isCPU);
    const cpuIds = order.filter(pid => byId[pid]?.isCPU);
    const isCPU = player.isCPU || player.isAi || player.type === 'ai';
    
    const scenarioIds = new Set();
    
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
        assignment.scenarioIds.forEach(id => scenarioIds.add(id));
      }
    }
    
    // Map scenario IDs to affected categories
    // Use the category property from scenario definitions in catalog.js
    scenarioIds.forEach(id => {
      const scenario = getScenario(id);
      if (!scenario || !scenario.category) return;
      
      // Check each category in the scenario's category array
      scenario.category.forEach(cat => {
        if (cat === 'health') {
          result.hasHealth = true;
          result.healthScenarios.push(scenario.label);
        }
        if (cat === 'energy') {
          result.hasEnergy = true;
          result.energyScenarios.push(scenario.label);
        }
        if (cat === 'vp') {
          result.hasVP = true;
          result.vpScenarios.push(scenario.label);
        }
        if (cat === 'cards') {
          result.hasCards = true;
          result.cardsScenarios.push(scenario.label);
        }
      });
    });
    
    return result;
  } catch(e) {
    console.warn('Error getting player scenario categories:', e);
    return result;
  }
}

// Check if a player has scenarios assigned (kept for backward compatibility)
function checkPlayerHasScenarios(state, playerId) {
  const categories = getPlayerScenarioCategories(state, playerId);
  return categories.hasHealth || categories.hasEnergy || categories.hasVP || categories.hasCards;
}

// Get names of scenarios assigned to a player
function getPlayerScenarioNames(state, playerId) {
  try {
    const assignments = state.settings?.scenarioConfig?.assignments || [];
    if (!assignments.length) return '';
    
    // Import getScenario dynamically or use a simpler approach
    const order = state.players?.order || [];
    const byId = state.players?.byId || {};
    const player = byId[playerId];
    if (!player) return '';
    
    const humanId = order.find(pid => !byId[pid]?.isCPU);
    const cpuIds = order.filter(pid => byId[pid]?.isCPU);
    const isCPU = player.isCPU || player.isAi || player.type === 'ai';
    
    const scenarioIds = new Set();
    
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
        assignment.scenarioIds.forEach(id => scenarioIds.add(id));
      }
    }
    
    return [...scenarioIds].join(', ') || 'Unknown';
  } catch(e) {
    console.warn('Error getting player scenario names:', e);
    return 'Unknown';
  }
}
