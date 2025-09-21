/**
 * AI Decision Engine for King of Tokyo
 * 
 * This module contains all the intelligent decision-making logic for CPU players.
 * It uses monster personality traits and game state analysis to make strategic decisions.
 */

// Game mechanics constants - all thresholds and rules in one place
const AI_CONSTANTS = {
    DICE_VALUES: {
        attack: { baseValue: 3, situationalMultiplier: 2.0 },
        heal: { baseValue: 2, situationalMultiplier: 1.5 },
        energy: { baseValue: 1, situationalMultiplier: 1.2 },
        victoryPoints: { baseValue: 4, situationalMultiplier: 1.2 }
    },
    
    THREAT_DETECTION: {
        criticalVP: 18,        // Immediate win threat - triggers personality override
        highVP: 15,           // High VP threat
        tokyoVP: 16,          // Dangerous VP while in Tokyo
        highEnergy: 8,        // Energy threat (can buy cards)
        lowHealth: 3          // Elimination opportunity
    },
    
    POWER_CARD_TIMING: {
        preRoll: ['Energize', 'Heal', 'Extra Head'],
        postRoll: ['It Has a Child', 'Complete Destruction'],
        synergies: {
            energyEngine: ['Energize', 'Nuclear Power Plant', 'Dedicated News Team'],
            attackCombo: ['Acid Attack', 'Fire Breathing', 'Giant Brain'],
            victoryRush: ['Friend of Children', 'Evacuation Orders', 'Opportunist']
        }
    },
    
    DEFENSIVE_CARD_PRIORITIES: {
        // Cards that are critical to deny based on opponent status
        highValueTargets: {
            'Extra Head': { denyIf: 'anyOpponentNeedsVP', priority: 'high' },
            'Energize': { denyIf: 'opponentHasEnergyEngine', priority: 'high' },
            'Acid Attack': { denyIf: 'aggressiveOpponentExists', priority: 'medium' },
            'Fire Breathing': { denyIf: 'multipleThreats', priority: 'high' },
            'It Has a Child': { denyIf: 'opponentCanStayOutOfTokyo', priority: 'medium' },
            'Nuclear Power Plant': { denyIf: 'opponentHasHighEnergy', priority: 'high' },
            'Complete Destruction': { denyIf: 'aggressiveOpponentExists', priority: 'medium' },
            'Shrink Ray': { denyIf: 'targetIsVulnerableToAilments', priority: 'high' },
            'Poison Spit': { denyIf: 'targetDependsOnDice', priority: 'high' }
        }
    },
    
    POWER_CARD_ECONOMICS: {
        // Power card cost efficiency thresholds
        costEfficiencyThresholds: {
            excellent: 15, // Value per energy point
            good: 10,
            fair: 7,
            poor: 5
        },
        
        // Special effects that change dice probabilities
        diceModifiers: {
            'Extra Head': { extraDice: 1, rollProbabilityBonus: 0.15 },
            'Giant Brain': { extraDice: 0, rollProbabilityBonus: 0.10 },
            'Shrink Ray': { opponentDebuff: true, rollProbabilityBonus: 0.05 }
        },
        
        // Reroll and manipulation cards
        manipulationCards: {
            'Complete Destruction': { 
                effect: 'rerollOwnDice', 
                value: 'situational',
                probabilityImpact: 0.25
            },
            'Freeze Ray': { 
                effect: 'rerollOpponentDice', 
                value: 'disruptive',
                probabilityImpact: 0.15
            },
            'Psychic Probe': { 
                effect: 'forceKeepDice', 
                value: 'manipulative',
                probabilityImpact: 0.20
            }
        },
        
        // Portfolio strategies - multiple cheaper vs single expensive
        portfolioStrategies: {
            breadth: { // Multiple cheap cards for flexibility
                maxSingleCardCost: 4,
                minCardCount: 2,
                synergyBonus: 1.3
            },
            depth: { // Single expensive card for power
                minSingleCardCost: 6,
                maxCardCount: 1,
                powerBonus: 1.5
            },
            balanced: { // Mix of costs
                targetCostRange: [3, 5],
                idealCardCount: 2,
                versatilityBonus: 1.2
            }
        }
    }
};

class AIDecisionEngine {
    constructor() {
        this.config = null;
        this.loadConfiguration();
        // Lightweight runtime AI debug/config toggles (can be modified from console)
        window.AIConfig = window.AIConfig || {
            enablePersonalityThresholds: true,
            personalityJitter: true,
            jitterMagnitude: 0.04, // max +/- applied to base thresholds
            logPersonalityAdjust: false,
            showSetEV: false,
            showFourKindEV: false
        };
    }

    /**
     * Add entry to AI Logic Flow for debugging and transparency
     */
    addAILogicEntry(player, message, priority = 'normal') {
        // Check if addAILogicEntry function exists in main.js
        if (typeof addAILogicEntry === 'function') {
            addAILogicEntry(player, message, priority);
        }
    }

    /**
     * Load AI configuration from JSON file
     */
    async loadConfiguration() {
        try {
            const response = await fetch('ai-config.json');
            this.config = await response.json();
        } catch (error) {
            console.warn('Could not load AI configuration, using defaults:', error);
            // Use minimal config with just personality defaults
            this.config = {
                personalities: {
                    aggression: {
                        3: { attackBonus: 0, healPenalty: 0, vpBonus: 0 }
                    }
                }
            };
        }
    }

    /**
     * Default AI configuration if JSON file is not available
     */
    getDefaultConfig() {
        return {
            diceEvaluation: {
                // Base values for each dice face
                attack: { baseValue: 3, situationalMultiplier: 2.0 },
                energy: { baseValue: 2, situationalMultiplier: 1.5 },
                heal: { baseValue: 2, situationalMultiplier: 3.0 },
                victoryPoints: { baseValue: 4, situationalMultiplier: 1.2 },
                one: { baseValue: 1, situationalMultiplier: 1.0 },
                two: { baseValue: 2, situationalMultiplier: 1.0 },
                three: { baseValue: 3, situationalMultiplier: 1.0 }
            },
            personalities: {
                // How personality traits modify decision-making
                aggression: {
                    1: { attackBonus: -2, healPenalty: 0, vpBonus: 1 },
                    2: { attackBonus: -1, healPenalty: 0, vpBonus: 0 },
                    3: { attackBonus: 0, healPenalty: 0, vpBonus: 0 },
                    4: { attackBonus: 1, healPenalty: -1, vpBonus: -1 },
                    5: { attackBonus: 2, healPenalty: -2, vpBonus: -2 }
                },
                strategy: {
                    1: { planningDepth: 1, threatAwareness: 0.2 },
                    2: { planningDepth: 1, threatAwareness: 0.4 },
                    3: { planningDepth: 2, threatAwareness: 0.6 },
                    4: { planningDepth: 2, threatAwareness: 0.8 },
                    5: { planningDepth: 3, threatAwareness: 1.0 }
                },
                risk: {
                    1: { rerollThreshold: 0.8, keepSafeResults: true },
                    2: { rerollThreshold: 0.7, keepSafeResults: true },
                    3: { rerollThreshold: 0.6, keepSafeResults: false },
                    4: { rerollThreshold: 0.4, keepSafeResults: false },
                    5: { rerollThreshold: 0.2, keepSafeResults: false }
                }
            },
            threats: {
                // When to consider other players threats
                victoryPointThreat: 15, // VP threshold to consider dangerous
                healthThreat: 3,        // Low health makes them vulnerable
                energyThreat: 8,        // High energy means they can buy cards
                tokyoThreat: true       // Being in Tokyo is always a threat
            }
        };
    }

    /**
     * Main decision function: Should the CPU keep rolling or keep current dice?
     * @param {Array} currentDice - Current dice results
     * @param {number} rollsRemaining - Number of rolls left
     * @param {Object} player - The CPU player
     * @param {Object} gameState - Current game state including other players
     * @returns {Object} Decision object with action and dice to keep
     */
    async makeRollDecision(currentDice, rollsRemaining, player, gameState) {
        if (!this.config) {
            // Fallback to simple behavior if config not loaded
            return { action: 'reroll', keepDice: [], reason: 'Config not loaded' };
        }

        console.log(`🧠 AI Decision for ${player.monster.name}:`, {
            dice: currentDice,
            rollsLeft: rollsRemaining,
            personality: player.monster.personality
        });

        // Enhanced probability calculations with extra dice consideration
        const probabilities = this.calculateDiceProbabilities(player, currentDice, rollsRemaining);
        console.log('🎲 Enhanced probability analysis:', probabilities);

        // Analyze current situation with enhanced context
        const situation = this.analyzeSituation(player, gameState);
        console.log(`🧠 Situation analysis:`, situation);

        // Evaluate dice strategies with enhanced probability data
    const diceEvaluations = this.evaluateDiceEnhanced(currentDice, player, situation, probabilities, rollsRemaining);
        console.log(`🧠 Enhanced dice evaluations:`, diceEvaluations);

        // 🧠 MULTI-PLAYER STRATEGIC THINKING: Generate complex thought process
        if (situation.multiPlayerScenarios && situation.multiPlayerScenarios.thoughtProcess.length > 0) {
            const strategicThought = this.selectStrategicThought(situation.multiPlayerScenarios, player);
            if (strategicThought) {
                this.addAILogicEntry(player, `🧠 Strategic Analysis: ${strategicThought}`, 'high');
            }
        }

        // Make final decision with enhanced risk assessment
    const decision = await this.makeKeepDecisionEnhanced(diceEvaluations, rollsRemaining, player, situation, probabilities);
        console.log(`🧠 Enhanced final decision:`, decision);

        // POST-DECISION SAFEGUARD #1: Never drop an existing triple on first roll without extreme pressure
        if (rollsRemaining === 2) { // means this was the first roll just completed
            // NEW EARLY CONTINUATION: If we have exactly one triple and any non-triple dice not contributing to that set, never end immediately.
            if (decision.action === 'endRoll') {
                // ATTACK CLUSTER SAFEGUARD: If we have 4+ attacks on first roll plus any single number die (one|two|three) and rolls remain, pursue set growth instead of ending.
                const attackCount = currentDice.filter(f=>f==='attack').length;
                if (attackCount >= 4) {
                    const numberFaces = ['one','two','three'];
                    const strayNumberIndices = [];
                    currentDice.forEach((f,i)=>{ if(numberFaces.includes(f)) strayNumberIndices.push(i); });
                    if (strayNumberIndices.length >= 1) {
                        // Keep all attacks (they already represent pressure); reroll at least the first stray number and any energy unless energy shortage scenario.
                        const keepIdx = [];
                        currentDice.forEach((f,i)=>{ if(f==='attack') keepIdx.push(i); });
                        // Decide if we also keep energy (keep if player.energy === 0 and we have exactly one energy die)
                        const energyIndices = [];
                        currentDice.forEach((f,i)=>{ if(f==='energy') energyIndices.push(i); });
                        if (player.energy === 0 && energyIndices.length === 1) keepIdx.push(energyIndices[0]);
                        // Ensure at least one reroll target (the stray number). All stray numbers will be rerolled by omission.
                        console.log('⚔️ ATTACK-CLUSTER-CONTINUE: 4+ attacks with stray number -> reroll non-attack dice to fish for set/utility.');
                        window.AIOverrideStats = window.AIOverrideStats || { tripleKeep:0, noSetContinue:0, tripleExtend:0, twoPairs:0, release:0, decisions:0, attackCluster:0, threatBias:0 };
                        window.AIOverrideStats.attackCluster = (window.AIOverrideStats.attackCluster||0)+1;
                        return {
                            action: 'reroll',
                            keepDice: keepIdx,
                            reason: 'Override: early attack cluster - reroll stray number for improvement',
                            confidence: (decision.confidence||0.6)+0.05
                        };
                    }
                }
                const earlyCounts = { one:0,two:0,three:0 };
                currentDice.forEach(f=>{ if(earlyCounts.hasOwnProperty(f)) earlyCounts[f]++; });
                const tripleEntry = Object.entries(earlyCounts).find(([_,c])=>c===3);
                if (tripleEntry) {
                    const [tripleFace] = tripleEntry;
                    // Collect indices of triple and identify other dice
                    const keepIdx = [];
                    currentDice.forEach((f,i)=>{ if(f===tripleFace) keepIdx.push(i); });
                    // Keep at most one high-value support die (attack if outside Tokyo & attacks matter)
                    const otherDiceIndices = [];
                    currentDice.forEach((f,i)=>{ if(f!==tripleFace) otherDiceIndices.push({face:f,index:i}); });
                    if (otherDiceIndices.length) {
                        // Heuristic: retain one attack if present; else retain one energy if energy low; else keep none.
                        let supportIndex = -1;
                        const inTokyo = player.isInTokyo;
                        if (!inTokyo) {
                            const attackDie = otherDiceIndices.find(d=>d.face==='attack');
                            if (attackDie) supportIndex = attackDie.index;
                        }
                        if (supportIndex === -1 && player.energy === 0) {
                            const energyDie = otherDiceIndices.find(d=>d.face==='energy');
                            if (energyDie) supportIndex = energyDie.index;
                        }
                        if (supportIndex !== -1) keepIdx.push(supportIndex);
                        // Force reroll of all remaining off-set dice
                        if (keepIdx.length) {
                            console.log('🚀 EARLY-TRIPLE-CONTINUE: Forcing continuation to extend triple', tripleFace, 'keeping indices', keepIdx);
                            window.AIOverrideStats = window.AIOverrideStats || { tripleKeep:0, noSetContinue:0, tripleExtend:0, twoPairs:0, release:0, attackCluster:0, decisions:0, threatBias:0 };
                            window.AIOverrideStats.tripleExtend++; // reuse stat bucket for growth pursuit
                            return {
                                action: 'reroll',
                                keepDice: keepIdx,
                                reason: 'Override: extend early triple – reroll non-set dice',
                                confidence: (decision.confidence||0.6)+0.08
                            };
                        }
                    }
                }
            }
            const counts = { one:0, two:0, three:0 };
            currentDice.forEach(f=>{ if(counts.hasOwnProperty(f)) counts[f]++; });
            const tripleFace = Object.entries(counts).find(([face,c]) => c >= 3);
            if (tripleFace) {
                const face = tripleFace[0];
                const keptFaceCounts = diceEvaluations.filter(d=>d.face===face).length;
                if (keptFaceCounts < tripleFace[1]) {
                    // Override: ensure triple retained unless sacrifice conditions present
                    const pressure = (player.health <= 3 ? 40:0) + (player.energy <=1 ? 15:0) + (player.victoryPoints >= 15 ? 20:0);
                    if (pressure < 50) {
                        const newKeep = [...diceEvaluations.map(d=>d.index)];
                        // Add any missing indices of triple
                        currentDice.forEach((f,i)=>{ if(f===face && !newKeep.includes(i)) newKeep.push(i); });
                        console.log(`🛡️ TRIPLE-KEEP OVERRIDE: Restoring triple ${face}s on first roll (pressure=${pressure}).`);
                        window.AIOverrideStats = window.AIOverrideStats || { tripleKeep:0, noSetContinue:0, tripleExtend:0, twoPairs:0, release:0, attackCluster:0, decisions:0, threatBias:0 };
                        window.AIOverrideStats.tripleKeep++;
                        return {
                            action: 'reroll',
                            keepDice: newKeep,
                            reason: `Override: preserve early triple of ${face}s`,
                            confidence: (decision.confidence||0.6)+0.1
                        };
                    }
                }
            }
        }

        // POST-DECISION SAFEGUARD (NEW): If two distinct pairs and no triple, with rolls left, force continuation to chase at least one triple.
        if (decision.action === 'endRoll' && rollsRemaining > 0) {
            const countsPairsCheck = { one:0,two:0,three:0 };
            currentDice.forEach(f=>{ if(countsPairsCheck.hasOwnProperty(f)) countsPairsCheck[f]++; });
            const hasTriple = Object.values(countsPairsCheck).some(c=>c>=3);
            if (!hasTriple) {
                // NEW OVERRIDE: Single pair continuation heuristic
                // If exactly one pair among numbers (1/2/3), no triple, and AI is ending early, force continuation to try forming a triple.
                const pairFacesSingle = Object.entries(countsPairsCheck).filter(([_,c])=>c===2).map(([f])=>f);
                if (pairFacesSingle.length === 1) {
                    const targetPairFace = pairFacesSingle[0];
                    const keepIdx = [];
                    currentDice.forEach((f,i)=>{ if(f===targetPairFace) keepIdx.push(i); });
                    // Optionally retain one high-utility non-number (attack if aggression high or inTokyo logic; else one energy if energy==0)
                    let supportAdded = false;
                    const personality = player.monster && player.monster.personality ? player.monster.personality : { aggression:3 };
                    // Keep one attack if not already kept and player not in Tokyo (trying to pressure) and aggression >=4
                    if (!player.isInTokyo && personality.aggression >=4) {
                        const attackIndex = currentDice.findIndex(f=>f==='attack');
                        if (attackIndex !== -1) { keepIdx.push(attackIndex); supportAdded = true; }
                    }
                    if (!supportAdded && player.energy === 0) {
                        const energyIndex = currentDice.findIndex(f=>f==='energy');
                        if (energyIndex !== -1) { keepIdx.push(energyIndex); supportAdded = true; }
                    }
                    console.log('♻️ SINGLE-PAIR-CONTINUE OVERRIDE: Pursuing triple of', targetPairFace, 'keeping indices', keepIdx);
                    window.AIOverrideStats = window.AIOverrideStats || { tripleKeep:0, noSetContinue:0, tripleExtend:0, twoPairs:0, release:0, attackCluster:0, singlePair:0, decisions:0, personalityAdjust:0, threatBias:0 };
                    window.AIOverrideStats.singlePair = (window.AIOverrideStats.singlePair||0)+1;
                    return {
                        action: 'reroll',
                        keepDice: keepIdx,
                        reason: 'Override: single pair - continue to chase triple',
                        confidence: (decision.confidence||0.6)+0.05
                    };
                }
                const pairFaces = Object.entries(countsPairsCheck).filter(([_,c])=>c===2).map(([f])=>f);
                if (pairFaces.length >= 2) {
                    // Keep both pairs; reroll everything else (including energy) unless energy count is already 3+ (rare here)
                    const keepIdx = [];
                    currentDice.forEach((f,i)=>{
                        if (pairFaces.includes(f)) keepIdx.push(i);
                    });
                    // If nothing else kept (only 4 dice), optionally keep one high-utility non-number (attack if in/out Tokyo dynamics favor it)
                    if (keepIdx.length === 4) {
                        const attackIndex = currentDice.findIndex(f=>f==='attack');
                        if (attackIndex !== -1) keepIdx.push(attackIndex);
                    }
                    console.log('♻️ TWO-PAIRS-CONTINUE OVERRIDE: Forcing reroll to convert a pair into a triple');
                    window.AIOverrideStats = window.AIOverrideStats || { tripleKeep:0, noSetContinue:0, tripleExtend:0, twoPairs:0, release:0, attackCluster:0, decisions:0, personalityAdjust:0, threatBias:0 };
                    window.AIOverrideStats.twoPairs++;
                    return {
                        action: 'reroll',
                        keepDice: keepIdx,
                        reason: 'Override: two distinct pairs - pursue at least one triple',
                        confidence: (decision.confidence||0.6)+0.07
                    };
                }
            }
        }

        // POST-DECISION SAFEGUARD #2: Do not end early with no completed set and mixed singles when improvement possible
        if (decision.action === 'endRoll' && rollsRemaining > 0) {
            const counts = { one:0,two:0,three:0 };
            currentDice.forEach(f=>{ if(counts.hasOwnProperty(f)) counts[f]++; });
            const hasSet = Object.values(counts).some(c=>c>=3);
            const hasPair = Object.values(counts).some(c=>c===2);
            if (!hasSet && (hasPair || (counts.one+counts.two+counts.three)>=2)) {
                // Identify weakest dice to reroll: prefer rerolling solitary numbers that are not part of a pair, then low utility hearts (if full health), then excess singles of different numbers
                const indicesToKeep = new Set();
                // Keep any pairs entirely
                Object.keys(counts).forEach(faceKey => {
                    if (counts[faceKey] === 2) {
                        currentDice.forEach((f,i)=>{ if(f===faceKey) indicesToKeep.add(i); });
                    }
                });
                // Keep any energy already chosen in original decision
                diceEvaluations.filter(d=>d.face==='energy').forEach(d=>indicesToKeep.add(d.index));
                // Build new keep list
                const newKeepList = [...indicesToKeep];
                // Add any attack dice originally chosen if few kept (avoid keeping nothing)
                if (newKeepList.length < 2) {
                    diceEvaluations.filter(d=>d.face==='attack').forEach(d=>{ if(!indicesToKeep.has(d.index)) newKeepList.push(d.index); });
                }
                console.log('🔄 NO-SET-CONTINUE OVERRIDE: Forcing reroll to chase set (counts=',counts,')');
                window.AIOverrideStats = window.AIOverrideStats || { tripleKeep:0, noSetContinue:0, tripleExtend:0, twoPairs:0, release:0, attackCluster:0, decisions:0, personalityAdjust:0, threatBias:0 };
                window.AIOverrideStats.noSetContinue++;
                return {
                    action: 'reroll',
                    keepDice: newKeepList.length ? newKeepList : diceEvaluations.map(d=>d.index),
                    reason: 'Override: continue - no completed set yet and improvement potential remains',
                    confidence: (decision.confidence||0.6)+0.05
                };
            }
            // NEW POST-DECISION SAFEGUARD #3: If exactly one triple (size 3) plus exactly one stray number (not part of set) and rolls remain, keep triple + useful non-number dice, reroll stray number to chase 4-of-a-kind.
            if (hasSet) {
                const setFaceEntry = Object.entries(counts).find(([_,c])=>c>=3);
                if (setFaceEntry) {
                    const [setFace,setCount] = setFaceEntry;
                    if (setCount === 3) {
                        // count stray number dice not matching set
                        const strayNumberIndices = [];
                        currentDice.forEach((f,i)=>{
                            if ((f==='one'||f==='two'||f==='three') && f!==setFace && counts[f]===1) {
                                strayNumberIndices.push(i);
                            }
                        });
                        if (strayNumberIndices.length === 1) {
                            // Force reroll that single stray number
                            const keepIndices = [];
                            currentDice.forEach((f,i)=>{
                                if (f===setFace) keepIndices.push(i); // keep all dice that form the triple
                            });
                            // Keep attacks & energy already in decision
                            diceEvaluations.filter(d=> (d.face==='attack'||d.face==='energy')).forEach(d=>{ if(!keepIndices.includes(d.index)) keepIndices.push(d.index); });
                            console.log('🧩 TRIPLE-EXTEND OVERRIDE: Rerolling lone stray number to pursue 4-of-a-kind');
                            window.AIOverrideStats = window.AIOverrideStats || { tripleKeep:0, noSetContinue:0, tripleExtend:0, twoPairs:0, release:0, attackCluster:0, decisions:0, personalityAdjust:0, threatBias:0 };
                            window.AIOverrideStats.tripleExtend++;
                            return {
                                action: 'reroll',
                                keepDice: keepIndices,
                                reason: 'Override: extend triple - reroll lone off-set number',
                                confidence: (decision.confidence||0.7)+0.08
                            };
                        }
                    }
                }
            }
        }

        // NEW POST-DECISION SAFEGUARD #4: Auto-release lowest marginal die when all 6 are kept but growth potential exists (two pairs OR triple+pair) to allow a reroll.
        if (decision.action === 'endRoll') {
            const numberCounts = { one:counts.one, two:counts.two, three:counts.three };
            const pairFaces = Object.entries(numberCounts).filter(([_,c])=>c===2).map(([f])=>f);
            const tripleFaces = Object.entries(numberCounts).filter(([_,c])=>c===3).map(([f])=>f);
            const growthPotential = (pairFaces.length >= 2) || (tripleFaces.length === 1 && pairFaces.length === 1);
            if (growthPotential) {
                // Identify lowest marginal single to drop (priority: lone off-number not part of pair/triple, excess energy if mid/late game and energy >=2, low-impact attack if no Tokyo incentive)
                let releaseIndex = -1;
                // Pass 1: lone off-number
                currentDice.forEach((f,i)=>{
                    if (releaseIndex !== -1) return;
                    if ((f==='one'||f==='two'||f==='three') && numberCounts[f]===1) releaseIndex = i;
                });
                // Pass 2: excess energy (late/mid game heuristic) if none selected
                if (releaseIndex === -1) {
                    const gamePhase = situation.gamePhase || 'mid';
                    if (gamePhase !== 'early') {
                        let energyIndices = [];
                        currentDice.forEach((f,i)=>{ if(f==='energy') energyIndices.push(i); });
                        if (energyIndices.length >= 2) releaseIndex = energyIndices[0];
                    }
                }
                // Pass 3: attack with no strong incentive
                if (releaseIndex === -1) {
                    const attackIndex = currentDice.findIndex(f=>f==='attack');
                    if (attackIndex !== -1) releaseIndex = attackIndex;
                }
                if (releaseIndex !== -1) {
                    const keepIndices = diceEvaluations.map(d=>d.index).filter(idx => idx !== releaseIndex);
                    console.log('🪓 RELEASE-OVERRIDE: Freeing one die to pursue growth (index '+releaseIndex+')');
                    window.AIOverrideStats = window.AIOverrideStats || { tripleKeep:0, noSetContinue:0, tripleExtend:0, twoPairs:0, release:0, attackCluster:0, decisions:0, personalityAdjust:0, threatBias:0 };
                    window.AIOverrideStats.release++;
                    return {
                        action: 'reroll',
                        keepDice: keepIndices,
                        reason: 'Override: releasing low-value die to pursue set growth',
                        confidence: (decision.confidence||0.6)+0.06
                    };
                }
            }
        }

        // Increment decision counter & periodic summary
        try {
            window.AIOverrideStats = window.AIOverrideStats || { tripleKeep:0, noSetContinue:0, tripleExtend:0, twoPairs:0, release:0, attackCluster:0, decisions:0, personalityAdjust:0, threatBias:0 };
            window.AIOverrideStats.decisions++;
            if (window.AIOverrideStats.decisions % 10 === 0) {
                console.log('📊 AI Override Summary (last '+window.AIOverrideStats.decisions+' decisions):', {
                    tripleKeep: window.AIOverrideStats.tripleKeep,
                    noSetContinue: window.AIOverrideStats.noSetContinue,
                    tripleExtend: window.AIOverrideStats.tripleExtend,
                    twoPairs: window.AIOverrideStats.twoPairs,
                    release: window.AIOverrideStats.release,
                    attackCluster: window.AIOverrideStats.attackCluster
                });
            }
        } catch(e) { /* ignore */ }

        return decision;
    }

