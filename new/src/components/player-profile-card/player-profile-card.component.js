/** player-profile-card.component.js
 * Phase 6 Step 1–4: Player Profile Card component scaffold.
 * - Dual-class root: preserves legacy semantic (.player-dashboard) while introducing new tokens-based namespace (.cmp-player-profile-card)
 * - Pure build/update contract
 * - Owned cards miniature lane placeholder
 * - No external side-effects; relies only on selectors + store
 */
import { store } from '../../bootstrap/index.js';
import { selectPlayerById, selectPlayerCards } from '../../core/selectors.js';

/** Build a single player profile card root */
export function build({ selector, playerId }) {
  const root = document.createElement('div');
  // Dual class strategy: keep legacy hook (.player-dashboard) + new component namespace
  root.className = `player-dashboard cmp-player-profile-card`; // NOTE: do not remove legacy class until deprecation phase
  root.setAttribute('data-player-id', playerId);
  root.innerHTML = baseTemplate();
  return { root, update: (props) => update(root, { ...props, playerId }), destroy: () => root.remove() };
}

function baseTemplate() {
  return `
    <div class="ppc-header">
      <div class="ppc-avatar" data-avatar></div>
      <div class="ppc-meta">
        <div class="ppc-name" data-name></div>
        <div class="ppc-status-line">
          <span class="ppc-active-indicator" data-active-indicator></span>
          <span class="ppc-tokyo-indicator" data-tokyo></span>
        </div>
      </div>
    </div>
    <div class="ppc-stats" data-stats>
      <div class="ppc-stat hp" data-hp><span class="label">HP</span><span class="value" data-hp-value></span></div>
      <div class="ppc-stat energy" data-energy><span class="label">⚡</span><span class="value" data-energy-value></span></div>
      <div class="ppc-stat vp" data-vp><span class="label">★</span><span class="value" data-vp-value></span></div>
    </div>
    <div class="ppc-owned-cards" data-owned-cards>
      <div class="ppc-owned-cards-label">Cards</div>
      <div class="ppc-owned-cards-strip" data-cards-strip></div>
    </div>
  `;
}

/** Update cycle */
export function update(root, { playerId }) {
  if (!playerId) return;
  const state = store.getState();
  const player = selectPlayerById(state, playerId);
  if (!player) return;

  // Basic fields
  root.querySelector('[data-name]').textContent = player.name;
  root.querySelector('[data-hp-value]').textContent = player.health;
  root.querySelector('[data-energy-value]').textContent = player.energy;
  root.querySelector('[data-vp-value]').textContent = player.victoryPoints;

  const tokyoEl = root.querySelector('[data-tokyo]');
  if (player.inTokyo) {
    tokyoEl.textContent = 'TOKYO';
    tokyoEl.classList.add('is-in');
  } else {
    tokyoEl.textContent = '';
    tokyoEl.classList.remove('is-in');
  }

  // Active indicator (placeholder: will style via .is-active later)
  const activeIndicator = root.querySelector('[data-active-indicator]');
  if (player.status?.active) {
    root.classList.add('is-active');
    activeIndicator.textContent = '●';
  } else {
    root.classList.remove('is-active');
    activeIndicator.textContent = '';
  }

  // Owned cards miniature lane
  const cards = selectPlayerCards(state, playerId) || [];
  const strip = root.querySelector('[data-cards-strip]');
  strip.innerHTML = cards.map(c => `<span class="ppc-card-mini" title="${c.name}">${c.name.slice(0,8)}</span>`).join('');
}
