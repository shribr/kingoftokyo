/** player-card-list.component.js
 * LEGACY GLOBAL STYLE DEPENDENCY (FOR FUTURE LEGACY REMOVAL)
 * Legacy selectors: .players-area, .collapsible-panel, .monsters-panel, .collapsed, .monsters-collapsed
 * Source Files: css/legacy/layout.css (+ responsive adjustments) for panel chrome, collapse transforms, draggable spacing.
 * Reason: Panel still using transplanted global panel system before component-scoped panel module extracted.
 * Sunset Steps:
 *   1. Implement shared panel module (components.panel.css) with collapse + vertical header rotations using CSS vars.
 *   2. Replace global class hooks with data attributes (e.g., [data-panel="monsters"]).
 *   3. Migrate draggable affordance to utility class or inline style tokens; remove .players-area / .collapsible-panel usage.
 *   4. Excise associated blocks from legacy CSS once all panels migrated.
 */
import { selectPlayerOrder, selectPlayerById } from '../../core/selectors.js';
import { store } from '../../bootstrap/index.js';
import { createPositioningService } from '../../services/positioningService.js';

export function build({ selector }) {
  const root = document.createElement('div');
  // Include legacy structural hooks (players-area, collapsible-panel) so transplanted layout.css
  // rules apply until dedicated rewrite layout refactor is complete.
  // Add a more specific marker class (monsters-panel) for styling vertical collapsed header.
  root.className = `${selector.slice(1)} cmp-panel-root`; // legacy panel classes removed
  root.setAttribute('data-panel','monsters');
  // Panel structure mirrors legacy markup for consistent styling.
  root.innerHTML = `
    <h3 class="panel-header" data-toggle>
      <span class="toggle-arrow">></span>
      <span class="header-text">Monsters</span>
    </h3>
    <div class="panel-content" data-player-list></div>`;
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-toggle]')) {
      // Toggle collapsed + a specific modifier so CSS can rotate the header text.
      const willCollapse = root.getAttribute('data-collapsed') !== 'true';
      if (willCollapse) {
        root.setAttribute('data-collapsed','true');
      } else {
        root.removeAttribute('data-collapsed');
      }
    }
  });

  // Make the entire panel draggable (persisting via positioning service)
  try {
    const ps = createPositioningService(store);
    ps.makeDraggable(root, 'monstersPanel', { grid: 4 });
  } catch(_) {}
  return { root, update: (props) => update(root, props), destroy: () => root.remove() };
}

export function update(root) {
  const listEl = root.querySelector('[data-player-list]');
  if (!listEl) return;
  const state = store.getState();
  const order = selectPlayerOrder(state);
  const html = order.map(id => {
    const p = selectPlayerById(state, id);
    return `<div class="player-card">
      <span class="name">${p.name}</span>
      <span class="hp">HP: ${p.health}</span>
      <span class="energy">⚡ ${p.energy}</span>
      <span class="vp">★ ${p.victoryPoints}</span>
      ${p.inTokyo ? '<span class="tokyo">TOKYO</span>' : ''}
    </div>`;
  }).join('');
  listEl.innerHTML = html;
}
