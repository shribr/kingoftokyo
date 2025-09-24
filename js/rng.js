// Seedable RNG module (Lean Path Item 1)
// Provides deterministic seeding while leaving existing Math.random() calls intact by overriding when seeded.
(function(){
    const originalRandom = Math.random;
    let currentSeed = null;
    function mulberry32(a){
        return function(){
            a |= 0; a = a + 0x6D2B79F5 | 0;
            let t = Math.imul(a ^ a >>> 15, 1 | a);
            t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    function seedRNG(seed){
        if (seed === undefined || seed === null || isNaN(seed)) return;
        currentSeed = (seed >>> 0);
        const seeded = mulberry32(currentSeed);
        Math.random = seeded; // Override global for centralization
        if (typeof console !== 'undefined') console.log(`🔢 RNG seeded with ${currentSeed}`);
    }
    function clearRNGSeed(){
        Math.random = originalRandom;
        if (typeof console !== 'undefined') console.log('♻️ RNG seed cleared (restored native Math.random)');
        currentSeed = null;
    }
    function getRNGState(){
        return { seed: currentSeed };
    }
    // Expose global helpers
    if (typeof window !== 'undefined') {
        window.seedRNG = seedRNG;
        window.clearRNGSeed = clearRNGSeed;
        window.getRNGState = getRNGState;
    }
})();
