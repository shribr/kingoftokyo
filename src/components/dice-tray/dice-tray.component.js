/** dice-tray.component.js
 * MIGRATED: Legacy structural classes (.dice-area, .draggable) removed.
 * Source extraction complete -> visuals governed by css/components.dice-tray.css.
 * Next: prune legacy .dice-area / draggable styling blocks after confirming no other components rely on them.
 */
import { eventBus } from '../../core/eventBus.js';
import { selectActivePlayer } from '../../core/selectors.js';
import { store } from '../../bootstrap/index.js';
import { createPositioningService } from '../../services/positioningService.js';
import { DICE_ANIM_MS } from '../../constants/uiTimings.js';

export function build({ selector, emit }) {
  const root = document.createElement('div');
  root.id = 'dice-tray';
  root.className = 'cmp-dice-tray';
  root.setAttribute('data-draggable','true');
  // Tray outer + inner frame + dice row
  root.innerHTML = `<div class="tray-outer" data-tray-outer>
      <div class="tray-frame" data-tray-frame>
        <div class="dice" data-dice aria-label="Dice Tray"></div>
      </div>
    </div>`;

  // Utility: determine mobile / touch mode (same heuristic used elsewhere)
  const checkMobile = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobileWidth = width <= 760;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isLandscapeMobile = (width <= 1024 && height <= 768 && isTouchDevice);
    return isMobileWidth || isTouchDevice || (isLandscapeMobile && width < 900);
  };
  const setupMobile = () => {
    const isMobile = checkMobile();
    if (isMobile) {
      // Ensure tray-outer remains visible (undo previous hide logic)
      try {
        const outer = root.querySelector('[data-tray-outer]');
        if (outer && outer.style.display === 'none') {
          outer.style.display = outer._origDisplay || '';
        }
      } catch(_) {}
      // Use attribute-driven approach consistent with CSS (data-collapsed="left" hides off-screen)
      const firstInit = !root.hasAttribute('data-mobile-init');
      root.setAttribute('data-mobile-init','true');
      root.style.position = 'fixed';
      root.style.bottom = '0'; // CSS media query may offset further if needed
      // We'll set left/width after ensuring toggle button exists (dynamic offset so tray clears button)
      root.style.right = 'auto';
      root.style.top = 'auto';
      root.style.transform = 'translateX(0)';
      root.style.transition = 'transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      // On first mobile init force collapsed
      if (firstInit) {
        root.removeAttribute('data-collapsed');
        root.setAttribute('data-collapsed','left');
        root.classList.remove('expanded');
        root.style.transform = 'translateX(-100%)';
      } else {
        // Preserve previous expanded/collapsed state via attribute
        const collapsed = root.getAttribute('data-collapsed') === 'left';
        root.style.transform = collapsed ? 'translateX(-100%)' : 'translateX(0)';
      }
      // Toggle button
      const existingBtn = document.getElementById('dice-toggle-btn');
      if (existingBtn) existingBtn.remove();
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.id = 'dice-toggle-btn';
  toggleBtn.className = 'dice-toggle-btn';
  toggleBtn.innerHTML = '<span class="vh">Toggle Dice Tray</span>\uD83C\uDFB2';
  toggleBtn.setAttribute('aria-label','Toggle Dice Tray');
  toggleBtn.setAttribute('aria-expanded','false');
      Object.assign(toggleBtn.style, {
        position:'fixed', bottom:'2vh', right:'10vw', width:'12vh', height:'12vh', background:'#ffcf33', border:'3px solid #333', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'5vh', cursor:'pointer', boxShadow:'0 0.4vh 1.2vh rgba(0,0,0,0.3)', zIndex:'6700', transition:'transform 0.2s ease'
      });
      // Helper to apply dynamic offset so tray's left edge sits just to the right of the toggle button
      const applyMobileOffset = () => {
        try {
          const rect = toggleBtn.getBoundingClientRect();
          const gap = window.innerWidth * 0.016; // 1.6vw - increased clearance so dice not blocked by button
          const offsetPx = Math.round(rect.left + rect.width + gap);
          const offsetVw = (offsetPx / window.innerWidth) * 100;
          root.style.left = offsetVw + 'vw';
          // Expand width a bit more now that gap increased; retain 0.5vw safety
          root.style.width = `calc(100vw - ${offsetVw + 0.5}vw)`;
          // Recompute current transform based on collapsed state
          const collapsed = root.getAttribute('data-collapsed') === 'left';
          root.style.transform = collapsed ? 'translateX(-100%)' : 'translateX(0)';
        } catch(_) {
          // Fallback: full width if measurement fails
          root.style.left = '0';
          root.style.width = 'calc(100vw - 1vw)';
        }
      };
      toggleBtn.addEventListener('click', () => {
        const collapsedNow = root.getAttribute('data-collapsed') === 'left';
        if (collapsedNow) {
          root.setAttribute('data-collapsed','none');
          applyMobileOffset();
          toggleBtn.style.transform = 'scale(0.9)';
          toggleBtn.setAttribute('aria-expanded','true');
        } else {
          root.setAttribute('data-collapsed','left');
          root.style.transform = 'translateX(-100%)';
          toggleBtn.style.transform = 'scale(1)';
          toggleBtn.setAttribute('aria-expanded','false');
        }
      });
      document.body.appendChild(toggleBtn);
      root._toggleBtn = toggleBtn;
      // Apply offset once appended (layout now known)
      requestAnimationFrame(applyMobileOffset);
      // Also adjust on resize/orientation changes
      window.addEventListener('resize', applyMobileOffset, { once:false });
      root._applyMobileOffset = applyMobileOffset;
    } else {
      // Clean up mobile state (tray-outer already visible)
      const existingBtn = document.getElementById('dice-toggle-btn');
      if (existingBtn) existingBtn.remove();
      root.removeAttribute('data-mobile-init');
      root.removeAttribute('data-collapsed');
      root.style.position = '';
      root.style.bottom = '';
      root.style.left = '';
      root.style.right = '';
      root.style.top = '';
      root.style.width = '';
      root.style.transform = '';
      root.style.transition = '';
      if (root._applyMobileOffset) {
        window.removeEventListener('resize', root._applyMobileOffset);
        delete root._applyMobileOffset;
      }
    }
  };
  
  // Setup mobile immediately and on resize
  setupMobile();
  window.addEventListener('resize', setupMobile);

  // Make draggable & persistent
  const positioning = createPositioningService(store);
  positioning.hydrate(); // ensure positions loaded (idempotent)
  const isTouch = matchMedia('(pointer: coarse)').matches || window.innerWidth <= 760;
  if (!isTouch) {
    // Exclude dice items from drag gesture so clicks toggle keeps reliably; without a handle we restrict drag start to tray frame background
    positioning.makeDraggable(root, 'diceTray', { snapEdges: true, snapThreshold: 12, noDragSelector: '[data-dice], [data-dice] *' });
  } else {
    root.setAttribute('data-draggable','false');
  }

  // If user has not manually moved tray (no stored position), it will be positioned by positioningService.
  function autoAlignIfNotUserMoved() {
    // Skip auto-align entirely on mobile/touch (not draggable there)
    if (checkMobile()) return;
    const persisted = positioning.getPersistedPosition?.('diceTray');
    if (persisted) return; // user customized position; don't override
    
    // Don't apply any positioning here - let positioningService handle it
    // This function just ensures we don't override user-dragged positions
  }
  // Align on next frame (after arena laid out) and on resize
  requestAnimationFrame(autoAlignIfNotUserMoved);
  window.addEventListener('resize', autoAlignIfNotUserMoved);
  root._destroyExtras = () => {
    window.removeEventListener('resize', autoAlignIfNotUserMoved);
    window.removeEventListener('resize', setupMobile);
  };

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
        const dicePhase = st.dice?.phase;
        const keepablePhase = dicePhase === 'resolved' || dicePhase === 'sequence-complete';
        if (st.phase !== 'ROLL' || !keepablePhase || isCpu) return;
      } catch(_) { /* fallback: allow if uncertain */ }
      emit('ui/dice/keptToggled', { index: idx });
    }
  });

  return { root, update: (props) => update(root, props), destroy: () => { 
    root._destroyExtras && root._destroyExtras(); 
    if (root._toggleBtn) {
      root._toggleBtn.remove();
    }
    root.remove(); 
  } };
}

