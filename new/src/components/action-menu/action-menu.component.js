/** actionexport function build({ selector, emit }) {
  const root = document.createElement('div');
  root.id = 'action-menu';
  root.className = 'action-menu-button cmp-action-menu';
  root.setAttribute('data-draggable','true');u.component.js
 * MIGRATED: Legacy classes (.action-menu, .draggable, .btn) replaced.
 * Styles now sourced from css/components.action-menu.css + button tokens.
 * Pending: prune unused legacy .action-menu and draggable selectors.
 */
import { eventBus } from '../../core/eventBus.js';
import { store } from '../../bootstrap/index.js';
import { phaseChanged, nextTurn, diceSetAllKept } from '../../core/actions.js';
import { createPositioningService } from '../../services/positioningService.js';

export function build({ selector }) {
  const root = document.createElement('div');
  root.id = 'action-menu';
  root.className = 'cmp-action-menu cmp-panel-root';
  root.setAttribute('data-am-root','true');
  root.setAttribute('data-panel','action-menu');
  root.setAttribute('data-draggable','true');
  // Default layout now vertical (single column buttons); hybrid docking support
  root.setAttribute('data-layout','vertical');
  root.dataset.amDockState = 'docked'; // internal: docked | floating (for hybrid behavior)
  root.innerHTML = `
    <div class="am-label" aria-hidden="true">ACTIONS</div>
    <button id="roll-btn" data-action="roll" class="k-btn k-btn--primary">ROLL</button>
    <button id="keep-btn" data-action="keep" class="k-btn k-btn--secondary" disabled>KEEP ALL</button>
    <div class="power-cards-menu-container">
      <button id="power-cards-btn" data-action="power-cards" class="k-btn k-btn--secondary power-cards-btn">
        <span class="arrow-left">◀</span>
        <span class="btn-text">POWER CARDS</span>
        <span class="arrow-right">▶</span>
      </button>
      <div class="power-cards-submenu" data-submenu hidden>
        <button id="show-my-cards-btn" data-action="show-my-cards" class="k-btn k-btn--xs">MY CARDS</button>
        <button id="flush-btn" data-action="flush" class="k-btn k-btn--xs" disabled>FLUSH CARDS (2⚡)</button>
      </div>
    </div>
    <button id="end-turn-btn" data-action="end" class="k-btn k-btn--secondary" disabled>END TURN</button>`;
  // Add mobile setup
  const checkMobile = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobileWidth = width <= 760;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isLandscapeMobile = (width <= 1024 && height <= 768 && isTouchDevice);
    // Show mobile buttons when narrow OR touch device (matching CSS media query logic)
    return isMobileWidth || isTouchDevice || (isLandscapeMobile && width < 900);
  };
  
  // Add game-active class to make action menu visible (required by legacy CSS)
  root.classList.add('game-active');
  
  const setupMobile = () => {
    const isMobile = checkMobile();
    
    if (isMobile) {
      // Hide the main action menu initially in mobile
      root.style.display = 'none';
      
      // Mark as mobile mode and disable dragging
      root._wasMobile = true;
      root.setAttribute('data-draggable', 'false');
      
      // Remove any existing mobile toggle button first
      const existingBtn = document.getElementById('action-menu-mobile-btn');
      if (existingBtn) existingBtn.remove();
      
      const mobileBtn = document.createElement('div');
      mobileBtn.id = 'action-menu-mobile-btn';
      mobileBtn.className = 'action-menu-mobile-btn';
      mobileBtn.innerHTML = '☰'; // Hamburger menu icon
      mobileBtn.setAttribute('aria-label', 'Toggle Action Menu');
      
      // Set styles directly to ensure they apply
      Object.assign(mobileBtn.style, {
        position: 'fixed',
        bottom: '20px',
        left: 'calc(100vw - 70px)',
        width: '50px',
        height: '50px',
        background: 'linear-gradient(135deg, #ffcf33 0%, #ffb300 100%)',
        border: '3px solid #333',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        zIndex: '1500',
        transition: 'transform 0.2s ease'
      });
      
      document.body.appendChild(mobileBtn);
      
      // Toggle functionality
      mobileBtn.addEventListener('click', () => {
        const isVisible = root.style.display !== 'none';
        
        if (isVisible) {
          // Hide menu
          root.style.display = 'none';
          mobileBtn.style.transform = 'scale(1)';
        } else {
          // Show menu directly above the mobile button, right-aligned
          root.style.display = 'flex';
          root.style.position = 'fixed';
          root.style.bottom = '80px'; // Above the mobile button (20px + 50px + 10px gap)
          root.style.right = '20px'; // Right-align with button's right edge
          root.style.left = 'auto';
          root.style.transform = 'none';
          root.style.zIndex = '7000'; // Higher than monsters panel (1400)
          root.setAttribute('data-draggable', 'false'); // Disable dragging in mobile
          mobileBtn.style.transform = 'scale(0.9)';
        }
      });
      
      // Store reference for cleanup
      root._mobileBtn = mobileBtn;

    } else {
      // Desktop: show the menu normally, remove mobile button, reset position
      root.style.display = 'flex'; // Show on desktop
      root.style.position = '';
      root.style.bottom = '';
      root.style.left = '';
      root.style.right = '';
      root.style.transform = '';
      root.style.zIndex = '';
      root.setAttribute('data-draggable', 'true');
      
      // Reset to default desktop position
      root.style.top = '';
      root.style.right = '';
      
      // Initialize or re-enable dragging positioning service
      if (!root._positioning) {
        // First time desktop setup - initialize positioning service
        root._positioning = createPositioningService(store);
      }
      if (root._positioning) {
        root._positioning.makeDraggable(root, 'actionMenu', { snapEdges: true, snapThreshold: 12 });
        root._wasMobile = false;
      }
      
      const existingBtn = document.getElementById('action-menu-mobile-btn');
      if (existingBtn) existingBtn.remove();
    }
  };
  
  // Setup mobile immediately and on resize
  setupMobile();
  window.addEventListener('resize', setupMobile);
  
  // Ensure proper positioning for desktop after initial render
  setTimeout(() => {
    const width = window.innerWidth;
    if (width > 760) {
      // For desktop, ensure proper positioning
      const mode = store.getState().settings?.actionMenuMode || 'hybrid';
      if (mode === 'docked' || (mode === 'hybrid' && root.dataset.amDockState === 'docked')) {
        anchorActionMenu(root, true); // true = initial positioning
      }
      ensureVisibleWithinViewport(root);
      avoidMonsterPanelOverlap(root);
    }
  }, 100);
  


  root.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const st = store.getState();
    // Clean click handling without verbose diagnostics
    switch(action){
      case 'roll': eventBus.emit('ui/dice/rollRequested'); break;
      case 'keep': {
        // Behavior: when in ROLL phase with resolved dice, mark all dice as kept (visual shift up)
        if (st.phase === 'ROLL' && st.dice?.phase === 'resolved' && (st.dice.faces?.length||0) > 0) {
          store.dispatch(diceSetAllKept(true));
        }
        break; }
      case 'power-cards': {
        // Toggle submenu visibility
        const submenu = root.querySelector('.power-cards-submenu');
        if (submenu) {
          const isHidden = submenu.hasAttribute('hidden');
          console.log('Power cards clicked, submenu hidden:', isHidden);
          if (isHidden) {
            submenu.removeAttribute('hidden');
            updateSubmenuPosition(root);
          } else {
            submenu.setAttribute('hidden', '');
          }
        } else {
          console.error('Submenu not found');
        }
        break; }
      case 'show-my-cards': {
        // Open modal showing player's power cards
        eventBus.emit('ui/modal/showPlayerCards');
        // Hide submenu after action
        const submenu = root.querySelector('.power-cards-submenu');
        submenu.setAttribute('hidden', '');
        break; }
      case 'flush': {
        // Flush power cards shop for 2 energy
        const active = st.players?.byId?.[st.players?.order?.[st.meta?.activePlayerIndex]] || null;
        if (active && active.energy >= 2) {
          import('../../services/cardsService.js').then(({ flushShop }) => {
            import('../../bootstrap/index.js').then(({ logger }) => {
              flushShop(store, logger, active.id, 2);
            });
          });
        }
        // Hide submenu after action
        const submenu = root.querySelector('.power-cards-submenu');
        submenu.setAttribute('hidden', '');
        break; }
      case 'end': {
        const phase = st.phase;
        if (typeof window !== 'undefined' && window.__KOT_NEW__?.turnService) {
          const ts = window.__KOT_NEW__.turnService;
          if (!root._endTurnInFlight) {
            root._endTurnInFlight = true;
            let p;
            if (phase === 'ROLL') p = ts.resolve();
            else if (phase === 'BUY') p = ts.cleanup();
            else if (phase === 'CLEANUP' || phase === 'RESOLVE') p = ts.endTurn();
            else p = ts.endTurn();
            Promise.resolve(p).finally(()=> { root._endTurnInFlight = false; });
          }
        } else {
          // Fallback: advance minimally
          if (phase === 'ROLL') store.dispatch(phaseChanged('RESOLVE'));
          else { store.dispatch(nextTurn()); store.dispatch(phaseChanged('ROLL')); }
        }
        break; }
      // legacy panels toggle removed
    }
  });
  // Restore draggability & persisted position
  try {
    const positioning = createPositioningService(store);
    root._positioning = positioning; // Store reference for mobile/desktop transitions
    positioning.hydrate();
    // Disable dragging on touch/mobile (coarse pointer) or narrow viewports
    const isTouch = matchMedia('(pointer: coarse)').matches || window.innerWidth <= 760;
    if (isTouch) {
      root.setAttribute('data-draggable','false');
      // Force mobile positioning for action menu
      root.style.position = 'fixed';
      root.style.bottom = '20px';
      root.style.left = '80%';
      root.style.top = 'auto';
      root.style.right = 'auto';
      root.style.transform = 'none';

    }
    if (root.getAttribute('data-draggable') !== 'false') {
      // Remove bounds to allow dragging anywhere, including over the toolbar
      positioning.makeDraggable(root, 'actionMenu', { snapEdges: true, snapThreshold: 12 });
    }
    // Track drag to switch hybrid -> floating
    let dragTransformStart = null;
    root.addEventListener('pointerdown', () => { dragTransformStart = root.style.transform; }, { capture:true });
    window.addEventListener('pointerup', () => {
      if (dragTransformStart !== null) {
        if (root.style.transform !== dragTransformStart) {
          root._userMoved = true;
          if ((store.getState().settings?.actionMenuMode || 'hybrid') === 'hybrid') {
            root.dataset.amDockState = 'floating';
          }
          // Update arrow visibility after drag
          updateArrowVisibility(root);
          // Hide submenu if it was open during drag
          const submenu = root.querySelector('.power-cards-submenu');
          if (submenu && !submenu.hasAttribute('hidden')) {
            submenu.setAttribute('hidden', '');
          }
        }
        dragTransformStart = null;
      }
    });
    // Re-clamp on resize so it never drifts off-screen after viewport changes
    const clampIntoView = () => {
      // Check if mobile mode should be applied
      const isMobileNow = matchMedia('(pointer: coarse)').matches || window.innerWidth <= 760;
      if (isMobileNow) {
        // Force mobile positioning
        root.style.position = 'fixed';
        root.style.bottom = '5%';
        root.style.left = '80%';
        root.style.top = 'auto';
        root.style.right = 'auto';
        root.style.transform = 'none';
        return;
      }
      
      const rect = root.getBoundingClientRect();
      const maxLeft = window.innerWidth - rect.width - 4;
      const maxTop = window.innerHeight - rect.height - 4;
      // Extract current translate
      const m = /translate\(([-0-9.]+)px,\s*([-0-9.]+)px\)/.exec(root.style.transform||'');
      let tx = m ? parseFloat(m[1]) : 0;
      let ty = m ? parseFloat(m[2]) : 0;
      // If using top/left positioning fallback (initial placement), compute from offsets
      if (!m) {
        tx = root.offsetLeft; ty = root.offsetTop;
      }
      tx = Math.min(Math.max(tx, 0), maxLeft);
      ty = Math.min(Math.max(ty, 0), maxTop);
      root.style.transform = `translate(${tx}px, ${ty}px)`;
    };
    window.addEventListener('resize', () => {
      const mode = store.getState().settings?.actionMenuMode || 'hybrid';
      if (mode === 'docked' || (mode === 'hybrid' && root.dataset.amDockState === 'docked')) {
        anchorActionMenu(root);
      }
      clampIntoView();
      ensureVisibleWithinViewport(root);
      avoidMonsterPanelOverlap(root);
    });
    // If no persisted position yet, place next to dice tray by default
    const persist = !!store.getState().settings?.persistPositions;
    const hasSaved = persist && !!store.getState().ui.positions.actionMenu;
    if (!hasSaved) {
      anchorActionMenu(root, true);
      // Additional pass after layout settle
      requestAnimationFrame(() => { if (!root._userMoved && root.dataset.amDockState === 'docked') anchorActionMenu(root); });
    }
  } catch(e) { /* non-fatal */ }
  
  // Add click outside handler for submenu
  document.addEventListener('click', (e) => {
    const submenu = root.querySelector('.power-cards-submenu');
    if (submenu && !submenu.hasAttribute('hidden')) {
      if (!root.contains(e.target)) {
        submenu.setAttribute('hidden', '');
      }
    }
  });
  
  // Add deck illumination on power cards button hover
  const powerCardsBtn = root.querySelector('.power-cards-btn');
  if (powerCardsBtn) {
    powerCardsBtn.addEventListener('mouseenter', () => {
      const deck = document.querySelector('.power-card-deck');
      if (deck) {
        deck.style.boxShadow = 'inset 0 0 20px rgba(0,0,0,0.3), 0 0 20px #4a7c59';
      }
    });
    
    powerCardsBtn.addEventListener('mouseleave', () => {
      const deck = document.querySelector('.power-card-deck');
      if (deck) {
        deck.style.boxShadow = 'inset 0 0 20px rgba(0,0,0,0.3)';
      }
    });
  }
  
    return { root, update: (props) => update(root, props), destroy: () => {
    root._destroyExtras && root._destroyExtras();
    if (root._mobileBtn) {
      root._mobileBtn.remove();
    }
    window.removeEventListener('resize', setupMobile);
    root.remove();
  } };
}

