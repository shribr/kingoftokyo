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
    const applyBounds = () => ({ left:0, top:0, right: window.innerWidth, bottom: window.innerHeight });
    positioning.makeDraggable(root, 'actionMenu', { snapEdges: true, snapThreshold: 12, bounds: applyBounds() });
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
  const dice = st.dice;
  const hasAnyFaces = dice.faces && dice.faces.length > 0;
  const canRoll = st.phase === 'ROLL' && dice.rollsUsed < (dice.allowedRerolls + 1 || 3);
  rollBtn.disabled = !canRoll;
  keepBtn.disabled = !(st.phase === 'ROLL' && hasAnyFaces);
  endBtn.disabled = st.phase === 'ROLL';
  enforceVerticalLayout(root);
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