    /**
     * Analyze the current game situation including power card strategies and multi-player scenarios
     */
    analyzeSituation(player, gameState) {
        const threats = this.identifyThreats(player, gameState);
        const opportunities = this.identifyOpportunities(player, gameState);
        const powerCardStrategy = this.evaluatePowerCardStrategy(player, gameState);
        const multiPlayerScenarios = this.analyzeMultiPlayerScenarios(player, gameState);
        
        return {
            player: {
                health: player.health,
                energy: player.energy,
                victoryPoints: player.victoryPoints,
                isInTokyo: player.isInTokyo,
                personality: player.monster.personality
            },
            threats,
            opportunities,
            powerCardStrategy,
            multiPlayerScenarios,
            gamePhase: this.determineGamePhase(gameState)
        };
    }

    /**
     * Identify threats from other players with advanced persona override logic
     */
    identifyThreats(currentPlayer, gameState) {
        const threats = [];
        let criticalThreatDetected = false;
        
        gameState.players.forEach(player => {
            if (player.id === currentPlayer.id || player.isEliminated) return;
            
            let threatLevel = 0;
            let reasons = [];
            let isCritical = false;

            // CRITICAL THREAT: 18+ VP (immediate win threat)
            if (player.victoryPoints >= AI_CONSTANTS.THREAT_DETECTION.criticalVP) {
                threatLevel += 5;
                isCritical = true;
                criticalThreatDetected = true;
                reasons.push(`🚨 CRITICAL: ${player.victoryPoints} VP (can win next turn!)`);
            }
            // High VP threat
            else if (player.victoryPoints >= AI_CONSTANTS.THREAT_DETECTION.highVP) {
                threatLevel += 3;
                reasons.push(`${player.victoryPoints} VP (close to winning)`);
            }

            // CRITICAL: Player in Tokyo with 16+ VP (could win by staying)
            if (player.isInTokyo && player.victoryPoints >= AI_CONSTANTS.THREAT_DETECTION.tokyoVP) {
                threatLevel += 4;
                isCritical = true;
                criticalThreatDetected = true;
                reasons.push(`🚨 TOKYO THREAT: ${player.victoryPoints} VP in Tokyo`);
            }
            // Tokyo threat (they're scoring points)
            else if (player.isInTokyo) {
                threatLevel += 2;
                reasons.push('controlling Tokyo');
            }

            // High energy threat (can buy powerful cards)
            if (player.energy >= AI_CONSTANTS.THREAT_DETECTION.highEnergy) {
                threatLevel += 1;
                reasons.push(`${player.energy} energy`);
            }

            if (threatLevel > 0) {
                threats.push({
                    player,
                    level: threatLevel,
                    reasons: reasons.join(', '),
                    isCritical,
                    requiresPersonalityOverride: isCritical && currentPlayer.monster.personality.aggression <= 2
                });
            }
        });

        // Add critical threat context to analysis
        const analysis = {
            threats: threats.sort((a, b) => b.level - a.level),
            hasCriticalThreat: criticalThreatDetected,
            personalityOverrideRequired: threats.some(t => t.requiresPersonalityOverride)
        };

        return analysis;
    }

    /**
     * Evaluate power card interactions and timing for strategic decisions
     */
    evaluatePowerCardStrategy(player, gameState) {
        if (!player.powerCards || player.powerCards.length === 0) {
            return { hasStrategy: false, recommendations: [] };
        }

        const strategy = {
            hasStrategy: false,
            preRollActions: [],
            postRollFocus: [],
            energyPriority: 0,
            recommendations: []
        };

        // Check for pre-roll cards that should influence dice decisions
        const preRollCards = player.powerCards.filter(card => 
            AI_CONSTANTS.POWER_CARD_TIMING.preRoll.includes(card.name)
        );

        if (preRollCards.length > 0) {
            strategy.preRollActions = preRollCards.map(card => ({
                card: card.name,
                effect: this.getPowerCardEffect(card.name),
                timing: 'beforeRoll'
            }));
        }

        // Check for synergistic combinations
        const ownedCardNames = player.powerCards.map(c => c.name);
        
        // Energy engine detection
        const energyCards = ownedCardNames.filter(name => 
            AI_CONSTANTS.POWER_CARD_TIMING.synergies.energyEngine.includes(name)
        );
        if (energyCards.length >= 2) {
            strategy.hasStrategy = true;
            strategy.energyPriority = 3;
            strategy.recommendations.push('Energy engine detected - prioritize energy dice');
            this.addAILogicEntry(player, `🔋 Energy Engine: ${energyCards.join(', ')}`, 'high');
        }

        // Attack combo detection
        const attackCards = ownedCardNames.filter(name => 
            AI_CONSTANTS.POWER_CARD_TIMING.synergies.attackCombo.includes(name)
        );
        if (attackCards.length >= 2) {
            strategy.hasStrategy = true;
            strategy.recommendations.push('Attack combo detected - prioritize attack dice');
            this.addAILogicEntry(player, `⚔️ Attack Combo: ${attackCards.join(', ')}`, 'high');
        }

        // Victory rush detection
        const victoryCards = ownedCardNames.filter(name => 
            AI_CONSTANTS.POWER_CARD_TIMING.synergies.victoryRush.includes(name)
        );
        if (victoryCards.length >= 2) {
            strategy.hasStrategy = true;
            strategy.recommendations.push('Victory rush detected - prioritize victory points');
            this.addAILogicEntry(player, `🏆 Victory Rush: ${victoryCards.join(', ')}`, 'high');
        }

        return strategy;
    }

    /**
     * Get power card effect description for strategy planning
     */
    getPowerCardEffect(cardName) {
        const effects = {
            'Energize': 'Gain energy at start of turn',
            'Heal': 'Gain health at start of turn', 
            'Extra Head': 'Roll extra die',
            'It Has a Child': 'Gain VP when not attacking',
            'Complete Destruction': 'Extra damage potential',
            'Nuclear Power Plant': 'Energy from other players\' energy',
            'Dedicated News Team': 'Energy from victory points',
            'Acid Attack': 'Extra attack damage',
            'Fire Breathing': 'Attack all players',
            'Giant Brain': 'Extra energy and attack',
            'Friend of Children': 'VP from staying out of Tokyo',
            'Evacuation Orders': 'VP from others entering Tokyo',
            'Opportunist': 'VP from others\' misfortune'
        };
        
        return effects[cardName] || 'Unknown effect';
    }

    /**
     * Advanced multi-player strategic analysis - predicts what other players might do
     */
    analyzeMultiPlayerScenarios(currentPlayer, gameState) {
        const turnOrder = this.calculateTurnOrder(currentPlayer, gameState);
        const scenarios = {
            turnOrder,
            predictions: [],
            strategicInsights: [],
            cooperativeOpportunities: [],
            competitiveThreats: [],
            thoughtProcess: []
        };

        // Analyze each upcoming player's likely actions
        turnOrder.forEach((player, index) => {
            if (player.id === currentPlayer.id) return;
            
            const prediction = this.predictPlayerAction(player, gameState, currentPlayer);
            scenarios.predictions.push(prediction);
            
            // Generate strategic insights based on predictions
            const insights = this.generateStrategicInsights(prediction, currentPlayer, gameState, index);
            scenarios.strategicInsights.push(...insights);
        });

        // Analyze cooperative vs competitive scenarios
        scenarios.cooperativeOpportunities = this.findCooperativeOpportunities(currentPlayer, gameState, scenarios.predictions);
        scenarios.competitiveThreats = this.findCompetitiveThreats(currentPlayer, gameState, scenarios.predictions);
        
        // Generate thought process narrative for thought bubbles
        scenarios.thoughtProcess = this.generateThoughtProcess(currentPlayer, scenarios);

        return scenarios;
    }

    /**
     * Calculate turn order from current player
     */
    calculateTurnOrder(currentPlayer, gameState) {
        const activePlayers = gameState.players.filter(p => !p.isEliminated);
        const currentIndex = activePlayers.findIndex(p => p.id === currentPlayer.id);
        
        // Return players in order after current player
        const turnOrder = [];
        for (let i = 1; i < activePlayers.length; i++) {
            const nextIndex = (currentIndex + i) % activePlayers.length;
            turnOrder.push(activePlayers[nextIndex]);
        }
        
        return turnOrder;
    }

    /**
     * Predict what a specific player is likely to do on their turn
     */
    predictPlayerAction(player, gameState, currentPlayer) {
        const personality = player.monster.personality;
        const threats = this.identifyThreats(player, gameState);
        
        const prediction = {
            player,
            personality,
            likelyActions: [],
            probability: 0,
            reasoning: [],
            willAttackTokyo: false,
            willBuyCards: false,
            willGoForVP: false,
            riskAssessment: 'low'
        };

        // Analyze based on personality and game state
        
        // 1. Health status analysis
        if (player.health <= 5) {
            prediction.likelyActions.push({
                action: 'prioritize_heal',
                probability: 0.8 + (personality.aggression <= 2 ? 0.15 : -0.1),
                reasoning: `${player.monster.name} has low health (${player.health})`
            });
        }

        // 2. Victory point analysis
        if (player.victoryPoints >= 15) {
            prediction.likelyActions.push({
                action: 'go_for_victory',
                probability: 0.9,
                reasoning: `${player.monster.name} is close to winning with ${player.victoryPoints} VP`
            });
            prediction.willGoForVP = true;
        }

        // 3. Tokyo attack analysis
        const playerInTokyo = gameState.players.find(p => p.isInTokyo && !p.isEliminated);
        if (playerInTokyo && playerInTokyo.id !== player.id) {
            let attackProbability = 0.3; // Base probability
            
            // Personality modifiers
            attackProbability += (personality.aggression - 3) * 0.15;
            attackProbability += (personality.risk - 3) * 0.1;
            
            // Threat level modifiers
            if (playerInTokyo.victoryPoints >= 18) {
                attackProbability += 0.5; // Critical threat
            } else if (playerInTokyo.victoryPoints >= 15) {
                attackProbability += 0.3; // High threat
            }
            
            // Health consideration
            if (player.health <= 3) {
                attackProbability -= 0.4; // Less likely to attack when vulnerable
            }
            
            prediction.willAttackTokyo = attackProbability > 0.5;
            prediction.likelyActions.push({
                action: 'attack_tokyo',
                probability: Math.max(0, Math.min(1, attackProbability)),
                reasoning: `Tokyo has ${playerInTokyo.monster.name} with ${playerInTokyo.victoryPoints} VP`
            });
        }

        // 4. Power card purchasing analysis
        if (player.energy >= 8) {
            let buyProbability = 0.6;
            buyProbability += (personality.strategy - 3) * 0.15;
            
            prediction.willBuyCards = buyProbability > 0.5;
            prediction.likelyActions.push({
                action: 'buy_power_cards',
                probability: buyProbability,
                reasoning: `${player.monster.name} has ${player.energy} energy`
            });
        }

        // Calculate overall prediction confidence
        prediction.probability = prediction.likelyActions.reduce((sum, action) => sum + action.probability, 0) / prediction.likelyActions.length || 0;
        
        return prediction;
    }

