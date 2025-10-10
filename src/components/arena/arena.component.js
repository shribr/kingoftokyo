/** arena.component.js
 * LEGACY GLOBAL STYLE DEPENDENCY  function ensureCardInSlot(playerId, slotEl, slotName) {
    if (!playerId) {
      if (!slotEl.firstElementChild) slotEl.innerHTML = '<div class="slot-empty">Empty</div>';
      return;
    }
    
    // Clear any stuck animating state for this player before querying
    const stuckCard = document.querySelector(`.cmp-player-profile-card[data-player-id="${playerId}"][data-animating-portal]`);
    if (stuckCard) {
      console.log('[ensureCardInSlot] Clearing stuck animating state for player', playerId);
      stuckCard.removeAttribute('data-animating-portal');
    }
    
    // Debug: log what we're looking for and what exists
    const allCards = Array.from(document.querySelectorAll('.cmp-player-profile-card'));
    const cardIds = allCards.map(c => ({
      id: c.getAttribute('data-player-id'),
      inTokyo: c.getAttribute('data-in-tokyo-slot'),
      animating: c.getAttribute('data-animating-portal')
    }));
    console.log('[ensureCardInSlot] Looking for player:', playerId);
    console.log('[ensureCardInSlot] Slot name:', slotName);
    console.log('[ensureCardInSlot] All cards in DOM:');
    cardIds.forEach((card, idx) => {
      console.log(`  Card ${idx + 1}:`, card);
    });
    console.log('[ensureCardInSlot] Match found?', cardIds.some(c => c.id === playerId));REMOVAL)
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
    
    // Clear any stuck animating or portal state FIRST
    document.querySelectorAll(`.cmp-player-profile-card[data-player-id="${playerId}"]`).forEach(card => {
      if (card.hasAttribute('data-animating-portal')) {
        card.removeAttribute('data-animating-portal');
      }
    });
    
    // Also clear global animation lock
    if (root._tokyoPortalAnimating === playerId) {
      delete root._tokyoPortalAnimating;
    }
    
    const alreadyHere = slotEl.querySelector(`.cmp-player-profile-card[data-player-id="${playerId}"]`);
    if (alreadyHere) {
      return;
    }
    
    const liveCard = document.querySelector(`.cmp-player-profile-card[data-player-id="${playerId}"]:not([data-in-tokyo-slot])`);
    if (!liveCard) {
      return;
    }
    // If a portal animation is already running for this player, bail
    if (root._tokyoPortalAnimating === playerId) {
      return;
    }
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
        const dxVw = (dx / window.innerWidth) * 100;
        const dyVh = (dy / window.innerHeight) * 100;
        const sx = firstRect.width / (lastRect.width || 1);
        const sy = firstRect.height / (lastRect.height || 1);
        card.classList.add('tokyo-flip-anim');
        card.style.willChange = 'transform';
        card.style.transition = 'none';
        card.style.transformOrigin = 'top left';
        card.style.transform = `translate(${dxVw}vw, ${dyVh}vh) scale(${sx}, ${sy})`;
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
 * Animates the live card from its current position to the slot, then appends it.
 */
