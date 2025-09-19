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
            'Complete Destruction': { denyIf: 'aggressiveOpponentExists', priority: 'medium' }
        }
    }
};

class AIDecisionEngine {
    constructor() {
        this.config = null;
        this.loadConfiguration();
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
    makeRollDecision(currentDice, rollsRemaining, player, gameState) {
        if (!this.config) {
            // Fallback to simple behavior if config not loaded
            return { action: 'reroll', keepDice: [], reason: 'Config not loaded' };
        }

        console.log(`🧠 AI Decision for ${player.monster.name}:`, {
            dice: currentDice,
            rollsLeft: rollsRemaining,
            personality: player.monster.personality
        });

        // Analyze current situation
        const situation = this.analyzeSituation(player, gameState);
        console.log(`🧠 Situation analysis:`, situation);

        // Evaluate dice strategies
        const diceEvaluations = this.evaluateDice(currentDice, player, situation);
        console.log(`🧠 Dice evaluations:`, diceEvaluations);

        // 🧠 MULTI-PLAYER STRATEGIC THINKING: Generate complex thought process
        if (situation.multiPlayerScenarios && situation.multiPlayerScenarios.thoughtProcess.length > 0) {
            const strategicThought = this.selectStrategicThought(situation.multiPlayerScenarios, player);
            if (strategicThought) {
                this.addAILogicEntry(player, `🧠 Strategic Analysis: ${strategicThought}`, 'high');
            }
        }

        // Make final decision
        const decision = this.makeKeepDecision(diceEvaluations, rollsRemaining, player, situation);
        console.log(`🧠 Final decision:`, decision);

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

        // Players with specific synergies
        const synergyValue = this.calculateSynergyValueForPlayer(card, player);
        if (synergyValue > 0) {
            value += synergyValue;
            reason = `This card synergizes with ${player.monster}'s current strategy`;
        }

        return { value, reason };
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
            default:
                return false;
        }
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
}

// Make AIDecisionEngine available globally
window.AIDecisionEngine = AIDecisionEngine;