    /**
     * Generate strategic insights based on player predictions
     */
    generateStrategicInsights(prediction, currentPlayer, gameState, turnPosition) {
        const insights = [];
        const playerInTokyo = gameState.players.find(p => p.isInTokyo && !p.isEliminated);
        
        // Tokyo attack scenarios
        if (playerInTokyo && prediction.willAttackTokyo) {
            insights.push({
                type: 'cooperative_opportunity',
                description: `${prediction.player.monster.name} will likely attack Tokyo - I could focus on VP/energy instead`,
                strategic_value: 'high',
                confidence: prediction.likelyActions.find(a => a.action === 'attack_tokyo')?.probability || 0
            });
        } else if (playerInTokyo && !prediction.willAttackTokyo && turnPosition === 0) {
            insights.push({
                type: 'burden_responsibility',
                description: `${prediction.player.monster.name} probably won't attack Tokyo - I might need to do it myself`,
                strategic_value: 'medium',
                confidence: 1 - (prediction.likelyActions.find(a => a.action === 'attack_tokyo')?.probability || 0.5)
            });
        }

        // Victory point competition
        if (prediction.willGoForVP && currentPlayer.victoryPoints >= 12) {
            insights.push({
                type: 'competitive_threat',
                description: `${prediction.player.monster.name} is racing for victory - need to be aggressive`,
                strategic_value: 'critical',
                confidence: 0.9
            });
        }

        // Energy competition for power cards
        if (prediction.willBuyCards && currentPlayer.energy >= 6) {
            insights.push({
                type: 'resource_competition',
                description: `${prediction.player.monster.name} will buy cards - should I secure energy or buy first?`,
                strategic_value: 'medium',
                confidence: prediction.likelyActions.find(a => a.action === 'buy_power_cards')?.probability || 0
            });
        }

        return insights;
    }

    /**
     * Find cooperative opportunities where other players might help
     */
    findCooperativeOpportunities(currentPlayer, gameState, predictions) {
        const opportunities = [];
        const playerInTokyo = gameState.players.find(p => p.isInTokyo && !p.isEliminated);
        
        if (playerInTokyo && playerInTokyo.victoryPoints >= 16) {
            const attackers = predictions.filter(p => p.willAttackTokyo);
            
            if (attackers.length > 0) {
                opportunities.push({
                    type: 'tokyo_liberation',
                    description: `${attackers.map(a => a.player.monster.name).join(' and ')} likely to attack Tokyo`,
                    benefit: 'Can focus on VP/energy instead of attacking',
                    confidence: attackers.reduce((sum, a) => sum + a.probability, 0) / attackers.length
                });
            }
        }

        return opportunities;
    }

    /**
     * Find competitive threats from other players' likely actions
     */
    findCompetitiveThreats(currentPlayer, gameState, predictions) {
        const threats = [];
        
        // Victory point racing threats
        const vpRacers = predictions.filter(p => p.willGoForVP);
        vpRacers.forEach(racer => {
            threats.push({
                type: 'victory_race',
                player: racer.player.monster.name,
                description: `${racer.player.monster.name} racing for victory with ${racer.player.victoryPoints} VP`,
                urgency: racer.player.victoryPoints >= 18 ? 'critical' : 'high',
                confidence: racer.probability
            });
        });

        // Power card competition
        const cardBuyers = predictions.filter(p => p.willBuyCards);
        if (cardBuyers.length > 0 && currentPlayer.energy >= 6) {
            threats.push({
                type: 'resource_competition',
                description: 'Multiple players competing for power cards',
                urgency: 'medium',
                confidence: 0.7
            });
        }

        return threats;
    }

    /**
     * Generate narrative thought process for thought bubbles
     */
    generateThoughtProcess(currentPlayer, scenarios) {
        const thoughts = [];
        const playerInTokyo = scenarios.turnOrder.find(p => p.isInTokyo);
        
        // Tokyo scenario analysis
        if (playerInTokyo && playerInTokyo.victoryPoints >= 16) {
            const attackers = scenarios.predictions.filter(p => p.willAttackTokyo);
            
            if (attackers.length > 0) {
                thoughts.push(`Hmm... ${attackers[0].player.monster.name} will probably attack Tokyo. I could focus on points instead of wasting dice on attacks.`);
            } else {
                thoughts.push(`Nobody else looks likely to attack Tokyo... I might have to 'take one for the team' and deal with ${playerInTokyo.monster.name} myself.`);
            }
        }

        // Competitive analysis
        const vpThreats = scenarios.competitiveThreats.filter(t => t.type === 'victory_race');
        if (vpThreats.length > 0) {
            const threat = vpThreats[0];
            thoughts.push(`${threat.player} is close to winning... I need to be more aggressive and can't afford to play it safe.`);
        }

        // Cooperative opportunities
        if (scenarios.cooperativeOpportunities.length > 0) {
            const opp = scenarios.cooperativeOpportunities[0];
            thoughts.push(`Good! ${opp.description.split(' likely')[0]} will handle Tokyo. I can focus on my own strategy.`);
        }

        // Resource competition
        const energyCompetition = scenarios.competitiveThreats.find(t => t.type === 'resource_competition');
        if (energyCompetition && currentPlayer.energy >= 8) {
            thoughts.push(`Multiple players are eyeing power cards... should I buy now or risk losing good cards to other players?`);
        }

        // Default strategic thoughts
        if (thoughts.length === 0) {
            thoughts.push(`Let me think about what the other players might do... ${scenarios.turnOrder[0]?.monster.name} goes next.`);
        }

        return thoughts;
    }

    /**
     * Select most relevant strategic thought for current situation
     */
    selectStrategicThought(multiPlayerScenarios, currentPlayer) {
        const { thoughtProcess, cooperativeOpportunities, competitiveThreats } = multiPlayerScenarios;
        
        // Prioritize thoughts based on urgency and relevance
        
        // Critical competitive threats get priority
        const criticalThreats = competitiveThreats.filter(t => t.urgency === 'critical');
        if (criticalThreats.length > 0) {
            return thoughtProcess.find(t => t.includes('close to winning')) || 
                   `${criticalThreats[0].player} is about to win! I need to be much more aggressive.`;
        }
        
        // Cooperative opportunities 
        const tokyoCooperation = cooperativeOpportunities.find(o => o.type === 'tokyo_liberation');
        if (tokyoCooperation && tokyoCooperation.confidence > 0.6) {
            return thoughtProcess.find(t => t.includes('probably attack Tokyo')) ||
                   `Great! Someone else will deal with Tokyo, so I can focus on my own strategy.`;
        }
        
        // Resource competition
        const resourceComp = competitiveThreats.find(t => t.type === 'resource_competition');
        if (resourceComp && currentPlayer.energy >= 8) {
            return thoughtProcess.find(t => t.includes('power cards')) ||
                   `Multiple players are eyeing the same power cards... timing is critical.`;
        }
        
        // Default strategic analysis
        return thoughtProcess.length > 0 ? thoughtProcess[0] : 
               `Let me think about what the other players are likely to do...`;
    }

    /**
     * Identify opportunities for the current player
     */
    identifyOpportunities(player, gameState) {
        const opportunities = [];

        // Tokyo opportunity (if empty and player is healthy)
        const tokyoPlayer = gameState.players.find(p => p.isInTokyo);
        if (!tokyoPlayer && player.health > 5) {
            opportunities.push({
                type: 'enterTokyo',
                value: 2,
                description: 'Tokyo is empty and player is healthy'
            });
        }

        // Attack opportunity (if other players are low health)
        // Elimination opportunity (if any player can be eliminated with attack)
        const vulnerablePlayers = gameState.players.filter(p => 
            p.id !== player.id && !p.isEliminated && p.health <= AI_CONSTANTS.THREAT_DETECTION.lowHealth
        );
        if (vulnerablePlayers.length > 0) {
            opportunities.push({
                type: 'eliminate',
                value: 3,
                description: `${vulnerablePlayers.length} vulnerable players`
            });
        }

        return opportunities;
    }

    /**
     * Determine what phase of the game we're in
     */
    determineGamePhase(gameState) {
        const maxVP = Math.max(...gameState.players.map(p => p.victoryPoints));
        const aliveCount = gameState.players.filter(p => !p.isEliminated).length;

        if (maxVP >= 15 || aliveCount <= 2) return 'endgame';
        if (maxVP >= 10) return 'midgame';
        return 'earlygame';
    }

    /**
     * Evaluate the value of each die result
     */
    evaluateDice(dice, player, situation) {
        // First, count occurrences of each dice face for combination analysis
        const faceCounts = {};
        dice.forEach(face => {
            faceCounts[face] = (faceCounts[face] || 0) + 1;
        });

        return dice.map((dieValue, index) => {
            const baseValue = this.getDiceBaseValue(dieValue);
            const situationalValue = this.getDiceSituationalValue(dieValue, player, situation);
            const personalityValue = this.getDicePersonalityValue(dieValue, player.monster.personality, situation);
            
            // NEW: Add combination bonus for numbers
            const combinationValue = this.getDiceCombinationValue(dieValue, faceCounts);
            
            const totalValue = baseValue + situationalValue + personalityValue + combinationValue;
            
            return {
                index,
                face: dieValue,
                baseValue,
                situationalValue,
                personalityValue,
                combinationValue,
                totalValue,
                shouldKeep: totalValue > this.getKeepThreshold(player, situation)
            };
        });
    }

    /**
     * Calculate bonus value for dice combinations (especially numbers for VP)
     */
    getDiceCombinationValue(dieValue, faceCounts) {
        if (['1', '2', '3'].includes(dieValue)) {
            const count = faceCounts[dieValue];
            
            // VP scoring: 3 same = number value, each extra = +1 VP
            if (count >= 3) {
                // This die is part of a VP-scoring combination!
                const vpValue = parseInt(dieValue) + Math.max(0, count - 3);
                return vpValue * 3; // Weight VP combinations heavily
            } else if (count === 2) {
                // Two of a kind - valuable because we're close to VP
                return 2;
            } else {
                // Single die - minimal value unless we can build to 3
                return 0;
            }
        }
        
        // For non-numbers, check if multiples add value
        if (dieValue === 'attack') {
            const count = faceCounts['attack'];
            return count >= 2 ? count * 0.5 : 0; // Multiple attacks are valuable
        }
        
        if (dieValue === 'energy') {
            const count = faceCounts['energy'];
            return count >= 2 ? count * 0.3 : 0; // Multiple energy is nice
        }
        
        if (dieValue === 'heal') {
            const count = faceCounts['heal'];
            return count >= 2 ? count * 0.4 : 0; // Multiple heals can be useful
        }
        
        return 0;
    }

    /**
     * Get base value for a dice face using constants
     */
    getDiceBaseValue(dieValue) {
        switch(dieValue) {
            case 'attack': return AI_CONSTANTS.DICE_VALUES.attack.baseValue;
            case 'energy': return AI_CONSTANTS.DICE_VALUES.energy.baseValue;
            case 'heal': return AI_CONSTANTS.DICE_VALUES.heal.baseValue;
            case '1': case '2': case '3': 
                return AI_CONSTANTS.DICE_VALUES.victoryPoints.baseValue; // Numbers are victory points
            default: return 1;
        }
    }

    /**
     * Calculate situational bonuses for dice with advanced personality override logic
     */
    getDiceSituationalValue(dieValue, player, situation) {
        let bonus = 0;

        switch(dieValue) {
            case 'attack':
                // 🚨 PERSONALITY OVERRIDE: Critical threats force attack regardless of personality
                if (situation.threats.hasCriticalThreat && situation.threats.personalityOverrideRequired) {
                    bonus += 8; // Massive bonus forces attack even for timid monsters
                    // Add extra context to AI Logic Flow
                    this.addAILogicEntry(player, `⚠️ PERSONALITY OVERRIDE: Timid monster MUST attack 18+ VP threat`, 'high');
                }
                // Normal threat response
                else if (situation.threats.threats.length > 0) {
                    bonus += 2;
                }
                
                // ⚔️ POWER CARD STRATEGY: Attack combo bonus
                if (situation.powerCardStrategy && situation.powerCardStrategy.recommendations.some(r => r.includes('attack combo'))) {
                    bonus += 2;
                    this.addAILogicEntry(player, `⚔️ Attack Combo Strategy: +2 bonus`, 'normal');
                }
                
                // 🎯 MULTI-PLAYER STRATEGY: Tokyo attack coordination
                if (situation.multiPlayerScenarios) {
                    const cooperativeOpp = situation.multiPlayerScenarios.cooperativeOpportunities.find(o => o.type === 'tokyo_liberation');
                    if (cooperativeOpp && cooperativeOpp.confidence > 0.6) {
                        bonus -= 2; // Others will attack, I can focus elsewhere
                        this.addAILogicEntry(player, `🤝 Cooperative: Others will attack Tokyo - reducing attack priority`, 'high');
                    }
                    
                    const competitiveThreats = situation.multiPlayerScenarios.competitiveThreats.filter(t => t.urgency === 'critical');
                    if (competitiveThreats.length > 0) {
                        bonus += 3; // Critical situation requires aggression
                        this.addAILogicEntry(player, `⚡ Critical Competition: Must be aggressive vs ${competitiveThreats[0].player}`, 'high');
                    }
                }
                
                if (situation.opportunities.some(o => o.type === 'eliminate')) bonus += 2;
                // Penalty if player is in Tokyo (will hurt themselves)
                if (player.isInTokyo) bonus -= 3;
                break;
                
            case 'heal':
                // Bonus for healing when health is low
                if (player.health <= 5) bonus += 3;
                if (player.health <= 3) bonus += 2;
                // No value if at full health or in Tokyo
                if (player.health >= 10 || player.isInTokyo) bonus -= 5;
                break;
                
            case 'energy':
                // Bonus for energy in mid/endgame
                if (situation.gamePhase === 'midgame') bonus += 1;
                if (situation.gamePhase === 'endgame') bonus += 2;
                
                // 🔋 POWER CARD STRATEGY: Energy engine bonus
                if (situation.powerCardStrategy && situation.powerCardStrategy.energyPriority > 0) {
                    bonus += situation.powerCardStrategy.energyPriority;
                    this.addAILogicEntry(player, `🔋 Energy Strategy: +${situation.powerCardStrategy.energyPriority} bonus`, 'normal');
                }
                
                // 💰 MULTI-PLAYER STRATEGY: Resource competition
                if (situation.multiPlayerScenarios) {
                    const resourceCompetition = situation.multiPlayerScenarios.competitiveThreats.find(t => t.type === 'resource_competition');
                    if (resourceCompetition && player.energy >= 6) {
                        bonus += 2; // Need to secure energy before others
                        this.addAILogicEntry(player, `💰 Competition: Others want power cards too - prioritizing energy`, 'normal');
                    }
                }
                break;
                
            case '1': case '2': case '3':
                // Victory points are more valuable in endgame
                if (situation.gamePhase === 'endgame') bonus += 2;
                if (player.victoryPoints >= 15) bonus += 3; // Close to winning
                
                // 🏆 POWER CARD STRATEGY: Victory rush bonus
                if (situation.powerCardStrategy && situation.powerCardStrategy.recommendations.some(r => r.includes('victory rush'))) {
                    bonus += 2;
                    this.addAILogicEntry(player, `🏆 Victory Rush Strategy: +2 bonus`, 'normal');
                }
                
                // 🏁 MULTI-PLAYER STRATEGY: Victory point racing
                if (situation.multiPlayerScenarios) {
                    const vpRacers = situation.multiPlayerScenarios.competitiveThreats.filter(t => t.type === 'victory_race');
                    if (vpRacers.length > 0 && player.victoryPoints >= 12) {
                        bonus += 3; // Racing situation - VP critical
                        this.addAILogicEntry(player, `🏁 Victory Race: Competing with ${vpRacers[0].player} - VP critical!`, 'high');
                    }
                }
                break;
        }

        return bonus;
    }

    /**
     * Apply personality modifiers to dice values with critical override support
     */
    getDicePersonalityValue(dieValue, personality, situation = null) {
        const { aggression, strategy, risk } = personality;
        let bonus = 0;

        // Aggression affects attack and heal preferences
        if (dieValue === 'attack') {
            // 🚨 PERSONALITY OVERRIDE: Critical threats bypass personality
            if (situation && situation.threats && situation.threats.hasCriticalThreat) {
                bonus += 2; // Force attack regardless of low aggression
            } else {
                bonus += (aggression - 3) * 0.5; // -1 to +1 based on aggression
            }
        }
        if (dieValue === 'heal') {
            bonus -= (aggression - 3) * 0.3; // Aggressive monsters heal less
        }

        // Strategy affects victory point preference
        if (['1', '2', '3'].includes(dieValue)) {
            bonus += (strategy - 3) * 0.3; // Strategic monsters focus on VP
        }

        // Risk affects overall decision threshold (handled in getKeepThreshold)

        return bonus;
    }

    /**
     * Determine threshold for keeping dice based on personality and situation
     */
    getKeepThreshold(player, situation) {
        const baseThreshold = 3.0;
        const { risk, strategy } = player.monster.personality;
        
        let threshold = baseThreshold;
        
        // Risk tolerance affects threshold
        threshold += (5 - risk) * 0.3; // High risk = lower threshold (keep more dice)
        
        // Strategic players are more selective
        threshold += (strategy - 3) * 0.2;
        
        // In endgame, be more selective
        if (situation.gamePhase === 'endgame') {
            threshold += 0.5;
        }
        
        return threshold;
    }

    /**
     * Make final decision on what dice to keep
     */
    makeKeepDecision(diceEvaluations, rollsRemaining, player, situation) {
        const diceToKeep = diceEvaluations.filter(d => d.shouldKeep);
        const { risk } = player.monster.personality;
        
        // CRITICAL: Ensure CPU always rerolls unless it's the final roll or has amazing results
        
        // On final roll (rollsRemaining === 1), must end
        if (rollsRemaining === 1) {
            return {
                action: 'endRoll',
                keepDice: diceToKeep.map(d => d.index),
                reason: 'Final roll - must end turn',
                confidence: 0.9
            };
        }
        
        // Exceptional results - only stop early if we have 4+ great dice
        if (diceToKeep.length >= 4 && risk <= 2) {
            return {
                action: 'keep',
                keepDice: diceToKeep.map(d => d.index),
                reason: `Exceptional results (${diceToKeep.length} dice) - conservative stop`,
                confidence: 0.8
            };
        }
        
        // High-risk personalities almost always continue unless final roll
        if (risk >= 4) {
            return {
                action: 'reroll',
                keepDice: diceToKeep.map(d => d.index),
                reason: `High-risk personality - continuing for better results (${diceToKeep.length} kept)`,
                confidence: 0.7
            };
        }
        
        // Medium risk - continue unless we have very good results
        if (risk === 3 && diceToKeep.length < 3) {
            return {
                action: 'reroll',
                keepDice: diceToKeep.map(d => d.index),
                reason: `Moderate risk - need more good dice (${diceToKeep.length} kept)`,
                confidence: 0.6
            };
        }
        
        // Conservative - but still continue on first roll unless truly exceptional
        if (rollsRemaining >= 2) {
            return {
                action: 'reroll',
                keepDice: diceToKeep.map(d => d.index),
                reason: `${rollsRemaining} rolls left - continuing (${diceToKeep.length} dice kept)`,
                confidence: 0.5
            };
        }
        
        // Default: continue rolling (should rarely hit this case)
        return {
            action: 'reroll',
            keepDice: diceToKeep.map(d => d.index),
            reason: `Default continue - ${diceToKeep.length} dice kept`,
            confidence: 0.4
        };
    }