// (legacy panels toggle removed)

// (Removed deferred DOMContentLoaded init; handled synchronously above)

// (Removed global fallback & debug instrumentation – drag service now respects data-nodrag)

function updateArrowVisibility(root) {
  const rect = root.getBoundingClientRect();
  const submenuWidth = 200;
  const margin = 8;
  const leftSpace = rect.left - margin;
  const rightSpace = window.innerWidth - rect.right - margin;
  
  const leftArrow = root.querySelector('.arrow-left');
  const rightArrow = root.querySelector('.arrow-right');
  
  if (leftArrow && rightArrow) {
    // Show arrow pointing to the side where submenu will appear
    const shouldShowLeft = leftSpace > rightSpace && leftSpace >= submenuWidth;
    leftArrow.style.opacity = shouldShowLeft ? '1' : '0';
    rightArrow.style.opacity = shouldShowLeft ? '0' : '1';
  }
}

function updateSubmenuPosition(root) {
  const submenu = root.querySelector('.power-cards-submenu');
  const rect = root.getBoundingClientRect();
  
  if (submenu) {
    // Calculate available space on both sides
    const submenuWidth = 200; // min-width from CSS
    const margin = 8; // margin from CSS
    const leftSpace = rect.left - margin;
    const rightSpace = window.innerWidth - rect.right - margin;
    
    // Choose side with more space, but prefer right if equal
    const shouldShowLeft = leftSpace > rightSpace && leftSpace >= submenuWidth;
    
    submenu.classList.toggle('submenu-left', shouldShowLeft);
    submenu.classList.toggle('submenu-right', !shouldShowLeft);
  }
}

