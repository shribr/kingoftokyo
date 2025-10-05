// metricsPanel.js
// Dev overlay to visualize recent phase timings.
// Data is NOT persisted - it's real-time performance monitoring only.

(function(){
  if (typeof window === 'undefined') return;
  
  // Initialize metrics object so turnService can write to it
  if (!window.__KOT_METRICS__) {
    window.__KOT_METRICS__ = { phaseSpans: [] };
  }
  
  // Performance thresholds for color coding (milliseconds)
  const THRESHOLDS = {
    good: 50,    // < 50ms = green (fast)
    warning: 150 // 50-150ms = yellow (acceptable), > 150ms = red (slow)
  };
  
  function getColorForDuration(dur) {
    if (dur < THRESHOLDS.good) return '#2ecc71'; // green
    if (dur < THRESHOLDS.warning) return '#f39c12'; // yellow/orange
    return '#e74c3c'; // red
  }
  
  const panel = document.createElement('div');
  panel.id = 'phase-metrics-panel';
  
  // Check settings for visibility
  function updateVisibility() {
    const st = window.store?.getState();
    const visible = st?.settings?.showPhaseMetrics || false;
    panel.style.display = visible ? 'block' : 'none';
  }
  
  // Position beneath power cards panel, match its expanded width
  panel.style.cssText = `
    position: fixed;
    left: 20px;
    top: calc(100px + 520px + 20px);
    z-index: 6600;
    font: 13px/1.4 'Comic Neue', cursive;
    background: rgba(255, 255, 255, 0.7);
    color: #000;
    padding: 12px 14px;
    border-radius: 6px;
    width: 280px;
    height: 180px;
    cursor: pointer;
    border: 2px solid #000;
    box-shadow: 2px 2px 0 #000, 0 0 0 1px #222 inset;
    overflow-y: auto;
    display: none;
  `;
  panel.innerHTML = '<div data-rows></div>';
  const rowsEl = panel.querySelector('[data-rows]');
  let collapsed = true;
  
  function render() {
    const spans = (window.__KOT_METRICS__ && window.__KOT_METRICS__.phaseSpans) || [];
    const recent = spans.slice(-10).reverse();
    if (collapsed) {
      const last = recent[0];
      if (last) {
        const color = getColorForDuration(last.dur);
        rowsEl.innerHTML = `<div style="color:${color};font-weight:bold;font-size:14px;">${last.phase}: ${(last.dur).toFixed(0)}ms</div>`;
      } else {
        rowsEl.innerHTML = `<div style="opacity:0.5;">No phase data yet</div>`;
      }
    } else {
      if (recent.length > 0) {
        rowsEl.innerHTML = recent.map(s => {
          const color = getColorForDuration(s.dur);
          return `<div style="color:${color};margin:2px 0;"><span style="display:inline-block;width:120px;">${s.phase}</span><span style="font-weight:bold;">${(s.dur).toFixed(0)}ms</span></div>`;
        }).join('');
      } else {
        rowsEl.innerHTML = `<div style="opacity:0.5;">No phase data yet</div>`;
      }
    }
  }
  
  panel.addEventListener('click', () => { collapsed = !collapsed; render(); });
  setInterval(render, 600);
  render();
  
  // Listen for settings changes to update visibility
  if (window.store) {
    window.store.subscribe(() => updateVisibility());
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(panel);
    updateVisibility();
  });
})();
