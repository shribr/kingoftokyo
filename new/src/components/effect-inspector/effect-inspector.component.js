/** components/effect-inspector/effect-inspector.component.js */
export function build({ selector }) {
  const root = document.createElement('div');
  root.className = 'cmp-effect-inspector';
  root.innerHTML = `<div class="cmp-effect-inspector__title">Active Keep Effects</div>
    <div class="cmp-effect-inspector__subtitle">Aggregated modifiers shown first.</div>
    <div class="cmp-effect-inspector__aggregate ei-aggregate" aria-live="polite"></div>
    <hr />
    <div class="cmp-effect-inspector__list ei-list" aria-live="polite"></div>`;
  return { root, update: () => {} };
}

export function update(ctx) {
  const { state } = ctx;
  const root = ctx.inst?.root || document.querySelector('.cmp-effect-inspector');
  if (!root) return;
  // Hide while splash visible or debug disabled
  const splashVisible = state?.ui?.splash?.visible === true;
  const debugOn = !!state?.settings?.showDebugPanels;
  root.style.display = (splashVisible || !debugOn) ? 'none' : '';
  const listEl = root.querySelector('.ei-list');
  const aggEl = root.querySelector('.ei-aggregate');
  listEl.innerHTML = '';
  aggEl.innerHTML = '';
  const players = state.players?.order?.map(id => state.players.byId[id]) || [];
  const rawRows = [];
  players.forEach(p => {
    (p.cards||[]).filter(c => c.type === 'keep').forEach(c => {
      rawRows.push({ player: p.id, card: c.name, kind: c.effect?.kind, value: c.effect?.value });
    });
  });
  if (!rawRows.length) {
    listEl.textContent = 'None';
    aggEl.textContent = 'No modifiers';
    return;
  }
  // Aggregate numeric modifiers by kind & player
  const aggregates = new Map(); // key: player+kind
  rawRows.forEach(r => {
    if (typeof r.value === 'number') {
      const key = r.player+'|'+r.kind;
      aggregates.set(key, (aggregates.get(key)||0) + r.value);
    }
  });
  if (aggregates.size) {
    aggregates.forEach((val, key) => {
      const [player, kind] = key.split('|');
      const row = document.createElement('div');
      row.style.cssText = 'color:#7fd65d;';
      row.textContent = `${player}: ${kind} total ${val>0?'+':''}${val}`;
      aggEl.appendChild(row);
    });
  } else {
    aggEl.textContent = 'No numeric modifiers';
  }
  rawRows.forEach(r => {
    const div = document.createElement('div');
    div.textContent = `${r.player}: ${r.card} (${r.kind}${r.value!=null?':'+r.value:''})`;
    listEl.appendChild(div);
  });
}
