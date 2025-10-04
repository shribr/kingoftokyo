/** arena.component.js
 * LEGACY GLOBAL STYLE DEPENDENCY (FOR FUTURE LEGACY REMOVAL)
 * Structural legacy selectors previously in use (now removed): .game-board, .tokyo-area, .tokyo-city, .tokyo-bay, .round-indicator-container
 * Source: css/legacy/layout.css (board grid, background art, positioning, typography sizing) + responsive.css
 * Purpose: Preserve existing visual board & occupancy layout until rewritten with component-scoped CSS + tokens.
 * Decommission Steps:
 *   1. Extract board sizing / background / slot layout rules into new css/components.arena.css.
 *   2. Introduce CSS variables for spacing & z-index; remove dependence on global .game-board cascade. (DONE)
 *   3. Replace legacy class names here with local BEM-style or data-role attributes.
 *   4. Purge matching selector blocks from css/legacy/*.css after no other references remain.
 */
import { store } from '../../bootstrap/index.js';
import { selectPlayerById, selectActivePlayer } from '../../core/selectors.js';

export function build({ selector }) {
  const root = document.createElement('div');
  // Use only new namespace class; legacy .game-board removed
  root.className = selector.slice(1) + ' cmp-arena';
  root.innerHTML = `
    <div data-round-indicator>
      <div class="round-indicator-label" data-round-label>Round <span id="round-counter" data-round-counter>1</span></div>
    </div>
    <div data-tokyo data-arena-section="tokyo">
      <div data-city data-arena-section="city">
        <h3>Tokyo City</h3>
        <span class="tokyo-anchor" data-tokyo-city-anchor aria-hidden="true"></span>
        <div class="city-slot" data-city-slot></div>
      </div>
      <div data-bay data-arena-section="bay">
        <h3>Tokyo Bay</h3>
        <span class="tokyo-anchor" data-tokyo-bay-anchor aria-hidden="true"></span>
        <div class="bay-slot" data-bay-slot></div>
      </div>
    </div>
    <div data-active data-arena-section="active">
      <div class="active-player-slot" data-active-player-slot></div>
    </div>
    <div class="arena-active-player-dock" data-active-player-dock aria-label="Active player overview"></div>
  `;
  return { root, update: () => update(root) };
}

export function update(root) {
  const state = store.getState();
  const metaRound = state.meta?.round || 1;
  const span = root.querySelector('[data-round-counter]');
  if (span) span.textContent = metaRound;

  // Tokyo occupancy (real card relocation)
  const { tokyo } = state;
  const citySlot = root.querySelector('[data-city-slot]');
  const baySlot = root.querySelector('[data-bay-slot]');
  if (!root._tokyoOriginMap) root._tokyoOriginMap = new Map();
  const originMap = root._tokyoOriginMap; // Map<HTMLElement,{parent:HTMLElement,index:number}>

  const ensureCardInSlot = (playerId, slotEl, slotName) => {
    if (!slotEl) return;
    if (!playerId) {
      if (!slotEl.firstElementChild) slotEl.innerHTML = '<div class="slot-empty">Empty</div>';
      return;
    }
    const alreadyHere = slotEl.querySelector(`.cmp-player-profile-card[data-player-id="${playerId}"]`);
    if (alreadyHere) return;
    const liveCard = document.querySelector(`.cmp-player-profile-card[data-player-id="${playerId}"]:not([data-in-tokyo-slot])`);
    if (!liveCard) return;
    // If a portal animation is already running for this player, bail
    if (root._tokyoPortalAnimating === playerId) return;
    // Start portal (two-phase: animate clone, then relocate real card)
    startTokyoPortal({ root, playerId, slotEl, slotName, liveCard, originMap });
  };

  ensureCardInSlot(tokyo.city, citySlot, 'city');
  ensureCardInSlot(tokyo.bay, baySlot, 'bay');

  // Restore cards leaving Tokyo
  document.querySelectorAll('.cmp-player-profile-card[data-in-tokyo-slot]').forEach(card => {
    const slotName = card.getAttribute('data-in-tokyo-slot');
    const pid = card.getAttribute('data-player-id');
    const still = (slotName === 'city' && tokyo.city === pid) || (slotName === 'bay' && tokyo.bay === pid);
    if (still) return;
    // FLIP animation for exit: measure first (current) rect, then move, then animate
    const firstRect = card.getBoundingClientRect();
    const meta = originMap.get(card);
    card.removeAttribute('data-in-tokyo-slot');
    card.removeAttribute('data-in-tokyo');
    if (meta && meta.parent) {
      const { parent, index } = meta;
      const kids = Array.from(parent.children);
      if (index >= 0 && index < kids.length) parent.insertBefore(card, kids[index]); else parent.appendChild(card);
      try {
        const lastRect = card.getBoundingClientRect();
        const dx = firstRect.left - lastRect.left;
        const dy = firstRect.top - lastRect.top;
        const sx = firstRect.width / (lastRect.width || 1);
        const sy = firstRect.height / (lastRect.height || 1);
        card.classList.add('tokyo-flip-anim');
        card.style.willChange = 'transform';
        card.style.transition = 'none';
        card.style.transformOrigin = 'top left';
        card.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
        void card.offsetWidth;
        card.style.transition = 'transform 500ms cubic-bezier(.25,.9,.35,1.15)';
        card.style.transform = '';
        const cleanup = () => {
          card.style.willChange = '';
          card.classList.remove('tokyo-flip-anim');
          card.removeEventListener('transitionend', cleanup);
        };
        card.addEventListener('transitionend', cleanup);
      } catch(_) {}
    }
  });

  // Default sizing sample (unchanged)
  try {
    if (!root._defaultCardSizeApplied) {
      const sampleCard = document.querySelector('.cmp-player-profile-card:not(.cmp-player-profile-card--mini)');
      if (sampleCard) {
        const rect = sampleCard.getBoundingClientRect();
        root.style.setProperty('--player-card-width', Math.ceil(rect.width) + 'px');
        root.style.setProperty('--player-card-height', Math.ceil(rect.height) + 'px');
        root._defaultCardSizeApplied = true;
      }
    }
  } catch(_) {}

  // Bay enable/disable
  try {
    const totalPlayers = state.players?.order?.length || 0;
    const baySection = root.querySelector('[data-arena-section="bay"]');
    if (baySection) {
      if (totalPlayers < 5) baySection.setAttribute('data-disabled','true'); else baySection.removeAttribute('data-disabled');
    }
  } catch(_) {}

  // Active flags
  try {
    const citySection = root.querySelector('[data-arena-section="city"]');
    const baySection = root.querySelector('[data-arena-section="bay"]');
    if (citySection) { if (tokyo.city) citySection.setAttribute('data-active','true'); else citySection.removeAttribute('data-active'); }
    if (baySection) { if (tokyo.bay) baySection.setAttribute('data-active','true'); else baySection.removeAttribute('data-active'); }
  } catch(_) {}

  // Removed dynamic ResizeObserver sizing (initial size applied pre-move to avoid flicker).
}

