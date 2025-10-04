/** ui/a11yOverlays.js
 * Injects lightweight accessible overlays for peek modal & yield prompts.
 * Bound to the store at runtime to avoid circular imports.
 */
import { uiPeekHide, yieldPromptDecided, playerLeftTokyo } from '../core/actions.js';

let peekEl = null;
let yieldContainer = null;
let liveRegion = null;
let lastAnnouncedLogId = 0;

function ensurePeekEl(store) {
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
    inner.innerHTML = '<button id="peek-close" style="margin-top:12px">Close</button>';
    peekEl.appendChild(inner);
    document.body.appendChild(peekEl);
  inner.querySelector('#peek-close').addEventListener('click', () => store.dispatch(uiPeekHide()));
    // Focus trap & ESC
    peekEl.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { store.dispatch(uiPeekHide()); return; }
      if (e.key === 'Tab') {
        const focusables = Array.from(peekEl.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])'));
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }
  return peekEl;
}

function updatePeek(card, store) {
  // Disable a11y peek overlay since we have a proper peek modal component
  if (peekEl) {
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

function ensureLiveRegion() {
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'live-region';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'assertive');
    liveRegion.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;';
    document.body.appendChild(liveRegion);
  }
  return liveRegion;
}

function renderYieldPrompts(prompts, state, store) {
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
    // Countdown timer removed to avoid implying a time limit for human players
    const advisoryLine = p.advisory ? `<div style='font-size:11px;color:#ccc;margin-top:2px'>Suggest: ${p.advisory.suggestion === 'yield' ? 'Yield' : 'Stay'} – ${p.advisory.reason}</div>` : '';
    panel.innerHTML = `<div style="font-size:13px">${p.defenderId}: Yield Tokyo ${p.slot}? </div>${advisoryLine}`;
    const btnWrap = document.createElement('div'); btnWrap.style.marginTop = '4px';
    const btnStay = document.createElement('button'); btnStay.textContent = 'Stay'; btnStay.style.marginRight = '6px'; btnStay.setAttribute('aria-label','Stay in Tokyo');
    const btnYield = document.createElement('button'); btnYield.textContent = 'Yield'; btnYield.setAttribute('aria-label','Yield Tokyo');
    btnStay.addEventListener('click', () => store.dispatch(yieldPromptDecided(p.defenderId, p.attackerId, p.slot, 'stay')));
    btnYield.addEventListener('click', () => {
      store.dispatch(yieldPromptDecided(p.defenderId, p.attackerId, p.slot, 'yield'));
      store.dispatch(playerLeftTokyo(p.defenderId));
    });
    btnWrap.appendChild(btnStay); btnWrap.appendChild(btnYield);
    panel.appendChild(btnWrap);
    cont.appendChild(panel);
    // Focus first button if newly added
    setTimeout(() => { if (document.activeElement === document.body) btnStay.focus(); }, 0);
  }
  cont.style.display = pending.length ? 'flex' : 'none';
}

let lastYieldRender = 0;
let boundStore = null;

export function bindA11yOverlays(store) {
  boundStore = store;
  store.subscribe((state) => {
    // Peek overlay
    const card = state.ui.peek?.card || null;
    updatePeek(card, store);
    // Yield prompts (throttle re-render to ~5 fps)
    const now = performance.now();
    if (now - lastYieldRender > 200) {
      const prompts = state.yield?.prompts || [];
      renderYieldPrompts(prompts, state, store);
      lastYieldRender = now;
    }
    // Live region announcements from logs (announce new meaningful events)
    ensureLiveRegion();
    const log = state.log?.entries || state.log; // depending on slice shape
    if (Array.isArray(log) && log.length) {
      const latest = log[log.length - 1];
      if (latest.id && latest.id !== lastAnnouncedLogId) {
        if (['tokyo','damage','vp','energy','system'].includes(latest.kind)) {
          liveRegion.textContent = latest.message;
          lastAnnouncedLogId = latest.id;
        }
      }
    }
  });
  // Expose globally for debugging with bound store
  if (typeof window !== 'undefined') {
    window.__KOT_NEW__ = window.__KOT_NEW__ || {};
    window.__KOT_NEW__.a11yOverlays = { updatePeek: (card) => updatePeek(card, store) };
  }
}
