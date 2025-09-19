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

        // Make final decision
        const decision = this.makeKeepDecision(diceEvaluations, rollsRemaining, player, situation);
        console.log(`🧠 Final decision:`, decision);

        return decision;
    }

    /**
     * Analyze the current game situation including power card strategies
     */
    analyzeSituation(player, gameState) {
        const threats = this.identifyThreats(player, gameState);
        const opportunities = this.identifyOpportunities(player, gameState);
        const powerCardStrategy = this.evaluatePowerCardStrategy(player, gameState);
        
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
}

// Make AIDecisionEngine available globally
window.AIDecisionEngine = AIDecisionEngine;