export function update(root) {
  const st = store.getState();
  const rollBtn = root.querySelector('[data-action="roll"]');
  const keepBtn = root.querySelector('[data-action="keep"]');
  const powerCardsBtn = root.querySelector('[data-action="power-cards"]');
  const flushBtn = root.querySelector('[data-action="flush"]');
  const endBtn = root.querySelector('[data-action="end"]');
  // Update arrow visibility based on menu position
  updateArrowVisibility(root);
  // no collapse button in mobile; hamburger opens/closes via window event
  const dice = st.dice || {};
  const faces = dice.faces || [];
  const hasAnyFaces = faces.length > 0;
  const keptCount = faces.reduce((n,f)=> n + (f && f.kept ? 1 : 0), 0);
  // New dice state model: phase: 'idle' | 'rolling' | 'resolved' | 'sequence-complete'
  // rerollsRemaining tracks how many rerolls still available (after first roll).
  const isIdle = dice.phase === 'idle';
  const hasFirstRoll = !isIdle && (dice.faces?.length > 0);
  const anyUnkept = faces.some(f => f && !f.kept);
  const canReroll = dice.phase === 'resolved' && dice.rerollsRemaining > 0 && anyUnkept;
  const canInitialRoll = isIdle;
  const canRoll = st.phase === 'ROLL' && (canInitialRoll || canReroll) && dice.phase !== 'rolling';
  const order = st.players.order;
  let active = null;
  if (order.length) {
    const activeId = order[st.meta.activePlayerIndex % order.length];
    active = st.players.byId[activeId];
  }
  const isCPU = !!(active && (active.isCPU || active.isAi || active.type === 'ai'));

  if (rollBtn) {
    rollBtn.disabled = isCPU ? true : !canRoll;
    // Dynamic label: after first roll, change to RE-ROLL UNSELECTED
    rollBtn.textContent = hasFirstRoll ? 'RE-ROLL UNSELECTED' : 'ROLL';
  }
  if (keepBtn) {
    const allKept = hasAnyFaces && faces.every(f => !!f.kept);
    const canKeepAll = st.phase === 'ROLL' && hasAnyFaces && dice.phase === 'resolved' && !isCPU && !allKept;
    keepBtn.disabled = !canKeepAll;
    keepBtn.textContent = 'KEEP ALL';
  }
  if (flushBtn) {
    // Enable flush button only after final roll (no rerolls remaining) and player has enough energy
    const afterFinalRoll = st.phase === 'ROLL' && dice.phase === 'resolved' && dice.rerollsRemaining === 0;
    const hasEnergy = active && active.energy >= 2;
    const canFlush = !isCPU && afterFinalRoll && hasEnergy;
    flushBtn.disabled = !canFlush;
  }
  if (endBtn) {
    // End turn should be enabled when:
    // 1. After any roll when you have dice resolved or sequence-complete
    // 2. When not in ROLL phase
    const diceReadyToEnd = dice.phase === 'resolved' || dice.phase === 'sequence-complete';
    const canEndAfterRoll = st.phase === 'ROLL' && diceReadyToEnd && hasAnyFaces;
    const notRollPhase = st.phase !== 'ROLL';
    const canEnd = !isCPU && (canEndAfterRoll || notRollPhase);
    
    // Debug logging when end button should be enabled but isn't
    if (!canEnd && !isCPU) {
      console.log('🚫 End Turn Disabled - Debug Info:', {
        phase: st.phase,
        dicePhase: dice.phase,
        keptCount,
        hasAnyFaces,
        rerollsRemaining: dice.rerollsRemaining,
        canEndAfterRoll,
        notRollPhase,
        isCPU
      });
    }
    
    endBtn.disabled = !canEnd;
  }

  // CPU turn styling state
  if (isCPU) root.classList.add('cpu-turn'); else root.classList.remove('cpu-turn');

  // Auto-roll for CPU active player (first roll only) after roll-for-first resolution
  try {
    if (isCPU && st.phase === 'ROLL' && isIdle && !hasAnyFaces) {
      if (root._lastCpuAutoRollIndex !== st.meta.activePlayerIndex) {
        root._lastCpuAutoRollIndex = st.meta.activePlayerIndex;
        setTimeout(() => {
          // Flash cue on roll button (visual indicator CPU took action)
          if (rollBtn) {
            rollBtn.classList.add('cpu-flash');
            setTimeout(()=> rollBtn && rollBtn.classList.remove('cpu-flash'), 1200);
          }
          eventBus.emit('ui/dice/rollRequested');
        }, 350);
      }
    } else if (!isCPU) {
      root._lastCpuAutoRollIndex = undefined;
    }
  } catch(_) {}

  enforceVerticalLayout(root);

  // Mobile/touch: horizontal layout and hamburger toggle behavior
  const isTouch = matchMedia('(pointer: coarse)').matches || window.innerWidth <= 760;
  if (isTouch) {
    root.setAttribute('data-layout','horizontal');
    // Position as a top-left drawer; hidden by default until hamburger toggles
    if (!root._hbWired) {
      root._hbWired = true;
      // Ensure backdrop element exists for outside-click close
      let backdrop = document.querySelector('.action-menu-backdrop');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'action-menu-backdrop';
        document.body.appendChild(backdrop);
      }
      const applyHidden = () => {
        const open = !!root._hamburgerOpen;
        root.toggleAttribute('data-hamburger-open', open);
        if (backdrop) backdrop.toggleAttribute('data-show', open);
      };
    // Hamburger toggle: open/close and anchor relative to the Actions button
  window.addEventListener('ui.actionMenu.hamburgerToggle', (e) => {
        // Close settings/tools menu if open to ensure only one menu is visible
        try { window.dispatchEvent(new CustomEvent('ui.settingsMenu.forceClose')); } catch(_){}
        root._hamburgerOpen = !root._hamburgerOpen;
        try {
          const r = e?.detail?.anchorRect;
          const bottom = 56 + 8; // sit above bottom-left Actions Menu button
          root.style.bottom = bottom + 'px';
          root.style.top = 'auto';
          root.setAttribute('data-hamburger-corner','left');
          root.style.left = '8px';
          root.style.right = 'auto';
          // Clear any transform-based drift from previous drags
          root.style.transform = 'translate(0, 0)';
          // Let CSS compute width; reset explicit width if any
          root.style.width = '';
        } catch(_){ }
        applyHidden();
      });
      // Outside click via backdrop
      backdrop.addEventListener('click', () => { if (root._hamburgerOpen) { root._hamburgerOpen = false; applyHidden(); } });
  // Listen for forced close from counterpart menu
  window.addEventListener('ui.actionMenu.forceClose', () => { if (root._hamburgerOpen) { root._hamburgerOpen = false; applyHidden(); } });
      // ESC to close
      window.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && root._hamburgerOpen) { root._hamburgerOpen = false; applyHidden(); } });
      window.addEventListener('resize', () => { if (window.innerWidth > 760) { root._hamburgerOpen = false; applyHidden(); } });
      applyHidden();
    }
  } else {
    root.setAttribute('data-layout','vertical');
    root.removeAttribute('data-collapsed');
    root._hamburgerOpen = false;
    root.removeAttribute('data-hamburger-open');
  }
}

