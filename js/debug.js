// Debug / Overlay utilities (Lean Path Items 2 & 3)
(function(){
    if (typeof window === 'undefined') return;
    window.DEBUG_MODE = window.DEBUG_MODE || false;

    // Create overlay element
    const overlay = document.createElement('div');
    overlay.id = 'debug-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.cssText = [
        'position:fixed','top:4px','right:4px','z-index:99999','background:rgba(0,0,0,0.75)','color:#0f0',
        'font:12px/1.3 monospace','padding:6px 8px','border:1px solid #0f0','border-radius:4px',
        'max-width:260px','white-space:pre','display:none','pointer-events:none'
    ].join(';');
    document.addEventListener('DOMContentLoaded', ()=> document.body.appendChild(overlay));

    function format(obj){
        try { return JSON.stringify(obj); } catch(e){ return String(obj); }
    }

    function getAIStats(){
        const profiler = window.AIDecisionProfiler;
        let stats = profiler && profiler.stats ? profiler.stats() : null;
        if (!stats && profiler && typeof profiler.getStats === 'function') stats = profiler.getStats();
        return stats || {};
    }

    function updateOverlay(){
        if (overlay.style.display === 'none') return; // Hidden
        const ai = getAIStats();
        const rng = (window.getRNGState && window.getRNGState()) || { seed:null };
        const snapshotAvail = typeof window.__debugUIState === 'function';
        let lines = [];
        lines.push('DEBUG OVERLAY');
        lines.push(`Seed: ${rng.seed !== null ? rng.seed : '∅'}`);
        if (ai && ai.count){
            lines.push(`AI decisions: ${ai.count}`);
            lines.push(`AI avg(ms): ${ai.avg}`);
            lines.push(`AI min/max: ${ai.min}/${ai.max}`);
        } else {
            lines.push('AI decisions: (none)');
        }
        lines.push(`Snapshot fn: ${snapshotAvail ? 'yes':'no'}`);
        lines.push(`Debug Mode: ${window.DEBUG_MODE ? 'ON':'off'}`);
        overlay.textContent = lines.join('\n');
    }

    setInterval(updateOverlay, 800);

    function toggleOverlay(){
        overlay.style.display = (overlay.style.display === 'none') ? 'block' : 'none';
        if (overlay.style.display === 'block') updateOverlay();
    }

    // Key binding Shift+D
    window.addEventListener('keydown', (e)=>{
        if (e.key === 'D' && e.shiftKey){
            toggleOverlay();
        }
    });

    // Snapshot function (Lean Path Item 2)
    window.__debugUIState = function(){
        const startBtn = document.getElementById('start-game');
        const monsterTilesGrid = document.getElementById('player-tiles-grid');
        const rolloffModal = document.querySelector('[id="rolloff-modal"]') || document.getElementById('rolloff-modal');
        const ai = getAIStats();
        let monsterSlots = [];
        if (monsterTilesGrid){
            monsterSlots = Array.from(monsterTilesGrid.querySelectorAll('.player-tile')).map(tile=>{
                const assigned = tile.querySelector('.monster-assigned, img');
                let monsterName = null;
                if (assigned){
                    monsterName = assigned.getAttribute('data-monster') || assigned.getAttribute('alt') || null;
                }
                return {
                    id: tile.id || null,
                    monster: monsterName,
                    human: tile.classList.contains('human') || /human/i.test(tile.textContent||''),
                };
            });
        }
        return {
            monsterSlots,
            startButton: startBtn ? { text:startBtn.textContent, disabled:startBtn.disabled } : null,
            rolloff: rolloffModal ? { open: !rolloffModal.classList.contains('hidden') } : null,
            ai,
            rng: (window.getRNGState && window.getRNGState()) || null,
            timestamp: Date.now()
        };
    };

    // Allow toggling debug mode
    window.setDebugMode = function(flag){ window.DEBUG_MODE = !!flag; console.log('DEBUG_MODE:', window.DEBUG_MODE); };
})();
