/** tokyoEntryAnimationService.js
 * Observes Tokyo entry events and animates the active player's profile card
 * moving from the active dock back to the monsters panel while a clone
 * flies into the Tokyo City/Bay area.
 *
 * Non-destructive: underlying Redux state already set (playerEnteredTokyo, tokyoOccupantSet).
 * This is purely visual; failures should degrade silently.
 */
export function bindTokyoEntryAnimation(store, logger = console) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return; // SSR / tests
  let lastTokyoOccupants = { city: null, bay: null };
  // Track previous player health values for damage highlight
  let prevHealth = {};
  let animating = false;
  const queue = [];
  function enqueue(job) {
    queue.push(job);
    drain();
  }
  function drain() {
    if (animating) return;
    const next = queue.shift();
    if (!next) return;
    animating = true;
    try {
      next(() => { animating = false; drain(); });
    } catch(e) {
      animating = false; drain();
    }
  }
  const prefersReducedMotion = (()=>{
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(_) { return false; }
  })();

  store.subscribe((state) => {
    try {
      const tokyo = state.tokyo || {};
      const cityOcc = tokyo.cityOccupant || null;
      const bayOcc = tokyo.bayOccupant || null;
      const enteredCity = cityOcc && cityOcc !== lastTokyoOccupants.city;
      const enteredBay = bayOcc && bayOcc !== lastTokyoOccupants.bay;
      const exitedCity = !cityOcc && lastTokyoOccupants.city;
      const exitedBay = !bayOcc && lastTokyoOccupants.bay;
      // Update health diff detection (independent of animation gating)
      const players = state.players?.byId || {};
      Object.keys(players).forEach(pid => {
        const cur = players[pid];
        const prevH = prevHealth[pid];
        if (typeof cur.health === 'number') {
          if (typeof prevH === 'number' && cur.health < prevH) {
            triggerDamageFlash(pid);
          }
          prevHealth[pid] = cur.health;
        }
      });
      // Process entry/exit animations
      if (enteredCity || enteredBay) {
        lastTokyoOccupants = { city: cityOcc, bay: bayOcc };
        const phase = state.phase;
        if (!['RESOLVE','BUY','YIELD_DECISION'].includes(phase)) return;
        const playerId = enteredCity ? cityOcc : bayOcc;
        enqueue(done => animateTokyoEntry(playerId, enteredCity ? 'city' : 'bay', done));
        return;
      }
      if (exitedCity || exitedBay) {
        const leavingId = exitedCity ? lastTokyoOccupants.city : lastTokyoOccupants.bay;
        lastTokyoOccupants = { city: cityOcc, bay: bayOcc };
        if (leavingId) enqueue(done => animateTokyoExit(leavingId, exitedCity ? 'city' : 'bay', done));
        return;
      }
      lastTokyoOccupants = { city: cityOcc, bay: bayOcc };
    } catch(_) {}
  });

  function animateTokyoEntry(playerId, slot, done) {
    try {
      const activeCardSlot = document.getElementById('active-player-card-slot');
      if (!activeCardSlot) { done && done(); return; }
      const activeCard = activeCardSlot.querySelector(`.cmp-player-profile-card[data-player-id="${playerId}"]`);
      // If player's card not currently in active slot, skip (maybe already moved)
      if (!activeCard) { done && done(); return; }
      const monstersPanel = document.querySelector('.cmp-monsters-panel .mp-player-cards');
      if (!monstersPanel) { done && done(); return; }
      // Target Tokyo visual anchor (fallback: tokyo city element else arena center)
      const tokyoAnchor = document.querySelector(slot === 'city' ? '[data-tokyo-city-anchor]' : '[data-tokyo-bay-anchor]') || document.querySelector('.cmp-arena') || document.body;
      const startRect = activeCard.getBoundingClientRect();
      const endRect = tokyoAnchor.getBoundingClientRect();
      // Clone card for flight animation
      const clone = activeCard.cloneNode(true);
      clone.removeAttribute('data-in-active-dock');
      clone.classList.add('tokyo-flight-clone');
      clone.dataset.mode = 'entry';
      Object.assign(clone.style, {
        position: 'fixed',
        margin: '0',
        left: startRect.left + 'px',
        top: startRect.top + 'px',
        width: startRect.width + 'px',
        transformOrigin: 'center center',
        zIndex: 5000
      });
      document.body.appendChild(clone);
      // Hide original active card (will be re-docked back into panel)
      activeCard.setAttribute('data-flight-hidden','true');
      requestAnimationFrame(() => {
        const dx = (endRect.left + (endRect.width/2)) - (startRect.left + startRect.width/2);
        const dy = (endRect.top + (endRect.height/2)) - (startRect.top + startRect.height/2);
        clone.setAttribute('data-phase','landing');
        if (prefersReducedMotion) {
          clone.style.transitionDuration = '120ms';
          clone.style.transform = `translate(${dx}px, ${dy}px) scale(1)`;
        } else {
          clone.style.transform = `translate(${dx}px, ${dy}px) scale(.72)`;
        }
        triggerAnchorGlow(tokyoAnchor);
      });
      const doneDelay = prefersReducedMotion ? 140 : 800;
      setTimeout(() => {
        // Remove clone, restore original card but relocate to monsters panel list (visual return of active slot card)
        try { clone.remove(); } catch(_) {}
        try {
          monstersPanel.appendChild(activeCard);
          activeCard.removeAttribute('data-flight-hidden');
          activeCard.classList.remove('is-active');
          activeCard.removeAttribute('data-in-active-dock');
          activeCard.setAttribute('data-in-tokyo','true');
          activeCard.dataset.tokyoAnimatedAt = Date.now();
          // Card entry glow effect
            activeCard.setAttribute('data-entry-glow','true');
            setTimeout(()=>{ try { activeCard.removeAttribute('data-entry-glow'); } catch(_){} }, 950);
        } catch(_) {}
        done && done();
      }, doneDelay);
    } catch(err) {
      done && done();
      logger.warn('[tokyoEntryAnimation] failed', err);
    }
  }

  function animateTokyoExit(playerId, slot, done) {
    try {
      const tokyoCard = document.querySelector(`.cmp-player-profile-card[data-player-id="${playerId}"][data-in-tokyo="true"]`);
      if (!tokyoCard) { done && done(); return; }
      const monstersPanel = document.querySelector('.cmp-monsters-panel .mp-player-cards');
      if (!monstersPanel) { done && done(); return; }
      // Destination: active slot or panel area center
      const activeSlot = document.getElementById('active-player-card-slot');
      const destAnchor = activeSlot || monstersPanel;
      const startRect = tokyoCard.getBoundingClientRect();
      const endRect = destAnchor.getBoundingClientRect();
      const clone = tokyoCard.cloneNode(true);
      clone.classList.add('tokyo-flight-clone');
      clone.dataset.mode = 'exit';
      Object.assign(clone.style, {
        position: 'fixed',
        margin: '0',
        left: startRect.left + 'px',
        top: startRect.top + 'px',
        width: startRect.width + 'px',
        transformOrigin: 'center center',
        zIndex: 5000
      });
      document.body.appendChild(clone);
      tokyoCard.setAttribute('data-flight-hidden','true');
      requestAnimationFrame(()=>{
        const dx = (endRect.left + (endRect.width/2)) - (startRect.left + startRect.width/2);
        const dy = (endRect.top + (endRect.height/2)) - (startRect.top + startRect.height/2);
        clone.setAttribute('data-phase','landing');
        if (prefersReducedMotion) {
          clone.style.transitionDuration = '120ms';
          clone.style.transform = `translate(${dx}px, ${dy}px) scale(1)`;
          clone.style.opacity = '0';
        } else {
          clone.style.transform = `translate(${dx}px, ${dy}px) scale(.95)`;
          clone.style.opacity = '0';
        }
      });
      const doneDelay = prefersReducedMotion ? 140 : 800;
      setTimeout(()=>{
        try { clone.remove(); } catch(_) {}
        try {
          tokyoCard.removeAttribute('data-flight-hidden');
          tokyoCard.removeAttribute('data-in-tokyo');
          monstersPanel.appendChild(tokyoCard);
          tokyoCard.dataset.tokyoExitAnimatedAt = Date.now();
        } catch(_) {}
        done && done();
      }, doneDelay);
    } catch(err) {
      done && done();
      logger.warn('[tokyoExitAnimation] failed', err);
    }
  }

  function triggerDamageFlash(playerId) {
    try {
      const el = document.querySelector(`.cmp-player-profile-card[data-player-id="${playerId}"]`);
      if (!el) return;
      el.setAttribute('data-damage-flash','true');
      setTimeout(()=>{ try { el.removeAttribute('data-damage-flash'); } catch(_){} }, 680);
    } catch(_) {}
  }

  function triggerAnchorGlow(anchorEl) {
    try {
      if (!anchorEl || !anchorEl.setAttribute) return;
      anchorEl.setAttribute('data-glow','true');
      setTimeout(()=>{ try { anchorEl.removeAttribute('data-glow'); } catch(_){} }, 1500);
    } catch(_) {}
  }
}
