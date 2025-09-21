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
        // Expose a readiness promise so callers can await configuration
        this.configReady = this.loadConfiguration();
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
            console.warn('Could not load AI configuration, falling back to internal defaults:', error);
            // Use comprehensive internal defaults to avoid undefined personality traits
            this.config = this.getDefaultConfig();
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
        // Ensure configuration is loaded (await if still pending)
        if (!this.config) {
            try {
                if (this.configReady) {
                    await this.configReady;
                }
            } catch (e) {
                console.warn('Config load promise rejected, using defaults');
                this.config = this.getDefaultConfig();
            }
        }
        if (!this.config) {
            this.config = this.getDefaultConfig();
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
        const diceEvaluations = this.evaluateDiceEnhanced(currentDice, player, situation, probabilities);
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
            gamePhase: this.determineGamePhase(gameState),
            gameState: gameState // Add gameState for first turn detection
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
            'alien-metabolism': 'Buy cards cost 1 less energy (min 1)',
            'armor-plating': 'Ignore 1 damage each turn',
            'background-dweller': 'Access to hidden cards',
            'camouflage': 'Cannot be attacked when outside Tokyo',
            'complete-destruction': 'Gain extra points on destroying a monster',
            'corner-store': 'Start turn with +1 energy',
            'dedicated-news-team': 'Gain extra points when attacking',
            'energy-hoarder': 'Gain +1 energy when not buying cards',
            'even-bigger': 'Gain extra points when attacking',
            'extra-head': 'Increase max health',
            'fire-breathing': 'Deal extra damage to all when attacking',
            'friend-of-children': 'You don\'t take damage when yielding Tokyo',
            'giant-brain': 'Increase hand limit / planning advantage',
            'healing-ray': 'Spend energy to heal',
            'herbivore': 'Cannot attack, gain points each turn',
            'it-has-a-child': 'Gain VP at start of turn',
            'jets': 'Spend energy to avoid losing points when leaving Tokyo',
            'made-in-a-lab': 'Bonus points when certain conditions met',
            'metamorphosis': 'Spend energy to heal and gain VP',
            'nova-breath': 'Spend energy to gain extra attack die',
            'parasitic-tentacles': 'Steal energy when you damage others',
            'solar-powered': 'Gain energy when outside Tokyo',
            'urbavore': 'Gain VP each turn in Tokyo',
            'wings': 'Leave Tokyo without taking damage'
        };

        return effects[cardName] || 'Unknown effect';
    }

    /**
     * Evaluate target player's power-card modifiers asynchronously.
     * Returns an object with modifiers to adjust attack utility and kill estimates.
     * This function is non-blocking to callers; callers can use the sync wrapper
     * which returns cached/default modifiers immediately.
     */
    async evaluateTargetPowerModifiersAsync(player, options = {}) {
        // options: { strategyLevel: 0..1, considerShop: bool }
        const strategy = (options.strategyLevel == null) ? (player?.monster?.personality?.strategy || 3) / 5 : Math.max(0, Math.min(1, options.strategyLevel));

        // Default modifiers
        const modifiers = {
            damageReduction: 0,
            yieldProtection: false,
            isUntargetable: false,
            attackUtilityMultiplier: 1,
            attackPriorityDelta: 0,
            healPossible: false,
            extraHP: 0,
            canBlockDamageWithEnergy: false,
            shopInfluences: []
        };

        // --- Per-turn cache ---
        try {
            // Initialize cache store on the engine instance
            if (!this._ttCache) this._ttCache = { lastTurnKey: null, map: new Map() };

            // Determine a stable per-turn key using global game state when available
            let turnKey = null;
            if (window && window.game && window.game.currentPlayerTurn && window.game.currentPlayerTurn.id) {
                turnKey = `turn:${window.game.currentPlayerTurn.id}`;
            } else if (window && window.game && window.game.currentRound && typeof window.game.currentPlayerIndex === 'number') {
                turnKey = `round:${window.game.currentRound.roundNumber}:p${window.game.currentPlayerIndex}`;
            } else {
                // Fallback to a coarse timestamp per 2-second window to avoid unbounded caching
                turnKey = `time:${Math.floor(Date.now() / 2000)}`;
            }

            // Compose cache id for this player
            const cacheId = `${turnKey}::player:${player && player.id ? player.id : (player && player.monster && player.monster.name) || 'unknown'}`;

            // If there's a cached value for this player for this turn, return it immediately
            const cached = this._ttCache.map.get(cacheId);
            if (cached && cached.turnKey === turnKey && cached.modifiers) {
                // Lightweight instrumentation
                if (window && window.UI && window.UI._debug) window.UI._debug(`AI cache hit for ${cacheId}`);
                return Object.assign({}, cached.modifiers);
            }

            // Otherwise continue to compute and will store below
        } catch (cacheErr) {
            console.warn('AI per-turn cache check failed', cacheErr);
        }

        // Try to get local game/shop data from global 'game' if available
        try {
            const owned = (player && (player.powerCards || player.cards || player.ownedCards)) || [];

            // Map known config ids to semantic effects
            const applyCard = (card) => {
                if (!card || !card.effect) return;
                const eff = card.effect;
                switch (eff.target) {
                    case 'yieldProtection':
                        modifiers.yieldProtection = true;
                        modifiers.attackUtilityMultiplier *= 0.5;
                        modifiers.attackPriorityDelta -= 2;
                        break;
                    case 'damageReduction':
                        modifiers.damageReduction += (eff.value || 1);
                        modifiers.attackUtilityMultiplier *= Math.max(0.25, 1 - 0.15 * (eff.value || 1));
                        break;
                    case 'outsideTokyoImmunity':
                        modifiers.isUntargetable = true;
                        modifiers.attackUtilityMultiplier = 0;
                        break;
                    case 'maxHealth':
                        modifiers.extraHP += (eff.value || 0);
                        break;
                    case 'heal':
                        modifiers.healPossible = true;
                        modifiers.attackUtilityMultiplier *= 0.85;
                        break;
                    case 'pointProtection':
                        modifiers.canBlockDamageWithEnergy = true;
                        modifiers.attackUtilityMultiplier *= 0.6;
                        break;
                    case 'globalAttackBonus':
                        modifiers.attackPriorityDelta += 2;
                        break;
                    case 'attackDice':
                        modifiers.attackPriorityDelta += 1;
                        break;
                    case 'attackPoints':
                        modifiers.attackPriorityDelta += 1;
                        break;
                    default:
                        // No-op: prefer canonical effect.target mapping from config.json
                }
            };

            // If _powerCardCatalog is available on this instance, use it; else try to read global config
            const catalog = (this.catalog || (window && window.CONFIG && window.CONFIG.powerCards) || null);

            // Normalize owned cards to card definitions when possible
            for (const c of owned) {
                let def = null;
                if (!c) continue;
                if (typeof c === 'string') {
                    // try find in catalog
                    if (catalog) def = catalog.find(x => x.id === c || x.name === c);
                } else if (c.id) {
                    def = c;
                } else if (c.name && catalog) {
                    def = catalog.find(x => x.name === c.name || x.id === c.name);
                }
                applyCard(def || c);
            }

            // Consider shop cards if strategy says to (and if game exposes available cards)
            if (options.considerShop && strategy > 0.5 && window && window.game) {
                const shop = window.game.availableCards || window.game.availablePowerCards || window.game.availableCards || [];
                for (const sc of shop) {
                    const def = sc;
                    if (!def || !def.effect) continue;
                    // If target can afford or almost afford protective card, reduce utility
                    const cost = def.cost || (def.effect && def.effect.cost) || 0;
                    const energy = player.energy || 0;
                    if (def.effect.target === 'yieldProtection' && (energy >= cost - 1)) {
                        modifiers.shopInfluences.push({ card: def.id || def.name, reason: 'yieldProtectionAvailable' });
                        modifiers.attackUtilityMultiplier *= 0.7;
                    }
                    if (def.effect.target === 'damageReduction' && (energy >= cost - 1)) {
                        modifiers.shopInfluences.push({ card: def.id || def.name, reason: 'damageReductionAvailable' });
                        modifiers.attackUtilityMultiplier *= 0.85;
                    }
                }
            }

        } catch (e) {
            console.warn('evaluateTargetPowerModifiersAsync failed', e);
        }

        // Store in per-turn cache before returning
        try {
            if (this._ttCache) {
                const turnKey = (window && window.game && window.game.currentPlayerTurn && window.game.currentPlayerTurn.id)
                    ? `turn:${window.game.currentPlayerTurn.id}`
                    : (window && window.game && window.game.currentRound && typeof window.game.currentPlayerIndex === 'number')
                        ? `round:${window.game.currentRound.roundNumber}:p${window.game.currentPlayerIndex}`
                        : `time:${Math.floor(Date.now() / 2000)}`;
                const cacheId = `${turnKey}::player:${player && player.id ? player.id : (player && player.monster && player.monster.name) || 'unknown'}`;
                this._ttCache.map.set(cacheId, { turnKey, modifiers: Object.assign({}, modifiers), storedAt: Date.now() });
                // Keep lastTurnKey for quick eviction if needed
                this._ttCache.lastTurnKey = turnKey;
                // Optional: prune cache if it grows too big
                if (this._ttCache.map.size > 300) {
                    // delete oldest entries (simple strategy)
                    const keys = Array.from(this._ttCache.map.keys()).slice(0, 50);
                    for (const k of keys) this._ttCache.map.delete(k);
                }
            }
        } catch (cacheErr) {
            console.warn('AI per-turn cache store failed', cacheErr);
        }

        return modifiers;
    }

    /**
     * Synchronous wrapper that returns conservative defaults immediately and
     * schedules async evaluation if needed. Callers that want exact modifiers
     * can await evaluateTargetPowerModifiersAsync.
     */
    evaluateTargetPowerModifiers(player, options = {}) {
        // Quick conservative defaults
        const defaults = {
            damageReduction: 0,
            yieldProtection: false,
            isUntargetable: false,
            attackUtilityMultiplier: 1,
            attackPriorityDelta: 0,
            healPossible: false,
            extraHP: 0,
            canBlockDamageWithEnergy: false,
            shopInfluences: []
        };

        // Try to return a cached value from the per-turn cache if available (synchronous fast path)
        try {
            if (this._ttCache) {
                let turnKey = null;
                if (window && window.game && window.game.currentPlayerTurn && window.game.currentPlayerTurn.id) {
                    turnKey = `turn:${window.game.currentPlayerTurn.id}`;
                } else if (window && window.game && window.game.currentRound && typeof window.game.currentPlayerIndex === 'number') {
                    turnKey = `round:${window.game.currentRound.roundNumber}:p${window.game.currentPlayerIndex}`;
                }
                const cacheId = `${turnKey || 'time:null'}::player:${player && player.id ? player.id : (player && player.monster && player.monster.name) || 'unknown'}`;
                const cached = this._ttCache.map.get(cacheId);
                if (cached && cached.modifiers) {
                    if (window && window.UI && window.UI._debug) window.UI._debug(`AI sync-cache hit for ${cacheId}`);
                    return Object.assign({}, cached.modifiers);
                }
            }
        } catch (syncCacheErr) {
            // ignore and fall back to defaults
        }

        // Kick off async evaluation in background for better accuracy next time
        this.evaluateTargetPowerModifiersAsync(player, options).catch(() => {});
        return defaults;
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

        // Known dice-enhancing cards (fallback list)
        const diceCards = ['Extra Head', 'Giant Brain', 'Opportunist'];

        // Try the centralized helper once (fast sync wrapper that may return cached modifiers)
        try {
            const mods = this.evaluateTargetPowerModifiers(player, { considerShop: false });
            // If helper indicates extra dice or attack-dice capability, treat as dice-dependent
            if (mods && (mods.extraDice || mods.attackDice || mods.rollProbabilityBonus)) return true;
        } catch (e) {
            // ignore and fall back to name-based detection below
        }

        // Fallback name-based detection (used only if helper doesn't provide dice info)
        try {
            if (player.powerCards && player.powerCards.some(card => diceCards.includes(card.name))) return true;
        } catch (e) {
            // Defensive: if player's powerCards isn't iterable, ignore
        }

        // Players with low energy depend on dice for energy generation
        if (typeof player.energy === 'number' && player.energy <= 3) return true;

        return false;
    }

    // Check if opponent can easily heal ailment tokens
    opponentCanEasilyHeal(opponent) {
        // Prefer centralized modifier evaluation to detect healing capability
        try {
            const mods = this.evaluateTargetPowerModifiers(opponent, { considerShop: false });
            if (mods && mods.healPossible) return true;
        } catch (e) {
            // ignore and fall back to name-based checks
        }

        // Fallback: check common healing card names conservatively
        try {
            const healingCards = ['Regeneration', 'Healing Ray', 'Dedicated News Team'];
            const hasHealingCards = opponent.powerCards && opponent.powerCards.some(card => healingCards.includes(card.name));
            if (hasHealingCards) return true;
        } catch (e) {}

        // Check if they're outside Tokyo (can heal with hearts) or have energy to buy healing
        if (!opponent.inTokyo && typeof opponent.energy === 'number' && opponent.energy >= 2) return true;

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
    evaluateDiceEnhanced(currentDice, player, situation, probabilities) {
        const diceToKeep = [];
        const personality = player.monster.personality;
        
        console.log('🎲 DEBUG: Evaluating dice:', currentDice, 'Current state:', probabilities.currentState);
        
        // Pre-analyze potential number combinations to boost their value
        const numberComboPotential = this.analyzeNumberCombinations(currentDice);
        console.log('🎯 DEBUG: Number combination potential:', numberComboPotential);
        
        currentDice.forEach((face, index) => {
            let keepProbability = this.getDiceKeepProbability(face, situation, personality, probabilities.currentState);
            
            // Apply combination bonuses for number dice
            if (numberComboPotential[face] && numberComboPotential[face].count >= 2) {
                const bonusMultiplier = numberComboPotential[face].count >= 3 ? 3.0 : 2.0;
                keepProbability *= bonusMultiplier;
                console.log(`🎯 COMBO BONUS: Boosting ${face} probability by ${bonusMultiplier}x to`, keepProbability, 'due to', numberComboPotential[face].count, 'available');
            }
            
            // Apply extra dice bonus to keep probability
            keepProbability *= (1 + probabilities.extraDiceBonus);
            
            // Enhanced decision logic based on current state
            const shouldKeep = this.shouldKeepDiceEnhanced(face, keepProbability, probabilities.currentState, situation);
            
            console.log(`🎲 DEBUG: Dice ${index} (${face}) - keepProb: ${keepProbability.toFixed(2)}, shouldKeep: ${shouldKeep}`);
            
            if (shouldKeep) {
                diceToKeep.push({ 
                    face, 
                    index, 
                    probability: keepProbability,
                    strategicValue: this.calculateDiceStrategicValue(face, situation, probabilities, numberComboPotential)
                });
            }
        });
        
        console.log('🎲 DEBUG: Final dice to keep:', diceToKeep.map(d => `${d.index}:${d.face}`));
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
        
        // Base strategic value
        switch (face) {
            case 'heart':
                value = situation.player.health <= 5 ? 30 : 10;
                break;
            case 'energy':
                value = situation.player.energy <= 3 ? 25 : 15;
                break;
            case 'attack':
                value = situation.player.isInTokyo ? 20 : 15;
                break;
            case 'one':
                // CRITICAL FIX: Pairs give ZERO VP in King of Tokyo - only 3+ of a kind matter
                if (numberComboPotential[face]) {
                    const count = numberComboPotential[face].count;
                    value = count >= 3 ? 150 : (count >= 2 ? 25 : 5); // Pairs much lower value since they give 0 VP
                } else {
                    value = probabilities.currentState.ones >= 3 ? 80 :
                           (probabilities.currentState.ones === 2 ? 15 : 1); // Pairs are only valuable for potential
                }
                break;
            case 'two':
                // CRITICAL FIX: Pairs give ZERO VP in King of Tokyo - only 3+ of a kind matter
                if (numberComboPotential[face]) {
                    const count = numberComboPotential[face].count;
                    value = count >= 3 ? 180 : (count >= 2 ? 35 : 8); // Pairs much lower value since they give 0 VP
                } else {
                    value = probabilities.currentState.twos >= 3 ? 100 : 
                           (probabilities.currentState.twos === 2 ? 20 : 2); // Pairs are only valuable for potential
                }
                break;
            case 'three':
                // CRITICAL FIX: Pairs give ZERO VP in King of Tokyo - only 3+ of a kind matter
                if (numberComboPotential[face]) {
                    const count = numberComboPotential[face].count;
                    value = count >= 3 ? 220 : (count >= 2 ? 45 : 12); // Pairs much lower value since they give 0 VP
                } else {
                    value = probabilities.currentState.threes >= 3 ? 120 : 
                           (probabilities.currentState.threes === 2 ? 25 : 3); // Pairs are only valuable for potential
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

    shouldKeepDiceEnhanced(face, keepProbability, currentState, situation = {}) {
        // CRITICAL: Check if this is the first turn of the game
        const gameState = situation.gameState || situation;
        const isFirstTurn = gameState?.round === 1 && gameState?.currentPlayerIndex === 0;
        
        // On first turn as first player, NEVER keep attack or hearts - they're completely useless
        if (isFirstTurn && (face === 'attack' || face === 'heart')) {
            console.log(`🚫 FIRST TURN: Never keeping ${face} on first turn as first player - completely useless`);
            return false;
        }
        
        // Special logic for number combinations - SIGNIFICANTLY boost pairs/triples
        if (face === 'one' && currentState.ones >= 2) return true;
        if (face === 'two' && currentState.twos >= 2) return true;
        if (face === 'three' && currentState.threes >= 2) return true;
        
        // For single number dice, apply much stricter logic that prioritizes combinations
        if (face === 'one' || face === 'two' || face === 'three') {
            // MAJOR FIX: Strongly favor pairs over single high numbers
            const hasBetterCombination = (currentState.ones >= 2 && face !== 'one') ||
                                       (currentState.twos >= 2 && face !== 'two') ||
                                       (currentState.threes >= 2 && face !== 'three');
            
            if (hasBetterCombination) {
                console.log(`❌ Not keeping single ${face} because we have better combinations:`, {
                    ones: currentState.ones,
                    twos: currentState.twos, 
                    threes: currentState.threes,
                    currentFace: face
                });
                return false;
            }
            
            // NEW: Check if we have an incomplete pair that's more valuable than this single
            const incompleteHigherPairs = [];
            if (currentState.threes === 1 && face !== 'three') incompleteHigherPairs.push({ type: 'three', value: 9 });
            if (currentState.twos === 1 && face !== 'two' && face !== 'three') incompleteHigherPairs.push({ type: 'two', value: 6 });
            
            // If we have a single three and this is a one or two, don't keep it
            if (incompleteHigherPairs.length > 0) {
                const faceValue = face === 'three' ? 9 : (face === 'two' ? 6 : 3);
                const bestIncompleteValue = Math.max(...incompleteHigherPairs.map(p => p.value));
                
                if (faceValue < bestIncompleteValue) {
                    console.log(`❌ Not keeping single ${face} (value: ${faceValue}) because we have incomplete higher combo (value: ${bestIncompleteValue})`);
                    return false;
                }
            }
            
            // Don't keep single number dice if we have multiple good non-number dice
            const goodNonNumberDice = (currentState.attacks || 0) + (currentState.energy || 0) + (currentState.heal || 0);
            if (goodNonNumberDice >= 2) {
                console.log(`❌ Not keeping single ${face} because we have ${goodNonNumberDice} good non-number dice (attack/energy/heal)`);
                return false;
            }
            
            // For single number dice, require a much higher threshold unless it's desperate
            const singleNumberThreshold = goodNonNumberDice >= 1 ? 0.85 : 0.7; // Even higher if we have any good dice
            const shouldKeep = keepProbability >= singleNumberThreshold;
            console.log(`🎲 Single ${face} decision: probability=${keepProbability.toFixed(2)}, threshold=${singleNumberThreshold}, goodNonNumber=${goodNonNumberDice}, keeping=${shouldKeep}`);
            return shouldKeep;
        }
        
        // Always keep if probability is very high (for non-single number dice)
        if (keepProbability >= 0.8) return true;
        
        // Don't keep if probability is very low
        if (keepProbability <= 0.2) return false;
        
        // For non-number dice (attack, heart, energy), check if we should prioritize number combinations
        if (face === 'attack' || face === 'heart' || face === 'energy') {
            // Enhanced first turn logic - be more restrictive on attack/hearts early game
            if (gameState?.round <= 2) {
                if (face === 'attack' && keepProbability < 0.7) {
                    console.log(`❌ Early game: Not keeping ${face} (probability: ${keepProbability.toFixed(2)}) - attacks less valuable early`);
                    return false;
                }
                if (face === 'heart' && keepProbability < 0.6) {
                    console.log(`❌ Early game: Not keeping ${face} (probability: ${keepProbability.toFixed(2)}) - healing less valuable early`);
                    return false;
                }
            }
            
            // Check if we have incomplete number combinations that are more valuable
            const incompleteCombos = [];
            if (currentState.ones === 2) incompleteCombos.push({ type: 'ones', vpValue: 1 });
            if (currentState.twos === 2) incompleteCombos.push({ type: 'twos', vpValue: 2 });
            if (currentState.threes === 2) incompleteCombos.push({ type: 'threes', vpValue: 3 });
            
            // If we have incomplete high-value combos, be more selective about keeping non-number dice
            if (incompleteCombos.length > 0) {
                const bestComboValue = Math.max(...incompleteCombos.map(c => c.vpValue));
                
                // For hearts, only keep if we're critically injured and the combo value isn't too high
                if (face === 'heart') {
                    const player = situation.player || {};
                    const healthRatio = player.health && player.maxHealth ? (player.health / player.maxHealth) : 1;
                    const isCriticallyInjured = healthRatio <= 0.3; // 30% health or less
                    
                    if (!isCriticallyInjured && bestComboValue >= 2) {
                        console.log(`❌ Not keeping ${face} because we have incomplete ${bestComboValue}VP combo and health isn't critical (${Math.round(healthRatio * 100)}%)`);
                        return false;
                    }
                }
                
                // For energy, only keep if we're very low on energy and the combo value isn't max
                if (face === 'energy') {
                    const player = situation.player || {};
                    const energyCount = player.energy || 0;
                    const isEnergyDesperate = energyCount <= 1;
                    
                    if (!isEnergyDesperate && bestComboValue >= 3) {
                        console.log(`❌ Not keeping ${face} because we have incomplete ${bestComboValue}VP combo and energy isn't desperate (${energyCount})`);
                        return false;
                    }
                }
                
                // For attack, be more lenient but still consider high-value combos
                if (face === 'attack') {
                    // Only reject attack if we have a 3VP combo potential and no immediate threats
                    if (bestComboValue >= 3 && keepProbability < 0.7) {
                        console.log(`❌ Not keeping ${face} because we have incomplete ${bestComboValue}VP combo and attack probability is only ${keepProbability.toFixed(2)}`);
                        return false;
                    }
                }
            }
            
            // Use standard threshold if no incomplete combos or exceptions apply
            return keepProbability >= 0.5;
        }
        
        // Standard threshold for everything else
        return keepProbability >= 0.6; // Slightly higher threshold for better decisions
    }

    async makeKeepDecisionEnhanced(diceEvaluations, rollsRemaining, player, situation, probabilities) {
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
        
        // Calculate total strategic value
        const totalValue = diceEvaluations.reduce((sum, dice) => sum + dice.strategicValue, 0);
        const currentValue = probabilities.currentState.victoryPoints + probabilities.currentState.hearts + probabilities.currentState.energy + probabilities.currentState.attacks;
        
        console.log('🔍 DEBUG: Strategic values - total:', totalValue, 'current:', currentValue, 'dice count:', diceEvaluations.length);
        
        // CRITICAL: Check if we have incomplete number combinations that need the third dice
        const incompleteCombos = this.checkIncompleteNumberCombinations(probabilities.currentState, rollsRemaining, player);
        if (incompleteCombos.shouldContinue && rollsRemaining > 0) {
            console.log('🎯 INCOMPLETE COMBO: Must continue rolling -', incompleteCombos.reason);
            
            // ADVANCED STRATEGY: If we need to drop a pair to focus on another, filter the dice
            let finalKeepDice = diceEvaluations.map(d => d.index);
            
            if (incompleteCombos.dropCombo && incompleteCombos.focusCombo) {
                // Final roll strategy: drop the lower-value pair, keep only the higher-value pair
                console.log(`🎯 FINAL ROLL FOCUS: Dropping ${incompleteCombos.dropCombo.type}, keeping only ${incompleteCombos.focusCombo.type}`);
                
                // Filter out dice from the combo we want to drop
                const dropDiceType = incompleteCombos.dropCombo.type.slice(0, -1); // Remove 's' from 'ones'/'twos'/'threes'
                finalKeepDice = diceEvaluations
                    .filter(dice => dice.face !== dropDiceType)
                    .map(d => d.index);
                
                console.log(`🎯 FILTERED DICE: Originally keeping ${diceEvaluations.length} dice, now keeping ${finalKeepDice.length} dice (dropped ${dropDiceType}s)`);
            }
            
            return {
                action: 'reroll',
                keepDice: finalKeepDice,
                reason: incompleteCombos.reason,
                confidence: 0.9
            };
        }

        // Heuristic: If we already have a triple of one number but also have a pair
        // of another number, prefer to hold the triple and reroll the other dice
        // to try converting that pair into another triple (aggressive VP optimization).
        // Example: 4x 'three' and 2x 'two' -> keep the 3s, reroll the 2s.
        if (rollsRemaining > 0) {
            const cs = probabilities.currentState || {};
            const ones = cs.ones || 0;
            const twos = cs.twos || 0;
            const threes = cs.threes || 0;

            const hasTriple = ones >= 3 || twos >= 3 || threes >= 3;
            const hasOtherPair = (ones >= 2 && ones < 3) || (twos >= 2 && twos < 3) || (threes >= 2 && threes < 3);

            if (hasTriple && hasOtherPair) {
                // Find which face is the triple we should hold (prefer highest face)
                let holdFace = null;
                if (threes >= 3) holdFace = 'three';
                else if (twos >= 3) holdFace = 'two';
                else if (ones >= 3) holdFace = 'one';

                if (holdFace) {
                    const finalKeepDice = diceEvaluations
                        .filter(d => d.face === holdFace)
                        .map(d => d.index);

                    if (finalKeepDice.length > 0) {
                        return {
                            action: 'reroll',
                            keepDice: finalKeepDice,
                            reason: `Holding ${holdFace} triple, rerolling other dice to convert pairs`,
                            confidence: 0.8
                        };
                    }
                }
            }
        }
        
        // Enhanced stopping conditions - much higher thresholds to prevent premature stopping
        if (totalValue >= 300 || currentValue >= 12) {
            return {
                action: 'endRoll',
                keepDice: diceEvaluations.map(d => d.index),
                reason: `Exceptional strategic value achieved (total: ${totalValue}, current: ${currentValue})`,
                confidence: 0.85
            };
        }
        
        // Risk-adjusted continuation logic - be more aggressive about continuing
        let continueThreshold = risk >= 4 ? 2 : (risk <= 2 ? 5 : 4); // Increased thresholds
        // Only apply extraDiceBonus if it's significant 
        if (probabilities.extraDiceBonus > 0.1) {
            continueThreshold -= 1;
        }
        
        console.log(`🎲 DEBUG: Continue threshold: ${continueThreshold}, dice count: ${diceEvaluations.length}, risk: ${risk}`);

        // Evaluate expected victory points (EV) for a small set of candidate keep sets
        // and choose the option that maximizes EV adjusted by risk tolerance.
        if (rollsRemaining > 0) {
            const totalDice = 6; // standard dice count

            // Helper: compute expected VP when rerolling N dice given current counts
            const expectedVPWhenRerolling = (currentCounts, rerollCount) => {
                // For each face '1','2','3' compute expected contribution
                const p = 1 / 6; // chance for a specific number on each die
                let ev = 0;

                ['1','2','3'].forEach(face => {
                    const current = currentCounts[face] || 0;
                    // Sum over possible successes from 0..rerollCount
                    for (let k = 0; k <= rerollCount; k++) {
                        // probability of k successes
                        const comb = factorial(rerollCount) / (factorial(k) * factorial(rerollCount - k));
                        const prob = comb * Math.pow(p, k) * Math.pow(1 - p, rerollCount - k);
                        const finalCount = current + k;
                        if (finalCount >= 3) {
                            const basePoints = parseInt(face, 10);
                            const extra = finalCount - 3;
                            const points = basePoints + extra;
                            ev += prob * points;
                        }
                    }
                });

                return ev;
            };

            // Small factorial helper
            const factorial = (n) => n <= 1 ? 1 : n * factorial(n - 1);

            // Build current counts from actual dice results
            const currentDiceFaces = probabilities.currentState || {};
            const currentCounts = {
                '1': currentDiceFaces.ones || 0,
                '2': currentDiceFaces.twos || 0,
                '3': currentDiceFaces.threes || 0
            };

            // Generate candidate keep sets: keepAll, keepThrees, keepTwos, keepOnes, keepCurrent
            const keptByFace = (face) => {
                // keep indices of dice that currently match face
                return diceEvaluations.filter(d => d.face === faceToName(face)).map(d => d.index);
            };

            const faceToName = (face) => {
                // Accept '1','2','3' to names used in evaluateDiceEnhanced (one/two/three or '1'?)
                // Our diceEvaluations use faces like 'one','two','three' earlier; probabilities.currentState uses ones/twos/threes.
                // So map numeric string to word where needed for diceEvaluations comparisons.
                const map = { '1': 'one', '2': 'two', '3': 'three' };
                return map[face] || face;
            };

            // Count kept indices for each candidate using existing dice data
            const candidates = [];

            // Candidate: keep all current number-scoring dice (i.e., any that contribute to numbers)
            const keepCurrent = diceEvaluations.map(d => d.index);
            candidates.push({ label: 'keepCurrent', keep: keepCurrent });

            // Candidate: keep only threes
            const keepThrees = diceEvaluations.filter(d => d.face === 'three').map(d => d.index);
            candidates.push({ label: 'keepThrees', keep: keepThrees });

            // Candidate: keep only twos
            const keepTwos = diceEvaluations.filter(d => d.face === 'two').map(d => d.index);
            candidates.push({ label: 'keepTwos', keep: keepTwos });

            // Candidate: keep only ones
            const keepOnes = diceEvaluations.filter(d => d.face === 'one').map(d => d.index);
            candidates.push({ label: 'keepOnes', keep: keepOnes });

            // Candidate: keep none (reroll all)
            candidates.push({ label: 'keepNone', keep: [] });

            // Evaluate each candidate
            const currentVP = this.calculateCurrentVPFromCounts(currentCounts);
            let best = null;
            // Evaluate candidates in sequence to allow awaiting power-card modifier checks for high-strategy CPUs
            for (const c of candidates) {
                const keptCount = c.keep.length;
                const rerollCount = totalDice - keptCount;

                // Build counts assuming kept dice are those kept (we'll approximate using currentCounts proportions)
                // For simplicity, assume kept dice reflect currentCounts proportionally; better accuracy requires actual dice list.
                const adjustedCounts = Object.assign({}, currentCounts);

                // Expected VP after reroll
                const ev = expectedVPWhenRerolling(adjustedCounts, rerollCount);

                // Utility: EV adjusted by risk preference (risk 1-5). Higher risk adds weight to chance of improvement.
                // Calculate simple improvement chance: ev > currentVP probability approximated by (ev - currentVP)/max(1,currentVP)
                const improvementMetric = Math.max(0, ev - currentVP);
                const riskFactor = (player?.monster?.personality?.risk || 3) - 3; // -2..+2
                const utility = ev + (riskFactor * 0.5 * improvementMetric);

                c.ev = ev;
                // --- Attack/threat adjustment ---
                // Compute probability to roll at least one attack across the reroll attempts (approx across remaining rolls)
                const perDieAttackProb = 1 / 6;
                const singleRollNoAttackProb = Math.pow(1 - perDieAttackProb, rerollCount);
                // Approximate across remaining rolls: chance to get at least one attack in remaining attempts
                const attackProbTotal = 1 - Math.pow(singleRollNoAttackProb, Math.max(1, rollsRemaining));

                // Determine threat level from situation: prioritize attacking if someone in Tokyo is an immediate win threat
                let attackPriority = 0; // 0..5
                if (situation && situation.threats && situation.threats.length > 0) {
                    // Find a player in Tokyo with highest threat
                    const tokyoThreat = situation.threats.find(t => t.player && t.player.isInTokyo) || null;
                    if (tokyoThreat) {
                        const vp = tokyoThreat.player.victoryPoints || 0;
                        if (tokyoThreat.isCritical || vp >= AI_CONSTANTS.THREAT_DETECTION.highVP) attackPriority = 5;
                        else if (vp >= AI_CONSTANTS.THREAT_DETECTION.tokyoVP) attackPriority = 4;
                        else attackPriority = Math.min(3, Math.max(1, Math.floor(tokyoThreat.level || 2)));
                    }
                }

                // Extra incentive if this CPU is one point away from winning: prefer attacks that let you enter Tokyo on kill
                const cpuNeedsVP = Math.max(0, (player?.victoryPoints || 0) - 0);
                // If CPU is one point from winning, weight attacks higher
                if ((player && player.victoryPoints >= 17) ) {
                    attackPriority = Math.max(attackPriority, 4);
                }

                // Base attack value (how valuable is getting at least one attack? scale with priority)
                const baseAttackValue = 3; // heuristic points-equivalent for a single attack in urgent contexts
                let attackUtility = attackProbTotal * baseAttackValue * (1 + attackPriority * 0.25);

                // Adjust attack utility based on known opponent power-cards and situation
                let adjustedAttackUtility = attackUtility;
                try {
                    const tokyoThreat = situation && situation.threats ? situation.threats.find(t => t.player && t.player.isInTokyo) : null;
                    if (tokyoThreat && tokyoThreat.player) {
                        const victim = tokyoThreat.player;

                        // For high-strategy monsters, await a more thorough modifier evaluation (may consult shop)
                        const strategyLevel = (player && player.monster && player.monster.personality) ? player.monster.personality.strategy : 3;
                        let modifiers = null;
                        if (strategyLevel >= 4 && typeof this.evaluateTargetPowerModifiersAsync === 'function') {
                            // await the async evaluator, pass considerShop for strategic players
                            try {
                                modifiers = await this.evaluateTargetPowerModifiersAsync(victim, { strategyLevel: strategyLevel / 5, considerShop: true });
                                console.debug('[AI DEBUG] modifiers for victim', victim.id || victim.name, modifiers);
                            } catch (e) {
                                console.warn('AI: evaluateTargetPowerModifiersAsync failed', e);
                                modifiers = this.evaluateTargetPowerModifiers(victim, { strategyLevel: strategyLevel / 5, considerShop: true });
                            }
                        } else {
                            // Low-strategy: use fast synchronous conservative defaults
                            modifiers = this.evaluateTargetPowerModifiers(victim, { strategyLevel: strategyLevel / 5, considerShop: false });
                        }

                        // Apply modifiers to adjust attack utility and expected damage
                        if (modifiers) {
                            if (modifiers.yieldProtection) adjustedAttackUtility *= (modifiers.attackUtilityMultiplier || 0.5);
                            if (modifiers.canBlockDamageWithEnergy) adjustedAttackUtility *= (modifiers.attackUtilityMultiplier || 0.6);
                            if (modifiers.isUntargetable) adjustedAttackUtility = 0;

                            // Compute damage estimate considering damageReduction and extraHP
                            const damageReduction = modifiers.damageReduction || 0;
                            const currentKeptAttacks = c.keep ? diceEvaluations.filter(d => c.keep.includes(d.index) && d.face === 'attack').length : 0;
                            const expectedFutureAttacks = perDieAttackProb * rerollCount * Math.max(1, rollsRemaining);
                            const approxExpectedDamage = currentKeptAttacks + expectedFutureAttacks - damageReduction;
                            const targetHealth = (victim.health || 10) + (modifiers.extraHP || 0);
                            if (approxExpectedDamage >= Math.max(1, targetHealth - 1)) {
                                adjustedAttackUtility *= 1.8;
                            }
                        }
                    }
                } catch (e) {
                    console.warn('AI: error adjusting attack utility', e);
                }

                // Combine EV utility with adjusted attack utility, factoring risk preference
                c.utility = utility + (adjustedAttackUtility * (1 + (riskFactor * 0.3)));

                // Debug trace for candidate utilities
                if (typeof console !== 'undefined' && console.debug) {
                    console.debug('[AI DEBUG] candidate', c.label, {
                        ev: c.ev,
                        attackProbTotal,
                        attackPriority,
                        baseAttackValue,
                        attackUtilityBeforeAdjust: attackUtility,
                        attackUtilityAfterAdjust: adjustedAttackUtility,
                        utilityBefore: utility,
                        utilityFinal: c.utility
                    });
                }

                if (!best || c.utility > best.utility) best = c;
            }

            if (best) {
                // If best candidate is to keep all current scoring dice and it yields no reroll, consider ending
                if (best.label === 'keepCurrent' && best.keep.length === totalDice) {
                    return {
                        action: 'endRoll',
                        keepDice: best.keep,
                        reason: `Best EV indicates stopping (${best.label})`,
                        confidence: 0.8
                    };
                }

                // If best implies keeping something and rerolling others, continue rolling
                if (rollsRemaining > 0) {
                    return {
                        action: 'reroll',
                        keepDice: best.keep,
                        reason: `EV-based choice: ${best.label} (ev=${best.ev.toFixed(3)})`,
                        confidence: 0.75
                    };
                }
            }
        }

        if (diceEvaluations.length < continueThreshold && rollsRemaining > 0) {
            return {
                action: 'reroll',
                keepDice: diceEvaluations.map(d => d.index),
                reason: `Continue with ${diceEvaluations.length} dice (enhanced threshold: ${continueThreshold}, risk: ${risk})`,
                confidence: 0.7
            };
        }
        
        return {
            action: 'endRoll',
            keepDice: diceEvaluations.map(d => d.index),
            reason: `Stopping with sufficient dice (enhanced risk: ${risk})`,
            confidence: 0.6
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
    checkIncompleteNumberCombinations(currentState, rollsRemaining, player = null) {
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

        // ADVANCED MULTI-ROLL STRATEGY: Handle multiple pairs with roll-dependent logic
        if (incompleteCombos.length >= 2) {
            console.log('🎯 MULTIPLE PAIRS STRATEGY: Analyzing', incompleteCombos.length, 'pairs with', rollsRemaining, 'rolls left');
            
            // Use personality-based decision making
            const personality = player?.monster?.personality || { risk: 3 };
            const pairDecision = this.makeMultiplePairDecision(incompleteCombos, rollsRemaining, personality);
            
            if (pairDecision.strategy === 'keep_both') {
                return { 
                    shouldContinue: true, 
                    reason: pairDecision.reason
                };
            } else if (pairDecision.strategy === 'focus_best') {
                return { 
                    shouldContinue: true, 
                    reason: pairDecision.reason,
                    focusCombo: pairDecision.focusCombo,
                    dropCombo: pairDecision.dropCombo
                };
            }
        }

        // Single incomplete combo logic with roll-dependent strategy
        if (incompleteCombos.length === 1) {
            const combo = incompleteCombos[0];
            
            // Calculate dice available for reroll
            const diceKept = (currentState.ones || 0) + (currentState.twos || 0) + (currentState.threes || 0) + 
                           (currentState.attacks || 0) + (currentState.energy || 0) + (currentState.heal || 0);
            const diceToReroll = 6 - diceKept;
            
            if (diceToReroll <= 0) {
                return { shouldContinue: false, reason: 'No dice available to reroll for completion' };
            }
            
            // Calculate probability of success
            const successProbability = this.calculateCompletionProbability(combo.type, diceToReroll, rollsRemaining);
            
            console.log(`🎯 SINGLE PAIR ANALYSIS: ${combo.type} (${combo.vpValue}VP) - ${successProbability.toFixed(1)}% chance with ${diceToReroll} dice, ${rollsRemaining} rolls`);
            
            // Risk-based decision threshold
            const minimumProbability = rollsRemaining >= 2 ? 15 : 25; // Lower threshold with more rolls
            
            if (successProbability >= minimumProbability) {
                return {
                    shouldContinue: true,
                    reason: `${combo.reason} - ${successProbability.toFixed(1)}% success chance (${diceToReroll} dice, ${rollsRemaining} rolls)`,
                    combo: combo,
                    probability: successProbability
                };
            } else {
                return { 
                    shouldContinue: false, 
                    reason: `Low success probability (${successProbability.toFixed(1)}%) for ${combo.type} completion - not worth the risk` 
                };
            }
        }

        return { shouldContinue: false, reason: 'No incomplete number combinations' };
    }
    
    // Calculate probability of completing a triplet
    calculateCompletionProbability(numberType, diceToReroll, rollsRemaining) {
        if (diceToReroll <= 0 || rollsRemaining <= 0) return 0;
        
        // Base probability of rolling the needed number on a single die
        const singleDieProbability = 1/6; // 16.67%
        
        // Probability of NOT getting the number on a single die
        const failureProbability = 5/6; // 83.33%
        
        // For multiple dice in a single roll: 1 - (probability of failing on all dice)
        const singleRollSuccess = 1 - Math.pow(failureProbability, diceToReroll);
        
        // For multiple rolls: probability of success in at least one roll
        const overallFailure = Math.pow(1 - singleRollSuccess, rollsRemaining);
        const overallSuccess = 1 - overallFailure;
        
        return overallSuccess * 100; // Return as percentage
    }

    // Enhanced risk-based decision making for multiple pairs
    makeMultiplePairDecision(incompleteCombos, rollsRemaining, personality) {
        const risk = personality?.risk || 3;
        
        console.log(`🎯 MULTIPLE PAIR DECISION: ${incompleteCombos.length} pairs, ${rollsRemaining} rolls, risk level ${risk}`);
        
        if (rollsRemaining >= 2) {
            // Early rolls: All personality types should keep both pairs
            return {
                strategy: 'keep_both',
                reason: `Early roll (${rollsRemaining} rolls left) - keeping both pairs regardless of risk level`
            };
        } else if (rollsRemaining === 1) {
            // Final roll: Risk-based decision
            const bestCombo = incompleteCombos.reduce((best, current) => 
                current.vpValue > best.vpValue ? current : best
            );
            const worstCombo = incompleteCombos.reduce((worst, current) => 
                current.vpValue < worst.vpValue ? current : worst
            );
            
            // Calculate potential VP gain difference
            const vpDifference = bestCombo.vpValue - worstCombo.vpValue;
            
            if (risk >= 4) {
                // High risk: Go for maximum VP, keep both pairs ("shoot the moon")
                if (vpDifference >= 2) {
                    // Significant difference: still go for broke
                    return {
                        strategy: 'keep_both',
                        reason: `High-risk personality shooting for maximum VP (both ${bestCombo.type} and ${worstCombo.type}) despite final roll`
                    };
                } else {
                    // Small difference: focus on better odds
                    return {
                        strategy: 'focus_best',
                        focusCombo: bestCombo,
                        dropCombo: worstCombo,
                        reason: `High-risk but small VP difference (${vpDifference}) - focusing on ${bestCombo.type} for better odds`
                    };
                }
            } else if (risk <= 2) {
                // Low risk: Always focus on highest value with best odds
                return {
                    strategy: 'focus_best',
                    focusCombo: bestCombo,
                    dropCombo: worstCombo,
                    reason: `Conservative personality focusing on highest value (${bestCombo.type} for ${bestCombo.vpValue}VP) with better odds`
                };
            } else {
                // Medium risk: Balanced decision based on VP difference
                if (vpDifference >= 2) {
                    // Large difference: focus on better combo
                    return {
                        strategy: 'focus_best',
                        focusCombo: bestCombo,
                        dropCombo: worstCombo,
                        reason: `Moderate risk with significant VP difference (${vpDifference}) - focusing on ${bestCombo.type}`
                    };
                } else {
                    // Small difference: slight preference for "shooting the moon"
                    return {
                        strategy: 'keep_both',
                        reason: `Moderate risk with small VP difference (${vpDifference}) - attempting both pairs for maximum VP`
                    };
                }
            }
        }
        
        return {
            strategy: 'keep_both',
            reason: 'Default strategy - keeping both pairs'
        };
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
        const tokyoHealthLow = tokyoHealth <= 3;
        const myHealthCritical = myHealth <= 2;
        const tokyoHealthCritical = tokyoHealth <= 2;
        
        // Check for protective power cards (like Jets)
        const hasTokyoProtection = this.hasTokyoProtectionCards(player);
        console.log(`🏛️ PROTECTION: Has Tokyo protection cards: ${hasTokyoProtection}`);
        
        // AVOID TOKYO scenarios
        if (myHealthCritical && !hasTokyoProtection) {
            // Critical health - avoid Tokyo at all costs unless very aggressive
            if (aggression < 4) {
                return {
                    avoidTokyo: true,
                    targetTokyo: false,
                    reason: `Critical health (${myHealth}) - avoiding Tokyo entry unless very aggressive`
                };
            }
        }
        
        if (myHealthLow && !tokyoHealthCritical && !hasTokyoProtection) {
            // Low health, but Tokyo player is healthy - consider personality
            if (risk <= 2) {
                // Risk-averse - avoid Tokyo
                return {
                    avoidTokyo: true,
                    targetTokyo: false,
                    reason: `Low health (${myHealth}) + risk-averse personality - avoiding Tokyo`
                };
            } else if (strategy_trait >= 4) {
                // Strategic - look for protection cards instead
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
        // Use the unified modifiers helper to determine if the player has protection
        try {
            const mods = this.evaluateTargetPowerModifiers(player, { considerShop: false });
            if (mods) {
                if (mods.isUntargetable) return true;
                if (mods.canBlockDamageWithEnergy) return true;
                if (mods.damageReduction && mods.damageReduction > 0) return true;
                if (mods.healPossible) return true;
            }
        } catch (e) {
            // ignore and fallback
        }

        // Fallback: conservative check against names
        if (!Array.isArray(player.powerCards)) return false;
        const protectionCards = [ 'Jets', 'Armor Plating', 'Healing Ray', 'Force Field', 'Regeneration' ];
        return player.powerCards.some(card => protectionCards.includes(card.name));
    }

    // Evaluate the value of Tokyo protection cards based on strategy and health
    evaluateTokyoProtectionValue(card, player) {
        const personality = player.monster.personality;
        const strategy_trait = personality?.strategy || 3;
        const aggression = personality?.aggression || 3;
        const myHealth = player.health || 10;

        // Use modifiers to score protection value instead of hardcoded card names
        const mods = this.evaluateTargetPowerModifiers(player, { considerShop: false });
        let value = 0;
        let reason = '';

        if (mods) {
            if (mods.canBlockDamageWithEnergy) { value += 60; reason += 'Can pay to avoid points/leave Tokyo; '; }
            if (mods.damageReduction && mods.damageReduction > 0) { value += 45 + (mods.damageReduction * 5); reason += `Damage reduction ${mods.damageReduction}; `; }
            if (mods.healPossible) { value += 40; reason += 'Has healing potential; '; }
            if (mods.isUntargetable) { value += 80; reason += 'Untargetable outside Tokyo; '; }
        }

        // Personality modifiers
        if (strategy_trait >= 4) { value *= 1.25; reason += 'Strategic personality ups value; '; }
        if (myHealth <= 3) { value *= 1.7; reason += `Critical low health (${myHealth}); `; }
        else if (myHealth <= 5) { value *= 1.2; reason += `Moderate health (${myHealth}); `; }
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

    hasAttackCards(player) {
        if (!player || !player.powerCards) return false;
        // Prefer centralized modifiers to detect attack-enhancing cards
        try {
            const mods = this.evaluateTargetPowerModifiers(player, { considerShop: false });
            if (mods) {
                if (mods.attackUtilityMultiplier && mods.attackUtilityMultiplier > 1) return true;
                if (mods.attackPriorityDelta && mods.attackPriorityDelta > 0) return true;
            }
        } catch (e) {
            // ignore and fallback
        }

        // Fallback to per-card detection
        return player.powerCards.some(card => this.isAttackCard(card));
    }

    // ===== NUMBER DICE VP HELPER =====
    // Calculates current VP contributed by number dice counts (1/2/3) following King of Tokyo rules:
    // - A set of three of a number gives that number in VP (three 1s = 1 VP, three 2s = 2 VP, three 3s = 3 VP)
    // - Each additional matching die beyond three adds +1 VP
    // counts: { '1': n1, '2': n2, '3': n3 }
    calculateCurrentVPFromCounts(counts) {
        if (!counts) return 0;
        let vp = 0;
        ['1','2','3'].forEach(face => {
            const c = counts[face] || 0;
            if (c >= 3) {
                const base = parseInt(face, 10); // 1,2,3
                vp += base + (c - 3); // extra dice beyond 3 each add +1
            }
        });
        return vp;
    }
}

// Make AIDecisionEngine available globally
window.AIDecisionEngine = AIDecisionEngine;