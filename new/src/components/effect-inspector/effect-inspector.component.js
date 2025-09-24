/** components/effect-inspector/effect-inspector.component.js */
export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.replace('.', '') + ' effect-inspector';
  root.style.cssText = 'position:fixed;left:8px;bottom:8px;background:#18181c;color:#fff;font:12px/1.4 system-ui;border:1px solid #333;padding:6px 8px;border-radius:6px;max-width:300px;z-index:150;';
  root.innerHTML = `<div style="font-weight:bold;margin-bottom:4px;">Active Keep Effects</div>
  <div style="font-size:11px;margin-bottom:4px;color:#aaa">Aggregated modifiers shown first.</div>
  <div class="ei-aggregate" aria-live="polite"></div>
  <hr style="border:none;border-top:1px solid #333;margin:4px 0" />
  <div class="ei-list" aria-live="polite"></div>`;
  return { root, update: () => {} };
}

export function update(ctx) {
  const { state } = ctx;
  const root = ctx.inst?.root || document.querySelector('.effect-inspector');
  if (!root) return;
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