    // ===== DEFENSIVE POWER CARD ANALYSIS =====
    evaluateDefensiveCardPurchase(card, player, availableCards) {
        const cardValue = this.getCardValueForOpponents(card, player);
        const denialBenefit = this.calculateDenialBenefit(card, player);
        const purchaseCost = this.getDefensivePurchaseCost(card, player);
        
        return {
            shouldBuyDefensively: cardValue.criticalForOpponent && denialBenefit > purchaseCost,
            defensiveValue: cardValue.totalValue,
            denialReason: cardValue.reason,
            cost: purchaseCost
        };
    }

    getCardValueForOpponents(card, player) {
        let maxValue = 0;
        let criticalForOpponent = false;
        let mostThreateningPlayer = null;
        let reason = '';

        // Check each opponent to see how valuable this card would be for them
        for (const opponent of Object.values(game.players)) {
            if (opponent.id === player.id || opponent.eliminated) continue;

            const opponentValue = this.calculateCardValueForPlayer(card, opponent);
            if (opponentValue.value > maxValue) {
                maxValue = opponentValue.value;
                mostThreateningPlayer = opponent;
                reason = opponentValue.reason;
            }

            // Check if this card would be critical for this opponent
            if (this.isCardCriticalForPlayer(card, opponent)) {
                criticalForOpponent = true;
            }
        }

        return {
            totalValue: maxValue,
            criticalForOpponent,
            mostThreateningPlayer,
            reason
        };
    }

    calculateCardValueForPlayer(card, player) {
        let value = 0;
        let reason = '';

        // Tokyo Strategy Enhancement: Priority for protection cards
        const tokyoProtectionValue = this.evaluateTokyoProtectionValue(card, player);
        if (tokyoProtectionValue.value > 0) {
            value += tokyoProtectionValue.value;
            reason = tokyoProtectionValue.reason;
        }

        // High VP players need victory cards
        if (player.victoryPoints >= 15 && this.isVictoryAcceleratorCard(card)) {
            value += 80;
            reason = `${player.monster} is close to victory and this card accelerates VP gain`;
        }

        // Energy engine builders need energy cards
        if (this.playerHasEnergyEngine(player) && this.isEnergyCard(card)) {
            value += 60;
            reason = `${player.monster} has an energy engine and this enhances it`;
        }

        // Aggressive players in Tokyo need attack cards
        if (player.inTokyo && this.isAttackCard(card)) {
            value += 50;
            reason = `${player.monster} is in Tokyo and this card boosts attacks`;
        }

        // Ailment token strategy evaluation
        const ailmentValue = this.evaluateAilmentTokenStrategy(card, player);
        if (ailmentValue.value > 0) {
            value += ailmentValue.value;
            reason = ailmentValue.reason;
        }

        // Players with specific synergies
        const synergyValue = this.calculateSynergyValueForPlayer(card, player);
        if (synergyValue > 0) {
            value += synergyValue;
            reason = `This card synergizes with ${player.monster}'s current strategy`;
        }

        return { value, reason };
    }

    // Evaluate the strategic value of ailment token cards
    evaluateAilmentTokenStrategy(card, player) {
        const game = this.game;
        
        // Check if this is an ailment token card
        if (card.name === 'Shrink Ray' || card.name === 'Poison Spit') {
            let value = 0;
            let reason = '';
            
            // Find the most threatening opponent
            const opponents = game.players.filter(p => p !== player && !p.isEliminated);
            const threateningOpponent = this.findMostThreateningOpponent(opponents, player);
            
            if (threateningOpponent) {
                if (card.name === 'Shrink Ray') {
                    // Shrink Ray is valuable against high-health opponents or those about to win
                    if (threateningOpponent.health >= 8) {
                        value += 45;
                        reason = `${threateningOpponent.monster.name} has high health (${threateningOpponent.health}) - Shrink Ray reduces survivability`;
                    } else if (threateningOpponent.victoryPoints >= 15) {
                        value += 60;
                        reason = `${threateningOpponent.monster.name} is close to victory - Shrink Ray disrupts their endgame`;
                    } else if (threateningOpponent.inTokyo) {
                        value += 35;
                        reason = `${threateningOpponent.monster.name} in Tokyo - Shrink Ray forces earlier exit`;
                    }
                } else if (card.name === 'Poison Spit') {
                    // Poison Spit is valuable against dice-dependent strategies
                    if (this.playerDependsOnDice(threateningOpponent)) {
                        value += 50;
                        reason = `${threateningOpponent.monster.name} relies on dice rolls - Poison Spit cripples their strategy`;
                    } else if (threateningOpponent.inTokyo) {
                        value += 40;
                        reason = `${threateningOpponent.monster.name} in Tokyo - Poison Spit reduces attack potential`;
                    } else if (threateningOpponent.victoryPoints >= 12) {
                        value += 30;
                        reason = `${threateningOpponent.monster.name} gaining momentum - Poison Spit slows progress`;
                    }
                }
                
                // Bonus value if opponent has no easy way to heal ailments
                if (!this.opponentCanEasilyHeal(threateningOpponent)) {
                    value += 15;
                    reason += ' (no easy healing available)';
                }
            }
            
            return { value, reason };
        }
        
        return { value: 0, reason: '' };
    }

    // Find the most threatening opponent for ailment targeting
    findMostThreateningOpponent(opponents, player) {
        if (opponents.length === 0) return null;
        
        // Score opponents by threat level
        let mostThreatening = null;
        let highestThreat = 0;
        
        opponents.forEach(opponent => {
            let threatScore = 0;
            
            // Victory point threat
            if (opponent.victoryPoints >= 15) threatScore += 100;
            else if (opponent.victoryPoints >= 12) threatScore += 60;
            else if (opponent.victoryPoints >= 8) threatScore += 30;
            
            // Tokyo control threat
            if (opponent.inTokyo) threatScore += 40;
            
            // Energy/power card threat
            if (opponent.energy >= 8) threatScore += 25;
            if (opponent.powerCards.length >= 3) threatScore += 20;
            
            // Health advantage threat
            if (opponent.health >= 8) threatScore += 15;
            
            if (threatScore > highestThreat) {
                highestThreat = threatScore;
                mostThreatening = opponent;
            }
        });
        
        return mostThreatening;
    }

    // Check if a player depends heavily on dice rolls
    playerDependsOnDice(player) {
        // Players in Tokyo depend on dice for attacks
        if (player.inTokyo) return true;
        
        // Players with dice-enhancing cards depend on dice
        const diceCards = ['Extra Head', 'Giant Brain', 'Opportunist'];
        const hasDiceCards = player.powerCards.some(card => diceCards.includes(card.name));
        if (hasDiceCards) return true;
        
        // Players with low energy depend on dice for energy generation
        if (player.energy <= 3) return true;
        
        return false;
    }

    // Check if opponent can easily heal ailment tokens
    opponentCanEasilyHeal(opponent) {
        // Check for healing cards
        const healingCards = ['Regeneration', 'Healing Ray', 'Dedicated News Team'];
        const hasHealingCards = opponent.powerCards.some(card => healingCards.includes(card.name));
        if (hasHealingCards) return true;
        
        // Check if they're outside Tokyo (can heal with hearts)
        if (!opponent.inTokyo && opponent.energy >= 2) return true;
        
        return false;
    }

    isCardCriticalForPlayer(card, player) {
        const defensivePriorities = AI_CONSTANTS.DEFENSIVE_CARD_PRIORITIES.highValueTargets;
        
        if (!defensivePriorities[card.name]) return false;

        const condition = defensivePriorities[card.name].denyIf;
        
        switch (condition) {
            case 'anyOpponentNeedsVP':
                return player.victoryPoints >= 15;
            case 'opponentHasEnergyEngine':
                return this.playerHasEnergyEngine(player);
            case 'aggressiveOpponentExists':
                return this.isPlayerAggressive(player);
            case 'multipleThreats':
                return player.victoryPoints >= 12 && (player.inTokyo || this.playerHasEnergyEngine(player));
            case 'opponentCanStayOutOfTokyo':
                return !player.inTokyo && player.health > 6;
            case 'opponentHasHighEnergy':
                return player.energy >= 6;
            case 'targetIsVulnerableToAilments':
                return this.isPlayerVulnerableToAilments(player);
            case 'targetDependsOnDice':
                return this.playerDependsOnDice(player);
            default:
                return false;
        }
    }

    // Check if a player is vulnerable to ailment tokens
    isPlayerVulnerableToAilments(player) {
        // Players with high health are vulnerable to Shrink Ray
        if (player.health >= 8) return true;
        
        // Players close to victory are vulnerable to any disruption
        if (player.victoryPoints >= 15) return true;
        
        // Players in Tokyo are vulnerable to health reduction
        if (player.inTokyo) return true;
        
        // Players with no healing ability are vulnerable
        if (!this.opponentCanEasilyHeal(player)) return true;
        
        return false;
    }

    calculateDenialBenefit(card, player) {
        // How much strategic advantage do we gain by denying this card?
        const defensivePriorities = AI_CONSTANTS.DEFENSIVE_CARD_PRIORITIES.highValueTargets;
        const cardPriority = defensivePriorities[card.name];
        
        if (!cardPriority) return 0;

        let baseBenefit = 0;
        switch (cardPriority.priority) {
            case 'high': baseBenefit = 60; break;
            case 'medium': baseBenefit = 40; break;
            case 'low': baseBenefit = 20; break;
        }

        // Multiply by how close opponents are to victory
        const threatMultiplier = this.calculateThreatMultiplier();
        return baseBenefit * threatMultiplier;
    }

    calculateThreatMultiplier() {
        let maxThreat = 1;
        
        for (const opponent of Object.values(game.players)) {
            if (opponent.eliminated) continue;
            
            if (opponent.victoryPoints >= 18) maxThreat = Math.max(maxThreat, 2.5);
            else if (opponent.victoryPoints >= 15) maxThreat = Math.max(maxThreat, 2.0);
            else if (opponent.victoryPoints >= 12) maxThreat = Math.max(maxThreat, 1.5);
        }
        
        return maxThreat;
    }

    getDefensivePurchaseCost(card, player) {
        // What's the opportunity cost of buying this card defensively?
        let cost = card.cost;
        
        // If we don't really want this card for ourselves, increase the cost
        const personalValue = this.evaluateCardForPlayer(card, player).value;
        if (personalValue < 30) {
            cost += 20; // Penalty for buying cards we don't need
        }
        
        // If our energy is limited, increase the cost
        if (player.energy < 8) {
            cost += 10;
        }
        
        return cost;
    }

    // Helper methods for card classification
    isVictoryAcceleratorCard(card) {
        const victoryCards = ['Extra Head', 'Friend of Children', 'Opportunist', 'Evacuation Orders'];
        return victoryCards.includes(card.name);
    }

    isEnergyCard(card) {
        const energyCards = ['Energize', 'Nuclear Power Plant', 'Dedicated News Team', 'Solar Powered'];
        return energyCards.includes(card.name);
    }

    isAttackCard(card) {
        const attackCards = ['Acid Attack', 'Fire Breathing', 'Giant Brain', 'Complete Destruction'];
        return attackCards.includes(card.name);
    }

    playerHasEnergyEngine(player) {
        const energyCards = player.powerCards.filter(card => this.isEnergyCard(card));
        return energyCards.length >= 2 || player.energy >= 8;
    }

    isPlayerAggressive(player) {
        const attackCards = player.powerCards.filter(card => this.isAttackCard(card));
        return attackCards.length >= 1 || (player.inTokyo && player.health >= 6);
    }

    calculateSynergyValueForPlayer(card, player) {
        let synergyValue = 0;
        
        // Check for specific card synergies in player's current cards
        const playerCardNames = player.powerCards.map(c => c.name);
        const synergies = AI_CONSTANTS.POWER_CARD_TIMING.synergies;
        
        for (const [synergyType, cards] of Object.entries(synergies)) {
            if (cards.includes(card.name)) {
                const existingSynergies = cards.filter(c => playerCardNames.includes(c));
                synergyValue += existingSynergies.length * 15;
            }
        }
        
        return synergyValue;
    }

    // Evaluate a card's value for a specific player (used by both personal and defensive analysis)
    evaluateCardForPlayer(card, player) {
        const cardAnalysis = this.calculateCardValueForPlayer(card, player);
        
        return {
            value: cardAnalysis.value,
            reason: cardAnalysis.reason
        };
    }

    // ===== POWER CARD PORTFOLIO OPTIMIZATION =====
    optimizePowerCardPortfolio(availableCards, player) {
        const energy = player.energy;
        const personalityProfile = player.monster.personality;
        
        // Generate possible purchase combinations
        const purchaseCombinations = this.generatePurchaseCombinations(availableCards, energy);
        
        // Evaluate each combination
        const evaluatedCombinations = purchaseCombinations.map(combo => {
            return {
                cards: combo,
                totalCost: combo.reduce((sum, card) => sum + card.cost, 0),
                totalValue: this.evaluateCardCombination(combo, player),
                strategy: this.determinePortfolioStrategy(combo),
                efficiency: this.calculateCostEfficiency(combo, player)
            };
        });

        // Sort by total value adjusted for personality and efficiency
        evaluatedCombinations.sort((a, b) => {
            const aScore = this.calculatePortfolioScore(a, personalityProfile);
            const bScore = this.calculatePortfolioScore(b, personalityProfile);
            return bScore - aScore;
        });

        return evaluatedCombinations[0] || { cards: [], totalValue: 0, strategy: 'none' };
    }

    generatePurchaseCombinations(availableCards, maxEnergy) {
        const combinations = [];
        const affordableCards = availableCards.filter(card => card.cost <= maxEnergy);
        
        // Single card combinations
        affordableCards.forEach(card => {
            combinations.push([card]);
        });
        
        // Two card combinations
        for (let i = 0; i < affordableCards.length; i++) {
            for (let j = i + 1; j < affordableCards.length; j++) {
                const combo = [affordableCards[i], affordableCards[j]];
                const totalCost = combo.reduce((sum, card) => sum + card.cost, 0);
                if (totalCost <= maxEnergy) {
                    combinations.push(combo);
                }
            }
        }
        
        // Three card combinations (for high energy scenarios)
        if (maxEnergy >= 8) {
            for (let i = 0; i < affordableCards.length; i++) {
                for (let j = i + 1; j < affordableCards.length; j++) {
                    for (let k = j + 1; k < affordableCards.length; k++) {
                        const combo = [affordableCards[i], affordableCards[j], affordableCards[k]];
                        const totalCost = combo.reduce((sum, card) => sum + card.cost, 0);
                        if (totalCost <= maxEnergy) {
                            combinations.push(combo);
                        }
                    }
                }
            }
        }
        
        return combinations;
    }

    evaluateCardCombination(cardCombo, player) {
        let totalValue = 0;
        let synergyBonus = 0;
        
        // Base value of individual cards
        cardCombo.forEach(card => {
            const cardEval = this.evaluateCardForPlayer(card, player);
            totalValue += cardEval.value;
        });
        
        // Calculate synergy bonuses
        synergyBonus = this.calculateCombinationSynergy(cardCombo, player);
        
        // Apply dice probability modifications
        const diceBonus = this.calculateDiceProbabilityBonus(cardCombo, player);
        
        return totalValue + synergyBonus + diceBonus;
    }

    calculateCombinationSynergy(cardCombo, player) {
        let synergyValue = 0;
        const cardNames = cardCombo.map(c => c.name);
        const existingCards = player.powerCards.map(c => c.name);
        const allCards = [...cardNames, ...existingCards];
        
        // Energy engine synergies
        const energyCards = allCards.filter(name => 
            AI_CONSTANTS.POWER_CARD_TIMING.synergies.energyEngine.includes(name)
        );
        if (energyCards.length >= 2) {
            synergyValue += (energyCards.length - 1) * 25;
        }
        
        // Attack combo synergies
        const attackCards = allCards.filter(name => 
            AI_CONSTANTS.POWER_CARD_TIMING.synergies.attackCombo.includes(name)
        );
        if (attackCards.length >= 2) {
            synergyValue += (attackCards.length - 1) * 20;
        }
        
        // Victory rush synergies
        const victoryCards = allCards.filter(name => 
            AI_CONSTANTS.POWER_CARD_TIMING.synergies.victoryRush.includes(name)
        );
        if (victoryCards.length >= 2) {
            synergyValue += (victoryCards.length - 1) * 30;
        }
        
        return synergyValue;
    }

    calculateDiceProbabilityBonus(cardCombo, player) {
        let probabilityBonus = 0;
        let extraDice = 0;
        
        cardCombo.forEach(card => {
            const diceModifier = AI_CONSTANTS.POWER_CARD_ECONOMICS.diceModifiers[card.name];
            if (diceModifier) {
                extraDice += diceModifier.extraDice || 0;
                probabilityBonus += (diceModifier.rollProbabilityBonus || 0) * 100;
            }
        });
        
        // Extra dice are extremely valuable - each die increases success probability significantly
        if (extraDice > 0) {
            probabilityBonus += extraDice * 50; // Each extra die is worth ~50 value points
        }
        
        return probabilityBonus;
    }

    determinePortfolioStrategy(cardCombo) {
        if (cardCombo.length === 0) return 'none';
        if (cardCombo.length === 1) {
            return cardCombo[0].cost >= 6 ? 'depth' : 'single';
        }
        
        const avgCost = cardCombo.reduce((sum, card) => sum + card.cost, 0) / cardCombo.length;
        if (avgCost <= 3) return 'breadth';
        if (avgCost >= 5) return 'depth';
        return 'balanced';
    }

    calculateCostEfficiency(cardCombo, player) {
        if (cardCombo.length === 0) return 0;
        
        const totalCost = cardCombo.reduce((sum, card) => sum + card.cost, 0);
        const totalValue = this.evaluateCardCombination(cardCombo, player);
        
        return totalValue / totalCost;
    }

    calculatePortfolioScore(portfolioEvaluation, personalityProfile) {
        let score = portfolioEvaluation.totalValue;
        
        // Apply personality-based strategy preferences
        const strategy = portfolioEvaluation.strategy;
        
        if (personalityProfile.aggression >= 4) {
            // Aggressive players prefer depth (powerful single cards)
            if (strategy === 'depth') score *= 1.3;
            if (strategy === 'breadth') score *= 0.8;
        }
        
        if (personalityProfile.strategy >= 4) {
            // Strategic players prefer balanced portfolios
            if (strategy === 'balanced') score *= 1.4;
            if (strategy === 'breadth') score *= 1.2;
        }
        
        if (personalityProfile.risk >= 4) {
            // Risk-takers prefer expensive, high-impact cards
            if (strategy === 'depth') score *= 1.2;
        } else {
            // Risk-averse prefer multiple cheaper cards for safety
            if (strategy === 'breadth') score *= 1.3;
        }
        
        // Efficiency bonus
        score *= (1 + portfolioEvaluation.efficiency * 0.1);
        
        return score;
    }

    // ===== ENHANCED DICE PROBABILITY CALCULATIONS =====
    calculateDiceProbabilities(player, diceResults, rollsRemaining) {
        const baseDiceCount = 6;
        const extraDice = this.getPlayerExtraDice(player);
        const totalDice = baseDiceCount + extraDice;
        
        const currentResults = this.analyzeDiceResults(diceResults);
        const probabilities = {
            baseChances: this.getBaseProbabilities(totalDice),
            extraDiceBonus: extraDice * 0.15, // Each extra die adds ~15% success rate
            currentState: currentResults,
            projectedOutcomes: this.projectRemainingRolls(currentResults, rollsRemaining, totalDice)
        };
        
        return probabilities;
    }

