/** components/effect-queue/effect-queue.component.js */
export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.replace('.', '') + ' effect-queue-panel';
  root.style.cssText = 'position:fixed;top:8px;right:8px;background:#1e1e24;color:#fff;font:12px/1.4 system-ui;border:1px solid #333;padding:6px 8px;border-radius:6px;max-width:240px;z-index:150;';
  root.innerHTML = `<div style="font-weight:bold;margin-bottom:4px;">Effects</div><div class="eq-current" aria-live="polite"></div><div class="eq-queue" style="margin-top:4px"></div><details style="margin-top:4px"><summary style="cursor:pointer">History</summary><div class="eq-history" style="max-height:120px;overflow:auto;margin-top:4px"></div></details>`;
  return { root, update: () => {} };
}

export function update(ctx) {
  const { state } = ctx;
  const root = ctx.inst?.root || document.querySelector('.effect-queue-panel');
  if (!root) return;
  const currentEl = root.querySelector('.eq-current');
  const queueEl = root.querySelector('.eq-queue');
  const histEl = root.querySelector('.eq-history');
  const eq = state.effectQueue;
  if (!eq) return;
  // Current
  const processing = eq.queue.find(e => e.status === 'processing');
  currentEl.textContent = processing ? `Processing: ${processing.effect.kind} (${processing.cardId})` : 'Idle';
  // Queue
  queueEl.innerHTML = '';
  const queued = eq.queue.filter(e => e.status === 'queued');
  queued.forEach(e => {
    const div = document.createElement('div');
    div.textContent = `Queued: ${e.effect.kind} (${e.cardId})`;
    queueEl.appendChild(div);
  });
  // History
  histEl.innerHTML = '';
  eq.history.slice(-10).reverse().forEach(e => {
    const div = document.createElement('div');
    div.style.opacity = e.status === 'failed' ? 0.6 : 1;
    div.textContent = `${e.status === 'failed' ? '✖' : '✓'} ${e.effect.kind} (${e.cardId})`;
    histEl.appendChild(div);
  });
}
