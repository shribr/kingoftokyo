/** positioningService.js
 * Phase 7: Provide draggable positioning & persistence for components.
 * Usage:
 *   const ps = createPositioningService(store);
 *   ps.makeDraggable(element, componentName);
 */
import { uiPositionSet, uiPositionsReset } from '../core/actions.js';
import { store as bootstrapStore } from '../bootstrap/index.js';
import { eventBus } from '../core/eventBus.js';

const STORAGE_KEY = 'kot_new_ui_positions_v1';
let singleton;

export function createPositioningService(store) {
  if (singleton) return singleton;
  const active = new Map(); // element -> drag state
  let lastPersist = 0;
  let hydrationDone = false;

  // Subscribe once for persistence of entire positions object
  store.subscribe(() => {
    const st = store.getState();
    const allowPersist = !!st.settings?.persistPositions;
    if (!allowPersist) return; // do nothing if persistence disabled
    const positions = st.ui.positions;
    persistThrottled(positions);
  });

  let zCounter = 6000; // elevated above base component z-indexes

  function makeDraggable(el, componentName, opts = {}) {
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

    function onPointerDown(e) {
      if (pointerId !== null) return; // already tracking
      if (e.target.closest(noDragSelector)) return; // interactive zone – let click happen
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
  }

  function applyTransform(el, x, y) {
    el.style.transform = `translate(${x}px, ${y}px)`;
  }

  function currentTransform(el) {
    const m = /translate\(([-0-9.]+)px,\s*([-0-9.]+)px\)/.exec(el.style.transform || '');
    if (!m) return { x:0, y:0 };
    return { x: parseFloat(m[1]), y: parseFloat(m[2]) };
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
  // Listen for global reset event
  eventBus.on('ui/positions/resetRequested', () => resetPositions());
  if (typeof window !== 'undefined') {
    window.__KOT_NEW_POSITIONS__ = singleton;
  }
  return singleton;
}
