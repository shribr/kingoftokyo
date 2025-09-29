/**
 * AI Engine Selector
 * -------------------------------------------------------------
 * Exposes window.AIDecisionEngine as either the rewrite (NewAIDecisionEngine)
 * or the legacy snapshot (LegacyAIDecisionEngine) based on:
 *   1. URL param  ai=legacy | ai=rewrite
 *   2. Persisted localStorage key KOT_AI_VARIANT
 *   3. Default fallback = rewrite
 *
 * Usage:
 *   setAIEngineVariant('legacy')  // forces legacy & persists
 *   setAIEngineVariant('rewrite') // forces rewrite & persists
 *   getAIEngineVariant()          // returns active variant id
 *
 * Safe to load before other game logic that reads window.AIDecisionEngine.
 */
(function(){
	const STORAGE_KEY = 'KOT_AI_VARIANT';
	function parseURLVariant(){
		try {
			const u = new URL(window.location.href);
			const v = (u.searchParams.get('ai')||'').toLowerCase();
			if (v==='legacy' || v==='rewrite') return v;
		} catch(_){}
		return null;
	}
	function loadStored(){
		try { return localStorage.getItem(STORAGE_KEY); } catch(_) { return null; }
	}
	function storeVariant(v){
		try { localStorage.setItem(STORAGE_KEY, v); } catch(_){}
	}
	function resolveVariant(){
		const fromURL = parseURLVariant();
		if (fromURL) { storeVariant(fromURL); return fromURL; }
		const stored = loadStored();
		if (stored==='legacy' || stored==='rewrite') return stored;
		return 'rewrite';
	}
	function installVariant(v){
		if (v==='legacy' && typeof window.LegacyAIDecisionEngine === 'function') {
			window.AIDecisionEngine = window.LegacyAIDecisionEngine;
			window._AI_ENGINE_VARIANT = 'legacy';
		} else if (typeof window.NewAIDecisionEngine === 'function') {
			window.AIDecisionEngine = window.NewAIDecisionEngine;
			window._AI_ENGINE_VARIANT = 'rewrite';
		}
	}
	const initial = resolveVariant();
	installVariant(initial);
	window.getAIEngineVariant = function(){ return window._AI_ENGINE_VARIANT; };
	window.setAIEngineVariant = function(v){
		if (v!=='legacy' && v!=='rewrite') return false;
		storeVariant(v);
		installVariant(v);
		console.log('[AI Selector] variant set to', v);
		return true;
	};
	console.log('[AI Selector] active variant:', window._AI_ENGINE_VARIANT);
})();
