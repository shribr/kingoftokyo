/**
 * Direct unit tests for card effect handlers
 * Tests handlers without queue system
 */

import { createEffectEngine } from '../effectEngine.js';
import { createPassiveEffectsProcessor } from '../passiveEffectsProcessor.js';

describe('Card Effect Handlers - Direct Tests', () => {
  
  let mockStore;
  let mockLogger;
  let mockState;
  let dispatched;
  
  beforeEach(() => {
    dispatched = [];
    mockState = {
      players: {
        order: ['player1', 'player2', 'player3'],
        byId: {
          player1: {
            id: 'player1',
            name: 'Player 1',
            health: 10,
            maxHealth: 10,
            energy: 5,
            victoryPoints: 3,
            powerCards: [],
            inTokyo: false,
            status: { alive: true }
          },
          player2: {
            id: 'player2',
            name: 'Player 2',
            health: 8,
            maxHealth: 10,
            energy: 3,
            victoryPoints: 5,
            powerCards: [],
            inTokyo: true,
            status: { alive: true }
          },
          player3: {
            id: 'player3',
            name: 'Player 3',
            health: 6,
            maxHealth: 10,
            energy: 2,
            victoryPoints: 2,
            powerCards: [],
            inTokyo: false,
            status: { alive: true }
          }
        }
      },
      tokyo: {
        city: 'player2',
        bay: null
      },
      meta: {
        turnCycleId: 1
      }
    };
    
    mockStore = {
      getState: () => mockState,
      dispatch: (action) => {
        dispatched.push(action);
        // Simulate state updates for certain actions
        if (action.type === 'PLAYER_HEALED') {
          const player = mockState.players.byId[action.payload.playerId];
          if (player) {
            player.health = Math.min(player.maxHealth, player.health + action.payload.amount);
          }
        }
        if (action.type === 'PLAYER_TAKE_DAMAGE') {
          const player = mockState.players.byId[action.payload.playerId];
          if (player) {
            player.health = Math.max(0, player.health - action.payload.amount);
          }
        }
        if (action.type === 'PLAYER_VP_GAINED') {
          const player = mockState.players.byId[action.payload.playerId];
          if (player) {
            player.victoryPoints += action.payload.amount;
          }
        }
        if (action.type === 'PLAYER_GAINED_ENERGY') {
          const player = mockState.players.byId[action.payload.playerId];
          if (player) {
            player.energy += action.payload.amount;
          }
        }
        return action;
      },
      subscribe: () => () => {}
    };
    
    mockLogger = {
      info: () => {},
      warn: () => {},
      error: () => {},
      system: () => {}
    };
  });
  
  describe('Phase 2: Simple Passive Effects', () => {
    
    test('getAttackBonus - should return attack bonus from Acid Attack', () => {
      mockState.players.byId.player1.powerCards = [
        { id: 'acid-attack', name: 'Acid Attack', effect: { kind: 'attack_bonus', value: 1, passive: true } }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      const bonus = processor.getAttackBonus('player1');
      expect(bonus).toBe(1);
    });
    
    test('getAttackBonus - should sum multiple attack bonuses', () => {
      mockState.players.byId.player1.powerCards = [
        { id: 'acid-attack', name: 'Acid Attack', effect: { kind: 'attack_bonus', value: 1, passive: true } },
        { id: 'poison-spit', name: 'Poison Spit', effect: { kind: 'attack_bonus', value: 2, passive: true } }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      const bonus = processor.getAttackBonus('player1');
      expect(bonus).toBe(3);
    });
    
    test('getTokyoAttackBonus - should return Tokyo attack bonus from Burrowing', () => {
      mockState.players.byId.player2.powerCards = [
        { id: 'burrowing', name: 'Burrowing', effect: { kind: 'tokyo_attack_bonus', value: 1 } }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      const bonus = processor.getTokyoAttackBonus('player2');
      expect(bonus).toBe(1);
    });
    
    test('getTokyoAttackBonus - should return 0 when not in Tokyo', () => {
      mockState.players.byId.player1.powerCards = [
        { id: 'burrowing', name: 'Burrowing', effect: { kind: 'tokyo_attack_bonus', value: 1 } }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      const bonus = processor.getTokyoAttackBonus('player1');
      expect(bonus).toBe(0);
    });
    
    test('getCardCostReduction - should return cost reduction from Alien Metabolism', () => {
      mockState.players.byId.player1.powerCards = [
        { id: 'alien-metabolism', name: 'Alien Metabolism', effect: { kind: 'cheaper_cards', value: 1 } }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      const reduction = processor.getCardCostReduction('player1');
      expect(reduction).toBe(1);
    });
    
    test('getHealBonus - should return heal bonus from Regeneration', () => {
      mockState.players.byId.player1.powerCards = [
        { id: 'regeneration', name: 'Regeneration', effect: { kind: 'heal_bonus', value: 1 } }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      const bonus = processor.getHealBonus('player1');
      expect(bonus).toBe(1);
    });
    
    test('getArmorReduction - should reduce damage from Armor Plating', () => {
      mockState.players.byId.player1.powerCards = [
        { id: 'armor-plating', name: 'Armor Plating', effect: { kind: 'armor', value: 1 } }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      const reduction = processor.getArmorReduction('player1', 1); // Armor negates damage of 1
      expect(reduction).toBe(1);
    });
    
    test('getArmorReduction - should not reduce damage > armor value', () => {
      mockState.players.byId.player1.powerCards = [
        { id: 'armor-plating', name: 'Armor Plating', effect: { kind: 'armor', value: 1 } }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      const reduction = processor.getArmorReduction('player1', 3); // 3 damage > 1 armor
      expect(reduction).toBe(0);
    });
    
    test('hasNoYieldDamage - should return true for Jets', () => {
      mockState.players.byId.player1.powerCards = [
        { id: 'jets', name: 'Jets', effect: { kind: 'no_yield_damage' } }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      const hasIt = processor.hasNoYieldDamage('player1');
      expect(hasIt).toBe(true);
    });
  });
  
  describe('Phase 3: Triggered Passive Effects', () => {
    
    test('processAttackEffects - Alpha Monster should give VP on attack', () => {
      mockState.players.byId.player1.powerCards = [
        { id: 'alpha-monster', name: 'Alpha Monster', effect: { kind: 'vp_on_attack', value: 1 } }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      processor.processAttackEffects('player1', true);
      
      const vpAction = dispatched.find(a => a.type === 'PLAYER_VP_GAINED');
      expect(vpAction).toBeDefined();
      expect(vpAction.payload.amount).toBe(1);
    });
    
    test('processAttackEffects - Herbivore should give VP when no damage', () => {
      mockState.players.byId.player1.powerCards = [
        { id: 'herbivore', name: 'Herbivore', effect: { kind: 'vp_no_damage', value: 1 } }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      processor.processAttackEffects('player1', false);
      
      const vpAction = dispatched.find(a => a.type === 'PLAYER_VP_GAINED');
      expect(vpAction).toBeDefined();
      expect(vpAction.payload.amount).toBe(1);
    });
    
    test('processAttackEffects - Alpha Monster should not trigger when no damage', () => {
      mockState.players.byId.player1.powerCards = [
        { id: 'alpha-monster', name: 'Alpha Monster', effect: { kind: 'vp_on_attack', value: 1 } }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      processor.processAttackEffects('player1', false);
      
      const vpAction = dispatched.find(a => a.type === 'PLAYER_VP_GAINED');
      expect(vpAction).toBeUndefined();
    });
    
    test('processEnergyGainEffects - Friend of Children should give bonus energy', () => {
      mockState.players.byId.player1.powerCards = [
        { id: 'friend-of-children', name: 'Friend of Children', effect: { kind: 'energy_on_energy', value: 1 } }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      processor.processEnergyGainEffects('player1', 3);
      
      const energyAction = dispatched.find(a => a.type === 'PLAYER_GAINED_ENERGY');
      expect(energyAction).toBeDefined();
      expect(energyAction.payload.amount).toBe(1);
    });
    
    test('processTurnEndEffects - Energy Hoarder should convert energy to VP', () => {
      mockState.players.byId.player1.energy = 12; // 12 energy / 6 = 2 VP
      mockState.players.byId.player1.powerCards = [
        { id: 'energy-hoarder', name: 'Energy Hoarder', effect: { kind: 'energy_to_vp', value: 6 } }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      processor.processTurnEndEffects('player1');
      
      const vpAction = dispatched.find(a => a.type === 'PLAYER_VP_GAINED');
      expect(vpAction).toBeDefined();
      expect(vpAction.payload.amount).toBe(2);
    });
    
    test('processTurnEndEffects - Solar Powered should give energy when at 0', () => {
      mockState.players.byId.player1.energy = 0;
      mockState.players.byId.player1.powerCards = [
        { id: 'solar-powered', name: 'Solar Powered', effect: { kind: 'energy_when_zero', value: 1 } }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      processor.processTurnEndEffects('player1');
      
      const energyAction = dispatched.find(a => a.type === 'PLAYER_GAINED_ENERGY');
      expect(energyAction).toBeDefined();
      expect(energyAction.payload.amount).toBe(1);
    });
    
    test('processTurnEndEffects - Solar Powered should not trigger when energy > 0', () => {
      mockState.players.byId.player1.energy = 5;
      mockState.players.byId.player1.powerCards = [
        { id: 'solar-powered', name: 'Solar Powered', effect: { kind: 'energy_when_zero', value: 1 } }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      processor.processTurnEndEffects('player1');
      
      const energyAction = dispatched.find(a => a.type === 'PLAYER_GAINED_ENERGY');
      expect(energyAction).toBeUndefined();
    });
  });
  
  describe('Phase 4: Dice Result Effects', () => {
    
    test('processDiceResultEffects - Complete Destruction should detect perfect roll', () => {
      mockState.players.byId.player1.powerCards = [
        { id: 'complete-destruction', name: 'Complete Destruction', effect: { kind: 'perfect_roll_bonus', value: 9 } }
      ];
      const diceResults = [
        { face: '1' },
        { face: '2' },
        { face: '3' },
        { face: 'heart' },
        { face: 'energy' },
        { face: 'attack' }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      processor.processDiceResultEffects('player1', diceResults);
      
      const vpAction = dispatched.find(a => a.type === 'PLAYER_VP_GAINED');
      expect(vpAction).toBeDefined();
      expect(vpAction.payload.amount).toBe(9);
    });
    
    test('processDiceResultEffects - Perfect roll should not trigger on duplicate', () => {
      mockState.players.byId.player1.powerCards = [
        { id: 'complete-destruction', name: 'Complete Destruction', effect: { kind: 'perfect_roll_bonus', value: 9 } }
      ];
      const diceResults = [
        { face: '1' },
        { face: '1' }, // duplicate!
        { face: '3' },
        { face: 'heart' },
        { face: 'energy' },
        { face: 'attack' }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      processor.processDiceResultEffects('player1', diceResults);
      
      const vpAction = dispatched.find(a => a.type === 'PLAYER_VP_GAINED');
      expect(vpAction).toBeUndefined();
    });
    
    test('processDiceResultEffects - Gourmet should detect three 1s', () => {
      mockState.players.byId.player1.powerCards = [
        { id: 'gourmet', name: 'Gourmet', effect: { kind: 'bonus_vp_on_111', value: 2 } }
      ];
      const diceResults = [
        { face: '1' },
        { face: '1' },
        { face: '1' },
        { face: 'heart' },
        { face: 'energy' },
        { face: 'attack' }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      processor.processDiceResultEffects('player1', diceResults);
      
      const vpAction = dispatched.find(a => a.type === 'PLAYER_VP_GAINED');
      expect(vpAction).toBeDefined();
      expect(vpAction.payload.amount).toBe(2);
    });
    
    test('processDiceResultEffects - Poison Quills should deal damage on three 2s', () => {
      mockState.players.byId.player1.powerCards = [
        { id: 'poison-quills', name: 'Poison Quills', effect: { kind: 'damage_on_222', value: 2 } }
      ];
      const diceResults = [
        { face: '2' },
        { face: '2' },
        { face: '2' },
        { face: 'heart' },
        { face: 'energy' },
        { face: 'attack' }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      processor.processDiceResultEffects('player1', diceResults);
      
      const damageActions = dispatched.filter(a => a.type === 'PLAYER_TAKE_DAMAGE');
      expect(damageActions.length).toBe(2); // Should damage player2 and player3
      expect(damageActions.every(a => a.payload.amount === 2)).toBe(true);
    });
    
    test('canRerollDice - Background Dweller should allow rerolling 3s', () => {
      mockState.players.byId.player1.powerCards = [
        { id: 'background-dweller', name: 'Background Dweller', effect: { kind: 'reroll_3s', value: 1 } }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      const canReroll = processor.canRerollDice('player1', 0, '3');
      expect(canReroll).toBe(true); // Always allows rerolling
    });
    
    test('canRerollDice - should allow rerolling all faces by default', () => {
      mockState.players.byId.player1.powerCards = [];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      const canReroll = processor.canRerollDice('player1', 0, '2');
      expect(canReroll).toBe(true); // Default: can reroll anything
    });
  });
  
  describe('Integration - Multiple Cards', () => {
    
    test('should stack multiple attack bonuses', () => {
      mockState.players.byId.player2.powerCards = [
        { id: 'acid-attack', name: 'Acid Attack', effect: { kind: 'attack_bonus', value: 1, passive: true } },
        { id: 'urbavore', name: 'Urbavore', effect: { kind: 'tokyo_bonuses', value: 1 } }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      const attackBonus = processor.getAttackBonus('player2');
      const tokyoBonus = processor.getTokyoAttackBonus('player2');
      expect(attackBonus + tokyoBonus).toBe(2);
    });
    
    test('should apply multiple card cost reductions', () => {
      mockState.players.byId.player1.powerCards = [
        { id: 'alien-metabolism', name: 'Alien Metabolism', effect: { kind: 'cheaper_cards', value: 1 } },
        { id: 'alien-metabolism-2', name: 'Alien Metabolism 2', effect: { kind: 'cheaper_cards', value: 1 } }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      const reduction = processor.getCardCostReduction('player1');
      expect(reduction).toBe(2);
    });
    
    test('should apply multiple heal bonuses', () => {
      mockState.players.byId.player1.powerCards = [
        { id: 'regeneration', name: 'Regeneration', effect: { kind: 'heal_bonus', value: 1 } },
        { id: 'it-has-a-child', name: 'It Has a Child', effect: { kind: 'heal_bonus', value: 1 } }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      const bonus = processor.getHealBonus('player1');
      expect(bonus).toBe(2);
    });
  });
  
  describe('Edge Cases', () => {
    
    test('should handle player with no cards', () => {
      mockState.players.byId.player1.powerCards = [];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      
      expect(processor.getAttackBonus('player1')).toBe(0);
      expect(processor.getHealBonus('player1')).toBe(0);
      expect(processor.getCardCostReduction('player1')).toBe(0);
    });
    
    test('should handle non-existent player', () => {
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      
      expect(processor.getAttackBonus('nonexistent')).toBe(0);
      expect(processor.getHealBonus('nonexistent')).toBe(0);
    });
    
    test('should handle multiple triggers in one turn', () => {
      mockState.players.byId.player1.powerCards = [
        { id: 'alpha-monster', name: 'Alpha Monster', effect: { kind: 'vp_on_attack', value: 1 } }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      
      // Trigger twice
      processor.processAttackEffects('player1', true);
      processor.processAttackEffects('player1', true);
      
      const vpActions = dispatched.filter(a => a.type === 'PLAYER_VP_GAINED');
      expect(vpActions.length).toBe(2); // Should trigger twice
      expect(vpActions.every(a => a.payload.amount === 1)).toBe(true);
    });
  });
});