// ------------------------------
// Enforce vertical layout (single column) regardless of viewport size
let amResizeRO;
function enforceVerticalLayout(root){
  if (!root) return;
  const apply = () => {
    root.setAttribute('data-layout','vertical');
    // If menu extends beyond viewport bottom, cap its height and enable internal scroll
    const rect = root.getBoundingClientRect();
    const maxVisible = window.innerHeight - 40; // leave some margin
    if (rect.height > maxVisible) {
      root.style.maxHeight = maxVisible + 'px';
      root.style.overflowY = 'auto';
    } else {
      root.style.maxHeight = '';
      root.style.overflowY = '';
    }
  };
  apply();
  if (!amResizeRO) {
    // DISABLED: ResizeObserver temporarily disabled for troubleshooting
    // TODO: Re-enable when animation issues are resolved
    // amResizeRO = new ResizeObserver(apply);
    // amResizeRO.observe(document.documentElement);
    
    // Use fallback event listeners instead of ResizeObserver
    window.addEventListener('orientationchange', apply);
    window.addEventListener('resize', apply);
  }
}

// Ensure the menu never ends up fully below the fold after drastic vertical resize.
function ensureVisibleWithinViewport(root) {
  try {
    const rect = root.getBoundingClientRect();
    const vh = window.innerHeight;
    // If bottom is above 0 (fine) or top within viewport we do nothing.
    // If top is beyond viewport height (menu moved off-screen), reset to a safe anchor.
    if (rect.top > vh - 40) {
      // Anchor near bottom with small padding
      const desiredTop = Math.max(10, vh - rect.height - 90); // leave room above footer (64px + margin)
      root.style.top = desiredTop + 'px';
      root.style.bottom = '';
      // Clear transform-based translation if present
      root.style.transform = 'translate(0,0)';
    }
    // If header overlap pushes it out of view (negative top beyond threshold), nudge down
    if (rect.top < 0) {
      const offset = Math.min(0, rect.top) * -1 + 10;
      const currentTop = parseInt(root.style.top||'0',10) || 0;
      root.style.top = (currentTop + offset) + 'px';
    }
  } catch(_) {}
}

