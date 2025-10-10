/**
 * Unit tests for card effect implementations
 * Tests effectEngine handlers and passiveEffectsProcessor functions
 */

import { createEffectEngine } from '../effectEngine.js';
import { createPassiveEffectsProcessor } from '../passiveEffectsProcessor.js';

describe('Card Effect Implementations', () => {
  
  // Mock store and logger
  let mockStore;
  let mockLogger;
  let mockState;
  
  beforeEach(() => {
    mockState = {
      players: {
        order: ['player1', 'player2', 'player3'],
        byId: {
          player1: {
            id: 'player1',
            name: 'Player 1',
            health: 10,
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
      },
      effectQueue: {
        queue: [],
        processing: false
      }
    };
    
    const dispatched = [];
    mockStore = {
      getState: () => mockState,
      dispatch: (action) => {
        dispatched.push(action);
        return action;
      },
      subscribe: () => () => {},
      dispatched
    };
    
    mockLogger = {
      info: () => {},
      warn: () => {},
      error: () => {},
      system: () => {}
    };
  });
  
  describe('Phase 1: Instant Discard Effects', () => {
    
    test('heal - should heal player', () => {
      const engine = createEffectEngine(mockStore, mockLogger);
      const card = { id: 'heal', name: 'Heal', effect: { kind: 'heal', value: 2 } };
      engine.enqueueImmediate(card, 'player1');
      
      const healAction = mockStore.dispatched.find(a => a.type === 'PLAYER_HEALED');
      expect(healAction).toBeDefined();
      expect(healAction.payload.playerId).toBe('player1');
      expect(healAction.payload.amount).toBe(2);
    });
    
    test('damage_all - should damage all opponents', () => {
      const engine = createEffectEngine(mockStore, mockLogger);
      const card = { id: 'fire-blast', name: 'Fire Blast', effect: { kind: 'damage_all', value: 2 } };
      engine.enqueueImmediate(card, 'player1');
      
      const damageActions = mockStore.dispatched.filter(a => a.type === 'PLAYER_TAKE_DAMAGE');
      expect(damageActions.length).toBe(2); // Should damage player2 and player3
      expect(damageActions.every(a => a.payload.amount === 2)).toBe(true);
    });
    
    test('damage_all_including_self - should damage everyone', () => {
      const engine = createEffectEngine(mockStore, mockLogger);
      const card = { id: 'high-altitude-bombing', name: 'High Altitude Bombing', effect: { kind: 'damage_all_including_self', value: 3 } };
      engine.enqueueImmediate(card, 'player1');
      
      const damageActions = mockStore.dispatched.filter(a => a.type === 'PLAYER_TAKE_DAMAGE');
      expect(damageActions.length).toBe(3); // Should damage all 3 players
    });
    
    test('vp_and_damage - should give VP and damage others', () => {
      const engine = createEffectEngine(mockStore, mockLogger);
      const card = { id: 'gas-refinery', name: 'Gas Refinery', effect: { kind: 'vp_and_damage', value: 2, damage: 3 } };
      engine.enqueueImmediate(card, 'player1');
      
      const vpAction = mockStore.dispatched.find(a => a.type === 'PLAYER_VP_GAINED' && a.payload.playerId === 'player1');
      expect(vpAction).toBeDefined();
      expect(vpAction.payload.amount).toBe(2);
      
      const damageActions = mockStore.dispatched.filter(a => a.type === 'PLAYER_TAKE_DAMAGE');
      expect(damageActions.length).toBe(2); // damage player2 and player3
      expect(damageActions.every(a => a.payload.amount === 3)).toBe(true);
    });
    
    test('vp_steal_all - should reduce all opponents VP', () => {
      const engine = createEffectEngine(mockStore, mockLogger);
      const card = { id: 'evacuation-orders', name: 'Evacuation Orders', effect: { kind: 'vp_steal_all', value: 5 } };
      engine.enqueueImmediate(card, 'player1');
      
      const vpActions = mockStore.dispatched.filter(a => a.type === 'PLAYER_VP_GAINED');
      expect(vpActions.length).toBeGreaterThan(0);
      // Player2 should lose min(5, 5) = 5, Player3 should lose min(5, 2) = 2
      const player2VP = vpActions.find(a => a.payload.playerId === 'player2');
      const player3VP = vpActions.find(a => a.payload.playerId === 'player3');
      expect(player2VP.payload.amount).toBe(-5);
      expect(player3VP.payload.amount).toBe(-2);
    });
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
  });
  
  describe('Phase 3: Triggered Passive Effects', () => {
    
    test('processAttackEffects - Alpha Monster should give VP on attack', () => {
      mockState.players.byId.player1.powerCards = [
        { id: 'alpha-monster', name: 'Alpha Monster', effect: { kind: 'vp_on_attack', value: 1 } }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      processor.processAttackEffects('player1', true);
      
      const vpAction = mockStore.dispatched.find(a => a.type === 'PLAYER_VP_GAINED');
      expect(vpAction).toBeDefined();
      expect(vpAction.payload.amount).toBe(1);
    });
    
    test('processAttackEffects - Herbivore should give VP when no damage', () => {
      mockState.players.byId.player1.powerCards = [
        { id: 'herbivore', name: 'Herbivore', effect: { kind: 'vp_no_damage', value: 1 } }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      processor.processAttackEffects('player1', false);
      
      const vpAction = mockStore.dispatched.find(a => a.type === 'PLAYER_VP_GAINED');
      expect(vpAction).toBeDefined();
      expect(vpAction.payload.amount).toBe(1);
    });
    
    test('processEnergyGainEffects - Friend of Children should give bonus energy', () => {
      mockState.players.byId.player1.powerCards = [
        { id: 'friend-of-children', name: 'Friend of Children', effect: { kind: 'energy_on_energy', value: 1 } }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      processor.processEnergyGainEffects('player1', 3);
      
      const energyAction = mockStore.dispatched.find(a => a.type === 'PLAYER_GAINED_ENERGY');
      expect(energyAction).toBeDefined();
      expect(energyAction.payload.amount).toBe(1); // Bonus energy
    });
    
    test('processTurnEndEffects - Energy Hoarder should convert energy to VP', () => {
      mockState.players.byId.player1.energy = 12; // 12 energy / 6 = 2 VP
      mockState.players.byId.player1.powerCards = [
        { id: 'energy-hoarder', name: 'Energy Hoarder', effect: { kind: 'energy_to_vp', value: 6 } }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      processor.processTurnEndEffects('player1');
      
      const vpAction = mockStore.dispatched.find(a => a.type === 'PLAYER_VP_GAINED');
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
      
      const energyAction = mockStore.dispatched.find(a => a.type === 'PLAYER_GAINED_ENERGY');
      expect(energyAction).toBeDefined();
      expect(energyAction.payload.amount).toBe(1);
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
      
      const vpAction = mockStore.dispatched.find(a => a.type === 'PLAYER_VP_GAINED');
      expect(vpAction).toBeDefined();
      expect(vpAction.payload.amount).toBe(9);
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
      
      const vpAction = mockStore.dispatched.find(a => a.type === 'PLAYER_VP_GAINED');
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
      
      const damageActions = mockStore.dispatched.filter(a => a.type === 'PLAYER_TAKE_DAMAGE');
      expect(damageActions.length).toBe(2); // Should damage player2 and player3
      expect(damageActions.every(a => a.payload.amount === 2)).toBe(true);
    });
    
    test('canRerollDice - Background Dweller should allow rerolling 3s', () => {
      mockState.players.byId.player1.powerCards = [
        { id: 'background-dweller', name: 'Background Dweller', effect: { kind: 'reroll_3s', value: 1 } }
      ];
      const processor = createPassiveEffectsProcessor(mockStore, mockLogger);
      const canReroll = processor.canRerollDice('player1', 0, '3');
      expect(canReroll).toBe(true);
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
  });
});
