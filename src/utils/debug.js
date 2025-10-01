/** utils/debug.js
 * Centralized debug control: gate console.debug/warn behind a flag.
 * Enable by adding ?debug=1 to URL or localStorage.setItem('KOT_DEBUG','1').
 */
(function(){
  try {
    const href = (typeof location !== 'undefined') ? location.href : '';
    const q = (typeof location !== 'undefined') ? location.search : '';
    const hash = (typeof location !== 'undefined') ? location.hash : '';
    const ls = (typeof localStorage !== 'undefined') ? localStorage.getItem('KOT_DEBUG') : null;
    const enabled = /[?&#]debug=1\b/i.test(href) || /\bdebug=1\b/i.test(q) || /\bdebug=1\b/i.test(hash) || ls === '1';
    if (typeof window !== 'undefined') window.__KOT_DEBUG__ = !!enabled;
    const origDebug = console.debug ? console.debug.bind(console) : function(){};
    const origWarn = console.warn ? console.warn.bind(console) : function(){};
    console.debug = function(){ if (enabled) return origDebug.apply(console, arguments); };
    console.warn = function(){ if (enabled) return origWarn.apply(console, arguments); };
  } catch(_) { /* keep console as-is on failure */ }
})();
