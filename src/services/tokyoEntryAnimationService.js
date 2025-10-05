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
  function animationsDisabled() {
    try { return document.body.hasAttribute('data-disable-animations'); } catch(_) { return false; }
  }

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
  // Check if mobile
  const isMobile = window.matchMedia && (window.matchMedia('(max-width: 760px)').matches || window.matchMedia('(pointer: coarse)').matches);
  
  // In mobile: animate active-player-bubble to Tokyo slot, then transform to profile card
  if (isMobile) {
    const bubble = document.getElementById('active-player-bubble');
    const targetSlot = document.querySelector(slot === 'city' ? '[data-city-slot]' : '[data-bay-slot]');
    if (!bubble || !targetSlot) { done && done(); return; }
    
    // Get or create the profile card for this player (may be in monsters panel)
    let profileCard = document.querySelector(`.cmp-player-profile-card[data-player-id="${playerId}"]`);
    if (!profileCard) { done && done(); return; }
    
    // Step 1: Detach bubble from current position and add as direct child of body
    const bubbleOriginalParent = bubble.parentElement;
    if (bubbleOriginalParent) {
      document.body.appendChild(bubble);
    }
    
    // Step 2: Get start and end positions
    const startRect = bubble.getBoundingClientRect();
    const endRect = targetSlot.getBoundingClientRect();
    
    // Set bubble to fixed positioning at current location
    Object.assign(bubble.style, {
      position: 'fixed',
      left: startRect.left + 'px',
      top: startRect.top + 'px',
      width: startRect.width + 'px',
      height: startRect.height + 'px',
      margin: '0',
      transition: 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      zIndex: '9000'
    });
    
    // Step 3: Animate bubble to Tokyo slot position
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const dx = endRect.left + (endRect.width / 2) - (startRect.left + (startRect.width / 2));
        const dy = endRect.top + (endRect.height / 2) - (startRect.top + (startRect.height / 2));
        bubble.style.transform = `translate(${dx}px, ${dy}px)`;
      });
    });
    
    // Step 4: After animation, flash and transform into profile card
    setTimeout(() => {
      // Flash effect
      bubble.style.transition = 'opacity 0.15s ease-in-out';
      bubble.style.opacity = '0';
      
      setTimeout(() => {
        bubble.style.opacity = '1';
        setTimeout(() => {
          bubble.style.opacity = '0';
          
          setTimeout(() => {
            // Step 5: Hide bubble and insert scaled profile card into Tokyo slot
            bubble.style.display = 'none';
            bubble.setAttribute('data-hidden-until-next-turn', 'true');
            
            // Clone the profile card and insert into Tokyo slot
            const cardClone = profileCard.cloneNode(true);
            cardClone.removeAttribute('data-in-active-dock');
            cardClone.classList.remove('is-active');
            cardClone.setAttribute('data-in-tokyo', 'true');
            cardClone.setAttribute('data-live-in-tokyo-slot', slot);
            // Position and scale card to center within Tokyo slot (mobile)
            cardClone.style.position = 'absolute';
            cardClone.style.left = '50%';
            cardClone.style.top = '50%';
            cardClone.style.transform = 'translate(-50%, -50%) scale(0.55)';
            
            targetSlot.innerHTML = '';
            targetSlot.appendChild(cardClone);
            
            // Glow effect
            cardClone.setAttribute('data-entry-glow', 'true');
            setTimeout(() => { try { cardClone.removeAttribute('data-entry-glow'); } catch(_) {} }, 950);
            
            // Announce
            announceTokyoEntry(playerId, slot);
            
            done && done();
          }, 150);
        }, 150);
      }, 150);
    }, 500); // Wait for slide animation to complete
    
    return; // Exit early for mobile
  }
  
  // Desktop version: active card resides in arena dock (.arena-active-player-dock)
  const arenaDock = document.querySelector('.arena-active-player-dock');
  const activeCard = arenaDock ? arenaDock.querySelector(`.cmp-player-profile-card[data-player-id="${playerId}"]`) : null;
  if (!activeCard) { done && done(); return; }
  const targetSlot = document.querySelector(slot === 'city' ? '[data-city-slot]' : '[data-bay-slot]');
  if (!targetSlot) { done && done(); return; }
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
      // Hide original active card (it will be relocated to the Tokyo slot after animation)
      activeCard.setAttribute('data-flight-hidden','true');
      // Proactively clear the active dock so next active player (if turn advances quickly) can mount without waiting for animation end.
      try {
  if (arenaDock && arenaDock.firstChild === activeCard) {
          // Leave placeholder to prevent layout shift (optional minimal stub)
          const ph = document.createElement('div');
          ph.style.width = activeCard.style.width || activeCard.getBoundingClientRect().width + 'px';
          ph.style.height = activeCard.style.height || activeCard.getBoundingClientRect().height + 'px';
          ph.style.pointerEvents = 'none';
          activeCardSlot.replaceChild(ph, activeCard);
        }
      } catch(_) {}
      requestAnimationFrame(() => {
        const dx = (endRect.left + (endRect.width/2)) - (startRect.left + startRect.width/2);
        const dy = (endRect.top + (endRect.height/2)) - (startRect.top + startRect.height/2);
        clone.setAttribute('data-phase','landing');
        if (prefersReducedMotion || animationsDisabled()) {
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
          targetSlot.innerHTML = '';
          targetSlot.appendChild(activeCard);
          activeCard.removeAttribute('data-flight-hidden');
          activeCard.classList.remove('is-active');
          activeCard.removeAttribute('data-in-active-dock');
          activeCard.setAttribute('data-in-tokyo','true');
          activeCard.setAttribute('data-live-in-tokyo-slot', slot);
          activeCard.dataset.tokyoAnimatedAt = Date.now();
          // Card entry glow effect
          activeCard.setAttribute('data-entry-glow','true');
          setTimeout(()=>{ try { activeCard.removeAttribute('data-entry-glow'); } catch(_){} }, 950);
          // Particle burst
          if (!prefersReducedMotion && !animationsDisabled()) {
            spawnParticles(activeCard, 10);
            activeCard.classList.add('tokyo-settle');
            setTimeout(()=>activeCard.classList.remove('tokyo-settle'), 900);
          }
          announceTokyoEntry(playerId, slot);
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
  const tokyoCard = document.querySelector(`.cmp-player-profile-card[data-player-id="${playerId}"][data-live-in-tokyo-slot]`);
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
        if (prefersReducedMotion || animationsDisabled()) {
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
          const slotAttr = tokyoCard.getAttribute('data-live-in-tokyo-slot');
          tokyoCard.removeAttribute('data-in-tokyo');
          tokyoCard.removeAttribute('data-live-in-tokyo-slot');
          // Allow arena update cycle to repopulate placeholder clone next frame
          const slotEl = document.querySelector(slotAttr === 'city' ? '[data-city-slot]' : '[data-bay-slot]');
          if (slotEl && !slotEl.contains(tokyoCard)) {
            // slot will be re-rendered; ensure it's empty so renderOccupant can run
            slotEl.innerHTML = '';
          }
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

  function spawnParticles(cardEl, count) {
    try {
      const rect = cardEl.getBoundingClientRect();
      for (let i=0;i<count;i++) {
        const p = document.createElement('span');
        p.className = 'tokyo-entry-particle';
        const size = 6 + Math.random()*10;
        p.style.left = (rect.left + rect.width/2) + 'px';
        p.style.top = (rect.top + rect.height/2) + 'px';
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.margin = '-3px 0 0 -3px';
        document.body.appendChild(p);
        requestAnimationFrame(()=>{
          const angle = Math.random()*Math.PI*2;
            const dist = 40 + Math.random()*60;
            const dx = Math.cos(angle)*dist;
            const dy = Math.sin(angle)*dist;
            p.style.opacity='1';
            p.style.transform = `translate(${dx}px, ${dy}px) scale(1)`;
        });
        setTimeout(()=>{ try { p.style.opacity='0'; } catch(_){} }, 520);
        setTimeout(()=>{ try { p.remove(); } catch(_){} }, 900);
      }
    } catch(_) {}
  }

  function announceTokyoEntry(playerId, slot) {
    try {
      const region = document.getElementById('aria-live-phase');
      if (!region) return;
      const st = store.getState();
      const p = st.players?.byId?.[playerId];
      const name = p?.name || 'Player';
      region.textContent = `${name} entered Tokyo ${slot === 'city' ? 'City' : 'Bay'}`;
    } catch(_) {}
  }
}
