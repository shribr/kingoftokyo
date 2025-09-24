/** components/effect-inspector/effect-inspector.component.js */
export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.replace('.', '') + ' effect-inspector';
  root.style.cssText = 'position:fixed;left:8px;bottom:8px;background:#18181c;color:#fff;font:12px/1.4 system-ui;border:1px solid #333;padding:6px 8px;border-radius:6px;max-width:260px;z-index:150;';
  root.innerHTML = `<div style="font-weight:bold;margin-bottom:4px;">Active Keep Effects</div><div class="ei-list" aria-live="polite"></div>`;
  return { root, update: () => {} };
}

export function update(ctx) {
  const { state } = ctx;
  const root = ctx.inst?.root || document.querySelector('.effect-inspector');
  if (!root) return;
  const listEl = root.querySelector('.ei-list');
  listEl.innerHTML = '';
  const players = state.players?.order?.map(id => state.players.byId[id]) || [];
  const rows = [];
  players.forEach(p => {
    p.cards.filter(c => c.type === 'keep').forEach(c => {
      rows.push({ player: p.id, card: c.name, kind: c.effect?.kind, value: c.effect?.value });
    });
  });
  if (!rows.length) {
    listEl.textContent = 'None';
    return;
  }
  rows.forEach(r => {
    const div = document.createElement('div');
    div.textContent = `${r.player}: ${r.card} (${r.kind}${r.value!=null?':'+r.value:''})`;
    listEl.appendChild(div);
  });
}
