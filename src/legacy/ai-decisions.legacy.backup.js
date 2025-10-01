// Backup of previous ai-decisions.js prior to rewrite.
// Timestamp: 2025-09-21
// NOTE: This file is not loaded by the game; kept only for reference and potential cherry-picks.
// --- BEGIN LEGACY CONTENT ---
"use strict";
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

// (Legacy content truncated in backup to reduce file size for repository; refer to original commit for full version.)
// --- END LEGACY CONTENT ---