function startTokyoPortal({ root, playerId, slotEl, slotName, liveCard, originMap }) {
  try {
    // Record original placement for restoration later
    if (!originMap.has(liveCard)) {
      const parent = liveCard.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children);
        originMap.set(liveCard, { parent, index: siblings.indexOf(liveCard) });
      }
    }
    
    root._tokyoPortalAnimating = playerId;
    
    // Measure BEFORE moving
    const startRect = liveCard.getBoundingClientRect();
    const slotRect = slotEl.getBoundingClientRect();
    
    // Temporarily append to body at fixed position to animate freely
    const originalParent = liveCard.parentElement;
    const originalNextSibling = liveCard.nextSibling;
    
    // Create invisible placeholder to preserve layout
    const placeholder = document.createElement('div');
    placeholder.className = 'tokyo-card-placeholder';
    placeholder.style.width = (startRect.width / window.innerWidth * 100) + 'vw';
    placeholder.style.height = (startRect.height / window.innerHeight * 100) + 'vh';
    placeholder.style.visibility = 'hidden';
    placeholder.style.pointerEvents = 'none';
    if (originalParent) {
      originalParent.insertBefore(placeholder, liveCard);
    }
    
    // Move card to body with fixed positioning at current screen coords
    
    // FIRST: Move to body (DOM operation)
    document.body.appendChild(liveCard);
    
    // SECOND: Immediately set positioning to prevent any reflow/repaint
    // Do this synchronously before browser can render
    liveCard.style.position = 'fixed';
    liveCard.style.top = (startRect.top / window.innerHeight * 100) + 'vh';
    liveCard.style.left = (startRect.left / window.innerWidth * 100) + 'vw';
    liveCard.style.width = (startRect.width / window.innerWidth * 100) + 'vw';
    liveCard.style.height = (startRect.height / window.innerHeight * 100) + 'vh';
    liveCard.style.margin = '0';
    liveCard.style.zIndex = '6900';
    liveCard.style.transformOrigin = 'top left';
    liveCard.style.transition = 'none';
    liveCard.style.boxSizing = 'border-box';
    
    liveCard.setAttribute('data-animating-portal', 'true');
    
    // Disable transitions on children to prevent them from animating separately
    liveCard.classList.add('tokyo-portal-animating');
    
    // Force reflow to ensure styles are applied
    void liveCard.offsetWidth;
    
    // Calculate target position (center of slot)
    const targetScale = 0.85;
    const targetCenterX = slotRect.left + slotRect.width / 2;
    const targetCenterY = slotRect.top + slotRect.height / 2;
    const startCenterX = startRect.left + startRect.width / 2;
    const startCenterY = startRect.top + startRect.height / 2;
    
    let dx = targetCenterX - startCenterX;
    let dy = targetCenterY - startCenterY;
    
    // Adjust for scale shrinking around transform origin
    const scaleCorrection = (startRect.width * (1 - targetScale)) / 2;
    dx += scaleCorrection;
    dy += scaleCorrection;
    
    const rotation = slotName === 'city' ? 'rotate(-4deg)' : (slotName === 'bay' ? 'rotate(5deg)' : '');
    
    // Apply initial identity transform (no movement) BEFORE enabling transitions
    // This ensures the card stays in place visually
    liveCard.style.transform = 'translate(0, 0) scale(1)';
    
    // Force another reflow
    void liveCard.offsetWidth;
    
    // NOW enable transition
    liveCard.style.transition = 'transform 550ms cubic-bezier(.25,.9,.35,1.1)';
    
    // And animate to target
    const dxVw = (dx / window.innerWidth) * 100;
    const dyVh = (dy / window.innerHeight) * 100;
    requestAnimationFrame(() => {
      liveCard.style.transform = `translate(${dxVw}vw, ${dyVh}vh) ${rotation} scale(${targetScale})`;
    });
    
    const onTransitionEnd = (ev) => {
      console.log('[onTransitionEnd] Event fired:', { target: ev.target.className, propertyName: ev.propertyName });
      if (ev.target !== liveCard || ev.propertyName !== 'transform') return;
      console.log('[onTransitionEnd] Valid transition complete, appending to slot');
      liveCard.removeEventListener('transitionend', onTransitionEnd);
      
      // Remove placeholder
      if (placeholder.parentElement) {
        placeholder.parentElement.removeChild(placeholder);
      }
      
      // Clear inline styles (only the ones we set)
      liveCard.style.position = '';
      liveCard.style.top = '';
      liveCard.style.left = '';
      liveCard.style.width = '';
      liveCard.style.height = '';
      liveCard.style.margin = '';
      liveCard.style.zIndex = '';
      liveCard.style.transform = '';
      liveCard.style.transition = '';
      liveCard.style.transformOrigin = '';
      liveCard.style.boxSizing = '';
      liveCard.removeAttribute('data-animating-portal');
      liveCard.classList.remove('tokyo-portal-animating');
      
      // NOW append into slot
      slotEl.innerHTML = '';
      liveCard.setAttribute('data-in-tokyo-slot', slotName);
      liveCard.setAttribute('data-in-tokyo', 'true');
      liveCard.removeAttribute('data-in-active-dock');
      slotEl.appendChild(liveCard);
      
      console.log('[TokyoAnimationComplete]', {
        playerId,
        slotName,
        parentTag: liveCard.parentElement?.tagName,
        parentClasses: liveCard.parentElement?.className,
        cardInSlot: slotEl.contains(liveCard)
      });
      
      // Arrival glow
      liveCard.classList.add('tokyo-arrival-glow');
      setTimeout(() => liveCard.classList.remove('tokyo-arrival-glow'), 900);
      
      delete root._tokyoPortalAnimating;
    };
    
    liveCard.addEventListener('transitionend', onTransitionEnd);
    
    // Safety timeout in case transitionend never fires
    setTimeout(() => {
      if (liveCard.parentElement === document.body) {
        onTransitionEnd({ target: liveCard, propertyName: 'transform' });
      }
    }, 1000);
    
  } catch (e) {
    console.warn('Tokyo portal animation failed', e);
    // Fallback: direct append
    slotEl.innerHTML = '';
    liveCard.setAttribute('data-in-tokyo-slot', slotName);
    liveCard.setAttribute('data-in-tokyo', 'true');
    liveCard.removeAttribute('data-in-active-dock');
    liveCard.removeAttribute('data-animating-portal');
    slotEl.appendChild(liveCard);
    delete root._tokyoPortalAnimating;
  }
}

// renderOccupant removed – real cards are relocated; no cloning.