    getPlayerExtraDice(player) {
        let extraDice = 0;
        
        // Check power cards that grant extra dice
        if (player.powerCards) {
            player.powerCards.forEach(card => {
                const diceModifier = AI_CONSTANTS.POWER_CARD_ECONOMICS.diceModifiers[card.name];
                if (diceModifier && diceModifier.extraDice) {
                    extraDice += diceModifier.extraDice;
                }
            });
        }
        
        return extraDice;
    }

    // Calculate base probability distributions for dice outcomes
    getBaseProbabilities(totalDice) {
        // Base probability of each face on a standard die (1/6)
        const singleDieProbability = 1/6;
        
        // Calculate probabilities for getting specific results with multiple dice
        const probabilities = {
            // Probability of getting at least one of each face type
            hearts: 1 - Math.pow(5/6, totalDice),
            energy: 1 - Math.pow(5/6, totalDice),
            attack: 1 - Math.pow(5/6, totalDice),
            ones: 1 - Math.pow(5/6, totalDice),
            twos: 1 - Math.pow(5/6, totalDice),
            threes: 1 - Math.pow(5/6, totalDice),
            
            // Expected number of each face type
            expectedHearts: totalDice * singleDieProbability,
            expectedEnergy: totalDice * singleDieProbability,
            expectedAttack: totalDice * singleDieProbability,
            expectedOnes: totalDice * singleDieProbability,
            expectedTwos: totalDice * singleDieProbability,
            expectedThrees: totalDice * singleDieProbability,
            
            // Probability of getting scoring combinations
            tripleOnes: this.calculateTripleProbability(totalDice),
            tripleTwos: this.calculateTripleProbability(totalDice),
            tripleThrees: this.calculateTripleProbability(totalDice),
            
            // Total dice being rolled
            totalDice: totalDice
        };
        
        return probabilities;
    }

    // Calculate probability of getting at least 3 of the same number
    calculateTripleProbability(totalDice) {
        if (totalDice < 3) return 0;
        
        // Using binomial probability: P(X >= 3) where X ~ Binomial(n, 1/6)
        // This is an approximation - exact calculation would be more complex
        const singleFaceProbability = 1/6;
        let probability = 0;
        
        // Sum probabilities for exactly 3, 4, 5, 6 dice showing the same face
        for (let k = 3; k <= totalDice; k++) {
            const binomialCoeff = this.binomialCoefficient(totalDice, k);
            const prob = binomialCoeff * 
                        Math.pow(singleFaceProbability, k) * 
                        Math.pow(1 - singleFaceProbability, totalDice - k);
            probability += prob;
        }
        
        return probability;
    }

    // Calculate binomial coefficient (n choose k)
    binomialCoefficient(n, k) {
        if (k > n) return 0;
        if (k === 0 || k === n) return 1;
        
        let result = 1;
        for (let i = 1; i <= k; i++) {
            result = result * (n - i + 1) / i;
        }
        return result;
    }

    /**
     * Phase 4 Helper: Approximate Expected Value (EV) of pursuing/improving a number set.
     * We treat existing count of a face (1/2/3) and remaining rolls as an opportunity to gain VP.
     * Simplified model assumptions:
     *  - Chance to acquire an additional specific number on a single die in one roll = 1/6.
     *  - Treat remaining rolls as independent opportunities across all non-kept dice.
     *  - Diminishing marginal probability handled by geometric approximation (1 - (5/6)^dice*rollsRemaining).
     *  - Reward structure: forming initial triple yields base VP (face value 1/2/3), each die beyond triple +1 VP.
     * Returns object with { expectedGain, tripleCompletionProb, fourKindProb }.
     */
    computeSetEV(faceCount, faceValue, freeDice, rollsRemaining) {
        if (rollsRemaining <= 0 || freeDice <= 0) {
            return { expectedGain: 0, tripleCompletionProb: 0, fourKindProb: 0 };
        }
        // Probability to hit at least one of target face over remaining rolls across free dice
        const pHitOne = 1 - Math.pow(5/6, freeDice * rollsRemaining);
        let tripleCompletionProb = 0;
        let fourKindProb = 0;
        let expectedGain = 0;
        if (faceCount < 3) {
            const neededForTriple = 3 - faceCount; // 1 or 2
            // Rough probability of completing triple: scaled by pHitOne and needing multiple hits if count==1
            tripleCompletionProb = neededForTriple === 1 ? pHitOne : Math.pow(pHitOne * 0.7, 2); // dampen double requirement
            expectedGain += tripleCompletionProb * faceValue; // base VP when triple achieved
        } else {
            tripleCompletionProb = 1; // already formed
        }
        // Probability of extending to 4-of-a-kind (only if triple already or expected to form)
        if (faceCount >= 3) {
            const pExtra = 1 - Math.pow(5/6, freeDice * rollsRemaining * 0.6); // dampening factor: not all dice devoted
            fourKindProb = pExtra * 0.85; // adjust
            expectedGain += fourKindProb * 1; // +1 VP for the 4th die
        } else if (tripleCompletionProb > 0) {
            // Expected incremental after forming triple within horizon
            const pExtraConditional = 1 - Math.pow(5/6, (freeDice-1) * Math.max(rollsRemaining-1,0) * 0.5);
            fourKindProb = tripleCompletionProb * pExtraConditional * 0.5; // formation then extension
            expectedGain += fourKindProb * 1;
        }
        return { expectedGain, tripleCompletionProb, fourKindProb };
    }

    /**
     * Phase 4 Helper: Marginal EV of pushing a formed triple toward a 4-of-a-kind specifically.
     * Focused model used when deciding whether to reroll a stray die vs banking.
     */
    computeFourKindIncrementalEV(freeDice, rollsRemaining) {
        if (rollsRemaining <= 0 || freeDice <= 0) return 0;
        // Probability of at least one success over remaining opportunities devoted to target face.
        const pSuccess = 1 - Math.pow(5/6, freeDice * rollsRemaining * 0.7); // 0.7 focus factor
        // Value of success assumed +1 VP
        return pSuccess * 1;
    }

    analyzeDiceResults(diceResults) {
        const analysis = {
            hearts: 0,
            energy: 0,
            attacks: 0,
            ones: 0,
            twos: 0,
            threes: 0,
            total: diceResults.length
        };
        
        diceResults.forEach(face => {
            switch (face) {
                case 'heart': analysis.hearts++; break;
                case 'energy': analysis.energy++; break;
                case 'attack': analysis.attacks++; break;
                case 'one': analysis.ones++; break;
                case 'two': analysis.twos++; break;
                case 'three': analysis.threes++; break;
            }
        });
        
        // Calculate victory points from numbers
        analysis.victoryPoints = this.calculateVictoryPointsFromNumbers(analysis);
        
        return analysis;
    }

    calculateVictoryPointsFromNumbers(analysis) {
        let vp = 0;
        
        // 3 of a kind bonuses
        if (analysis.ones >= 3) vp += 1 + (analysis.ones - 3);
        if (analysis.twos >= 3) vp += 2 + (analysis.twos - 3);
        if (analysis.threes >= 3) vp += 3 + (analysis.threes - 3);
        
        return vp;
    }

    projectRemainingRolls(currentResults, rollsRemaining, totalDice) {
        if (rollsRemaining <= 0) return currentResults;
        
        const projections = {
            expectedHearts: currentResults.hearts + (rollsRemaining * totalDice * (1/6)),
            expectedEnergy: currentResults.energy + (rollsRemaining * totalDice * (1/6)),
            expectedAttacks: currentResults.attacks + (rollsRemaining * totalDice * (1/6)),
            expectedVP: this.projectVictoryPoints(currentResults, rollsRemaining, totalDice),
            riskAssessment: this.calculateRollRisk(currentResults, rollsRemaining)
        };
        
        return projections;
    }

    projectVictoryPoints(currentResults, rollsRemaining, totalDice) {
        // Complex VP projection considering number combinations
        let expectedVP = currentResults.victoryPoints;
        
        // Probability of completing sets with remaining rolls
        const remainingDice = rollsRemaining * totalDice;
        const numberProbability = 1/6;
        
        // Estimate additional VPs from completing number sets
        if (currentResults.ones === 2) {
            expectedVP += numberProbability * remainingDice * 1; // Chance to complete ones
        }
        if (currentResults.twos === 2) {
            expectedVP += numberProbability * remainingDice * 2; // Chance to complete twos
        }
        if (currentResults.threes === 2) {
            expectedVP += numberProbability * remainingDice * 3; // Chance to complete threes
        }
        
        return expectedVP;
    }

    calculateRollRisk(currentResults, rollsRemaining) {
        // Risk assessment for continuing to roll vs keeping current results
        let risk = 'low';
        
        const hasGoodResults = currentResults.hearts >= 2 || 
                              currentResults.energy >= 2 || 
                              currentResults.victoryPoints >= 2;
        
        const hasExcellentResults = currentResults.hearts >= 3 || 
                                   currentResults.victoryPoints >= 4;
        
        if (hasExcellentResults) {
            risk = rollsRemaining >= 2 ? 'medium' : 'low';
        } else if (hasGoodResults) {
            risk = rollsRemaining >= 2 ? 'high' : 'medium';
        } else {
            risk = 'low'; // Nothing to lose
        }
        
        return risk;
    }

    // Enhanced dice evaluation with probability calculations
    evaluateDiceEnhanced(currentDice, player, situation, probabilities, rollsRemaining = 0) {
        const diceToKeep = [];
        const personality = player.monster.personality;

        // Phase 4: Pre-compute EV for each number face (1/2/3) to inform weighting.
        // Count occurrences first.
        const numberFaces = ['one','two','three'];
        const faceCounts = { one:0, two:0, three:0 };
        currentDice.forEach(f=>{ if(faceCounts.hasOwnProperty(f)) faceCounts[f]++; });
        // Free dice concept: dice not currently locked to a decided keep set; for approximation use total dice minus those already part of solid sets (triples+) or that we plan to always keep (hearts when low HP).
        const totalDice = currentDice.length;
        const lowHP = player.health <= 3;
        const lockedDiceApprox = currentDice.filter(f=>{
            if(numberFaces.includes(f) && faceCounts[f] >= 3) return true; // formed triple
            if(f==='heart' && lowHP) return true; // emergency healing
            return false;
        }).length;
        const freeDiceApprox = Math.max(totalDice - lockedDiceApprox, 0);
        const setEVMap = { one:0, two:0, three:0 };
        const setEVDetail = {};
        numberFaces.forEach(face => {
            const value = face === 'one' ? 1 : (face === 'two' ? 2 : 3);
            const res = this.computeSetEV(faceCounts[face], value, freeDiceApprox, rollsRemaining);
            setEVMap[face] = res.expectedGain;
            setEVDetail[face] = res;
        });
        // If exactly one triple present consider incremental EV for pushing to 4-of-a-kind (used later in overrides)
        const tripleFaces = numberFaces.filter(f=>faceCounts[f]===3);
        let fourKindIncrementalEV = 0;
        if (tripleFaces.length === 1) {
            // free dice are those not part of the triple; approximate again
            const freeForFour = totalDice - 3; // ignoring other locks for simplicity
            fourKindIncrementalEV = this.computeFourKindIncrementalEV(freeForFour, rollsRemaining);
            if (typeof window !== 'undefined') {
                window.AIOverrideStats.fourKindEVEvaluations = (window.AIOverrideStats.fourKindEVEvaluations||0)+1;
            }
            if (window?.AIDebugConfig?.showFourKindEV) {
                console.log('🧪 FourKind Incremental EV:', { face: tripleFaces[0], freeForFour, fourKindIncrementalEV });
            }
        }
        if (typeof window !== 'undefined') {
            window.AIOverrideStats = window.AIOverrideStats || { tripleKeep:0, noSetContinue:0, tripleExtend:0, twoPairs:0, release:0, decisions:0, attackCluster:0, singlePair:0, personalityAdjust:0, threatBias:0 };
            window.AIOverrideStats.setEVEvaluations = (window.AIOverrideStats.setEVEvaluations||0)+1;
        }
        if (window?.AIDebugConfig?.showSetEV) {
            console.log('📈 Set EV Detail (Phase4):', { counts: faceCounts, freeDiceApprox, setEVDetail });
        }

        // Phase 5: compute threat context once per evaluation (lightweight)
        let threatContext = null;
        try {
            // Expect situation.allPlayers or derive from player.game?.players
            const allPlayers = situation?.allPlayers || (player?.game?.players) || [];
            threatContext = computeThreatContext(player, allPlayers);
            if (threatContext && typeof window !== 'undefined' && window.AIDebugConfig?.threatDebug) {
                console.log('🛡️ ThreatContext:', threatContext);
                window.AIOverrideStats = window.AIOverrideStats || { tripleKeep:0, noSetContinue:0, tripleExtend:0, twoPairs:0, release:0, decisions:0, attackCluster:0, singlePair:0, personalityAdjust:0, threatBias:0 };
                window.AIOverrideStats.threatBias = (window.AIOverrideStats.threatBias||0)+1;
            }
        } catch(e) { /* silent */ }
        
        console.log('🎲 DEBUG: Evaluating dice:', currentDice, 'Current state:', probabilities.currentState, threatContext?{threat:threatContext.threatScore}:'' );
        
        // Pre-analyze potential number combinations to boost their value
        const numberComboPotential = this.analyzeNumberCombinations(currentDice);
        console.log('🎯 DEBUG: Number combination potential:', numberComboPotential);
        
        // Determine global strategic pressures that could justify sacrificing a triple
        const cs = probabilities.currentState || {};
        const needHealing = player.health <= 3; // critical health
        const lethalThreat = situation.threats?.hasCriticalThreat; // someone may win next turn
        const needEnergy = situation.gamePhase !== 'late' && player.energy <= 1 && rollsRemaining > 0; // early ramp potential
        const inTokyoNeedingAttacks = (!player.isInTokyo && situation.threats?.threats?.some(t => t.player.isInTokyo)) || (player.isInTokyo && situation.threats?.threats?.length > 0);
        const allowTripleSacrifice = (needHealing || lethalThreat || needEnergy || inTokyoNeedingAttacks) && rollsRemaining > 0;

        currentDice.forEach((face, index) => {
            let keepProbability = this.getDiceKeepProbability(face, situation, personality, probabilities.currentState);

            // Phase 4: adjust keep probability by expected value pursuit incentives for number dice.
            if (face === 'one' || face === 'two' || face === 'three') {
                const evBoost = setEVMap[face];
                if (evBoost > 0) {
                    // Scale: modest boost; cap influence to avoid overpowering base heuristics.
                    const boostFactor = 1 + Math.min(evBoost * 0.35, 0.4);
                    keepProbability *= boostFactor;
                }
            }

            // Phase 5 dynamic weighting BEFORE structural bonuses
            if (threatContext) {
                // Attack emphasis affects attack faces
                if (face === 'attack') keepProbability *= threatContext.attackEmphasis;
                // Healing emphasis
                if (face === 'heart') keepProbability *= threatContext.healEmphasis;
                // VP emphasis for number dice
                if (face === 'one' || face === 'two' || face === 'three') keepProbability *= threatContext.vpEmphasis;
            }

            // Auto-keep rule: any completed number set (triple or more) is always kept
            if ((face === 'one' || face === 'two' || face === 'three') && numberComboPotential[face] && numberComboPotential[face].count >= 3) {
                // Evaluate if we should consider sacrificing ONE die of the triple
                if (allowTripleSacrifice) {
                    // Heuristic: only consider giving up exactly one die from the triple if face === 'one' (lowest VP) OR health/energy pressure high
                    const tripleCount = numberComboPotential[face].count;
                    const lowValueTriple = face === 'one';
                    const pressureScore = (needHealing ? 40 : 0) + (lethalThreat ? 50 : 0) + (needEnergy ? 25 : 0) + (inTokyoNeedingAttacks ? 20 : 0);
                    const sacrificeThreshold = lowValueTriple ? 30 : 60; // require higher pressure to break higher-value triples
                    if (pressureScore >= sacrificeThreshold) {
                        console.log(`⚖️ STRATEGIC SACRIFICE CONSIDERED: Triple ${face} (count=${tripleCount}) pressureScore=${pressureScore} >= threshold=${sacrificeThreshold}. Allowing re-roll of one die.`);
                        // Don't auto-keep; fall through to normal logic so some dice may be rerolled.
                    } else {
                        diceToKeep.push({
                            face,
                            index,
                            probability: 1,
                            strategicValue: this.calculateDiceStrategicValue(face, situation, probabilities, numberComboPotential),
                            autoKept: true
                        });
                        console.log(`✅ AUTO-KEEP: Keeping ${face} (count=${numberComboPotential[face].count}) as completed set (pressureScore=${pressureScore} < threshold).`);
                        return;
                    }
                } else {
                    diceToKeep.push({
                        face,
                        index,
                        probability: 1,
                        strategicValue: this.calculateDiceStrategicValue(face, situation, probabilities, numberComboPotential),
                        autoKept: true
                    });
                    console.log(`✅ AUTO-KEEP: Keeping ${face} (count=${numberComboPotential[face].count}) as completed set (no sacrifice conditions).`);
                    return;
                }
            }

            // Apply combination bonuses for number dice (pairs)
            if (numberComboPotential[face] && numberComboPotential[face].count >= 2) {
                const bonusMultiplier = numberComboPotential[face].count >= 3 ? 3.0 : 2.0; // triple path now mostly caught above
                keepProbability *= bonusMultiplier;
                console.log(`🎯 COMBO BONUS: Boosting ${face} probability by ${bonusMultiplier}x to`, keepProbability, 'due to', numberComboPotential[face].count, 'available');
            }

            // Apply extra dice bonus to keep probability
            keepProbability *= (1 + probabilities.extraDiceBonus);

            // Enhanced decision logic based on current state
            const shouldKeep = this.shouldKeepDiceEnhanced(face, keepProbability, probabilities.currentState);

            console.log(`🎲 DEBUG: Dice ${index} (${face}) - keepProb: ${keepProbability.toFixed(2)}, shouldKeep: ${shouldKeep}`);

            if (shouldKeep) {
                diceToKeep.push({
                    face,
                    index,
                    probability: keepProbability,
                    strategicValue: this.calculateDiceStrategicValue(face, situation, probabilities, numberComboPotential)
                });
            } else if ((face === 'one' || face === 'two' || face === 'three') && numberComboPotential[face] && numberComboPotential[face].count >= 3) {
                // Safety: warn if logic ever decides not to keep a triple (should not happen due to auto-keep branch)
                console.warn(`⚠️ WARNING: Triple ${face} (count=${numberComboPotential[face].count}) was NOT kept by evaluation logic.`);
            }
        });
        
        console.log('🎲 DEBUG: Final dice to keep:', diceToKeep.map(d => `${d.index}:${d.face}`));
        if (threatContext && typeof window !== 'undefined' && window.AIDebugConfig?.threatDebug) {
            console.log('🛡️ Applied Threat Multipliers:', {
                attack: threatContext.attackEmphasis,
                heal: threatContext.healEmphasis,
                vp: threatContext.vpEmphasis
            });
        }
        return diceToKeep;
    }

