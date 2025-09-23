/** positioningService.js
 * Phase 7: Provide draggable positioning & persistence for components.
 * Usage:
 *   const ps = createPositioningService(store);
 *   ps.makeDraggable(element, componentName);
 */
import { uiPositionSet, uiPositionsReset } from '../core/actions.js';
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
    const positions = store.getState().ui.positions;
    persistThrottled(positions);
  });

  function makeDraggable(el, componentName, opts = {}) {
    el.style.touchAction = 'none';
    el.dataset.draggable = 'true';
    const saved = store.getState().ui.positions[componentName];
    if (saved) applyTransform(el, saved.x, saved.y);

    let pointerId = null;
    let origin = { x:0, y:0 };
    let start = { x:0, y:0 };

    function onPointerDown(e) {
      if (pointerId !== null) return; // already dragging
      pointerId = e.pointerId;
      el.setPointerCapture(pointerId);
      const rect = el.getBoundingClientRect();
      start = currentTransform(el);
      origin = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
    function onPointerMove(e) {
      if (e.pointerId !== pointerId) return;
      const dx = e.clientX - origin.x;
      const dy = e.clientY - origin.y;
      const nx = start.x + dx;
      const ny = start.y + dy;
      const bounded = applyBounds(nx, ny, el, opts.bounds);
      const snapped = maybeSnap(bounded.x, bounded.y, opts.grid);
      applyTransform(el, snapped.x, snapped.y);
      throttledPersist(componentName, snapped.x, snapped.y);
    }
    function onPointerUp(e) {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      el.releasePointerCapture(e.pointerId);
    }

    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  function throttledPersist(name, x, y) {
    const now = performance.now();
    if (now - lastPersist > 120) { // ~8 fps throttle for store writes
      store.dispatch(uiPositionSet(name, x, y));
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
    if (stored && typeof stored === 'object') {
      Object.entries(stored).forEach(([name, pos]) => {
        if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
          store.dispatch(uiPositionSet(name, pos.x, pos.y));
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
