/** action-menu.component.js
 * MIGRATED: Legacy classes (.action-menu, .draggable, .btn) replaced.
 * Styles now sourced from css/components.action-menu.css + button tokens.
 * Pending: prune unused legacy .action-menu and draggable selectors.
 */
import { eventBus } from '../../core/eventBus.js';
import { store } from '../../bootstrap/index.js';
import { phaseChanged, nextTurn } from '../../core/actions.js';
import { createPositioningService } from '../../services/positioningService.js';

export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' cmp-action-menu cmp-panel-root';
  root.setAttribute('data-am-root','true');
  root.setAttribute('data-panel','action-menu');
  root.setAttribute('data-draggable','true');
  // Default layout now vertical (single column buttons); hybrid docking support
  root.setAttribute('data-layout','vertical');
  root.dataset.amDockState = 'docked'; // internal: docked | floating (for hybrid behavior)
  root.innerHTML = `
    <div class="am-label" aria-hidden="true">ACTIONS MENU</div>
    <button data-action="roll" class="k-btn k-btn--primary">ROLL</button>
    <button data-action="keep" class="k-btn k-btn--secondary" disabled>KEEP</button>
    <button data-action="end" class="k-btn k-btn--secondary" disabled>END TURN</button>`;
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const st = store.getState();
    switch(action){
      case 'roll': eventBus.emit('ui/dice/rollRequested'); break;
      case 'keep': // finalize roll early -> move to RESOLVE
        if (st.phase === 'ROLL') store.dispatch(phaseChanged('RESOLVE')); break;
      case 'end':
        if (st.phase !== 'ROLL') { store.dispatch(nextTurn()); store.dispatch(phaseChanged('ROLL')); }
        break; 
      // legacy panels toggle removed
    }
  });
  // Restore draggability & persisted position
  try {
    const positioning = createPositioningService(store);
    positioning.hydrate();
    // Disable dragging on touch/mobile (coarse pointer) or narrow viewports
    const isTouch = matchMedia('(pointer: coarse)').matches || window.innerWidth <= 760;
    if (isTouch) {
      root.setAttribute('data-draggable','false');
    }
    if (root.getAttribute('data-draggable') !== 'false') {
      const applyBounds = () => ({ left:0, top:0, right: window.innerWidth, bottom: window.innerHeight });
      positioning.makeDraggable(root, 'actionMenu', { snapEdges: true, snapThreshold: 12, bounds: applyBounds() });
    }
    // Track drag to switch hybrid -> floating
    let dragTransformStart = null;
    root.addEventListener('pointerdown', () => { dragTransformStart = root.style.transform; }, { capture:true });
    window.addEventListener('pointerup', () => {
      if (dragTransformStart !== null) {
        if (root.style.transform !== dragTransformStart) {
          root._userMoved = true;
          if ((store.getState().settings?.actionMenuMode || 'hybrid') === 'hybrid') {
            root.dataset.amDockState = 'floating';
          }
        }
        dragTransformStart = null;
      }
    });
    // Re-clamp on resize so it never drifts off-screen after viewport changes
    const clampIntoView = () => {
      const rect = root.getBoundingClientRect();
      const maxLeft = window.innerWidth - rect.width - 4;
      const maxTop = window.innerHeight - rect.height - 4;
      // Extract current translate
      const m = /translate\(([-0-9.]+)px,\s*([-0-9.]+)px\)/.exec(root.style.transform||'');
      let tx = m ? parseFloat(m[1]) : 0;
      let ty = m ? parseFloat(m[2]) : 0;
      // If using top/left positioning fallback (initial placement), compute from offsets
      if (!m) {
        tx = root.offsetLeft; ty = root.offsetTop;
      }
      tx = Math.min(Math.max(tx, 0), maxLeft);
      ty = Math.min(Math.max(ty, 0), maxTop);
      root.style.transform = `translate(${tx}px, ${ty}px)`;
    };
    window.addEventListener('resize', () => {
      const mode = store.getState().settings?.actionMenuMode || 'hybrid';
      if (mode === 'docked' || (mode === 'hybrid' && root.dataset.amDockState === 'docked')) {
        anchorActionMenu(root);
      }
      clampIntoView();
      ensureVisibleWithinViewport(root);
      avoidMonsterPanelOverlap(root);
    });
    // If no persisted position yet, place next to dice tray by default
    const persist = !!store.getState().settings?.persistPositions;
    const hasSaved = persist && !!store.getState().ui.positions.actionMenu;
    if (!hasSaved) {
      anchorActionMenu(root, true);
      // Additional pass after layout settle
      requestAnimationFrame(() => { if (!root._userMoved && root.dataset.amDockState === 'docked') anchorActionMenu(root); });
    }
  } catch(e) { /* non-fatal */ }
  return { root, update: () => update(root), destroy: () => { root.remove(); } };
}

// (legacy panels toggle removed)

// (Removed deferred DOMContentLoaded init; handled synchronously above)

// (Removed global fallback & debug instrumentation – drag service now respects data-nodrag)