    // Analyze potential number combinations in current dice
    analyzeNumberCombinations(currentDice) {
        const counts = { one: 0, two: 0, three: 0 };
        
        // Count each number type
        currentDice.forEach(face => {
            if (face === 'one' || face === 'two' || face === 'three') {
                counts[face]++;
            }
        });
        
        // Return potential for each number type
        const potential = {};
        Object.keys(counts).forEach(numberType => {
            if (counts[numberType] > 0) {
                potential[numberType] = {
                    count: counts[numberType],
                    isPair: counts[numberType] >= 2,
                    isTriple: counts[numberType] >= 3,
                    potential: counts[numberType] >= 2 ? 'high' : 'low'
                };
            }
        });
        
        return potential;
    }

    calculateDiceStrategicValue(face, situation, probabilities, numberComboPotential = {}) {
        let value = 0;
        const phase = situation.gamePhase || 'mid';
        const vpDeficit = (situation.player && typeof situation.player.victoryPoints === 'number') ? Math.max(0, (situation.opponents||[]).reduce((m,o)=>Math.max(m,o.victoryPoints||0),0) - situation.player.victoryPoints) : 0;
        const behindOnVP = vpDeficit >= 3; // threshold for being meaningfully behind
        
        // Base strategic value
        switch (face) {
            case 'heart':
                value = situation.player.health <= 5 ? 30 : 10;
                break;
            case 'energy':
                value = situation.player.energy <= 3 ? 25 : 15;
                // If mid/late and behind on VP, de-prioritize excess energy (prefer pushing number sets for VP catch-up)
                if (behindOnVP && phase !== 'early') {
                    value -= 5;
                }
                break;
            case 'attack':
                value = situation.player.isInTokyo ? 20 : 15;
                // If behind on VP and not leveraging attack for Tokyo pressure (not in Tokyo & no occupant), slightly reduce
                const anyInTokyo = (situation.opponents||[]).some(o=>o.isInTokyo);
                if (behindOnVP && !situation.player.isInTokyo && !anyInTokyo && phase !== 'early') {
                    value -= 4;
                }
                break;
            case 'one':
                // Use combination potential if available, otherwise fall back to current state
                if (numberComboPotential[face]) {
                    const count = numberComboPotential[face].count;
                    value = count >= 3 ? 80 : (count >= 2 ? 50 : 8);
                } else {
                    value = probabilities.currentState.ones >= 2 ? 35 : 
                           (probabilities.currentState.ones === 1 ? 5 : 2);
                }
                break;
            case 'two':
                // Use combination potential if available, otherwise fall back to current state  
                if (numberComboPotential[face]) {
                    const count = numberComboPotential[face].count;
                    value = count >= 3 ? 90 : (count >= 2 ? 60 : 12);
                } else {
                    value = probabilities.currentState.twos >= 2 ? 40 : 
                           (probabilities.currentState.twos === 1 ? 8 : 3);
                }
                break;
            case 'three':
                // Use combination potential if available, otherwise fall back to current state
                if (numberComboPotential[face]) {
                    const count = numberComboPotential[face].count;
                    value = count >= 3 ? 100 : (count >= 2 ? 70 : 15);
                } else {
                    value = probabilities.currentState.threes >= 2 ? 45 : 
                           (probabilities.currentState.threes === 1 ? 12 : 5);
                }
                break;
        }
        
        return value;
    }

    // Calculate the probability of keeping a specific dice face
    getDiceKeepProbability(face, situation, personality, currentState) {
        let baseProbability = 0.5; // Default 50% chance to keep
        
        // Base probabilities for each face type
        switch(face) {
            case 'attack':
                // Base attack probability
                baseProbability = 0.6;
                
                // Complex Tokyo strategy evaluation
                const tokyoStrategy = this.evaluateTokyoStrategy(situation.player, situation.opponents || [], personality);
                
                if (tokyoStrategy.avoidTokyo) {
                    // Actively avoid attacking if strategy says to avoid Tokyo
                    baseProbability = 0.2;
                    console.log(`🏛️ TOKYO AVOIDANCE: Reducing attack probability to ${baseProbability} - ${tokyoStrategy.reason}`);
                } else if (tokyoStrategy.targetTokyo) {
                    // Actively seek to attack Tokyo player
                    baseProbability = 0.9;
                    console.log(`🏛️ TOKYO TARGETING: Increasing attack probability to ${baseProbability} - ${tokyoStrategy.reason}`);
                } else {
                    // Standard threat-based evaluation
                    if (situation.threats && situation.threats.threats.length > 0) {
                        baseProbability = 0.8;
                    }
                    // Lower for defensive personalities unless critical threat
                    if (personality === 'defensive' && !(situation.threats && situation.threats.hasCriticalThreat)) {
                        baseProbability *= 0.7;
                    }
                }
                break;
                
            case 'energy':
                baseProbability = 0.7; // Energy is generally valuable
                // Higher for economic personalities
                if (personality === 'economic') {
                    baseProbability = 0.85;
                }
                break;
                
            case 'heal':
                baseProbability = 0.4; // Lower base value
                // Much higher if injured
                if (situation.player && situation.player.health < situation.player.maxHealth) {
                    const healthRatio = situation.player.health / situation.player.maxHealth;
                    baseProbability = Math.min(0.9, 0.3 + (1 - healthRatio) * 0.6);
                }
                // Higher for defensive personalities
                if (personality === 'defensive') {
                    baseProbability *= 1.2;
                }
                break;
                
            case '1':
            case 'one':
                baseProbability = 0.5;
                // Higher probability if already have some 1s for combinations
                if (currentState) {
                    const oneCount = currentState.ones || 0;
                    if (oneCount >= 2) baseProbability = 0.9; // Keep for triple
                    else if (oneCount === 1) baseProbability = 0.6; // Keep for potential pair
                }
                break;
                
            case '2':
            case 'two':
                baseProbability = 0.6;
                if (currentState) {
                    const twoCount = currentState.twos || 0;
                    if (twoCount >= 2) baseProbability = 0.9;
                    else if (twoCount === 1) baseProbability = 0.7;
                }
                break;
                
            case '3':
            case 'three':
                baseProbability = 0.7;
                if (currentState) {
                    const threeCount = currentState.threes || 0;
                    if (threeCount >= 2) baseProbability = 0.9;
                    else if (threeCount === 1) baseProbability = 0.8;
                }
                break;
                
            default:
                baseProbability = 0.5;
        }
        
        // Personality adjustments
        if (personality === 'aggressive') {
            if (face === 'attack') baseProbability *= 1.3;
            if (face === 'heal') baseProbability *= 0.8;
        } else if (personality === 'defensive') {
            if (face === 'heal') baseProbability *= 1.2;
            if (face === 'attack') baseProbability *= 0.9;
        } else if (personality === 'economic') {
            if (face === 'energy') baseProbability *= 1.2;
        }
        
        // Ensure probability stays within bounds
        return Math.max(0.1, Math.min(0.95, baseProbability));
    }

    shouldKeepDiceEnhanced(face, keepProbability, currentState) {
        // Setup dynamic thresholds (Phase 2 personality influence)
        const baseThresholds = {
            singleNumberHigh: 0.85,
            singleNumberLow: 0.7,
            nonNumberHigh: 0.8,
            nonNumberBase: 0.5,
            nonNumberLow: 0.2
        };
        // Attempt to access player via closure (this.currentPlayer maybe) else fallback
        const player = this.currentPlayer || this.player || null;
        const thresholds = getPersonalityAdjustedThresholds(baseThresholds, face, currentState, player);

        // Special logic for number combinations - keep if we already have multiples
        if (face === 'one' && currentState.ones >= 2) return true;
        if (face === 'two' && currentState.twos >= 2) return true;
        if (face === 'three' && currentState.threes >= 2) return true;
        
        // For single number dice, apply much stricter logic
        if (face === 'one' || face === 'two' || face === 'three') {
            const hasBetterCombination = (currentState.ones >= 2 && face !== 'one') ||
                                       (currentState.twos >= 2 && face !== 'two') ||
                                       (currentState.threes >= 2 && face !== 'three');
            if (hasBetterCombination) {
                console.log(`❌ Not keeping single ${face} (better combos)`, { ones: currentState.ones, twos: currentState.twos, threes: currentState.threes });
                return false;
            }
            const goodNonNumberDice = (currentState.attacks || 0) + (currentState.energy || 0) + (currentState.heal || 0);
            if (goodNonNumberDice >= 2) {
                console.log(`❌ Not keeping single ${face} due to ${goodNonNumberDice} good non-number dice`);
                return false;
            }
            const threshold = goodNonNumberDice >= 1 ? thresholds.singleNumberHigh : thresholds.singleNumberLow;
            const shouldKeep = keepProbability >= threshold;
            console.log(`🎲 Single ${face} decision (dyn): p=${keepProbability.toFixed(2)}, thr=${threshold.toFixed(2)}, goodNN=${goodNonNumberDice}, keep=${shouldKeep}`);
            return shouldKeep;
        }
        
        // Non-number dice logic with dynamic thresholds
        if (keepProbability >= thresholds.nonNumberHigh) return true;
        if (keepProbability <= thresholds.nonNumberLow) return false;
        if (face === 'attack' || face === 'heart' || face === 'energy') {
            return keepProbability >= thresholds.nonNumberBase;
        }
        return keepProbability >= (thresholds.nonNumberBase + 0.1); // default slightly higher
    }

