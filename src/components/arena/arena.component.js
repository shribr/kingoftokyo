/** arena.component.js
 * LEGACY GLOBAL STYLE DEPENDENCY (FOR FUTURE LEGACY REMOVAL)
 * Structural legacy selectors previously in use (now removed): .game-board, .tokyo-area, .tokyo-city, .tokyo-bay, .round-indicator-container
 * Source: css/legacy/layout.css (board grid, background art, positioning, typography sizing) + responsive.css
 * Purpose: Preserve existing visual board & occupancy layout until rewritten with component-scoped CSS + tokens.
 * Decommission Steps:
 *   1. Extract board sizing / background / slot layout rules into new css/components.arena.css.
 *   2. Introduce CSS variables for spacing & z-index; remove dependence on global .game-board cascade. (DONE)
 *   3. Replace legacy class names here with local BEM-style or data-role attributes.
 *   4. Purge matching selector blocks from css/legacy/*.css after no other references remain.
 */
import { store } from '../../bootstrap/index.js';
import { selectPlayerById, selectActivePlayer } from '../../core/selectors.js';

export function build({ selector }) {
  const root = document.createElement('div');
  // Use only new namespace class; legacy .game-board removed
  root.className = selector.slice(1) + ' cmp-arena';
  root.innerHTML = `
    <div data-round-indicator>
      <div class="round-indicator-label" data-round-label>Round <span id="round-counter" data-round-counter>1</span></div>
    </div>
    <div data-tokyo data-arena-section="tokyo">
      <div data-city data-arena-section="city">
        <h3>Tokyo City</h3>
        <span class="tokyo-anchor" data-tokyo-city-anchor aria-hidden="true"></span>
        <div class="city-slot" data-city-slot></div>
      </div>
      <div data-bay data-arena-section="bay">
        <h3>Tokyo Bay</h3>
        <span class="tokyo-anchor" data-tokyo-bay-anchor aria-hidden="true"></span>
        <div class="bay-slot" data-bay-slot></div>
      </div>
    </div>
    <div data-active data-arena-section="active">
      <div class="active-player-slot" data-active-player-slot></div>
    </div>
    <div class="arena-active-player-dock" data-active-player-dock aria-label="Active player overview"></div>
  `;

  // DISABLED: ResizeObserver temporarily disabled for troubleshooting
  // TODO: Re-enable when animation issues are resolved
  /*
  const activePlayerSlot = root.querySelector('[data-active-player-slot]');
  if (activePlayerSlot && window.ResizeObserver) {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        console.log('🏟️ ARENA SLOT Resize Detected:');
        console.log('  📍 Source: Active Player Slot Container');
        console.log('  📐 Dimensions:', { width, height });
        console.log('  ⏰ Time:', new Date().toISOString());
        console.log('  🎯 Element:', entry.target);
        console.log('  📊 Stack trace:', new Error().stack);
        
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
    });
    
    resizeObserver.observe(activePlayerSlot);
    
    // Store observer for cleanup if needed
    root._resizeObserver = resizeObserver;
  }
  */

  return { root, update: () => update(root) };
}