export function update(root) {
  const st = store.getState();
  const rollBtn = root.querySelector('[data-action="roll"]');
  const keepBtn = root.querySelector('[data-action="keep"]');
  const endBtn = root.querySelector('[data-action="end"]');
  // no collapse button in mobile; hamburger opens/closes via window event
  const dice = st.dice || {};
  const faces = dice.faces || [];
  const hasAnyFaces = faces.length > 0;
  // New dice state model: phase: 'idle' | 'rolling' | 'resolved' | 'sequence-complete'
  // rerollsRemaining tracks how many rerolls still available (after first roll).
  const isIdle = dice.phase === 'idle';
  const canReroll = dice.phase === 'resolved' && dice.rerollsRemaining > 0;
  const canInitialRoll = isIdle;
  const canRoll = st.phase === 'ROLL' && (canInitialRoll || canReroll) && dice.phase !== 'rolling';
  const order = st.players.order;
  let active = null;
  if (order.length) {
    const activeId = order[st.meta.activePlayerIndex % order.length];
    active = st.players.byId[activeId];
  }
  const isCPU = !!(active && (active.isCPU || active.isAi || active.type === 'ai'));

  if (rollBtn) rollBtn.disabled = isCPU ? true : !canRoll;
  if (keepBtn) keepBtn.disabled = isCPU ? true : !(st.phase === 'ROLL' && hasAnyFaces && dice.phase === 'resolved');
  if (endBtn) endBtn.disabled = true; // always disabled during ROLL phase; for CPU we keep disabled anyway until human logic implemented

  // CPU turn styling state
  if (isCPU) root.classList.add('cpu-turn'); else root.classList.remove('cpu-turn');

  // Auto-roll for CPU active player (first roll only) after roll-for-first resolution
  try {
    if (isCPU && st.phase === 'ROLL' && isIdle && !hasAnyFaces) {
      if (root._lastCpuAutoRollIndex !== st.meta.activePlayerIndex) {
        root._lastCpuAutoRollIndex = st.meta.activePlayerIndex;
        setTimeout(() => {
          // Flash cue on roll button (visual indicator CPU took action)
          if (rollBtn) {
            rollBtn.classList.add('cpu-flash');
            setTimeout(()=> rollBtn && rollBtn.classList.remove('cpu-flash'), 1200);
          }
          eventBus.emit('ui/dice/rollRequested');
        }, 350);
      }
    } else if (!isCPU) {
      root._lastCpuAutoRollIndex = undefined;
    }
  } catch(_) {}

  enforceVerticalLayout(root);

  // Mobile/touch: horizontal layout and hamburger toggle behavior
  const isTouch = matchMedia('(pointer: coarse)').matches || window.innerWidth <= 760;
  if (isTouch) {
    root.setAttribute('data-layout','horizontal');
    // Position as a top-left drawer; hidden by default until hamburger toggles
    if (!root._hbWired) {
      root._hbWired = true;
      // Ensure backdrop element exists for outside-click close
      let backdrop = document.querySelector('.action-menu-backdrop');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'action-menu-backdrop';
        document.body.appendChild(backdrop);
      }
      const applyHidden = () => {
        const open = !!root._hamburgerOpen;
        root.toggleAttribute('data-hamburger-open', open);
        if (backdrop) backdrop.toggleAttribute('data-show', open);
      };
    // Hamburger toggle: open/close and anchor relative to the Actions button
  window.addEventListener('ui.actionMenu.hamburgerToggle', (e) => {
        // Close settings/tools menu if open to ensure only one menu is visible
        try { window.dispatchEvent(new CustomEvent('ui.settingsMenu.forceClose')); } catch(_){}
        root._hamburgerOpen = !root._hamburgerOpen;
        try {
          const r = e?.detail?.anchorRect;
          const bottom = 56 + 8; // sit above bottom-left Actions Menu button
          root.style.bottom = bottom + 'px';
          root.style.top = 'auto';
          root.setAttribute('data-hamburger-corner','left');
          root.style.left = '8px';
          root.style.right = 'auto';
          // Clear any transform-based drift from previous drags
          root.style.transform = 'translate(0, 0)';
          // Let CSS compute width; reset explicit width if any
          root.style.width = '';
        } catch(_){ }
        applyHidden();
      });
      // Outside click via backdrop
      backdrop.addEventListener('click', () => { if (root._hamburgerOpen) { root._hamburgerOpen = false; applyHidden(); } });
  // Listen for forced close from counterpart menu
  window.addEventListener('ui.actionMenu.forceClose', () => { if (root._hamburgerOpen) { root._hamburgerOpen = false; applyHidden(); } });
      // ESC to close
      window.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && root._hamburgerOpen) { root._hamburgerOpen = false; applyHidden(); } });
      window.addEventListener('resize', () => { if (window.innerWidth > 760) { root._hamburgerOpen = false; applyHidden(); } });
      applyHidden();
    }
  } else {
    root.setAttribute('data-layout','vertical');
    root.removeAttribute('data-collapsed');
    root._hamburgerOpen = false;
    root.removeAttribute('data-hamburger-open');
  }
}