    /**
     * Make final decision on what dice to keep
     */
    async makeKeepDecisionEnhanced(diceEvaluations, rollsRemaining, player, situation, probabilities) {
        // Personality-differentiated dynamic threshold preprocessing (Phase 2)
        const personality = player.monster && player.monster.personality ? player.monster.personality : { aggression:3, risk:3, strategy:3 };
        const aiCfg = (typeof window !== 'undefined' ? (window.AIConfig||{}) : {});
        const usePersonality = aiCfg.enablePersonalityThresholds !== false; // default on
        let personalityContext = null;
        if (usePersonality) {
            personalityContext = this._computePersonalityThresholdContext(personality, player, situation);
            // Attach for later inspection
            probabilities.personalityThresholds = personalityContext.thresholds;
            try {
                window.AIOverrideStats = window.AIOverrideStats || { tripleKeep:0, noSetContinue:0, tripleExtend:0, twoPairs:0, release:0, attackCluster:0, singlePair:0, decisions:0, personalityAdjust:0, threatBias:0 };
                window.AIOverrideStats.personalityAdjust++;
            } catch(e) { /* ignore */ }
            if (aiCfg.logPersonalityAdjust) {
                console.log('🧬 Personality thresholds applied:', personalityContext);
            }
        }

        const risk = this.assessPersonalityRisk(player.monster.personality, situation);
        const projectedOutcome = probabilities.projectedOutcomes;
        
        console.log('🔍 DEBUG: Enhanced decision - diceToKeep count:', diceEvaluations.length, 'risk level:', risk);
        
        if (diceEvaluations.length === 0) {
            return {
                action: 'reroll',
                keepDice: [],
                reason: 'No dice worth keeping - rerolling all (enhanced)',
                confidence: 0.9
            };
        }

        // Phase 3: Optional async deep evaluation hook (preview / off by default)
        // This allows future heavier EV analysis without blocking main thread when enabled.
        try {
            const asyncCfg = (typeof window !== 'undefined') ? (window.AIAsyncConfig || {}) : {};
            const enableAsync = asyncCfg.enableDeepEval === true; // explicit opt-in only
            if (enableAsync && typeof this.evaluateDiceDeepAsync === 'function') {
                window.AIOverrideStats = window.AIOverrideStats || { tripleKeep:0, noSetContinue:0, tripleExtend:0, twoPairs:0, release:0, attackCluster:0, singlePair:0, decisions:0, personalityAdjust:0, threatBias:0, asyncAttempt:0, asyncUsed:0, asyncFailed:0 };
                window.AIOverrideStats.asyncAttempt++;
                const timeoutMs = Math.min( (asyncCfg.timeoutMs || 18), 100); // very small budget to avoid UI lag
                const startT = performance && performance.now ? performance.now() : Date.now();
                const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ _timeout:true }), timeoutMs));
                const deepPromise = this.evaluateDiceDeepAsync(diceEvaluations, probabilities, player, situation, { rollsRemaining, risk });
                const deepResult = await Promise.race([timeoutPromise, deepPromise]).catch(err => ({ _error: err }));
                const elapsed = (performance && performance.now ? performance.now() : Date.now()) - startT;
                if (deepResult && !deepResult._timeout && !deepResult._error) {
                    window.AIOverrideStats.asyncUsed++;
                    if (asyncCfg.logResults) {
                        console.log(`🧪 Async deep eval success in ${elapsed.toFixed(1)}ms`, deepResult);
                    }
                    // If deep evaluation suggests a different action with higher confidence, adopt it.
                    if (deepResult.decision && typeof deepResult.decision === 'object' && deepResult.decision.confidence > 0.9) {
                        deepResult.decision.reason = (deepResult.decision.reason||'') + ' (async)';
                        return deepResult.decision;
                    }
                } else {
                    window.AIOverrideStats.asyncFailed++;
                    if (asyncCfg.logTimeouts) {
                        console.warn(`⏱️ Async deep eval ${deepResult?._timeout ? 'timed out' : 'failed'} in ${elapsed.toFixed(1)}ms`, deepResult && deepResult._error ? deepResult._error : '');
                    }
                }
            }
        } catch (e) {
            try { window.AIOverrideStats.asyncFailed = (window.AIOverrideStats.asyncFailed||0)+1; } catch(_){}
        }
        
        // Calculate total strategic value
        const totalValue = diceEvaluations.reduce((sum, dice) => sum + dice.strategicValue, 0);
        const currentValue = projectedOutcome.expectedVP + projectedOutcome.expectedHearts + projectedOutcome.expectedEnergy + projectedOutcome.expectedAttacks;
        
        console.log('🔍 DEBUG: Strategic values - total:', totalValue, 'current:', currentValue, 'dice count:', diceEvaluations.length);
        
        // CRITICAL: Check if we have incomplete number combinations that need the third dice
        const incompleteCombos = this.checkIncompleteNumberCombinations(probabilities.currentState, rollsRemaining);
        if (incompleteCombos.shouldContinue && rollsRemaining > 0) {
            console.log('🎯 INCOMPLETE COMBO: Must continue rolling -', incompleteCombos.reason);
            return {
                action: 'reroll',
                keepDice: diceEvaluations.map(d => d.index),
                reason: incompleteCombos.reason,
                confidence: 0.9
            };
        }

        // AI_EXT: Phase 1 additions (pair sacrifice + resource filters)
        // Sacrifice logic: if we have 2 of a kind and not much else, consider rerolling one to chase triple
        const twoOfAKindFaces = ['ones','twos','threes'].filter(k => probabilities.currentState[k] === 2);
        const hasTwoOfAKind = twoOfAKindFaces.length > 0;
        const hasStrongSupport = (probabilities.currentState.attacks || 0) + (probabilities.currentState.energy || 0) >= 3;
        
        if (hasTwoOfAKind && !hasStrongSupport && rollsRemaining > 0) {
            console.log('🎯 PAIR SACRIFICE: Rerolling one die from two of a kind to chase triple');
            const keepIdx = diceEvaluations.filter(d => {
                const face = d.face;
                return !(twoOfAKindFaces.includes(face) && probabilities.currentState[face] === 2);
            }).map(d => d.index);
            return {
                action: 'reroll',
                keepDice: keepIdx,
                reason: 'Sacrificing one die from two of a kind to chase triple',
                confidence: 0.85
            };
        }

        // Resource filters: if energy is low and we have good energy dice, prioritize keeping them
        if (player.energy <= 2 && rollsRemaining > 0) {
            const energyDice = diceEvaluations.filter(d => d.face === 'energy' && d.totalValue > 5);
            if (energyDice.length > 0) {
                console.log('🔋 ENERGY FILTER: Keeping high-value energy dice');
                return {
                    action: 'reroll',
                    keepDice: energyDice.map(d => d.index),
                    reason: 'Keeping high-value energy dice due to low energy',
                    confidence: 0.8
                };
            }
        }

        // Assess potential improvement if we continue rolling
        const keptCount = diceEvaluations.length;
        const diceRemaining = 6 - keptCount;
        let improvementPotentialScore = 0;

        // Incomplete number sets (two of a kind) offer strong improvement prospects
        const cs = probabilities.currentState;
        const twoOfKinds = twoOfAKindFaces.length; // property keys maybe ones/twos/threes
        // Baseline weight for each pair
        improvementPotentialScore += twoOfKinds * 25; // base incentive

        // Bonus when two distinct pairs exist (very strong multi-out state)
        if (twoOfKinds >= 2) {
            improvementPotentialScore += 20; // encourage continuing even if many dice currently kept
        }

        // Probability-based EV boost for completing each pair to triple across remaining rolls
        // Each triple completion yields: base VP (1/2/3) + 2 bonus (net incremental vs current pair partial). We approximate incremental gain.
        const faceBaseVP = { ones:1, twos:2, threes:3 };
        const diceRemainingForEV = Math.max(0, 6 - diceEvaluations.length); // dice that would reroll
        const rollsLeft = rollsRemaining; // inclusive of current decision phase
        const pairEVDetails = [];
        if (diceRemainingForEV > 0 && rollsLeft > 0) {
            twoOfAKindFaces.forEach(faceKey => {
                const trials = diceRemainingForEV * rollsLeft;
                const probComplete = 1 - Math.pow(5/6, trials);
                const incrementalVP = faceBaseVP[faceKey] + 2; // triple gives value of base face + 2 bonus
                const evGain = probComplete * incrementalVP;
                const scaled = Math.min(30, evGain * 6);
                improvementPotentialScore += scaled;
                pairEVDetails.push({ face: faceKey, trials, probComplete: Number(probComplete.toFixed(3)), incrementalVP, evGain: Number(evGain.toFixed(2)), contribution: Number(scaled.toFixed(1)) });
            });
        }

        // Healing potential if low health and hearts not yet locked
        if (player.health <= 5 && (cs.hearts || 0) < 3) {
            improvementPotentialScore += 20;
        }

        // Attack improvement: if in Tokyo want more attacks to hit all; if outside and someone in Tokyo, attacks are valuable
        const anyTokyo = situation.gamePhase && situation.player.isInTokyo || situation.threats.threats?.some(t => t.player.isInTokyo);
        if (anyTokyo && (cs.attacks || 0) < 3) improvementPotentialScore += 15;

        // Energy ramp early game
        if (situation.gamePhase === 'early' && (cs.energy || 0) < 3) improvementPotentialScore += 10;

        // More dice remaining increases variance potential
        improvementPotentialScore += diceRemaining * 5;

        // Extra dice bonus (if any mechanic adds) further increases chance
        if (probabilities.extraDiceBonus > 0) improvementPotentialScore += Math.round(probabilities.extraDiceBonus * 50);

        // Triple expansion potential: if exactly 3-of-a-kind and space to grow, add modest incentive
        const numberSetSizes = [cs.ones||0, cs.twos||0, cs.threes||0];
        const largestSet = Math.max(...numberSetSizes);
        if (largestSet === 3 && diceRemaining > 0) {
            improvementPotentialScore += 15; // reward chasing 4th for +1 VP and future growth
        } else if (largestSet === 4 && diceRemaining > 0) {
            improvementPotentialScore += 10; // still some value to reach 5/6
        }

        // Normalize to 0-100 cap
        improvementPotentialScore = Math.min(100, improvementPotentialScore);

        // Determine if improvement potential is considered low
        const lowImprovement = improvementPotentialScore < 30; // threshold can be tuned

        // High current value thresholds scale by game phase (harder to stop early in early phase)
        const phaseMultiplier = situation.gamePhase === 'early' ? 1.3 : (situation.gamePhase === 'late' ? 0.8 : 1.0);
        const adjustedTotalStopThreshold = 150 * phaseMultiplier; // scaled dynamic threshold
        const adjustedCurrentValueThreshold = 8 * phaseMultiplier;

        const strongCurrentValue = (totalValue >= adjustedTotalStopThreshold) || (currentValue >= adjustedCurrentValueThreshold);

        // Only allow early stop (with rolls left) if current value strong AND improvement potential low AND we kept at least 4 dice
        if (rollsRemaining > 0 && strongCurrentValue && lowImprovement && keptCount >= 4) {
            // NEW GUARD: Prevent premature stop when we have a large number set that can still grow AND a useless heart
            const csNumbers = { ones: cs.ones||0, twos: cs.twos||0, threes: cs.threes||0 };
            const largestSetSize = Math.max(csNumbers.ones, csNumbers.twos, csNumbers.threes);
            const hasFourOfAKind = largestSetSize >= 4; // e.g., 4x 2s
            const hasUselessHeart = (cs.hearts||0) === 1 && player.health === player.maxHealth; // heart provides zero value
            const setTargetFace = Object.entries(csNumbers).find(([k,v]) => v === largestSetSize)?.[0];
            const canStillImproveSet = largestSetSize < 6; // still room to add more of that number
            const improvementStillMeaningful = largestSetSize === 4 || largestSetSize === 5; // adding 5th/6th gives +1 VP each

            if (hasFourOfAKind && hasUselessHeart && canStillImproveSet && improvementStillMeaningful) {
                if (window.UI && window.UI.debugMode) {
                    window.UI._debug(`🛑 OVERRIDE: Not stopping early. Holding ${largestSetSize} of a kind (${setTargetFace}) + useless heart with ${rollsRemaining} roll(s) left.`);
                }
                return {
                    action: 'reroll',
                    // Keep all dice except the heart (we'll recompute keep list filtering hearts not part of set)
                    keepDice: diceEvaluations.filter(d => {
                        const face = d.face;
                        if (face === 'heart') return false; // drop the useless heart
                        return true;
                    }).map(d => d.index),
                    reason: `Override: Chase larger set; drop useless heart (have ${largestSetSize} of a kind)` ,
                    confidence: 0.88
                };
            }
            return {
                action: 'endRoll',
                keepDice: diceEvaluations.map(d => d.index),
                reason: `Stopping early: strong value total=${totalValue} current=${currentValue} lowImprovement=${improvementPotentialScore}`,
                improvementDetail: { twoOfKinds: twoOfAKindFaces, diceRemaining: diceRemainingForEV, rollsLeft, pairEVDetails, note: 'Early stop gate passed' },
                overrideReasons: [],
                confidence: 0.82
            };
        }
        
        // Risk-adjusted continuation logic (re-evaluated after improvement potential)
        let continueThreshold = risk >= 4 ? 1 : (risk <= 2 ? 4 : 3);
        continueThreshold -= Math.floor(probabilities.extraDiceBonus * 10);
        // Ensure minimum threshold of 1 and max 5
        continueThreshold = Math.min(5, Math.max(1, continueThreshold));

        // If we have high improvement potential and rolls remain, be more willing to continue unless we already keep 5 dice
        if (!lowImprovement && rollsRemaining > 0 && keptCount < 5) {
            continueThreshold = Math.min(5, continueThreshold + 1);
        }
        
        if (diceEvaluations.length < continueThreshold && rollsRemaining > 0) {
            return {
                action: 'reroll',
                keepDice: diceEvaluations.map(d => d.index),
                reason: `Continue with ${diceEvaluations.length} dice (enhanced threshold: ${continueThreshold}, risk: ${risk})`,
                confidence: 0.7
            };
        }
        
        // Default decision: if last roll or nothing compelling to reroll
        if (rollsRemaining === 0) {
            return {
                action: 'endRoll',
                keepDice: diceEvaluations.map(d => d.index),
                reason: `Final roll complete (risk: ${risk})`,
                confidence: 0.65
            };
        }

        // If improvement potential moderate but dice kept high (>=5), accept current state
        if (keptCount >= 5 && improvementPotentialScore < 60) {
            return {
                action: 'endRoll',
                keepDice: diceEvaluations.map(d => d.index),
                reason: `Marginal improvement potential (${improvementPotentialScore}), locking in`,
                improvementDetail: { twoOfKinds: twoOfAKindFaces, diceRemaining: diceRemainingForEV, rollsLeft, pairEVDetails, note: 'KeptCount>=5 gate', personality: personalityContext },
                overrideReasons: [],
                confidence: 0.62
            };
        }

        // Otherwise continue (reroll) to seek improvement
        return {
            action: 'reroll',
            keepDice: diceEvaluations.map(d => d.index),
            reason: `Continuing - improvement potential ${improvementPotentialScore} (threshold logic)`,
            improvementDetail: { twoOfKinds: twoOfAKindFaces, diceRemaining: diceRemainingForEV, rollsLeft, pairEVDetails, note: 'Continue path', personality: personalityContext },
            overrideReasons: [],
            confidence: 0.55
        };
    }

    /**
     * Phase 2 helper: compute dynamic thresholds influenced by personality & state.
     * Returns object { thresholds, factors } where thresholds influence keep heuristics elsewhere.
     */
    _computePersonalityThresholdContext(personality, player, situation) {
        // Base thresholds (conceptual) representing how many dice the AI is comfortable keeping early.
        let baseContinueBias = 0; // positive => more likely to continue
        baseContinueBias += (personality.risk||3) - 3; // higher risk pushes continuing
        baseContinueBias += (personality.aggression||3) >= 4 ? 0.5 : 0; // aggressive nudges continuation for attacks
        baseContinueBias -= (personality.strategy||3) >= 4 ? 0.3 : 0; // strategic may settle earlier if value good

        // Health influences caution: low health reduces continuation
        if (player.health <= 3) baseContinueBias -= 1.0;
        else if (player.health <= 5) baseContinueBias -= 0.4;

        // Tokyo presence: inside Tokyo encourages continuing if not at critical health
        if (player.isInTokyo && player.health > 3) baseContinueBias += 0.4;

        // Threat pressure: if a critical VP threat exists, bias toward continuation for attack / disruption
        const criticalThreat = situation?.threats?.hasCriticalThreat;
        if (criticalThreat) baseContinueBias += 0.7;

        // Clamp bias
        baseContinueBias = Math.max(-2, Math.min(2.5, baseContinueBias));

        // Translate bias into threshold scaling factors used conceptually by number/ non-number keep logic
        const singleNumberHigh = 0.55 - (baseContinueBias * 0.03); // higher bias => slightly lower threshold to keep
        const singleNumberLow = 0.35 - (baseContinueBias * 0.02);
        const nonNumberBase = 0.50 - (baseContinueBias * 0.025);
        const nonNumberHigh = 0.70 - (baseContinueBias * 0.03);
        const nonNumberLow = 0.25 - (baseContinueBias * 0.015);

        // Jitter to avoid deterministic edge cases
        const aiCfg = (typeof window !== 'undefined' ? (window.AIConfig||{}) : {});
        let jitter = 0; let appliedJitter = 0;
        if (aiCfg.personalityJitter) {
            const magnitude = aiCfg.jitterMagnitude || 0.04;
            jitter = (Math.random()*2 - 1) * magnitude; // [-mag, +mag]
            appliedJitter = Number(jitter.toFixed(3));
        }

        function clamp01(v){ return Math.max(0.05, Math.min(0.95, v)); }
        const thresholds = {
            singleNumberHigh: clamp01(singleNumberHigh + jitter),
            singleNumberLow: clamp01(singleNumberLow + jitter),
            nonNumberBase: clamp01(nonNumberBase + jitter),
            nonNumberHigh: clamp01(nonNumberHigh + jitter),
            nonNumberLow: clamp01(nonNumberLow + jitter)
        };

        return {
            thresholds,
            bias: Number(baseContinueBias.toFixed(2)),
            appliedJitter,
            personality: { ...personality },
            health: player.health,
            inTokyo: !!player.isInTokyo,
            criticalThreat: !!criticalThreat
        };
    }

    assessPersonalityRisk(personality, situation) {
        if (!personality || !situation) {
            return 3; // Default moderate risk
        }

        let riskLevel = personality.risk || 3; // Base risk from personality
        
        // Adjust based on situation
        if (situation.threats && situation.threats.length > 0) {
            // More cautious when threats are present
            riskLevel = Math.max(1, riskLevel - 1);
        }
        
        if (situation.opportunities && situation.opportunities.length > 0) {
            // More willing to take risks for opportunities
            riskLevel = Math.min(5, riskLevel + 1);
        }
        
        // Game phase considerations
        if (situation.gamePhase === 'late') {
            // More aggressive in late game
            riskLevel = Math.min(5, riskLevel + 1);
        } else if (situation.gamePhase === 'early') {
            // More conservative early game
            riskLevel = Math.max(1, riskLevel - 1);
        }
        
        return Math.max(1, Math.min(5, riskLevel));
    }

    // Check for incomplete number combinations that require the third dice
    checkIncompleteNumberCombinations(currentState, rollsRemaining) {
        // Only check if we have rolls remaining
        if (rollsRemaining <= 0) {
            return { shouldContinue: false, reason: 'No rolls remaining' };
        }

        // Check each number type for incomplete combinations
        const incompleteCombos = [];
        
        if (currentState.ones === 2) {
            incompleteCombos.push({
                type: 'ones',
                count: 2,
                vpValue: 1,
                reason: 'Need third 1 for VP (pair of 1s is worthless without the third)'
            });
        }
        
        if (currentState.twos === 2) {
            incompleteCombos.push({
                type: 'twos', 
                count: 2,
                vpValue: 2,
                reason: 'Need third 2 for VP (pair of 2s is worthless without the third)'
            });
        }
        
        if (currentState.threes === 2) {
            incompleteCombos.push({
                type: 'threes',
                count: 2, 
                vpValue: 3,
                reason: 'Need third 3 for VP (pair of 3s is worthless without the third)'
            });
        }

        // If we have any incomplete combos, we should continue rolling
        if (incompleteCombos.length > 0) {
            // Prioritize the highest value incomplete combo
            const bestCombo = incompleteCombos.reduce((best, current) => 
                current.vpValue > best.vpValue ? current : best
            );
            
            return {
                shouldContinue: true,
                reason: `${bestCombo.reason} - potential ${bestCombo.vpValue} VP`,
                combo: bestCombo
            };
        }

        return { shouldContinue: false, reason: 'No incomplete number combinations' };
    }

    // Evaluate complex Tokyo entry/attack strategy based on health and personality
    evaluateTokyoStrategy(player, opponents, personality) {
        // Find who's in Tokyo currently
        const tokyoPlayer = opponents.find(opp => opp.isInTokyo);
        const myHealth = player.health || 10;
        const maxHealth = player.maxHealth || 10;
        
        // Default strategy
        let strategy = {
            avoidTokyo: false,
            targetTokyo: false,
            reason: 'Standard attack evaluation'
        };

        if (!tokyoPlayer) {
            // No one in Tokyo - normal attack evaluation
            return strategy;
        }

        const tokyoHealth = tokyoPlayer.health || 10;
        const tokyoMaxHealth = tokyoPlayer.maxHealth || 10;
        
        // Get personality traits with defaults
        const aggression = personality?.aggression || 3;
        const strategy_trait = personality?.strategy || 3;
        const risk = personality?.risk || 3;
        
        console.log(`🏛️ TOKYO STRATEGY: My health ${myHealth}/${maxHealth}, Tokyo player health ${tokyoHealth}/${tokyoMaxHealth}`);
        console.log(`🏛️ PERSONALITY: Aggression ${aggression}, Strategy ${strategy_trait}, Risk ${risk}`);
        
        // Critical health thresholds
        const myHealthLow = myHealth <= 3;
        const tokyoHealthLow = tokyoHealth <= 4; // heuristic low threshold
        const tokyoHealthCritical = tokyoHealth <= 2;
        const hasTokyoProtection = this.hasTokyoProtectionCards(player);

        // Strategic personalities may delay Tokyo entry to secure protection if not pressured
        if (strategy_trait >= 4 && !myHealthLow && !tokyoHealthCritical && !player.isInTokyo) {
            if (!hasTokyoProtection && player.energy <= 2) {
                // Avoid committing until we can buy or draw protection
                return {
                    avoidTokyo: true,
                    targetTokyo: false,
                    reason: `Strategic personality seeking protection cards before Tokyo entry`
                };
            }
        }
        
        // TARGET TOKYO scenarios
        if (tokyoHealthCritical && myHealth > tokyoHealth) {
            // Tokyo player is critically low and we're healthier
            if (aggression >= 3 || risk >= 4) {
                return {
                    avoidTokyo: false,
                    targetTokyo: true,
                    reason: `Tokyo player critical (${tokyoHealth}) - going for elimination even with health risk`
                };
            }
        }
        
        if (tokyoHealthLow && myHealth >= (tokyoHealth + 2)) {
            // We have significantly more health than Tokyo player
            return {
                avoidTokyo: false,
                targetTokyo: true,
                reason: `Health advantage (${myHealth} vs ${tokyoHealth}) - targeting Tokyo player`
            };
        }
        
        if (hasTokyoProtection && tokyoHealthLow) {
            // We have protection and Tokyo player is vulnerable
            return {
                avoidTokyo: false,
                targetTokyo: true,
                reason: `Have Tokyo protection + Tokyo player low health (${tokyoHealth}) - safe to attack`
            };
        }
        
        // High aggression personalities attack more regardless
        if (aggression >= 4 && myHealth >= 4) {
            return {
                avoidTokyo: false,
                targetTokyo: true,
                reason: `High aggression (${aggression}) + adequate health (${myHealth}) - attacking`
            };
        }
        
        return strategy;
    }

    // Check if player has cards that provide Tokyo protection
    hasTokyoProtectionCards(player) {
        if (!player.powerCards) return false;
        
        const protectionCards = [
            'Jets', // Classic Tokyo protection
            'Armor Plating', // Damage reduction
            'Healing Ray', // Heal while in Tokyo
            'Force Field', // Damage prevention
            'Regeneration' // Ongoing healing
        ];
        
        return player.powerCards.some(card => 
            protectionCards.includes(card.name)
        );
    }

    // Evaluate the value of Tokyo protection cards based on strategy and health
    evaluateTokyoProtectionValue(card, player) {
        const personality = player.monster.personality;
        const strategy_trait = personality?.strategy || 3;
        const aggression = personality?.aggression || 3;
        const myHealth = player.health || 10;
        
        // Tokyo protection cards
        const protectionCards = {
            'Jets': { value: 70, reason: 'Jets provides excellent Tokyo protection' },
            'Armor Plating': { value: 50, reason: 'Armor Plating reduces Tokyo damage' },
            'Healing Ray': { value: 45, reason: 'Healing Ray allows healing in Tokyo' },
            'Force Field': { value: 55, reason: 'Force Field prevents Tokyo damage' },
            'Regeneration': { value: 40, reason: 'Regeneration provides ongoing healing' }
        };
        
        if (!protectionCards[card.name]) {
            return { value: 0, reason: '' };
        }
        
        let value = protectionCards[card.name].value;
        let reason = protectionCards[card.name].reason;
        
        // Strategic personalities value protection more highly
        if (strategy_trait >= 4) {
            value *= 1.5;
            reason += ' - strategic personality prioritizes protection';
        }
        
        // Low health players value protection extremely highly
        if (myHealth <= 3) {
            value *= 2.0;
            reason += ` - critical with low health (${myHealth})`;
        } else if (myHealth <= 5) {
            value *= 1.3;
            reason += ` - important with moderate health (${myHealth})`;
        }
        
        // Aggressive personalities still value protection but less so
        if (aggression >= 4 && myHealth > 5) {
            value *= 0.8;
            reason += ' - aggressive personality but still values protection';
        }
        
        // If we already have protection, value diminishes
        if (this.hasTokyoProtectionCards(player)) {
            value *= 0.4;
            reason += ' - already have Tokyo protection';
        }
        
        console.log(`🏛️ TOKYO PROTECTION: ${card.name} valued at ${value} - ${reason}`);
        
        return { value: Math.round(value), reason };
    }

    // ===== DICE MANIPULATION CARD ANALYSIS =====
    evaluateDiceManipulationCards(player, opponents, gameState) {
        const manipulationCards = [];
        
        // Check if player has manipulation cards
        if (player.powerCards) {
            player.powerCards.forEach(card => {
                const manipulationEffect = AI_CONSTANTS.POWER_CARD_ECONOMICS.manipulationCards[card.name];
                if (manipulationEffect) {
                    const evaluation = this.evaluateManipulationCardUsage(card, manipulationEffect, player, opponents, gameState);
                    if (evaluation.shouldUse) {
                        manipulationCards.push(evaluation);
                    }
                }
            });
        }
        
        return manipulationCards;
    }

    evaluateManipulationCardUsage(card, effect, player, opponents, gameState) {
        let value = 0;
        let shouldUse = false;
        let target = null;
        let reasoning = '';
        
        switch (effect.effect) {
            case 'rerollOwnDice':
                const rerollValue = this.evaluateOwnDiceReroll(player, gameState);
                value = rerollValue.value;
                shouldUse = rerollValue.shouldUse;
                reasoning = rerollValue.reasoning;
                break;
                
            case 'rerollOpponentDice':
                const opponentReroll = this.evaluateOpponentDiceReroll(opponents, gameState);
                value = opponentReroll.value;
                shouldUse = opponentReroll.shouldUse;
                target = opponentReroll.target;
                reasoning = opponentReroll.reasoning;
                break;
                
            case 'forceKeepDice':
                const forceKeep = this.evaluateForceKeepDice(opponents, gameState);
                value = forceKeep.value;
                shouldUse = forceKeep.shouldUse;
                target = forceKeep.target;
                reasoning = forceKeep.reasoning;
                break;
        }
        
        return {
            card,
            effect,
            value,
            shouldUse,
            target,
            reasoning,
            probabilityImpact: effect.probabilityImpact
        };
    }

    evaluateOwnDiceReroll(player, gameState) {
        // Analyze if rerolling own dice would be beneficial
        const currentDice = gameState.diceResults || [];
        const analysis = this.analyzeDiceResults(currentDice);
        
        let value = 0;
        let shouldUse = false;
        let reasoning = '';
        
        // Bad results warrant a reroll
        if (analysis.total > 0 && analysis.hearts + analysis.energy + analysis.victoryPoints <= 1) {
            value = 60;
            shouldUse = true;
            reasoning = 'Poor dice results warrant reroll for better outcome';
        }
        
        // Dangerous situation with bad rolls
        if (player.health <= 3 && analysis.hearts === 0) {
            value = 80;
            shouldUse = true;
            reasoning = 'Critical health situation requires heart reroll';
        }
        
        // Near victory but need specific results
        if (player.victoryPoints >= 15 && analysis.victoryPoints <= 1) {
            value = 70;
            shouldUse = true;
            reasoning = 'Near victory - reroll for winning VP combination';
        }
        
        return { value, shouldUse, reasoning };
    }

    evaluateOpponentDiceReroll(opponents, gameState) {
        let bestTarget = null;
        let maxValue = 0;
        let reasoning = '';
        
        opponents.forEach(opponent => {
            if (opponent.eliminated) return;
            
            let value = 0;
            let targetReason = '';
            
            // High value targets for disruption
            if (opponent.victoryPoints >= 15) {
                value += 50;
                targetReason = 'Disrupting near-victory opponent';
            }
            
            if (opponent.isInTokyo && opponent.health <= 5) {
                value += 40;
                targetReason = 'Disrupting vulnerable Tokyo occupant';
            }
            
            // Check if opponent has good results to disrupt
            const opponentDice = this.getOpponentDiceResults(opponent, gameState);
            if (opponentDice && this.hasGoodDiceResults(opponentDice)) {
                value += 60;
                targetReason += ' with excellent dice results';
            }
            
            if (value > maxValue) {
                maxValue = value;
                bestTarget = opponent;
                reasoning = targetReason;
            }
        });
        
        return {
            value: maxValue,
            shouldUse: maxValue >= 50,
            target: bestTarget,
            reasoning: reasoning
        };
    }

    evaluateForceKeepDice(opponents, gameState) {
        // Similar to reroll but for forcing opponents to keep bad dice
        let bestTarget = null;
        let maxValue = 0;
        let reasoning = '';
        
        opponents.forEach(opponent => {
            if (opponent.eliminated) return;
            
            const opponentDice = this.getOpponentDiceResults(opponent, gameState);
            if (!opponentDice) return;
            
            // Force keep if opponent has mostly bad results
            if (this.hasBadDiceResults(opponentDice)) {
                let value = 40;
                
                if (opponent.victoryPoints >= 15) {
                    value += 40; // Extra value for stopping near-victory players
                }
                
                if (value > maxValue) {
                    maxValue = value;
                    bestTarget = opponent;
                    reasoning = 'Forcing opponent to keep poor dice results';
                }
            }
        });
        
        return {
            value: maxValue,
            shouldUse: maxValue >= 40,
            target: bestTarget,
            reasoning: reasoning
        };
    }

    getOpponentDiceResults(opponent, gameState) {
        // This would need to be implemented based on how opponent dice data is stored
        // For now, return null - this would be connected to actual game state
        return null;
    }

    hasGoodDiceResults(diceResults) {
        const analysis = this.analyzeDiceResults(diceResults);
        return analysis.hearts >= 2 || analysis.energy >= 2 || analysis.victoryPoints >= 3;
    }

    hasBadDiceResults(diceResults) {
        const analysis = this.analyzeDiceResults(diceResults);
        return analysis.hearts + analysis.energy + analysis.victoryPoints <= 1;
    }

    // ===== TOKYO EXIT MANIPULATION STRATEGY =====
    evaluateTokyoExitStrategy(player, opponents, gameState) {
        if (!player.isInTokyo) {
            return { shouldExit: false, reasoning: 'Not in Tokyo' };
        }
        
        const strategy = this.analyzeTokyoSituation(player, opponents, gameState);
        return strategy;
    }

    analyzeTokyoSituation(player, opponents, gameState) {
        const personality = player.monster.personality;
        const vulnerableOpponents = this.identifyVulnerableOpponents(opponents);
        const threats = this.assessTokyoThreats(opponents, player);
        
        // Standard exit conditions
        if (player.health <= 3) {
            return {
                shouldExit: true,
                reasoning: 'Critical health - standard exit',
                strategy: 'survival',
                target: null
            };
        }
        
        // Strategic manipulation opportunities
        const manipulationOpportunity = this.identifyManipulationOpportunity(
            player, vulnerableOpponents, threats, personality
        );
        
        if (manipulationOpportunity.shouldExecute) {
            return manipulationOpportunity;
        }
        
        // Default stay decision
        return {
            shouldExit: false,
            reasoning: 'Favorable position in Tokyo',
            strategy: 'hold',
            target: null
        };
    }

    identifyVulnerableOpponents(opponents) {
        return opponents.filter(opponent => {
            if (opponent.eliminated) return false;
            
            // Low health opponents
            if (opponent.health <= 4) return true;
            
            // High VP opponents that others might target
            if (opponent.victoryPoints >= 15) return true;
            
            // Players with aggressive tendencies who might be targeted
            if (opponent.monster.personality.aggression >= 4 && opponent.health <= 6) return true;
            
            return false;
        });
    }

    assessTokyoThreats(opponents, player) {
        const threats = [];
        
        opponents.forEach(opponent => {
            if (opponent.eliminated) return;
            
            let threatLevel = 0;
            
            // High attack probability
            if (opponent.monster.personality.aggression >= 4) {
                threatLevel += 30;
            }
            
            // Power cards that enhance attacks
            if (opponent.powerCards) {
                const attackCards = opponent.powerCards.filter(card => 
                    this.isAttackCard(card)
                );
                threatLevel += attackCards.length * 20;
            }
            
            // Energy for power card purchases
            if (opponent.energy >= 6) {
                threatLevel += 25;
            }
            
            threats.push({
                player: opponent,
                threatLevel,
                canForcedIntoTokyo: opponent.health <= 5
            });
        });
        
        return threats.sort((a, b) => b.threatLevel - a.threatLevel);
    }

    identifyManipulationOpportunity(player, vulnerableOpponents, threats, personality) {
        // Only certain personality types would execute sacrificial strategies
        const strategicPersonality = personality.strategy >= 4;
        const manipulativePersonality = personality.aggression >= 3 && personality.strategy >= 3;
        
        if (!strategicPersonality && !manipulativePersonality) {
            return { shouldExecute: false };
        }
        
        // Look for vulnerable opponents who could be forced into Tokyo
        for (const vulnerable of vulnerableOpponents) {
            // Check if there's a likely attacker who would target the vulnerable player
            const likelyAttacker = this.findLikelyAttacker(threats, vulnerable, player);
            
            if (likelyAttacker && this.wouldAttackVulnerableInTokyo(likelyAttacker, vulnerable)) {
                // Check if sacrificial exit is worth it
                const manipulationValue = this.calculateManipulationValue(vulnerable, likelyAttacker, player);
                
                if (manipulationValue >= 60) {
                    return {
                        shouldExecute: true,
                        shouldExit: true,
                        reasoning: `Strategic exit to force ${vulnerable.monster.name} into Tokyo for ${likelyAttacker.monster.name} to eliminate`,
                        strategy: 'manipulation',
                        target: vulnerable,
                        attacker: likelyAttacker,
                        manipulationValue: manipulationValue
                    };
                }
            }
        }
        
        return { shouldExecute: false };
    }

    findLikelyAttacker(threats, vulnerableTarget, currentTokyoPlayer) {
        // Find threat that would likely attack if vulnerable player enters Tokyo
        return threats.find(threat => {
            const attacker = threat.player;
            
            // Won't attack themselves
            if (attacker.id === vulnerableTarget.id) return false;
            
            // High aggression players likely to attack
            if (attacker.monster.personality.aggression >= 4) return true;
            
            // Players close to victory might risk an attack
            if (attacker.victoryPoints >= 12 && vulnerableTarget.health <= 3) return true;
            
            // Players with attack power cards
            if (this.hasAttackCards(attacker)) return true;
            
            return false;
        })?.player;
    }

    wouldAttackVulnerableInTokyo(attacker, vulnerableTarget) {
        // Would the attacker likely attack the vulnerable target if they were in Tokyo?
        
        // High aggression always attacks
        if (attacker.monster.personality.aggression >= 4) return true;
        
        // Strategic players attack if elimination is likely
        if (attacker.monster.personality.strategy >= 3 && vulnerableTarget.health <= 3) return true;
        
        // Risk-takers attack weakened targets
        if (attacker.monster.personality.risk >= 4 && vulnerableTarget.health <= 4) return true;
        
        return false;
    }

    calculateManipulationValue(vulnerableTarget, attacker, currentPlayer) {
        let value = 0;
        
        // Value based on eliminating a threat
        if (vulnerableTarget.victoryPoints >= 15) {
            value += 80; // Eliminating near-victory player is highly valuable
        } else if (vulnerableTarget.victoryPoints >= 10) {
            value += 40;
        }
        
        // Value based on current position sacrifice
        const healthCost = Math.max(0, 6 - currentPlayer.health) * 5; // Cost of being vulnerable
        const tokyoBonusCost = 20; // Cost of losing Tokyo bonuses
        
        value -= (healthCost + tokyoBonusCost);
        
        // Personality modifiers
        if (currentPlayer.monster.personality.strategy >= 4) {
            value += 20; // Strategic players value manipulation more
        }
        
        if (currentPlayer.monster.personality.risk >= 4) {
            value += 15; // Risk-takers willing to sacrifice for opportunity
        }
        
        return value;
    }

    // ===== DEBUGGING AND VISUALIZATION HELPERS =====
    logCurrentState(player, gameState) {
        const diceResults = gameState.diceResults || [];
        const analysis = this.analyzeDiceResults(diceResults);
        const threats = this.identifyThreats(player, gameState);
        const opportunities = this.identifyOpportunities(player, gameState);
        const powerCardStrategy = this.evaluatePowerCardStrategy(player, gameState);
        const multiPlayerScenarios = this.analyzeMultiPlayerScenarios(player, gameState);
        
        console.log(`\n🧠 AI Debug State for ${player.monster.name}:`);
        console.log(`  Health: ${player.health}, Energy: ${player.energy}, VP: ${player.victoryPoints}, In Tokyo: ${player.isInTokyo}`);
        console.log(`  Dice Results: ${JSON.stringify(diceResults)}`);
        console.log(`  Analysis: ${JSON.stringify(analysis)}`);
        console.log(`  Threats: ${JSON.stringify(threats)}`);
        console.log(`  Opportunities: ${JSON.stringify(opportunities)}`);
        console.log(`  Power Card Strategy: ${JSON.stringify(powerCardStrategy)}`);
        console.log(`  Multi-Player Scenarios: ${JSON.stringify(multiPlayerScenarios)}`);
    }

    // ===== Phase 3 Async Deep Evaluation (Stub) =====
    /**
     * Asynchronous deeper evaluation placeholder.
     * Intention: Evaluate alternative keep sets via simulation / combinatorics without blocking main thread.
     * Current stub returns a resolved promise with a basic structure and no override decision.
     * Future expansion: Monte Carlo simulation of reroll outcomes, card synergy forecasting, threat-adjusted EV.
     * @param {Array} diceEvaluations - current dice evaluation objects
     * @param {Object} probabilities - probability state snapshot
     * @param {Object} player - player state
     * @param {Object} situation - broader situation context
     * @param {Object} meta - { rollsRemaining, risk }
     * @returns Promise<{ analysis:object, decision?:object }>
     */
    async evaluateDiceDeepAsync(diceEvaluations, probabilities, player, situation, meta) {
        try {
            // Lightweight micro-task yield to illustrate async path
            await new Promise(r => setTimeout(r, 0));
            const analysis = {
                timestamp: Date.now(),
                diceCount: diceEvaluations.length,
                rollsRemaining: meta.rollsRemaining,
                risk: meta.risk,
                largestSet: Math.max(probabilities.currentState.ones||0, probabilities.currentState.twos||0, probabilities.currentState.threes||0),
                pairs: ['ones','twos','threes'].filter(f => (probabilities.currentState[f]||0) === 2),
                energy: probabilities.currentState.energy||0,
                attacks: probabilities.currentState.attacks||0,
                hearts: probabilities.currentState.hearts||0,
                note: 'Phase 3 async stub - no deep simulation executed'
            };
            // Example heuristic: If we have two distinct pairs and high rolls remaining, propose forcing reroll (higher confidence)
            if (analysis.pairs.length >= 2 && meta.rollsRemaining > 0) {
                return {
                    analysis,
                    decision: {
                        action: 'reroll',
                        keepDice: diceEvaluations.map(d => d.index),
                        reason: 'Async: multi-pair high opportunity (stub)',
                        confidence: 0.91
                    }
                };
            }
            return { analysis };
        } catch (e) {
            return { _error: e };
        }
    }
}

