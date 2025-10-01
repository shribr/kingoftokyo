// about-modal.component.js
import { uiAboutClose } from '../../core/actions.js';

export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' cmp-about-modal modal-shell';
  root.innerHTML = `<div class="modal" data-modal aria-modal="true" role="dialog" aria-labelledby="about-title" hidden>
    <div class="modal-header"><h2 id="about-title">About</h2><button data-close aria-label="Close">×</button></div>
    <div class="modal-body" style="font-size:14px;line-height:1.5;">
      <p><strong>King of Tokyo – Enhanced UI Prototype</strong></p>
      <p>This experimental interface focuses on modular components, accessibility, flexible layout density (stacked / condensed / list), and clearer AI affordances.</p>
      <p>Session build: <span data-build-ts></span></p>
      <p style="opacity:.6;font-size:12px;">All trademarks belong to their respective owners. Prototype for personal/educational use.</p>
    </div>
  </div>`;
  root.addEventListener('click', (e) => { if (e.target.matches('[data-close]')) dispatchClose(); });
  return { root, update: ({ state }) => sync(root, state) };
}

function dispatchClose() { import('../../bootstrap/index.js').then(m => m.store.dispatch(uiAboutClose())); }

function sync(root, state) {
  const open = state.ui?.about?.open;
  const modal = root.querySelector('[data-modal]');
  if (!open) { modal.setAttribute('hidden',''); return; }
  modal.removeAttribute('hidden');
  const tsEl = root.querySelector('[data-build-ts]');
  if (tsEl && !tsEl.textContent) tsEl.textContent = new Date().toLocaleString();
}

export function update(ctx) { ctx.inst.update(ctx); }
