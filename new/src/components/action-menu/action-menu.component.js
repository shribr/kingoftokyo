/** action-menu.component.js
 * MIGRATED: Legacy classes (.action-menu, .draggable, .btn) replaced.
 * Styles now sourced from css/components.action-menu.css + button tokens.
 * Pending: prune unused legacy .action-menu and draggable selectors.
 */
import { eventBus } from '../../core/eventBus.js';
import { store } from '../../bootstrap/index.js';
import { phaseChanged, nextTurn } from '../../core/actions.js';

export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' cmp-action-menu cmp-panel-root';
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
    }
  });
  return { root, update: () => update(root) };
}

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
