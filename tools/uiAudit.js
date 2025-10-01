/** tools/uiAudit.js
 * DOM style auditor: collects computed style summaries for configured selectors.
 * Usage (in console after app mounts):
 *   import('/new/tools/uiAudit.js').then(({runUIAudit}) => runUIAudit())
 */
const DEFAULT_SELECTORS = [
  '.cmp-dice-tray',
  '.cmp-player-card-list',
  '.cmp-log-feed'
];

// LocalStorage keys
const LS_BASELINE_KEY = 'ui-audit:baseline:v1';

function stableStringify(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort(), 2);
}

function summarizeComputed(cs) {
  return {
    display: cs.display,
    position: cs.position,
    color: cs.color,
    backgroundColor: cs.backgroundColor,
    fontSize: cs.fontSize,
    fontFamily: cs.fontFamily,
    lineHeight: cs.lineHeight,
    margin: cs.margin,
    padding: cs.padding,
    border: cs.border,
    width: cs.width,
    height: cs.height
  };
}

export function runUIAudit(selectors = DEFAULT_SELECTORS) {
  const out = {};
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (!el) { out[sel] = null; continue; }
    out[sel] = summarizeComputed(getComputedStyle(el));
  }
  const json = JSON.stringify(out, null, 2);
  console.log('[ui-audit] result:', json);
  return out;
}

export function saveBaseline(selectors = DEFAULT_SELECTORS) {
  const snapshot = runUIAudit(selectors);
  localStorage.setItem(LS_BASELINE_KEY, stableStringify(snapshot));
  console.log('[ui-audit] baseline saved for selectors:', selectors);
  return snapshot;
}

export function loadBaseline() {
  const raw = localStorage.getItem(LS_BASELINE_KEY);
  if (!raw) {
    console.warn('[ui-audit] no baseline stored');
    return null;
  }
  try { return JSON.parse(raw); } catch (e) { console.error('[ui-audit] parse error', e); return null; }
}

export function diffCurrentAgainstBaseline(selectors = DEFAULT_SELECTORS) {
  const baseline = loadBaseline();
  if (!baseline) { console.warn('[ui-audit] create a baseline first via saveBaseline()'); return null; }
  const current = runUIAudit(selectors);
  const diff = {};
  for (const key of selectors) {
    const baseEntry = baseline[key];
    const curEntry = current[key];
    if (!baseEntry && !curEntry) continue;
    if (!baseEntry || !curEntry) { diff[key] = { added: curEntry, removed: baseEntry }; continue; }
    const fieldChanges = {};
    for (const prop of Object.keys(curEntry)) {
      if (curEntry[prop] !== baseEntry[prop]) {
        fieldChanges[prop] = { from: baseEntry[prop], to: curEntry[prop] };
      }
    }
    if (Object.keys(fieldChanges).length) diff[key] = fieldChanges;
  }
  console.log('[ui-audit] diff:', JSON.stringify(diff, null, 2));
  return diff;
}

export function exportBaselineFile(filename = 'ui-baseline.json') {
  const baseline = loadBaseline();
  if (!baseline) { console.warn('[ui-audit] no baseline to export'); return; }
  const blob = new Blob([JSON.stringify(baseline, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  console.log('[ui-audit] baseline exported as', filename);
}

export function importBaselineFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target.result);
        localStorage.setItem(LS_BASELINE_KEY, stableStringify(parsed));
        console.log('[ui-audit] baseline imported');
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// Convenience global attach (optional)
if (typeof window !== 'undefined') {
  window.UI_AUDIT = { runUIAudit, saveBaseline, loadBaseline, diffCurrentAgainstBaseline, exportBaselineFile, importBaselineFile };
}
