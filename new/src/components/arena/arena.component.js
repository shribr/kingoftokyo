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

export function build({ selector }) {
  const root = document.createElement('div');
  // Use only new namespace class; legacy .game-board removed
  root.className = selector.slice(1) + ' cmp-arena';
  root.innerHTML = `
    <div data-tokyo data-arena-section="tokyo">
      <div data-bay data-arena-section="bay">
        <h3>Tokyo Bay</h3>
        <div class="monster-slot" data-bay-slot></div>
      </div>
      <div data-city data-arena-section="city">
        <h3>Tokyo City</h3>
        <div class="monster-slot" data-city-slot></div>
      </div>
      <div data-round-indicator>
        <span class="round-label">Round</span>
        <div class="round-indicator"><span id="round-counter" data-round-counter>1</span></div>
      </div>
    </div>`;
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
  if (citySlot) citySlot.innerHTML = renderOccupant(tokyo.city, state);
  if (baySlot) baySlot.innerHTML = renderOccupant(tokyo.bay, state);
}

function renderOccupant(playerId, state) {
  if (!playerId) return '<div class="slot-empty">Empty</div>';
  const p = state.players.byId[playerId];
  if (!p) return '<div class="slot-empty">?</div>';
  return `<div class="tokyo-occupant" data-player-id="${playerId}">
    <span class="name">${p.name}</span>
    <span class="hp">HP ${p.health}</span>
    <span class="vp">★ ${p.victoryPoints}</span>
  </div>`;
}
