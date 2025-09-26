/** roll-for-first.component.js */
import { phaseChanged, metaActivePlayerSet, uiRollForFirstResolved } from '../../core/actions.js';

export function build({ selector, dispatch, getState }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' modal-shell rff-modal hidden';
  root.innerHTML = markup();
  root.addEventListener('click', (e) => {
    const t = e.target;
    if (t.matches('[data-action="close"]')) {
      hide(root);
      maybeClearBlackout();
    }
    if (t.matches('[data-action="roll"]')) {
      beginAnimatedRoll(dispatch, getState, root);
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
  return `<div class="modal rff-frame" role="dialog" aria-modal="true" aria-label="Roll For First Player">
    <div class="modal-header rff-header"><h2>ROLL FOR FIRST</h2><button class="rff-close" data-action="close" aria-label="Close">✕</button></div>
    <div class="modal-body rff-body" data-body>
      <p class="rff-intro">All monsters roll 1 die. Highest result takes the first turn. Ties re-roll.</p>
      <div class="rff-anim-dice" data-anim-dice hidden>
        ${[1,2,3,4,5,6].map(i => `<div class="rff-die" data-face="${i}"><span class="pip p1"></span><span class="pip p2"></span><span class="pip p3"></span><span class="pip p4"></span><span class="pip p5"></span><span class="pip p6"></span></div>`).join('')}
      </div>
      <div class="rff-results" data-results></div>
      <div class="rff-actions" data-actions>
        <button class="rff-btn rff-btn-primary" data-action="roll">ROLL DICE</button>
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
  maybeAutoDevRoll(dispatch, getState, root, rff);
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
    actions.innerHTML = '<button class="rff-btn rff-btn-primary" data-action="start">BEGIN GAME</button>';
  } else {
    actions.innerHTML = '<button class="rff-btn rff-btn-primary" data-action="roll">RE-ROLL TIED</button>';
  }
}

function beginAnimatedRoll(dispatch, getState, root) {
  const animWrap = root.querySelector('[data-anim-dice]');
  const resultsEl = root.querySelector('[data-results]');
  const actions = root.querySelector('[data-actions]');
  if (!animWrap || !resultsEl || !actions) return performRoll(dispatch, getState, root);
  // Reset state
  resultsEl.innerHTML = '';
  actions.innerHTML = '<button class="rff-btn rff-btn-primary" disabled>ROLLING...</button>';
  animWrap.hidden = false;
  // Randomize faces quickly to simulate rolling
  const dice = Array.from(animWrap.querySelectorAll('.rff-die'));
  const start = performance.now();
  const duration = 1400; // ms
  const shuffle = (now) => {
    const elapsed = now - start;
    const t = Math.min(1, elapsed / duration);
    dice.forEach(d => {
      const face = 1 + Math.floor(Math.random()*6);
      d.setAttribute('data-face', face);
    });
    if (t < 1) {
      animWrap._rffRaf = requestAnimationFrame(shuffle);
    } else {
      cancelAnimationFrame(animWrap._rffRaf);
      animWrap.hidden = true;
      performRoll(dispatch, getState, root);
    }
  };
  if (animWrap._rffRaf) cancelAnimationFrame(animWrap._rffRaf);
  animWrap._rffRaf = requestAnimationFrame(shuffle);
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

// Dev hash flag: #autorollfirst => automatically roll once modal opens, keep re-rolling ties until resolved
function maybeAutoDevRoll(dispatch, getState, root, rff) {
  if (!location.hash.toLowerCase().includes('autorollfirst')) return;
  if (rff && rff._devAutoRan) return; // simple guard
  rff._devAutoRan = true;
  const loop = () => {
    performRoll(dispatch, getState, root);
    const actions = root.querySelector('[data-actions]');
    if (!actions) return;
    const startBtn = actions.querySelector('[data-action="start"]');
    if (startBtn) {
      startBtn.click();
      return;
    }
    const rerollBtn = actions.querySelector('[data-action="roll"]');
    if (rerollBtn) setTimeout(loop, 300);
  };
  setTimeout(loop, 200);
}