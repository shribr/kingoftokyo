/** dice-tray.component.js
 * MIGRATED: Legacy structural classes (.dice-area, .draggable) removed.
 * Source extraction complete -> visuals governed by css/components.dice-tray.css.
 * Next: prune legacy .dice-area / draggable styling blocks after confirming no other components rely on them.
 */
import { eventBus } from '../../core/eventBus.js';
import { selectActivePlayer } from '../../core/selectors.js';
import { store } from '../../bootstrap/index.js';
import { createPositioningService } from '../../services/positioningService.js';

export function build({ selector, emit }) {
  const root = document.createElement('div');
  root.className = `${selector.slice(1)} cmp-dice-tray`;
  root.setAttribute('data-draggable','true');
  // Tray frame + dice row (matching legacy visual reference)
  root.innerHTML = `<div class="tray-frame" data-tray-frame>
    <div class="dice" data-dice aria-label="Dice Tray"></div>
  </div>`;
  // Track previous diceSlots to animate expansions
  root._prevDiceSlots = 6;

  // Make draggable & persistent
  const positioning = createPositioningService(store);
  positioning.hydrate(); // ensure positions loaded (idempotent)
  const isTouch = matchMedia('(pointer: coarse)').matches || window.innerWidth <= 760;
  if (!isTouch) {
    positioning.makeDraggable(root, 'diceTray', { snapEdges: true, snapThreshold: 12 });
  } else {
    root.setAttribute('data-draggable','false');
  }

  // If user has not manually moved tray (no stored position), align its left edge with arena's left edge.
  function autoAlignIfNotUserMoved() {
    const persisted = positioning.getPersistedPosition?.('diceTray');
    if (persisted) return; // user customized position; don't override
    const arena = document.querySelector('.cmp-arena');
    if (!arena) return;
    const aRect = arena.getBoundingClientRect();
    // Desired: default position directly below the arena. Keep previous left alignment with arena's left edge.
    const GAP_Y = 24;
    const GAP_X = 0; // maintain left edge alignment; adjust if we later add centering option
    root.style.left = (aRect.left + GAP_X) + 'px';
    root.style.transform = 'translateX(0)';
    // Clear any bottom anchoring and set top just below arena (clamped to viewport)
    root.style.bottom = '';
    let proposedTop = aRect.bottom + GAP_Y + (window.scrollY || 0);
    const trayH = root.offsetHeight || 0;
    const maxTop = (window.innerHeight - trayH - 16) + (window.scrollY || 0);
    if (trayH && proposedTop > maxTop) proposedTop = Math.max(10, maxTop);
    root.style.top = proposedTop + 'px';
    // Notify listeners (e.g., action menu) that tray alignment finalized for this frame.
    window.dispatchEvent(new CustomEvent('diceTrayAutoAligned', { detail: { left: aRect.left } }));
  }
  // Align on next frame (after arena laid out) and on resize
  requestAnimationFrame(autoAlignIfNotUserMoved);
  window.addEventListener('resize', autoAlignIfNotUserMoved);
  root._destroyExtras = () => window.removeEventListener('resize', autoAlignIfNotUserMoved);

  root.addEventListener('click', (e) => {
    const dieEl = e.target.closest('[data-die-index]');
    if (dieEl) {
      const idx = Number(dieEl.getAttribute('data-die-index'));
      emit('ui/dice/keptToggled', { index: idx });
    }
  });

  return { root, update: (props) => update(root, props), destroy: () => { root._destroyExtras && root._destroyExtras(); root.remove(); } };
}

export function update(root, { state }) {
  const diceContainer = root.querySelector('[data-dice]');
  if (!diceContainer) return;
  const collapseBtn = root.querySelector('[data-collapse-toggle]');
  const globalState = store.getState();
  const active = selectActivePlayer(globalState);
  const diceSlots = active?.modifiers?.diceSlots || 6;
  // Accept both nested slice shape ({ dice: {...} }) and flat ({ faces, ... })
  const diceState = (state && state.dice) ? state.dice : (state || {});
  const faces = diceState.faces || [];
  // Active player highlight on root (used by CSS for subtle glow)
  // Removed active-player visual highlighting for dice tray (no stylistic changes requested)

  const prevFaces = root._prevFaces || [];
  const facesChanged = faces.length && (faces.length !== prevFaces.length || faces.some((f,i) => !prevFaces[i] || prevFaces[i].value !== f.value || prevFaces[i].kept !== f.kept));
  // Build full list including placeholders for unrolled extra dice
  const rendered = [];
  for (let i = 0; i < diceSlots; i++) {
    const face = faces[i];
    const isExtra = i >= 6;
    if (face) {
      rendered.push(`<span class="die ${face.kept ? 'is-kept' : ''} ${isExtra ? 'extra-die' : ''}" data-die-index="${i}" data-face="${face.value}">${symbolFor(face.value)}</span>`);
    } else {
      // For extra dice (7th, 8th) show blank dashed slot (no '?')
      const content = isExtra ? '' : '?';
      rendered.push(`<span class="die pending ${isExtra ? 'extra-die' : ''}" data-die-index="${i}">${content}</span>`);
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
    // removed count bump visual
  }
  root._prevDiceSlots = diceSlots;
  root._prevFaces = faces.map(f => ({ value: f.value, kept: f.kept }));
  // Removed count & rerolls textual UI per request

  // Mobile/touch collapse behavior
  const isTouch = matchMedia('(pointer: coarse)').matches || window.innerWidth <= 760;
  if (isTouch && collapseBtn && !collapseBtn._wired) {
    collapseBtn._wired = true;
    collapseBtn.addEventListener('click', () => {
      const cur = root.getAttribute('data-collapsed');
      root.setAttribute('data-collapsed', cur === 'left' ? 'none' : 'left');
    });
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