export function update(root, { state }) {
  const diceContainer = root.querySelector('[data-dice]');
  if (!diceContainer) return;
  const collapseBtn = root.querySelector('[data-collapse-toggle]');
  const globalState = store.getState();
  const active = selectActivePlayer(globalState);
  const diceSlots = 6; // Keep it simple - always 6 dice for mobile
  // Accept both nested slice shape ({ dice: {...} }) and flat ({ faces, ... })
  const diceState = (state && state.dice) ? state.dice : (state || {});
  const faces = diceState.faces || [];
  // Active player highlight on root (used by CSS for subtle glow)
  // Removed active-player visual highlighting for dice tray (no stylistic changes requested)

  const prevFaces = root._prevFaces || [];
  const valuesChanged = faces.length && (faces.length !== prevFaces.length || faces.some((f,i) => !prevFaces[i] || prevFaces[i].value !== f.value));
  const keepsChanged = faces.length && prevFaces.length === faces.length && faces.some((f,i) => prevFaces[i] && prevFaces[i].kept !== f.kept);
  const facesChanged = valuesChanged || keepsChanged;
  const prefersReduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Only rebuild DOM when faces or slot count changed (prevents wiping rolling animation on unrelated state changes)
  const needInitialRender = diceContainer.childElementCount === 0;
  const prevSlots = root._prevDiceSlots || 6;
  const shouldRebuild = needInitialRender || facesChanged || diceSlots !== prevSlots;
  if (shouldRebuild) {
    // Build full list including placeholders for unrolled extra dice
    const rendered = [];
    // Show slots based on player's modifiers (6 standard + extra from power cards)
    // Only show extra slots (7th, 8th) if player has power cards granting them
    const totalSlots = Math.max(diceSlots, 6); // At minimum show 6, max 8 if player has extra dice
    for (let i = 0; i < totalSlots; i++) {
      const face = faces[i];
      const isExtra = i >= 6;
      if (face) {
        // Only hide results when face values change from a roll (not when only kept flags change)
        const hideResult = valuesChanged && !face.kept;
        const content = hideResult ? '?' : symbolFor(face.value);
        const extraCls = hideResult ? ' reveal-pending' : '';
        
        // Check if we're on mobile for mini dice styling
        const isMobile = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
        const baseClass = isMobile ? 'mini-die' : 'die';
        const faceClass = isMobile ? getFaceClass(face.value) : '';
        const keptClass = face.kept ? (isMobile ? 'selected' : 'is-kept') : '';
        
        // Add a subtle selection indicator (lift) via 'is-kept' without any yellow outline
        rendered.push(`<span class="${baseClass} ${keptClass} ${isExtra ? 'extra-die' : ''} ${faceClass}${extraCls}" data-die-index="${i}" data-face="${face.value}">${content}</span>`);
      } else {
        // For extra dice (7th, 8th) show empty compartments with dashed border
        // For regular dice (1-6) show '?' when waiting for roll
        const content = isExtra ? '' : '?';
        const extraClass = isExtra ? 'extra-die empty-compartment' : '';
        const isMobile = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
        const baseClass = isMobile ? 'mini-die' : 'die';
        
        rendered.push(`<span class="${baseClass} pending ${extraClass}" data-die-index="${i}">${content}</span>`);
      }
    }
    diceContainer.innerHTML = rendered.join('');
  }
  // Trigger rolling animation only when face values changed (a roll occurred), not on keep toggles
  if (valuesChanged && !prefersReduced) {
    const DURATION = DICE_ANIM_MS;
    const totalSlots = Math.max(diceSlots, 6); // Animate only the slots that are shown
    // Defer to next frame to ensure DOM paint before starting animation
    requestAnimationFrame(() => {
      // Temporarily disable pointer interactions during roll to avoid keep toggles mid-animation
      const prevPointer = root.style.pointerEvents;
      root.style.pointerEvents = 'none';
      let anyAnimated = false;
      for (let i = 0; i < totalSlots; i++) {
        const face = faces[i];
        const dieEl = diceContainer.querySelector(`[data-die-index="${i}"]`);
        if (!dieEl) continue;
        if (face && !face.kept) {
          anyAnimated = true;
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
      // Guaranteed restoration fallback after duration even if last slot not animated
      setTimeout(() => { if (root.style.pointerEvents === 'none') root.style.pointerEvents = prevPointer; }, DURATION + 30);
    });
  } else if (valuesChanged && prefersReduced) {
    // Directly reveal values with no animation
    faces.forEach((face, i) => {
      const dieEl = diceContainer.querySelector(`[data-die-index="${i}"]`);
      if (dieEl && face && !face.kept) {
        dieEl.textContent = symbolFor(face.value);
        dieEl.classList.remove('rolling','reveal-pending');
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
  // Safety: if animation finished but pointer events stuck off (e.g. interrupted render), restore when dice resolved
  try {
    if (root.style.pointerEvents === 'none' && diceState.phase === 'resolved') {
      root.style.pointerEvents = '';
    }
  } catch(_) {}
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

function getFaceClass(value) {
  switch(value) {
    case 'heart':
    case 'heal':
      return 'f-heart heal';
    case 'energy':
      return 'f-energy energy';
    case 'claw':
    case 'attack':
    case 'smash':
      return 'f-claw attack';
    case '1':
    case '2':
    case '3':
      return 'f-num vp';
    default:
      return '';
  }
}

// Event wiring centralized in src/ui/eventsToActions.js