/**
 * Portal / travel animation for a card entering Tokyo.
 * Creates a fixed-position clone that animates to the slot. On arrival, real card is inserted.
 */
function startTokyoPortal({ root, playerId, slotEl, slotName, liveCard, originMap }) {
  try {
    const firstRect = liveCard.getBoundingClientRect();
    // Record original placement for restoration later
    if (!originMap.has(liveCard)) {
      const parent = liveCard.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children);
        originMap.set(liveCard, { parent, index: siblings.indexOf(liveCard) });
      }
    }
    // Prepare destination sizing early
    const sectionEl = slotEl.closest('[data-arena-section]');
    if (sectionEl) {
      // Only set slot width; avoid mutating section sizing custom properties (prevent layout jumps)
      slotEl.style.width = Math.ceil(firstRect.width) + 'px';
      sectionEl.setAttribute('data-initial-sized','true');
    }
    // Destination rect (center of slot)
    const slotRect = slotEl.getBoundingClientRect();
    // Create traveling clone
    const clone = liveCard.cloneNode(true);
    clone.classList.add('tokyo-travel-clone', 'tokyo-travel-glow');
    // Remove IDs or attributes that could conflict
    clone.removeAttribute('id');
    // Style clone
    Object.assign(clone.style, {
      position: 'fixed',
      top: firstRect.top + 'px',
      left: firstRect.left + 'px',
      width: firstRect.width + 'px',
      height: firstRect.height + 'px',
      margin: '0',
      zIndex: '6900',
      transformOrigin: 'top left',
      pointerEvents: 'none',
      transition: 'transform 620ms cubic-bezier(.25,.9,.35,1.1), box-shadow 300ms ease'
    });
    document.body.appendChild(clone);
    // Hide real card during flight (keep layout)
    liveCard.style.visibility = 'hidden';
    root._tokyoPortalAnimating = playerId;
    // Compute transform delta
    const targetScale = 0.85; // final inside slot scale
    const targetWidth = firstRect.width * targetScale;
    // Center scaled card inside slot
    const targetCenterX = slotRect.left + slotRect.width / 2;
    const targetCenterY = slotRect.top + slotRect.height / 2;
    const startCenterX = firstRect.left + firstRect.width / 2;
    const startCenterY = firstRect.top + firstRect.height / 2;
  let finalDx = targetCenterX - startCenterX;
  let finalDy = targetCenterY - startCenterY;
  // Compensate for scale shrinking around top-left so final visual center aligns with slot center
  const correctionX = (firstRect.width * (1 - targetScale)) / 2;
  const correctionY = (firstRect.height * (1 - targetScale)) / 2;
  finalDx += correctionX;
  finalDy += correctionY;
    // Initial transform (identity) already implied; animate next frame
    requestAnimationFrame(() => {
  const rotation = slotName === 'city' ? 'rotate(-4deg)' : (slotName === 'bay' ? 'rotate(5deg)' : '');
  clone.style.transform = `translate(${finalDx}px, ${finalDy}px) ${rotation} scale(${targetScale})`;
    });
    const onEnd = () => {
      clone.removeEventListener('transitionend', onEnd);
      // Clean clone
      clone.remove();
      // Relocate real card
      slotEl.innerHTML = '';
      liveCard.setAttribute('data-in-tokyo-slot', slotName);
      liveCard.setAttribute('data-in-tokyo', 'true');
      liveCard.removeAttribute('data-in-active-dock');
      slotEl.appendChild(liveCard);
      liveCard.style.visibility = '';
      // Glow pulse to emphasize arrival
      liveCard.classList.add('tokyo-arrival-glow');
      setTimeout(() => liveCard.classList.remove('tokyo-arrival-glow'), 900);
      // Ensure no stale inline transform from previous exit remains (tile provides rotation/offset)
      liveCard.style.transform = '';
      delete root._tokyoPortalAnimating;
    };
    clone.addEventListener('transitionend', onEnd);
  } catch (e) {
    console.warn('Tokyo portal animation failed, falling back to direct move', e);
    // Fallback: direct append if failure
    slotEl.innerHTML = '';
    liveCard.setAttribute('data-in-tokyo-slot', slotName);
    liveCard.setAttribute('data-in-tokyo', 'true');
    liveCard.removeAttribute('data-in-active-dock');
    slotEl.appendChild(liveCard);
    liveCard.style.visibility = '';
    delete root._tokyoPortalAnimating;
  }
}

// renderOccupant removed – real cards are relocated; no cloning.
