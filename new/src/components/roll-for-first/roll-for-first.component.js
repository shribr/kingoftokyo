/** roll-for-first.component.js */
import { phaseChanged, metaActivePlayerSet, uiRollForFirstResolved } from '../../core/actions.js';

export function build({ selector, dispatch, getState }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' rff-modal hidden'; // selector already .cmp-roll-for-first
  root.innerHTML = markup();
  root.addEventListener('click', (e) => {
    const t = e.target;
    if (t.matches('[data-action="close"]')) {
      hide(root);
      maybeClearBlackout();
    }
    if (t.matches('[data-action="roll"]')) {
      performRoll(dispatch, getState, root);
    }
    if (t.matches('[data-action="start"]')) {
      hide(root);
      dispatch(uiRollForFirstResolved());
      // Start game if still in SETUP phase (turn service subscriber will not auto-start now; we directly set phase)
      const st = getState();
      if (st.phase === 'SETUP') dispatch(phaseChanged('ROLL'));
    }
  });
  return { root, update: (ctx) => update(ctx, root, dispatch, getState) };
}

function markup() {
  return `<div class="rff-frame">
    <div class="rff-header"><h2>ROLL FOR FIRST</h2><button class="rff-close" data-action="close" aria-label="Close">✕</button></div>
    <div class="rff-body" data-body>
      <p class="rff-intro">All monsters roll 1 die. Highest result takes the first turn. Ties re-roll.</p>
      <div class="rff-results" data-results></div>
      <div class="rff-actions" data-actions>
        <button class="rff-btn rff-btn-primary" data-action="roll">Roll Dice</button>
      </div>
    </div>
  </div>`;
}

export function update(ctx, root, dispatch, getState) {
  const state = ctx.fullState || ctx.state;
  const rff = state.ui?.rollForFirst;
  const open = rff?.open;
  if (!open) { hide(root); return; }
  show(root);
  ensureBlackout();
}

function performRoll(dispatch, getState, root) {
  const st = getState();
  const order = [...st.players.order];
  if (!order.length) return;
  // simulate die rolls 1-6
  const rolls = order.map(id => ({ id, val: 1 + Math.floor(Math.random()*6) }));
  const max = Math.max(...rolls.map(r => r.val));
  const top = rolls.filter(r => r.val === max);
  const resultsEl = root.querySelector('[data-results]');
  if (resultsEl) {
    resultsEl.innerHTML = `<ul class="rff-rolls">${rolls.map(r => `<li><span class="rff-mon">${st.players.byId[r.id].name}</span><span class="rff-val">${r.val}</span></li>`).join('')}</ul>`;
  }
  const actions = root.querySelector('[data-actions]');
  if (top.length === 1) {
    const targetId = top[0].id;
    const idx = st.players.order.indexOf(targetId);
    if (idx >= 0) {
      dispatch(metaActivePlayerSet(idx));
      console.info('[roll-for-first] First player:', targetId, 'index', idx);
    }
    actions.innerHTML = '<button class="rff-btn rff-btn-primary" data-action="start">Begin Game</button>';
  } else {
    actions.innerHTML = '<button class="rff-btn rff-btn-primary" data-action="roll">Re-Roll Tied Monsters</button>';
  }
}

function show(root) { root.classList.remove('hidden'); }
function hide(root) { root.classList.add('hidden'); }

function ensureBlackout() {
  if (document.querySelector('.post-splash-blackout')) return;
  const div = document.createElement('div');
  div.className = 'post-splash-blackout';
  document.body.appendChild(div);
}
function maybeClearBlackout() {
  // Now blackout lifecycle managed by bootstrap after game start; keep as no-op fallback.
}