// ------------------------------
// Enforce vertical layout (single column) regardless of viewport size
let amResizeRO;
function enforceVerticalLayout(root){
  if (!root) return;
  const apply = () => {
    root.setAttribute('data-layout','vertical');
    // If menu extends beyond viewport bottom, cap its height and enable internal scroll
    const rect = root.getBoundingClientRect();
    const maxVisible = window.innerHeight - 40; // leave some margin
    if (rect.height > maxVisible) {
      root.style.maxHeight = maxVisible + 'px';
      root.style.overflowY = 'auto';
    } else {
      root.style.maxHeight = '';
      root.style.overflowY = '';
    }
  };
  apply();
  if (!amResizeRO) {
    amResizeRO = new ResizeObserver(apply);
    amResizeRO.observe(document.documentElement);
    window.addEventListener('orientationchange', apply);
    window.addEventListener('resize', apply);
  }
}

// Ensure the menu never ends up fully below the fold after drastic vertical resize.
function ensureVisibleWithinViewport(root) {
  try {
    const rect = root.getBoundingClientRect();
    const vh = window.innerHeight;
    // If bottom is above 0 (fine) or top within viewport we do nothing.
    // If top is beyond viewport height (menu moved off-screen), reset to a safe anchor.
    if (rect.top > vh - 40) {
      // Anchor near bottom with small padding
      const desiredTop = Math.max(10, vh - rect.height - 90); // leave room above footer (64px + margin)
      root.style.top = desiredTop + 'px';
      root.style.bottom = '';
      // Clear transform-based translation if present
      root.style.transform = 'translate(0,0)';
    }
    // If header overlap pushes it out of view (negative top beyond threshold), nudge down
    if (rect.top < 0) {
      const offset = Math.min(0, rect.top) * -1 + 10;
      const currentTop = parseInt(root.style.top||'0',10) || 0;
      root.style.top = (currentTop + offset) + 'px';
    }
  } catch(_) {}
}

// If overlapping (visually) with monsters panel on right side, nudge action menu left.
function avoidMonsterPanelOverlap(root) {
  try {
    const monsters = document.querySelector('.cmp-monsters-panel');
    if (!monsters) return;
    const rRect = root.getBoundingClientRect();
    const mRect = monsters.getBoundingClientRect();
    const overlapX = rRect.left < mRect.right && rRect.right > mRect.left;
    const overlapY = rRect.top < mRect.bottom && rRect.bottom > mRect.top;
    if (overlapX && overlapY) {
      // Compute new left position so its right edge sits 12px left of monsters panel
      const shiftLeft = (mRect.left - 12) - rRect.width;
      if (shiftLeft > 0) {
        root.style.left = shiftLeft + 'px';
        root.style.right = 'auto';
        root.style.transform = 'translate(0,0)';
      } else {
        // fallback: place it below monsters panel
        root.style.top = (mRect.bottom + 16 + window.scrollY) + 'px';
        root.style.right = '50%';
      }
    }
  } catch(_) {}
}

// Re-anchor near dice tray (used for docked mode and hybrid before user drag)
function anchorActionMenu(root, initial=false) {
  const toolbar = document.querySelector('.cmp-toolbar');
  const mode = store.getState().settings?.actionMenuMode || 'hybrid';
  if (root._userMoved && (mode === 'floating' || mode === 'hybrid')) return;
  if (!toolbar) {
    // Fallback: top-right viewport anchor
    if (initial && (anchorActionMenu._tries = (anchorActionMenu._tries||0)+1) < 12) {
      requestAnimationFrame(() => anchorActionMenu(root, true));
    }
    root.style.left = (window.innerWidth - root.offsetWidth - 40) + 'px';
    root.style.top = '100px';
    root.style.transform = 'translate(0,0)';
    if (mode === 'hybrid') root.dataset.amDockState = 'docked';
    return;
  }
  const r = toolbar.getBoundingClientRect();
  const scrollY = window.scrollY || 0;
  const GAP = 32;
  const desiredLeft = r.right + GAP;
  const maxLeft = window.innerWidth - (root.offsetWidth || 240) - 12;
  root.style.left = Math.min(desiredLeft, maxLeft) + 'px';
  // Ensure we have a measured height; if zero (not yet laid out) schedule another frame.
  const menuHeight = root.offsetHeight;
  if (!menuHeight && (anchorActionMenu._heightTries = (anchorActionMenu._heightTries||0)+1) < 5) {
    requestAnimationFrame(() => anchorActionMenu(root, initial));
    return;
  }
  // Align menu bottom to toolbar top => top = toolbarTop - menuHeight
  let top = r.top + scrollY - menuHeight;
  const minTop = 10;
  const maxTop = window.innerHeight - menuHeight - 10 + scrollY;
  if (top < minTop) top = minTop; else if (top > maxTop) top = maxTop;
  root.style.top = top + 'px';
  root.style.right = '';
  root.style.bottom = '';
  root.style.transform = 'translate(0,0)';
  if (mode === 'hybrid') root.dataset.amDockState = 'docked';
}