// Make AIDecisionEngine available globally
window.AIDecisionEngine = AIDecisionEngine;

// Personality threshold adjustment helper (Phase 2)
if (typeof window !== 'undefined') {
    window.AIDebugConfig = window.AIDebugConfig || { personalityJitter:true, logPersonalityAdjust:true };
}

function getPersonalityAdjustedThresholds(base, face, currentState, player) {
    // base: { singleNumberHigh, singleNumberLow, nonNumberHigh, nonNumberBase, nonNumberLow }
    // Returns object with dynamic thresholds after personality + situation adjustments
    const personality = player?.monster?.personality || 'balanced';
    const situation = player?.gameSituationAnalyzer ? player.gameSituationAnalyzer() : null;
    const hp = player?.health ?? 10;
    const inTokyo = !!player?.inTokyo;
    let riskLevel = 'normal';
    if (situation && situation.riskAssessment) riskLevel = situation.riskAssessment;

    // Clone baseline
    const t = { ...base };

    // Personality scaling factors
    const scaleMap = {
        aggressive: { numberAgg: -0.05, attackBias: -0.05, healBias: +0.05 },
        defensive: { numberAgg: +0.05, attackBias: +0.05, healBias: -0.05 },
        economic:  { numberAgg: 0, attackBias: +0.02, healBias: 0 }
    };
    const scale = scaleMap[personality] || { numberAgg:0, attackBias:0, healBias:0 };

    // Adjust number thresholds (encourage/discourage keeping singles)
    t.singleNumberHigh += scale.numberAgg; // aggressive lowers high bar slightly
    t.singleNumberLow  += scale.numberAgg;

    // Risk-based adjustments (game situation)
    if (riskLevel === 'high') {
        // Be more selective with single numbers, unless we already have pairs
        if ((currentState?.ones||0) < 2 && (currentState?.twos||0) < 2 && (currentState?.threes||0) < 2) {
            t.singleNumberHigh += 0.05;
            t.singleNumberLow  += 0.05;
        }
    } else if (riskLevel === 'low') {
        t.singleNumberHigh -= 0.05;
        t.singleNumberLow  -= 0.05;
    }

    // Health / Tokyo context
    if (inTokyo && hp <= 4) {
        // Need hearts, reduce thresholds for healing if face is heart
        if (face === 'heart') t.nonNumberBase = Math.max(0.35, t.nonNumberBase - 0.1);
    }

    // Clamp values
    const clamp = (v) => Math.max(0.1, Math.min(0.95, v));
    Object.keys(t).forEach(k => { t[k] = clamp(t[k]); });

    // Optional jitter to avoid predictability
    if (typeof window !== 'undefined' && window.AIDebugConfig?.personalityJitter) {
        const jitter = (min, max) => (Math.random() * (max - min) + min);
        const j = jitter(-0.015, 0.015);
        t.singleNumberHigh = clamp(t.singleNumberHigh + j);
        t.singleNumberLow  = clamp(t.singleNumberLow + j);
        t.nonNumberBase    = clamp(t.nonNumberBase + j/2);
    }

    if (typeof window !== 'undefined' && window.AIDebugConfig?.logPersonalityAdjust) {
    window.AIOverrideStats = window.AIOverrideStats || { tripleKeep:0, noSetContinue:0, tripleExtend:0, twoPairs:0, release:0, decisions:0, attackCluster:0, singlePair:0, personalityAdjust:0, threatBias:0 };
        window.AIOverrideStats.personalityAdjust = (window.AIOverrideStats.personalityAdjust||0)+1;
        console.log('🧬 Personality thresholds', { face, personality, riskLevel, hp, inTokyo, thresholds:t });
    }

    return t;
}

// Threat context helper (Phase 5)
if (typeof window !== 'undefined') {
    window.AIDebugConfig = window.AIDebugConfig || {};
    if (window.AIDebugConfig.threatDebug === undefined) window.AIDebugConfig.threatDebug = true; // default on for development
}

function computeThreatContext(player, allPlayers) {
    try {
        if (!allPlayers || !Array.isArray(allPlayers)) return null;
        const alive = allPlayers.filter(p => !p.eliminated);
        if (alive.length <= 1) return null;

        const me = player;
        const maxVP = Math.max(...alive.map(p => p.victoryPoints || 0), 0);
        const vpRacePressure = Math.min(1, Math.max(0, (maxVP - (me.victoryPoints||0)) / 10));
        const lowHealthPressure = me.health <= 4 ? (me.health <= 2 ? 1 : 0.6) : 0;

        let topThreat = null;
        let topThreatScore = -Infinity;
        alive.forEach(op => {
            if (op === me) return;
            const vpComponent = (op.victoryPoints||0) * 1.4;
            const energyComponent = (op.energy||0) * 0.5;
            const healthComponent = (op.health||0) * 0.3;
            const tokyoComponent = op.inTokyo ? 3 : 0;
            const recentAttack = (op.lastRolledAttack||0) * 0.8;
            const score = vpComponent + energyComponent + healthComponent + tokyoComponent + recentAttack;
            if (score > topThreatScore) { topThreatScore = score; topThreat = op; }
        });

        // Emphasis multipliers start neutral
        let attackEmphasis = 1.0;
        let healEmphasis = 1.0;
        let vpEmphasis = 1.0;

        if (lowHealthPressure > 0) {
            healEmphasis += 0.5 * lowHealthPressure;
            attackEmphasis -= 0.3 * lowHealthPressure;
        }
        if (vpRacePressure > 0.4) {
            vpEmphasis += 0.6 * vpRacePressure;
            attackEmphasis += 0.4 * vpRacePressure;
        }
        if (topThreat && topThreat.inTokyo && me.health >= 5) {
            attackEmphasis += 0.5;
        }

        // Clamp
        const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
        attackEmphasis = clamp(attackEmphasis, 0.4, 2.0);
        healEmphasis = clamp(healEmphasis, 0.5, 2.0);
        vpEmphasis = clamp(vpEmphasis, 0.6, 2.0);

        const ctx = {
            topThreat,
            threatScore: topThreatScore,
            vpRacePressure:+vpRacePressure.toFixed(2),
            lowHealthPressure:+lowHealthPressure,
            attackEmphasis:+attackEmphasis.toFixed(2),
            healEmphasis:+healEmphasis.toFixed(2),
            vpEmphasis:+vpEmphasis.toFixed(2)
        };

        if (typeof window !== 'undefined') {
            try {
                window.lastThreatContext = ctx;
            } catch(_) {}
        }
        return ctx;
    } catch(e) {
        return null;
    }
}