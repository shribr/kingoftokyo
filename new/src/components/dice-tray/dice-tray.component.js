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
  // Tray outer + inner frame + dice row (legacy-style white container around dark tray)
  root.innerHTML = `<div class="tray-outer" data-tray-outer>
      <div class="tray-frame" data-tray-frame>
        <div class="dice" data-dice aria-label="Dice Tray"></div>
      </div>
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
      // Only allow toggling keeps during ROLL phase when dice are resolved (not actively rolling)
      try {
        const st = store.getState();
        const order = st.players.order || [];
        const activeId = order.length ? order[st.meta.activePlayerIndex % order.length] : null;
        const active = activeId ? st.players.byId[activeId] : null;
        const isCpu = !!(active && (active.isCPU || active.isAi || active.isAI || active.type === 'ai'));
        if (st.phase !== 'ROLL' || st.dice.phase !== 'resolved' || isCpu) return;
      } catch(_) { /* fallback: allow if uncertain */ }
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
  const valuesChanged = faces.length && (faces.length !== prevFaces.length || faces.some((f,i) => !prevFaces[i] || prevFaces[i].value !== f.value));
  const keepsChanged = faces.length && prevFaces.length === faces.length && faces.some((f,i) => prevFaces[i] && prevFaces[i].kept !== f.kept);
  const facesChanged = valuesChanged || keepsChanged;
  // Only rebuild DOM when faces or slot count changed (prevents wiping rolling animation on unrelated state changes)
  const needInitialRender = diceContainer.childElementCount === 0;
  const prevSlots = root._prevDiceSlots || 6;
  const shouldRebuild = needInitialRender || facesChanged || diceSlots !== prevSlots;
  if (shouldRebuild) {
    // Build full list including placeholders for unrolled extra dice
    const rendered = [];
    for (let i = 0; i < diceSlots; i++) {
      const face = faces[i];
      const isExtra = i >= 6;
      if (face) {
        // Only hide results when face values change from a roll (not when only kept flags change)
        const hideResult = valuesChanged && !face.kept;
        const content = hideResult ? '?' : symbolFor(face.value);
        const extraCls = hideResult ? ' reveal-pending' : '';
        // Add a subtle selection indicator (lift) via 'is-kept' without any yellow outline
        rendered.push(`<span class="die ${face.kept ? 'is-kept' : ''} ${isExtra ? 'extra-die' : ''}${extraCls}" data-die-index="${i}" data-face="${face.value}">${content}</span>`);
      } else {
        // For extra dice (7th, 8th) show blank dashed slot (no '?')
        const content = isExtra ? '' : '?';
        rendered.push(`<span class="die pending ${isExtra ? 'extra-die' : ''}" data-die-index="${i}">${content}</span>`);
      }
    }
    diceContainer.innerHTML = rendered.join('');
  }
  // Trigger rolling animation only when face values changed (a roll occurred), not on keep toggles
  if (valuesChanged) {
    const DURATION = 650;
    // Defer to next frame to ensure DOM paint before starting animation
    requestAnimationFrame(() => {
      for (let i = 0; i < diceSlots; i++) {
        const face = faces[i];
        const dieEl = diceContainer.querySelector(`[data-die-index="${i}"]`);
        if (!dieEl) continue;
        if (face && !face.kept) {
          dieEl.classList.remove('rolling'); // restart if previously applied
          // Force reflow to reset animation state
          void dieEl.offsetWidth; // eslint-disable-line no-unused-expressions
          dieEl.classList.add('rolling');
          // Ensure placeholder is visible during shake
          dieEl.textContent = '?';
          // Reveal final face after animation completes
          setTimeout(() => {
            dieEl.classList.remove('rolling');
            dieEl.classList.remove('reveal-pending');
            try { dieEl.textContent = symbolFor(face.value); } catch(_) {}
          }, DURATION);
        } else {
          dieEl.classList.remove('rolling');
        }
      }
    });
  }
  // Detect expansion
  if (diceSlots > prevSlots) {
    // Mark new dice indices with animation class
    for (let i = prevSlots; i < diceSlots; i++) {
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
    case 'heart': return '❤️';
    case 'heal': return '❤️'; // synonym used by legacy/config
    case 'energy': return '⚡';
    case 'claw': return '⚔️';
    case 'attack': return '⚔️'; // synonym used by legacy/config
    case 'smash': return '⚔️'; // safety: map any smash nomenclature to attack icon
    case '1': return '1';
    case '2': return '2';
    case '3': return '3';
    default: return '?'; // never show raw words on the dice
  }
}

// Event wiring centralized in src/ui/eventsToActions.js
