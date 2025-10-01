/** shared.js - Monster profile card renderer */

export function renderMonsterCard(monster) {
  const { id, name, image, description, personality = {} } = monster;
  const rows = [
    statRow('AGGRESSION', personality.aggression),
    statRow('STRATEGY', personality.strategy),
    statRow('RISK TAKING', personality.risk),
    statRow('ECONOMIC FOCUS', personality.economic)
  ].join('');
  return `<div class="monster-profile-card" data-mid="${id}">
    <div class="mpc-header">
      <div class="mpc-avatar">${image ? `<img src="${image}" alt="${name}">` : ''}</div>
      <div class="mpc-name">${name.toUpperCase()}</div>
      <div class="mpc-desc">${description || ''}</div>
    </div>
    <div class="mpc-stats">${rows}</div>
  </div>`;
}

function statRow(label, value) {
  const v = typeof value === 'number' ? value : '—';
  const percent = typeof value === 'number' ? (value / 5) * 100 : 0;
  return `<div class="mpc-stat-row"><div class="mpc-stat-label">${label}</div><div class="mpc-bar"><div class="mpc-bar-fill" style="width:${percent}%"></div></div><div class="mpc-value">${v}</div></div>`;
}
