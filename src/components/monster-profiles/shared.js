/** shared.js - Monster profile card renderer */

export function renderMonsterCard(monster) {
  const { id, name, image, description } = monster;
  return `<div class="monster-profile-card" data-mid="${id}">
    <div class="mpc-header">
      <div class="mpc-avatar">${image ? `<img src="${image}" alt="${name}">` : ''}</div>
      <div class="mpc-text">
        <div class="mpc-name">${name.toUpperCase()}</div>
        <div class="mpc-desc">${description || ''}</div>
      </div>
    </div>
  </div>`;
}