// If overlapping (visually) with monsters panel on right side, nudge action menu left.
function avoidMonsterPanelOverlap(root) {
  try {
    const monsters = document.getElementById('monsters-panel');
    if (!monsters) return;
    const rRect = root.getBoundingClientRect();
    const mRect = monsters.getBoundingClientRect();
    const overlapX = rRect.left < mRect.right && rRect.right > mRect.left;
    const overlapY = rRect.top < mRect.bottom && rRect.bottom > mRect.top;
    if (overlapX && overlapY) {
      // Compute new left position so its right edge sits 12px left of monsters panel
      const shiftLeft = (mRect.left - 12) - rRect.width;
      if (shiftLeft > 0) {
        root.style.left = shiftLeft + 'px';
        root.style.right = 'auto';
        root.style.transform = 'translate(0,0)';
      } else {
        // fallback: place it below monsters panel
        root.style.top = (mRect.bottom + 16 + window.scrollY) + 'px';
        root.style.right = '50%';
      }
    }
  } catch(_) {}
}

// Re-anchor near dice tray (used for docked mode and hybrid before user drag)
function anchorActionMenu(root, initial=false) {
  const toolbar = document.getElementById('toolbar-menu');
  const mode = store.getState().settings?.actionMenuMode || 'hybrid';
  if (root._userMoved && (mode === 'floating' || mode === 'hybrid')) return;
  if (!toolbar) {
    // Fallback: top-right viewport anchor
    if (initial && (anchorActionMenu._tries = (anchorActionMenu._tries||0)+1) < 12) {
      requestAnimationFrame(() => anchorActionMenu(root, true));
    }
    root.style.left = (window.innerWidth - root.offsetWidth - 40) + 'px';
    root.style.top = '100px';
    root.style.transform = 'translate(0,0)';
    if (mode === 'hybrid') root.dataset.amDockState = 'docked';
    return;
  }
  const r = toolbar.getBoundingClientRect();
  const scrollY = window.scrollY || 0;
  const GAP = 32;
  const desiredLeft = r.right + GAP;
  const maxLeft = window.innerWidth - (root.offsetWidth || 240) - 12;
  root.style.left = Math.min(desiredLeft, maxLeft) + 'px';
  // Ensure we have a measured height; if zero (not yet laid out) schedule another frame.
  const menuHeight = root.offsetHeight;
  if (!menuHeight && (anchorActionMenu._heightTries = (anchorActionMenu._heightTries||0)+1) < 5) {
    requestAnimationFrame(() => anchorActionMenu(root, initial));
    return;
  }
  // Align menu bottom to toolbar top => top = toolbarTop - menuHeight
  let top = r.top + scrollY - menuHeight;
  const minTop = 10;
  const maxTop = window.innerHeight - menuHeight - 10 + scrollY;
  if (top < minTop) top = minTop; else if (top > maxTop) top = maxTop;
  root.style.top = top + 'px';
  root.style.right = '';
  root.style.bottom = '';
  root.style.transform = 'translate(0,0)';
  if (mode === 'hybrid') root.dataset.amDockState = 'docked';
}