export function update(root) {
  const state = store.getState();
  // Round: derive from log length or a future dedicated phase tracker; fallback 1
  // Round indicator restored (distinct from game log)
  const metaRound = state.meta?.round || 1;
  const span = root.querySelector('[data-round-counter]');
  if (span) span.textContent = metaRound;
  // Tokyo occupancy
  const { tokyo } = state;
  const citySlot = root.querySelector('[data-city-slot]');
  const baySlot = root.querySelector('[data-bay-slot]');
  if (citySlot) {
    const existingLive = citySlot.querySelector('.cmp-player-profile-card[data-live-in-tokyo-slot="city"]');
    if (!existingLive) citySlot.innerHTML = renderOccupant(tokyo.city, state);
  }
  if (baySlot) {
    const existingLive = baySlot.querySelector('.cmp-player-profile-card[data-live-in-tokyo-slot="bay"]');
    if (!existingLive) baySlot.innerHTML = renderOccupant(tokyo.bay, state);
  }

  // Disable Bay if fewer than 5 players (standard rule) – mark attribute for styling
  try {
    const totalPlayers = state.players?.order?.length || 0;
    const baySection = root.querySelector('[data-arena-section="bay"]');
    if (baySection) {
      if (totalPlayers < 5) {
        baySection.setAttribute('data-disabled','true');
      } else {
        baySection.removeAttribute('data-disabled');
      }
    }
  } catch(_) {}

  // Highlight active occupancy on section elements
  try {
    const citySection = root.querySelector('[data-arena-section="city"]');
    const baySection = root.querySelector('[data-arena-section="bay"]');
    if (citySection) {
      if (tokyo.city) citySection.setAttribute('data-active','true'); else citySection.removeAttribute('data-active');
    }
    if (baySection) {
      if (tokyo.bay) baySection.setAttribute('data-active','true'); else baySection.removeAttribute('data-active');
    }
  } catch(_) {}

  // Active player dock (clone card into arena top-right)
  // Cloning logic removed – actual card is now physically moved by monsters-panel.component
  // This component intentionally leaves the dock empty; relocation handled upstream.
}

function renderOccupant(playerId, state) {
  if (!playerId) return '<div class="slot-empty">Empty</div>';
  const p = state.players.byId[playerId];
  if (!p) return '<div class="slot-empty">?</div>';
  // Clone the player's actual profile card markup so visuals are identical; apply a "mini" wrapper for scale
  try {
    const liveCard = document.querySelector(`.cmp-player-profile-card[data-player-id="${playerId}"]`);
    if (liveCard) {
      const html = liveCard.outerHTML
        .replace('class="cmp-player-profile-card"', 'class="cmp-player-profile-card cmp-player-profile-card--mini"')
        .replace('data-in-active-dock="true"', '')
        .replace(/data-player-id="[^"]*"/, `data-player-id="${playerId}" data-tokyo-clone="true"`);
      
      // Force update the clone with current player stats
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const cloneCard = tempDiv.querySelector('.cmp-player-profile-card');
      
      if (cloneCard) {
        // Update stats in the clone
        const energyEl = cloneCard.querySelector('[data-energy-value]');
        const vpEl = cloneCard.querySelector('[data-vp-value]');
        const hpEl = cloneCard.querySelector('[data-hp-value]');
        const hpFill = cloneCard.querySelector('[data-health-fill]');
        
        if (energyEl) energyEl.textContent = p.energy;
        if (vpEl) vpEl.textContent = p.victoryPoints;
        if (hpEl) hpEl.textContent = p.health;
        if (hpFill) hpFill.style.width = `${(p.health / 10) * 100}%`;
  // Card count (owned power cards)
  const cardsCountEl = cloneCard.querySelector('[data-cards-count]');
  if (cardsCountEl) cardsCountEl.textContent = (p.cards?.length||0);
        
        // Ensure Tokyo status is shown
        cloneCard.setAttribute('data-in-tokyo', 'true');
        const tokyoEl = cloneCard.querySelector('[data-tokyo]');
        if (tokyoEl) {
          tokyoEl.textContent = 'TOKYO';
          tokyoEl.classList.add('is-in');
        }
      }
      
      return `<div class="tokyo-occupant" data-player-id="${playerId}" data-active="true">${tempDiv.innerHTML}</div>`;
    }
  } catch(_) {}
  // Fallback: minimal info if card not in DOM yet
  return `<div class="tokyo-occupant" data-player-id="${playerId}" data-active="true">
    <span class="name">${p.name}</span>
    <span class="hp">HP ${p.health}</span>
    <span class="vp">★ ${p.victoryPoints}</span>
  </div>`;
}
