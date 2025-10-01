// metricsPanel.js
// Dev overlay to visualize recent phase timings.

(function(){
  if (typeof window === 'undefined') return;
  const ENABLE = true;
  if (!ENABLE) return;
  const panel = document.createElement('div');
  panel.id = 'phase-metrics-panel';
  panel.style.cssText = `
    position:fixed; bottom:8px; right:8px; z-index:4000; font:12px/1.3 monospace; background:rgba(0,0,0,0.65);
    color:#eee; padding:6px 8px; border-radius:6px; max-width:260px; cursor:pointer; backdrop-filter:blur(4px);
  `;
  panel.innerHTML = '<div data-rows></div>'; // label removed per request
  const rowsEl = panel.querySelector('[data-rows]');
  let collapsed = true;
  function render() {
    const spans = (window.__KOT_METRICS__ && window.__KOT_METRICS__.phaseSpans) || [];
    const recent = spans.slice(-10).reverse();
    if (collapsed) {
      const last = recent[0];
      rowsEl.innerHTML = last ? `${last.phase}: ${(last.dur).toFixed(0)}ms` : '—';
    } else {
      rowsEl.innerHTML = recent.map(s => `<div>${s.phase.padEnd(12,' ')} ${(s.dur).toFixed(0)}ms</div>`).join('');
    }
  }
  panel.addEventListener('click', () => { collapsed = !collapsed; render(); });
  setInterval(render, 600);
  render();
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(panel));
})();
