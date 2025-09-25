/** dice-tray.component.js
 * LEGACY GLOBAL STYLE DEPENDENCY (FOR FUTURE LEGACY REMOVAL)
 * Uses legacy layout hooks: .dice-area, .draggable
 * Origin: css/legacy/layout.css (positioning, sizing, drag affordance, visual accents)
 * Rationale: Temporary retention so migrated rewrite renders correctly while styles are extracted.
 * Decommission Plan:
 *   1. Create component-scoped stylesheet (components.dice-tray.css) with required layout + animation rules.
 *   2. Replace external positioning reliance with design tokens (size, gap, z-index) & inline CSS vars.
 *   3. Remove legacy class additions below ('.dice-area', '.draggable') and update tests / snapshots.
 *   4. Delete associated selector blocks from css/legacy/layout.css once no other components depend on them.
 */
import { eventBus } from '../../core/eventBus.js';
import { selectActivePlayer } from '../../core/selectors.js';
import { store } from '../../bootstrap/index.js';
import { createPositioningService } from '../../services/positioningService.js';

export function build({ selector, emit }) {
  const root = document.createElement('div');
  // Bridge legacy layout expectations by adding original structural class names.
  // This allows existing layout.css rules (which still target .dice-area & .draggable)
  // to style/position the rewrite dice tray without waiting for full CSS migration.
  root.className = `${selector.slice(1)} cmp-dice-tray`; // legacy .dice-area/.draggable removed
  root.setAttribute('data-draggable','true');
  root.innerHTML = `<div class="tray-header"><button data-action="roll">Roll</button><span class="tray-dice-count" data-dice-count></span></div><div class="dice" data-dice></div>`;
  // Track previous diceSlots to animate expansions
  root._prevDiceSlots = 6;

  // Make draggable & persistent
  const positioning = createPositioningService(store);
  positioning.hydrate(); // ensure positions loaded (idempotent)
  positioning.makeDraggable(root, 'diceTray');

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="roll"]');
    if (btn) {
      emit('ui/dice/rollRequested', {});
      return;
    }
    const dieEl = e.target.closest('[data-die-index]');
    if (dieEl) {
      const idx = Number(dieEl.getAttribute('data-die-index'));
      emit('ui/dice/keptToggled', { index: idx });
    }
  });

  return { root, update: (props) => update(root, props), destroy: () => root.remove() };
}

export function update(root, { state }) {
  const diceContainer = root.querySelector('[data-dice]');
  const countEl = root.querySelector('[data-dice-count]');
  if (!diceContainer) return;
  const globalState = store.getState();
  const active = selectActivePlayer(globalState);
  const diceSlots = active?.modifiers?.diceSlots || 6;
  const faces = state.faces || [];
  // Active player highlight on root (used by CSS for subtle glow)
  if (active) root.classList.add('for-active-player'); else root.classList.remove('for-active-player');

  const prevFaces = root._prevFaces || [];
  const facesChanged = faces.length && (faces.length !== prevFaces.length || faces.some((f,i) => !prevFaces[i] || prevFaces[i].value !== f.value || prevFaces[i].kept !== f.kept));
  // Build full list including placeholders for unrolled extra dice
  const rendered = [];
  for (let i = 0; i < diceSlots; i++) {
    const face = faces[i];
    if (face) {
      rendered.push(`<span class="die ${face.kept ? 'is-kept' : ''} ${i >= 6 ? 'extra-die' : ''}" data-die-index="${i}" data-face="${face.value}">${symbolFor(face.value)}</span>`);
    } else {
      rendered.push(`<span class="die pending ${i >= 6 ? 'extra-die' : ''}" data-die-index="${i}">?</span>`);
    }
  }
  diceContainer.innerHTML = rendered.join('');
  // Roll animation when faces changed (simple pulse)
  if (facesChanged) {
    diceContainer.classList.add('rolling');
    setTimeout(() => diceContainer.classList.remove('rolling'), 650);
  }
  // Detect expansion
  const prev = root._prevDiceSlots || 6;
  if (diceSlots > prev) {
    // Mark new dice indices with animation class
    for (let i = prev; i < diceSlots; i++) {
      const el = diceContainer.querySelector(`[data-die-index="${i}"]`);
      if (el) {
        el.classList.add('new-die');
        // Remove after animation completes
        setTimeout(() => el.classList.remove('new-die'), 1200);
      }
    }
    if (countEl) {
      countEl.classList.add('bump');
      setTimeout(() => countEl.classList.remove('bump'), 600);
    }
  }
  root._prevDiceSlots = diceSlots;
  root._prevFaces = faces.map(f => ({ value: f.value, kept: f.kept }));
  if (countEl) {
    if (diceSlots > 6) {
      countEl.textContent = `${diceSlots} dice (+${diceSlots - 6})`;
    } else {
      countEl.textContent = `${diceSlots} dice`;
    }
  }
}

function symbolFor(v) {
  switch(v) {
    case 4: return '❤️';
    case 5: return '⚡';
    case 6: return '⚔️';
    default: return String(v ?? '?');
  }
}

// Event wiring centralized in src/ui/eventsToActions.js
