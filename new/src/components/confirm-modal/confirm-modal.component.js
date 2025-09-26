// confirm-modal.component.js
import { uiConfirmClose } from '../../core/actions.js';
import { store } from '../../bootstrap/index.js';

export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' cmp-confirm-modal modal-shell';
  root.innerHTML = template();
  root.addEventListener('click', (e) => {
    if (e.target.matches('[data-close]')) {
      store.dispatch(uiConfirmClose());
    } else if (e.target.matches('[data-confirm]')) {
      const state = store.getState();
      const id = state.ui?.confirm?.confirmId;
      // Dispatch synthetic event so game logic can listen without coupling
      window.dispatchEvent(new CustomEvent('ui.confirm.accepted', { detail: { confirmId: id } }));
      store.dispatch(uiConfirmClose());
    } else if (e.target.matches('[data-cancel]')) {
      store.dispatch(uiConfirmClose());
    }
  });
  return { root, update: ({ state }) => sync(root, state) };
}

function template() {
  return `<div class="modal" data-modal role="dialog" aria-modal="true" aria-labelledby="confirm-title" hidden>
    <div class="modal-header"><h2 id="confirm-title">Confirm</h2><button data-close aria-label="Close">×</button></div>
    <div class="modal-body" data-message style="white-space:pre-line;font-size:14px;line-height:1.4;"></div>
    <div class="modal-footer" style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
      <button data-cancel class="k-btn k-btn-secondary">Cancel</button>
      <button data-confirm class="k-btn k-btn-primary">Confirm</button>
    </div>
  </div>`;
}

function sync(root, fullState) {
  const data = fullState.ui?.confirm;
  const modal = root.querySelector('[data-modal]');
  if (!data || !data.open) {
    modal.setAttribute('hidden','');
    return;
  }
  modal.removeAttribute('hidden');
  const msgEl = root.querySelector('[data-message]');
  msgEl.textContent = data.message || '';
  const confirmBtn = root.querySelector('[data-confirm]');
  const cancelBtn = root.querySelector('[data-cancel]');
  confirmBtn.textContent = data.confirmLabel || 'Confirm';
  cancelBtn.textContent = data.cancelLabel || 'Cancel';
}

export function update(ctx) { ctx.inst.update(ctx); }
