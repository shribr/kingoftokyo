/** ui/a11yOverlays.js
 * Injects lightweight accessible overlays for peek modal & yield prompts.
 */
import { store, logger } from '../bootstrap/index.js';
import { uiPeekHide, yieldPromptDecided, playerLeftTokyo } from '../core/actions.js';

let peekEl = null;
let yieldContainer = null;

function ensurePeekEl() {
  if (!peekEl) {
    peekEl = document.createElement('div');
    peekEl.id = 'peek-modal';
    peekEl.setAttribute('role', 'dialog');
    peekEl.setAttribute('aria-modal', 'true');
    peekEl.setAttribute('aria-label', 'Top card preview');
    peekEl.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.55);z-index:1000;';
    const inner = document.createElement('div');
    inner.style.cssText = 'background:#111;color:#fff;padding:16px;border-radius:8px;min-width:240px;max-width:320px;outline:0;';
    inner.tabIndex = -1;
    inner.innerHTML = '<div id="peek-card-name" style="font-weight:bold"></div><button id="peek-close" style="margin-top:12px">Close</button>';
    peekEl.appendChild(inner);
    document.body.appendChild(peekEl);
    inner.querySelector('#peek-close').addEventListener('click', () => store.dispatch(uiPeekHide()));
    peekEl.addEventListener('keydown', (e) => { if (e.key === 'Escape') store.dispatch(uiPeekHide()); });
  }
  return peekEl;
}

function updatePeek(card) {
  if (card) {
    const el = ensurePeekEl();
    el.style.display = 'flex';
    el.querySelector('#peek-card-name').textContent = card.name;
    requestAnimationFrame(() => el.querySelector('div').focus());
  } else if (peekEl) {
    peekEl.style.display = 'none';
  }
}

function ensureYieldContainer() {
  if (!yieldContainer) {
    yieldContainer = document.createElement('div');
    yieldContainer.id = 'yield-prompts';
    yieldContainer.style.cssText = 'position:fixed;bottom:8px;right:8px;display:flex;flex-direction:column;gap:8px;z-index:1001;';
    document.body.appendChild(yieldContainer);
  }
  return yieldContainer;
}

function renderYieldPrompts(prompts, state) {
  const cont = ensureYieldContainer();
  // Remove resolved
  cont.innerHTML = '';
  const pending = prompts.filter(p => p.decision == null);
  for (const p of pending) {
    const defender = state.players.byId[p.defenderId];
    if (!defender || !defender.status.alive) continue;
    const panel = document.createElement('div');
    panel.setAttribute('role','alertdialog');
    panel.setAttribute('aria-label', `Yield Tokyo ${p.slot}`);
    panel.style.cssText = 'background:#222;color:#fff;padding:8px 12px;border-radius:6px;box-shadow:0 2px 4px rgba(0,0,0,0.4);';
    const timeLeft = Math.max(0, p.expiresAt - Date.now());
    panel.innerHTML = `<div style="font-size:13px">${p.defenderId}: Yield Tokyo ${p.slot}? <span aria-live="polite">${Math.ceil(timeLeft/1000)}s</span></div>`;
    const btnStay = document.createElement('button'); btnStay.textContent = 'Stay'; btnStay.style.marginRight = '6px';
    const btnYield = document.createElement('button'); btnYield.textContent = 'Yield';
    btnStay.addEventListener('click', () => store.dispatch(yieldPromptDecided(p.defenderId, p.attackerId, p.slot, 'stay')));
    btnYield.addEventListener('click', () => {
      store.dispatch(yieldPromptDecided(p.defenderId, p.attackerId, p.slot, 'yield'));
      store.dispatch(playerLeftTokyo(p.defenderId));
    });
    panel.appendChild(document.createElement('div')).appendChild(btnStay);
    panel.appendChild(btnYield);
    cont.appendChild(panel);
  }
  cont.style.display = pending.length ? 'flex' : 'none';
}

let lastYieldRender = 0;
store.subscribe((state, action) => {
  // Peek overlay
  const card = state.ui.peek.card;
  updatePeek(card);
  // Yield prompts (throttle re-render to ~5 fps)
  const now = performance.now();
  if (now - lastYieldRender > 200) {
    renderYieldPrompts(state.yield.prompts, state);
    lastYieldRender = now;
  }
});

// Expose globally for debugging
if (typeof window !== 'undefined') {
  window.__KOT_NEW__ = window.__KOT_NEW__ || {};
  window.__KOT_NEW__.a11yOverlays = { updatePeek };
}
