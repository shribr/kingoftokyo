/** player-profile-card.component.js
 * Player Profile Card component scaffold (rewrite track).
 * - Uses single namespace class (.cmp-player-profile-card) – legacy term 'player-dashboard' replaced.
 * - Pure build/update contract.
 * - Owned cards miniature lane placeholder.
 * - No external side-effects; relies only on selectors + store.
 */
import { store } from '../../bootstrap/index.js';
import { selectPlayerById, selectPlayerCards, selectActivePlayer, selectMonsterById } from '../../core/selectors.js';
import { createPositioningService } from '../../services/positioningService.js';

/** Build a single player profile card root */
export function build({ selector, playerId }) {
  const root = document.createElement('div');
  // Single class namespace (legacy term 'player-dashboard' deprecated)
  root.className = `cmp-player-profile-card`;
  root.setAttribute('data-player-id', playerId);
  root.innerHTML = baseTemplate();
  // Flip on tap (mobile): toggles between front (stats) and back (owned cards)
  root.addEventListener('click', (e) => {
    const isTouch = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
    if (!isTouch) return;
    // Avoid flipping when clicking links/buttons in future
    if (e.target.closest('button,a,[data-ignore-flip]')) return;
    root.toggleAttribute('data-flipped');
  });
  // Defer draggable assignment until update determines active player to avoid all cards being movable.
  let draggableApplied = false;
  function ensureDraggableIfActive() {
    try {
      const state = store.getState();
      const active = selectActivePlayer(state);
      if (active && active.id === playerId && !draggableApplied) {
        const positioning = createPositioningService(store);
        positioning.hydrate();
        positioning.makeDraggable(root, `playerCard_${playerId}`, { snapEdges: true, snapThreshold: 12 });
        draggableApplied = true;
        root.setAttribute('data-draggable','true');
      } else if (!active || active.id !== playerId) {
        // Ensure non-active player cards are not draggable
        root.setAttribute('data-draggable','false');
        root.setAttribute('data-nodrag','true');
        // Remove pointer handlers if they were attached
        root.style.touchAction = '';
      }
    } catch(_) {}
  }
  ensureDraggableIfActive();
  return { root, update: (props) => { update(root, { ...props, playerId }); ensureDraggableIfActive(); }, destroy: () => root.remove() };
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
      <div class="ppc-stat hp" data-cards><span class="label">CARDS</span><span class="value" data-cards-count>0</span></div>
      <div class="ppc-stat energy" data-energy><span class="label">ENERGY</span><span class="value" data-energy-value></span></div>
      <div class="ppc-stat vp" data-vp><span class="label">POINTS</span><span class="value" data-vp-value></span></div>
    </div>
    <div class="ppc-health-block" data-health-block>
      <div class="ppc-health-label" data-health-label>HEALTH <span data-hp-value></span>/10</div>
      <div class="ppc-health-bar" data-health-bar><div class="fill" data-health-fill></div></div>
    </div>
    <div class="ppc-owned-cards" data-owned-cards hidden>
      <div class="ppc-owned-cards-label">OWNED</div>
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
  // Monster color theming
  try {
    const monster = selectMonsterById(state, player.monsterId);
    if (monster && monster.color) {
      root.style.setProperty('--ppc-accent', monster.color);
      // Derive readable accent text color
      try {
        const hex = monster.color.replace('#','');
        if (hex.length === 3) {
          const r = parseInt(hex[0]+hex[0],16), g = parseInt(hex[1]+hex[1],16), b = parseInt(hex[2]+hex[2],16);
          setAccentText(r,g,b);
        } else if (hex.length === 6) {
          const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
          setAccentText(r,g,b);
        }
        // Avatar image mapping (best effort based on monster name / provided image)
        try {
          const avatarEl = root.querySelector('[data-avatar]');
          if (avatarEl) {
            const baseName = (monster.imageBase || monster.name || '').toLowerCase().replace(/\s+/g,'_');
            const candidates = [];
            if (monster.image) candidates.push(monster.image);
            if (baseName) {
              candidates.push(`images/characters/${baseName}.png`);
              candidates.push(`images/characters/king_of_tokyo_${baseName}.png`);
            }
            const chosen = candidates.find(Boolean);
            if (chosen) {
              avatarEl.style.backgroundImage = `url(${chosen})`;
              avatarEl.dataset.avatarSrc = chosen;
            }
          }
        } catch(_) {}
      } catch(_) {}
    }
  } catch(_) {}

  // Basic fields
  root.querySelector('[data-name]').textContent = player.name;
  // CPU indicator appended after name (idempotent)
  try {
    const nameEl = root.querySelector('[data-name]');
    if (nameEl) {
      const isCPU = player.isCPU || player.isAi || player.type === 'ai';
      let cpuEl = nameEl.querySelector('.ppc-cpu');
      if (isCPU) {
        if (!cpuEl) {
          cpuEl = document.createElement('span');
          cpuEl.className = 'ppc-cpu';
          cpuEl.textContent = ' (CPU)';
          cpuEl.setAttribute('aria-label','Computer controlled player');
          nameEl.appendChild(cpuEl);
        }
      } else if (cpuEl) {
        cpuEl.remove();
      }
    }
  } catch(_) {}
  const hpValEl = root.querySelector('[data-hp-value]');
  if (hpValEl) hpValEl.textContent = player.health;
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
    root.setAttribute('data-active','true');
  } else {
    root.classList.remove('is-active');
    activeIndicator.textContent = '';
    root.removeAttribute('data-active');
  }

  // Owned cards miniature lane
  const cards = selectPlayerCards(state, playerId) || [];
  const cardsCountEl = root.querySelector('[data-cards-count]');
  if (cardsCountEl) cardsCountEl.textContent = cards.length;
  // Health bar fill
  const healthBar = root.querySelector('[data-health-bar]');
  const healthFill = root.querySelector('[data-health-fill]');
  if (healthBar && healthFill) {
    const pct = (player.health / 10) * 100;
    healthFill.style.width = pct + '%';
    if (player.health <= 3) healthBar.setAttribute('data-low','true'); else healthBar.removeAttribute('data-low');
  }
  const strip = root.querySelector('[data-cards-strip]');
  if (strip) strip.innerHTML = cards.map(c => `<span class="ppc-card-mini" title="${c.name}">${c.name.slice(0,8)}</span>`).join('');
}

function setAccentText(r,g,b) {
  // Perceived luminance (sRGB)
  const lum = 0.2126*(r/255) + 0.7152*(g/255) + 0.0722*(b/255);
  // If bright color, switch to darker value highlight; else keep yellow/gold
  if (lum > .55) {
    document.documentElement.style.setProperty('--ppc-accent-text', '#222');
  } else if (lum < .18) {
    document.documentElement.style.setProperty('--ppc-accent-text', '#ffe680');
  } else {
    document.documentElement.style.setProperty('--ppc-accent-text', '#ffd400');
  }
}
