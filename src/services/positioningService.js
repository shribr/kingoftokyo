/** positioningService.js — Persistent UI element positioning with dragging (migrate legacy .draggable)
 *  Usage:
 *   const ps = createPositioningService(store);
 *   ps.hydrate();
 *   ps.makeDraggable(element, componentName);
 */
import { uiPositionSet, uiPositionsReset } from '../core/actions.js';
import { store as bootstrapStore } from '../bootstrap/index.js';
import { eventBus } from '../core/eventBus.js';

// Viewport conversion constants
const VIEWPORT_WIDTH_REF = 1920;  // Reference width for vw calculations
const VIEWPORT_HEIGHT_REF = 1080; // Reference height for vh calculations

// Helper functions to convert px to viewport units based on CURRENT window size
function pxToVw(px) {
  return (px / window.innerWidth) * 100;
}

function pxToVh(px) {
  return (px / window.innerHeight) * 100;
}

function vhToPx(vh) {
  return (vh * window.innerHeight) / 100;
}

function vwToPx(vw) {
  return (vw * window.innerWidth) / 100;
}

const STORAGE_KEY = 'kot_new_ui_positions_v1';
let singleton;

export function createPositioningService(store) {
  if (singleton) return singleton;
  const active = new Map(); // element -> drag state
  let lastPersist = 0;
  let hydrationDone = false;

  // Subscribe once for persistence of entire positions object
  let prevPositions = null;
  let prevPersistSetting = null;
  store.subscribe(() => {
    const st = store.getState();
    const allowPersist = !!st.settings?.persistPositions;
    
    // OPTIMIZATION: Skip if persist setting hasn't changed and positions haven't changed
    if (prevPersistSetting === allowPersist && prevPositions === st.ui.positions) {
      return;
    }
    
    if (!allowPersist) {
      prevPersistSetting = allowPersist;
      prevPositions = st.ui.positions;
      return; // do nothing if persistence disabled
    }
    
    const positions = st.ui.positions;
    persistThrottled(positions);
    
    prevPersistSetting = allowPersist;
    prevPositions = positions;
  });

  let zCounter = 6000; // elevated above base component z-indexes

  function makeDraggable(el, componentName, opts = {}) {
    // Check if we're on mobile device - skip dragging if so
    const isMobile = () => {
      return window.innerWidth <= 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    };
    
    if (isMobile()) {
      el.dataset.draggable = 'false';
      return; // Skip dragging setup on mobile
    }
    
    el.style.touchAction = 'none';
    el.dataset.draggable = 'true';
    const saved = store.getState().ui.positions[componentName];
    if (saved && store.getState().settings?.persistPositions) {
      applyTransform(el, saved.x, saved.y);
    }

    let pointerId = null;
    let origin = { x:0, y:0 };
    let start = { x:0, y:0 };

    let dragging = false;
    const activateDistance = typeof opts.activateDistance === 'number' ? opts.activateDistance : 4; // px threshold
  const noDragSelector = opts.noDragSelector || '[data-nodrag],[data-action],button,input,textarea,select';
  const handleSelector = opts.handleSelector; // if provided, only initiate drag when pointerdown originates inside handle

    function onPointerDown(e) {
      if (pointerId !== null) return; // already tracking
      if (e.target.closest(noDragSelector)) return; // interactive zone – let click happen
      if (handleSelector) {
        const handleMatch = e.target.closest(handleSelector);
        if (!handleMatch || !el.contains(handleMatch)) return; // require handle for drag start
      }
      pointerId = e.pointerId;
      el.setPointerCapture(pointerId);
      start = currentTransform(el);
      origin = { x: e.clientX, y: e.clientY };
      dragging = false; // not yet – wait for movement beyond threshold
      // Do NOT preventDefault here to preserve click events on interactive children
    }
    function onPointerMove(e) {
      if (e.pointerId !== pointerId) return;
      const dx = e.clientX - origin.x;
      const dy = e.clientY - origin.y;
      if (!dragging) {
        if (Math.abs(dx) >= activateDistance || Math.abs(dy) >= activateDistance) {
          dragging = true;
          // Raise z-order once drag actually begins
          try { el.style.zIndex = String(++zCounter); } catch(_) {}
          // Once dragging starts, prevent default to avoid text selection/scroll conflicts
          try { e.preventDefault(); } catch(_) {}
        } else {
          return; // below threshold – allow potential click
        }
      }
      const nx = start.x + dx;
      const ny = start.y + dy;
      const bounded = applyBounds(nx, ny, el, opts.bounds);
      const snapped = maybeSnap(bounded.x, bounded.y, opts.grid);
      applyTransform(el, snapped.x, snapped.y);
      throttledPersist(componentName, snapped.x, snapped.y);
    }
    function onPointerUp(e) {
      if (e.pointerId !== pointerId) return;
      el.releasePointerCapture(e.pointerId);
      pointerId = null;
      if (!dragging) {
        // Treat as click pass-through; nothing to do (we avoided preventing default)
        return;
      }
      // Edge snapping logic after a completed drag
      if (opts.snapEdges) {
        try {
          const threshold = typeof opts.snapThreshold === 'number' ? opts.snapThreshold : 12;
          const rect = el.getBoundingClientRect();
          const vpW = window.innerWidth;
          const vpH = window.innerHeight;
          const cur = currentTransform(el);
          let tx = cur.x; let ty = cur.y; let snapped = false;
          const leftDist = rect.left;
          const topDist = rect.top;
          const rightDist = vpW - rect.right;
          const bottomDist = vpH - rect.bottom;
          if (leftDist <= threshold) { tx = cur.x - leftDist; snapped = true; }
          else if (rightDist <= threshold) { tx = cur.x + rightDist; snapped = true; }
          if (topDist <= threshold) { ty = cur.y - topDist; snapped = true; }
          else if (bottomDist <= threshold) { ty = cur.y + bottomDist; snapped = true; }
          if (snapped) {
            const bounded = applyBounds(tx, ty, el, opts.bounds);
            applyTransform(el, bounded.x, bounded.y);
            store.dispatch(uiPositionSet(componentName, bounded.x, bounded.y));
          }
        } catch(_) { /* ignore snapping errors */ }
      }
    }

    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  function throttledPersist(name, x, y) {
    const now = performance.now();
    if (now - lastPersist > 120) { // ~8 fps throttle for store writes
      if (store.getState().settings?.persistPositions) {
        store.dispatch(uiPositionSet(name, x, y));
      }
      lastPersist = now;
    }
  }

  function persistThrottled(allPositions) {
    const now = performance.now();
    if (now - lastPersist > 150) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(allPositions)); } catch(_) {}
      lastPersist = now;
    }
  }

  function hydrate() {
    if (hydrationDone) return;
    hydrationDone = true;
    let stored;
    try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch(_) { stored = null; }
    if (stored && typeof stored === 'object' && store.getState().settings?.persistPositions) {
      const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1024;
      const viewportH = typeof window !== 'undefined' ? window.innerHeight : 768;
      const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
      Object.entries(stored).forEach(([name, pos]) => {
        if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
          // Clamp to near-viewport; assume a minimal 120x120 footprint to avoid fully off-screen
          const cx = clamp(pos.x, 0, Math.max(0, viewportW - 120));
          const cy = clamp(pos.y, 0, Math.max(0, viewportH - 120));
          store.dispatch(uiPositionSet(name, cx, cy));
        }
      });
    }
  }

  function resetPositions() {
    try { localStorage.removeItem(STORAGE_KEY); } catch(_) {}
    store.dispatch(uiPositionsReset());
    
    // Close any open floating modals and clear their stored positions
    const winOddsModal = document.getElementById('mini-win-odds-floating');
    if (winOddsModal) {
      winOddsModal.remove();
    }
    // Clear Win Odds modal stored size/position to recenter on next open
    try { localStorage.removeItem('KOT_WIN_ODDS_MINI_SIZE'); } catch(_) {}
    
    // Clear all draggable element transforms first
    const draggableElements = document.querySelectorAll('[data-draggable="true"]');
    draggableElements.forEach(el => {
      el.style.transform = '';
      el.style.left = '';
      el.style.top = '';
      el.style.right = '';
      el.style.bottom = '';
      el.style.position = '';
    });
    
    // Function to position elements relative to toolbar
    function positionRelativeToToolbar() {
      const toolbar = document.querySelector('.cmp-toolbar');
      const pauseButton = toolbar?.querySelector('[data-action="pause"]');
      const diceBox = document.querySelector('.cmp-dice-tray');
      const actionMenu = document.querySelector('.cmp-action-menu');
      
      // Check if user has dragged the dice tray - if so, don't override their position
      const diceHasPersistedPosition = store.getState().ui?.positions?.diceTray;
      
      // Skip positioning on mobile (uses CSS positioning instead)
      const isMobile = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
      
      if (toolbar && pauseButton && diceBox && !diceHasPersistedPosition && !isMobile) {
        const toolbarRect = toolbar.getBoundingClientRect();
        const pauseRect = pauseButton.getBoundingClientRect();
        const diceRect = diceBox.getBoundingClientRect();
        
        // Calculate dice tray position using bottom/right (more resize-friendly)
        const padding = 40; // Space between toolbar and dice tray
        const bottomOffset = window.innerHeight - toolbarRect.top + padding;
        const rightOffset = window.innerWidth - pauseRect.left;
        
        // Position dice tray using bottom/right for natural resize behavior
        diceBox.style.position = 'fixed';
        diceBox.style.left = 'auto';
        diceBox.style.top = 'auto';
        diceBox.style.right = `${pxToVw(rightOffset)}vw`;
        diceBox.style.bottom = `${pxToVh(bottomOffset)}vh`;
        diceBox.style.transform = 'none';
      }
      
      // Check if user has dragged the action menu
      const menuHasPersistedPosition = store.getState().ui?.positions?.actionMenu;
      
      // Skip action menu positioning on mobile (uses horizontal mobile menu instead)
      if (toolbar && actionMenu && !menuHasPersistedPosition && !isMobile) {
        // Position action menu using CSS default values (bottom: 140px, right: 370px)
        // Convert to viewport units for consistency
        const actionRect = actionMenu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Adjusted positioning: more to the right and lower
        const rightOffset = 340; // moved back left a bit from 300
        const bottomOffset = 110; // was 140 - reduced to move down
        
        actionMenu.style.position = 'fixed';
        actionMenu.style.left = 'auto';
        actionMenu.style.top = 'auto';
        actionMenu.style.right = `${pxToVw(rightOffset)}vw`;
        actionMenu.style.bottom = `${pxToVh(bottomOffset)}vh`;
        actionMenu.style.transform = 'none';
      }
    }
    
    // Position elements initially
    positionRelativeToToolbar();
    
    // Re-apply positioning on resize (because dice-tray component clears styles on resize)
    let resizeTimeout;
    const resizeHandler = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Re-apply positioning after dice-tray setupMobile() has run
        positionRelativeToToolbar();
      }, 150); // Small delay to ensure setupMobile() completes first
    };
    window.addEventListener('resize', resizeHandler);
    
    // Store the handler so we can remove it if needed
    if (window.__KOT_RESIZE_HANDLER__) {
      window.removeEventListener('resize', window.__KOT_RESIZE_HANDLER__);
    }
    window.__KOT_RESIZE_HANDLER__ = resizeHandler;
    
    console.log(`[PositioningService] Reset positions with viewport units and resize re-application`);
  }

  function applyTransform(el, x, y) {
    el.style.transform = `translate(${pxToVw(x)}vw, ${pxToVh(y)}vh)`;
  }

  function currentTransform(el) {
    // Support both px and viewport unit transforms
    const vwMatch = /translate\(([-0-9.]+)vw,\s*([-0-9.]+)vh\)/.exec(el.style.transform || '');
    if (vwMatch) {
      return { x: vwToPx(parseFloat(vwMatch[1])), y: vhToPx(parseFloat(vwMatch[2])) };
    }
    
    const pxMatch = /translate\(([-0-9.]+)px,\s*([-0-9.]+)px\)/.exec(el.style.transform || '');
    if (pxMatch) {
      return { x: parseFloat(pxMatch[1]), y: parseFloat(pxMatch[2]) };
    }
    
    return { x: 0, y: 0 };
  }

  function applyBounds(x, y, el, bounds) {
    if (!bounds) return { x, y };
    const rect = el.getBoundingClientRect();
    const { innerWidth, innerHeight } = window;
    const maxX = (bounds.right ?? innerWidth) - rect.width;
    const maxY = (bounds.bottom ?? innerHeight) - rect.height;
    const minX = bounds.left ?? 0;
    const minY = bounds.top ?? 0;
    return { x: Math.min(Math.max(x, minX), maxX), y: Math.min(Math.max(y, minY), maxY) };
  }

  function maybeSnap(x, y, grid) {
    if (!grid || grid <= 1) return { x, y };
    return { x: Math.round(x / grid) * grid, y: Math.round(y / grid) * grid };
  }

  singleton = { makeDraggable, hydrate, resetPositions };
  
  // Expose a function to reapply default positioning without clearing persisted positions
  singleton.applyDefaultPositioning = function() {
    const toolbar = document.querySelector('.cmp-toolbar');
    const pauseButton = toolbar?.querySelector('[data-action="pause"]');
    const diceBox = document.querySelector('.cmp-dice-tray');
    const actionMenu = document.querySelector('.cmp-action-menu');
    
    if (window.__KOT_DEBUG__?.logComponentUpdates) {
      console.log('[applyDefaultPositioning] Elements found:', { 
        toolbar: !!toolbar, 
        pauseButton: !!pauseButton, 
        diceBox: !!diceBox, 
        actionMenu: !!actionMenu 
      });
    }
    
    // Check if user has dragged the dice tray - if so, don't override their position
    const diceHasPersistedPosition = store.getState().ui?.positions?.diceTray;
    
    // Skip positioning on mobile (uses CSS positioning instead)
    const isMobile = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
    
    if (toolbar && pauseButton && diceBox && !diceHasPersistedPosition && !isMobile) {
      const toolbarRect = toolbar.getBoundingClientRect();
      const pauseRect = pauseButton.getBoundingClientRect();
      const diceRect = diceBox.getBoundingClientRect();
      
      // Calculate dice tray position using bottom/right (more resize-friendly)
      const padding = 40; // Space between toolbar and dice tray
      const bottomOffset = window.innerHeight - toolbarRect.top + padding;
      const rightOffset = window.innerWidth - pauseRect.left;
      
      if (window.__KOT_DEBUG__?.logComponentUpdates) {
        console.log('[applyDefaultPositioning] Dice tray:', { bottomOffset, rightOffset });
      }
      
      // Position dice tray using bottom/right for natural resize behavior
      diceBox.style.position = 'fixed';
      diceBox.style.left = 'auto';
      diceBox.style.top = 'auto';
      diceBox.style.right = `${pxToVw(rightOffset)}vw`;
      diceBox.style.bottom = `${pxToVh(bottomOffset)}vh`;
      diceBox.style.transform = 'none';
    }
    
    // Check if user has dragged the action menu
    const menuHasPersistedPosition = store.getState().ui?.positions?.actionMenu;
    
    if (window.__KOT_DEBUG__?.logComponentUpdates) {
      console.log('[applyDefaultPositioning] Action menu persisted:', menuHasPersistedPosition);
    }
    
    // Skip action menu positioning on mobile (uses horizontal mobile menu instead)
    if (actionMenu && !menuHasPersistedPosition && !isMobile) {
      // Position action menu using CSS default values (bottom: 140px, right: 370px)
      // Convert to viewport units for consistency
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Adjusted positioning: more to the right and lower
      const rightOffset = 340; // moved back left a bit from 300
      const bottomOffset = 110; // was 140 - reduced to move down
      
      if (window.__KOT_DEBUG__?.logComponentUpdates) {
        console.log('[applyDefaultPositioning] Action menu position:', { rightOffset, bottomOffset });
      }
      
      actionMenu.style.position = 'fixed';
      actionMenu.style.left = 'auto';
      actionMenu.style.top = 'auto';
      actionMenu.style.right = `${pxToVw(rightOffset)}vw`;
      actionMenu.style.bottom = `${pxToVh(bottomOffset)}vh`;
      actionMenu.style.transform = 'none';
    }
  };
  
  // On first creation, perform an initial layout reset BEFORE components become visible if persistence disabled
  try {
    const st = store.getState();
    const persist = !!st.settings?.persistPositions;
    if (!persist) {
      // Temporarily hide dice tray & action menu to avoid flicker during reset
      const dice = document.querySelector('.cmp-dice-tray');
      const menu = document.querySelector('.cmp-action-menu');
      if (dice) dice.style.visibility = 'hidden';
      if (menu) menu.style.visibility = 'hidden';
      // Defer reset slightly so DOM elements from other components mount first
      requestAnimationFrame(() => {
        try { resetPositions(); } catch(_) {}
        // Reveal after positioning applied
        requestAnimationFrame(() => {
          if (dice) dice.style.visibility = '';
          if (menu) menu.style.visibility = '';
        });
      });
    }
  } catch(_) {}
  // Non-breaking convenience for components needing to check stored positions
  singleton.getPersistedPosition = function(name) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      return obj && obj[name] ? { x: obj[name].x, y: obj[name].y } : null;
    } catch(_) { return null; }
  };
  
  // Listen for global reset event
  eventBus.on('ui/positions/reset', () => resetPositions());
  
  // Watch for game-active class being added to body and reapply positioning
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const hasGameActive = document.body.classList.contains('game-active');
          if (hasGameActive && !window.__KOT_GAME_POSITIONED__) {
            window.__KOT_GAME_POSITIONED__ = true;
            // Wait a bit for all game elements to be fully rendered
            setTimeout(() => {
              if (singleton.applyDefaultPositioning) {
                singleton.applyDefaultPositioning();
              }
            }, 200);
          }
        }
      }
    });
    
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });
  }
  
  if (typeof window !== 'undefined') {
    window.__KOT_NEW_POSITIONS__ = singleton;
  }
  return singleton;
}
