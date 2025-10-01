/** components/effect-queue/effect-queue.component.js */
export function build({ selector }) {
  const root = document.createElement('div');
  root.className = 'cmp-effect-queue';
  root.innerHTML = `<div class="cmp-effect-queue__title">Effects</div>
    <div class="cmp-effect-queue__current eq-current" aria-live="polite"></div>
    <div class="cmp-effect-queue__list eq-queue"></div>
    <details class="cmp-effect-queue__history-wrapper"><summary>History</summary><div class="cmp-effect-queue__history eq-history"></div></details>`;
  return { root, update: () => {} };
}

export function update(ctx) {
  const { state } = ctx;
  const root = ctx.inst?.root || document.querySelector('.cmp-effect-queue');
  if (!root) return;
  // Hide while splash is visible or debug disabled
  const splashVisible = state?.ui?.splash?.visible === true;
  const debugOn = !!state?.settings?.showDebugPanels;
  root.style.display = (splashVisible || !debugOn) ? 'none' : '';
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
    if (e.status === 'failed') div.classList.add('cmp-effect-queue__item--failed');
    div.textContent = `${e.status === 'failed' ? '✖' : '✓'} ${e.effect.kind} (${e.cardId})`;
    histEl.appendChild(div);
  });
}
