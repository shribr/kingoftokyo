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
  root.setAttribute('data-layout','horizontal');
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
  // Do NOT pass bounds limiting left movement; allow full horizontal travel similar to dice tray.
    const applyBounds = () => ({ left:0, top:0, right: window.innerWidth, bottom: window.innerHeight });
    positioning.makeDraggable(root, 'actionMenu', { snapEdges: true, snapThreshold: 12, bounds: applyBounds() });
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
      clampIntoView();
    });
    // If no persisted position yet, place next to dice tray by default
    const persist = !!store.getState().settings?.persistPositions;
    const hasSaved = persist && !!store.getState().ui.positions.actionMenu;
    if (!hasSaved) {
      const GAP = 48; // separation from dice tray
      const attemptPlace = () => {
        const tray = document.querySelector('.cmp-dice-tray');
        if (!tray) { if ((attemptPlace._tries = (attemptPlace._tries||0)+1) < 10) requestAnimationFrame(attemptPlace); return; }
        try {
          const trayRect = tray.getBoundingClientRect();
          root.style.right = '';
          // Align top edges
          const desiredTop = trayRect.top;
          const menuApproxH = 140;
          const scrollY = window.scrollY || 0;
          root.style.top = Math.max(10, desiredTop + scrollY) + 'px';
          root.style.bottom = '';
          const menuApproxW = 240;
          const desiredLeft = trayRect.right + GAP;
          const maxLeft = window.innerWidth - menuApproxW - 8;
          root.style.left = Math.min(desiredLeft, maxLeft) + 'px';
        } catch(_) {}
      };
      requestAnimationFrame(attemptPlace);
    }
  } catch(e) { /* non-fatal */ }
  return { root, update: () => update(root) };
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
  adaptiveLayout(root);
}

// ------------------------------
// Adaptive layout: switch to vertical if horizontal width would overflow viewport
let amResizeRO;
function adaptiveLayout(root){
  if (!root) return;
  const apply = () => {
    try {
      const paddingX = 28; // approx left+right
      const gap = 8;
      const btns = [...root.querySelectorAll('button')];
      const totalBtnWidth = btns.reduce((acc,b)=>acc + b.getBoundingClientRect().width,0);
      const rowWidth = totalBtnWidth + gap*(btns.length-1) + paddingX;
      const viewportW = window.innerWidth;
      const shouldVertical = rowWidth > viewportW * 0.9; // near overflow
      root.setAttribute('data-layout', shouldVertical ? 'vertical':'horizontal');
    } catch(_) {}
  };
  // Initial
  apply();
  // Resize observer (buttons may wrap due to font load)
  if (!amResizeRO) {
    amResizeRO = new ResizeObserver(() => apply());
    amResizeRO.observe(document.documentElement);
    window.addEventListener('orientationchange', apply);
    window.addEventListener('resize', apply);
  }
}
