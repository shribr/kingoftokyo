// components/target-selector/target-selector.component.js
import { targetSelectionUpdated, targetSelectionConfirmed, targetSelectionCancelled } from '../../core/actions.js';

export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.replace('.', '') + ' target-selector';
  root.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#101014;color:#fff;border:1px solid #333;padding:12px 16px;border-radius:8px;z-index:1200;min-width:300px;box-shadow:0 4px 12px rgba(0,0,0,.6);font:13px system-ui;';
  root.innerHTML = `<div style="font-weight:bold;margin-bottom:6px;">Select Targets</div>
    <div class="ts-effect" style="font-size:11px;margin-bottom:6px;color:#ccc"></div>
    <div class="ts-eligible" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;"></div>
    <div class="ts-status" style="font-size:11px;margin-bottom:8px;color:#7fd65d"></div>
    <div style="text-align:right;">
      <button class="ts-cancel" style="margin-right:6px;">Cancel</button>
      <button class="ts-confirm" disabled>Confirm</button>
    </div>`;
  root.setAttribute('role','dialog');
  root.setAttribute('aria-modal','true');
  root.style.display = 'none';
  root.querySelector('.ts-cancel').addEventListener('click', () => {
    const st = window.__KOT_NEW__?.store?.getState();
    const active = st?.targetSelection?.active;
    if (active) window.__KOT_NEW__.store.dispatch(targetSelectionCancelled(active.requestId));
  });
  root.querySelector('.ts-confirm').addEventListener('click', () => {
    const st = window.__KOT_NEW__?.store?.getState();
    const active = st?.targetSelection?.active;
    if (!active) return;
    window.__KOT_NEW__.store.dispatch(targetSelectionConfirmed(active.requestId, active.selectedIds));
  });
  document.body.appendChild(root);
  return { root };
}

export function update(ctx) {
  const root = ctx.inst?.root || document.querySelector('.target-selector');
  if (!root) return;
  const state = ctx.state;
  const active = state.targetSelection?.active;
  if (!active) { root.style.display = 'none'; return; }
  root.style.display = 'block';
  const effEl = root.querySelector('.ts-effect');
  effEl.textContent = `Effect: ${active.effect.kind}`;
  const statusEl = root.querySelector('.ts-status');
  statusEl.textContent = `Select ${active.min === active.max ? active.min : active.min + '-' + active.max} targets (${active.selectedIds.length} chosen)`;
  const elig = root.querySelector('.ts-eligible');
  elig.innerHTML = '';
  active.eligibleIds.forEach(id => {
    const btn = document.createElement('button');
    btn.textContent = id;
    const selected = active.selectedIds.includes(id);
    btn.style.cssText = 'padding:4px 8px;border-radius:4px;border:1px solid ' + (selected ? '#7fd65d' : '#555') + ';background:' + (selected ? '#203820' : '#222') + ';color:#fff;font:12px system-ui;cursor:pointer;';
    btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
    btn.addEventListener('click', () => {
      const st2 = window.__KOT_NEW__?.store?.getState();
      const act2 = st2?.targetSelection?.active;
      if (!act2) return;
      let next = act2.selectedIds.includes(id)
        ? act2.selectedIds.filter(x => x !== id)
        : [...act2.selectedIds, id];
      if (next.length > act2.max) next = next.slice(0, act2.max);
      window.__KOT_NEW__.store.dispatch(targetSelectionUpdated(act2.requestId, next));
    });
    elig.appendChild(btn);
  });
  const confirmBtn = root.querySelector('.ts-confirm');
  confirmBtn.disabled = !(active.selectedIds.length >= active.min && active.selectedIds.length <= active.max);
  setTimeout(() => { if (root && document.activeElement === document.body) root.querySelector('.ts-cancel').focus(); }, 0);
}
