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
  positioning.makeDraggable(root, 'actionMenu', { snapEdges: true, snapThreshold: 12 });
    // If no persisted position yet, place next to dice tray by default
    const persist = !!store.getState().settings?.persistPositions;
    const hasSaved = persist && !!store.getState().ui.positions.actionMenu;
    if (!hasSaved) {
      const GAP = 48; // larger gap per request ("way the hell away")
      const attemptPlace = () => {
        const tray = document.querySelector('.cmp-dice-tray');
        if (!tray) { if ((attemptPlace._tries = (attemptPlace._tries||0)+1) < 10) requestAnimationFrame(attemptPlace); return; }
        try {
          const trayRect = tray.getBoundingClientRect();
          const bottomOffset = Math.max(0, window.innerHeight - trayRect.bottom);
          root.style.right = '';
          // Always place to right of tray with large separation
          const menuApproxW = 200;
          const desiredLeft = trayRect.right + GAP;
          const maxLeft = window.innerWidth - menuApproxW - 8;
          root.style.left = Math.min(desiredLeft, maxLeft) + 'px';
          root.style.bottom = bottomOffset + 'px';
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
}
