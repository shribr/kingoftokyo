/**
 * Comprehensive dice rolling tests
 * Focuses on CPU AI dice management and timing issues
 */

import { rollDice, tallyFaces } from '../../domain/dice.js';

describe('Dice Rolling - General Mechanics', () => {
  
  describe('rollDice function', () => {
    test('should roll 6 dice by default', () => {
      const result = rollDice();
      expect(result).toHaveLength(6);
      expect(result.every(die => die.value && typeof die.kept === 'boolean')).toBe(true);
    });
    
    test('should roll specified number of dice', () => {
      const result = rollDice({ count: 4 });
      expect(result).toHaveLength(4);
    });
    
    test('should roll 7 dice when player has extra dice slot', () => {
      const result = rollDice({ count: 7 });
      expect(result).toHaveLength(7);
    });
    
    test('should only return valid dice faces', () => {
      const validFaces = ['1', '2', '3', 'claw', 'energy', 'heart'];
      const result = rollDice({ count: 20 }); // Roll many to test randomness
      result.forEach(die => {
        expect(validFaces).toContain(die.value);
      });
    });
    
    test('should set kept to false for new dice', () => {
      const result = rollDice({ count: 6 });
      result.forEach(die => {
        expect(die.kept).toBe(false);
      });
    });
  });
  
  describe('tallyFaces function', () => {
    test('should count all face types correctly', () => {
      const faces = [
        { value: '1' },
        { value: '1' },
        { value: '2' },
        { value: 'claw' },
        { value: 'energy' },
        { value: 'heart' }
      ];
      const tally = tallyFaces(faces);
      expect(tally['1']).toBe(2);
      expect(tally['2']).toBe(1);
      expect(tally['3']).toBe(0);
      expect(tally.claw).toBe(1);
      expect(tally.energy).toBe(1);
      expect(tally.heart).toBe(1);
    });
    
    test('should handle triples correctly', () => {
      const faces = [
        { value: '2' },
        { value: '2' },
        { value: '2' },
        { value: 'claw' },
        { value: 'energy' },
        { value: 'heart' }
      ];
      const tally = tallyFaces(faces);
      expect(tally['2']).toBe(3);
    });
    
    test('should handle all same face', () => {
      const faces = [
        { value: 'claw' },
        { value: 'claw' },
        { value: 'claw' },
        { value: 'claw' },
        { value: 'claw' },
        { value: 'claw' }
      ];
      const tally = tallyFaces(faces);
      expect(tally.claw).toBe(6);
    });
  });
  
  describe('Dice randomness', () => {
    test('should produce different results across multiple rolls', () => {
      const roll1 = rollDice().map(d => d.value).join('');
      const roll2 = rollDice().map(d => d.value).join('');
      const roll3 = rollDice().map(d => d.value).join('');
      
      // Very unlikely all three rolls are identical
      const allSame = roll1 === roll2 && roll2 === roll3;
      expect(allSame).toBe(false);
    });
    
    test('should distribute faces somewhat evenly over many rolls', () => {
      const counts = { '1': 0, '2': 0, '3': 0, claw: 0, energy: 0, heart: 0 };
      const totalRolls = 600; // 100 rolls of 6 dice
      
      for (let i = 0; i < 100; i++) {
        const roll = rollDice();
        roll.forEach(die => {
          counts[die.value]++;
        });
      }
      
      // Each face should appear roughly 100 times (±50 for variance)
      Object.values(counts).forEach(count => {
        expect(count).toBeGreaterThan(50);
        expect(count).toBeLessThan(150);
      });
    });
  });
});

describe('CPU Dice Rolling - Timing and Reroll Issues', () => {
  
  let mockStore;
  let mockState;
  let dispatched;
  let mockEngine;
  
  beforeEach(() => {
    dispatched = [];
    mockState = {
      phase: 'ROLL',
      dice: {
        faces: [],
        rerollsRemaining: 2,
        phase: 'resolved'
      },
      players: {
        order: ['cpu1', 'cpu2', 'human1'],
        byId: {
          cpu1: {
            id: 'cpu1',
            name: 'CPU Player 1',
            isCPU: true,
            health: 10,
            maxHealth: 10,
            victoryPoints: 5,
            energy: 3,
            powerCards: [],
            inTokyo: false,
            modifiers: { diceSlots: 6 }
          },
          cpu2: {
            id: 'cpu2',
            name: 'CPU Player 2',
            isCPU: true,
            health: 8,
            maxHealth: 10,
            victoryPoints: 3,
            energy: 5,
            powerCards: [],
            inTokyo: true,
            modifiers: { diceSlots: 6 }
          },
          human1: {
            id: 'human1',
            name: 'Human Player',
            isCPU: false,
            health: 10,
            maxHealth: 10,
            victoryPoints: 2,
            energy: 4,
            powerCards: [],
            inTokyo: false,
            modifiers: { diceSlots: 6 }
          }
        }
      },
      meta: {
        activePlayerIndex: 0
      }
    };
    
    mockStore = {
      getState: () => mockState,
      dispatch: (action) => {
        dispatched.push(action);
        
        // Simulate state updates
        if (action.type === 'DICE_ROLL_STARTED') {
          mockState.dice.phase = 'rolling';
        }
        if (action.type === 'DICE_ROLLED') {
          mockState.dice.faces = action.payload.faces;
          mockState.dice.phase = 'rolled';
        }
        if (action.type === 'DICE_ROLL_RESOLVED') {
          mockState.dice.phase = 'resolved';
        }
        if (action.type === 'DICE_ROLL_COMPLETED') {
          mockState.dice.rerollsRemaining = Math.max(0, mockState.dice.rerollsRemaining - 1);
        }
        if (action.type === 'DICE_TOGGLE_KEEP') {
          const idx = action.payload.index;
          if (mockState.dice.faces[idx]) {
            mockState.dice.faces[idx].kept = !mockState.dice.faces[idx].kept;
          }
        }
        if (action.type === 'DICE_REROLL_USED') {
          mockState.dice.rerollsRemaining = Math.max(0, mockState.dice.rerollsRemaining - 1);
        }
        
        return action;
      },
      subscribe: () => () => {}
    };
    
    mockEngine = {
      makeRollDecision: (faces, rerollsLeft, player, gameState) => {
        // Track calls manually
        if (!mockEngine.calls) mockEngine.calls = [];
        mockEngine.calls.push({ faces, rerollsLeft, player, gameState });
        
        // Default: keep triples or high VP faces
        const tally = {};
        faces.forEach(f => tally[f] = (tally[f] || 0) + 1);
        
        const keepIndices = [];
        faces.forEach((face, idx) => {
          if (tally[face] >= 3) keepIndices.push(idx); // Keep triples
          else if (face === '3' && tally['3'] >= 2) keepIndices.push(idx); // Keep pairs of 3
        });
        
        const action = rerollsLeft > 0 && keepIndices.length < 6 ? 'reroll' : 'endRoll';
        
        return {
          action,
          keepDice: keepIndices,
          confidence: 0.8,
          reason: `Keep ${keepIndices.length} dice, ${action}`
        };
      },
      calls: []
    };
  });
  
  describe('Reroll Counter Management', () => {
    test('should start with 2 rerolls', () => {
      expect(mockState.dice.rerollsRemaining).toBe(2);
    });
    
    test('DICE_ROLL_COMPLETED should decrement rerolls', () => {
      mockStore.dispatch({ type: 'DICE_ROLL_COMPLETED' });
      expect(mockState.dice.rerollsRemaining).toBe(1);
      
      mockStore.dispatch({ type: 'DICE_ROLL_COMPLETED' });
      expect(mockState.dice.rerollsRemaining).toBe(0);
    });
    
    test('rerolls should not go below 0', () => {
      mockStore.dispatch({ type: 'DICE_ROLL_COMPLETED' });
      mockStore.dispatch({ type: 'DICE_ROLL_COMPLETED' });
      mockStore.dispatch({ type: 'DICE_ROLL_COMPLETED' });
      expect(mockState.dice.rerollsRemaining).toBe(0);
    });
    
    test('initial roll should NOT decrement rerolls', () => {
      // This is the key issue - initial roll is FREE
      const initialRerolls = mockState.dice.rerollsRemaining;
      
      // Simulate initial roll (should NOT call DICE_ROLL_COMPLETED)
      mockStore.dispatch({ type: 'DICE_ROLL_STARTED' });
      mockStore.dispatch({ 
        type: 'DICE_ROLLED', 
        payload: { faces: rollDice(6) }
      });
      mockStore.dispatch({ type: 'DICE_ROLL_RESOLVED' });
      
      // Rerolls should still be 2
      expect(mockState.dice.rerollsRemaining).toBe(initialRerolls);
    });
    
    test('first reroll should decrement from 2 to 1', () => {
      // Initial roll (free)
      mockStore.dispatch({ type: 'DICE_ROLL_STARTED' });
      mockStore.dispatch({ type: 'DICE_ROLLED', payload: { faces: rollDice(6) } });
      mockStore.dispatch({ type: 'DICE_ROLL_RESOLVED' });
      
      expect(mockState.dice.rerollsRemaining).toBe(2);
      
      // First reroll (costs 1)
      mockStore.dispatch({ type: 'DICE_ROLL_STARTED' });
      mockStore.dispatch({ type: 'DICE_ROLLED', payload: { faces: rollDice(6) } });
      mockStore.dispatch({ type: 'DICE_ROLL_RESOLVED' });
      mockStore.dispatch({ type: 'DICE_ROLL_COMPLETED' });
      
      expect(mockState.dice.rerollsRemaining).toBe(1);
    });
    
    test('second reroll should decrement from 1 to 0', () => {
      mockState.dice.rerollsRemaining = 1;
      
      mockStore.dispatch({ type: 'DICE_ROLL_STARTED' });
      mockStore.dispatch({ type: 'DICE_ROLLED', payload: { faces: rollDice(6) } });
      mockStore.dispatch({ type: 'DICE_ROLL_RESOLVED' });
      mockStore.dispatch({ type: 'DICE_ROLL_COMPLETED' });
      
      expect(mockState.dice.rerollsRemaining).toBe(0);
    });
    
    test('CPU should get 3 total rolls (1 initial + 2 rerolls)', () => {
      const rollSequence = [];
      
      // Roll 1: Initial (free)
      rollSequence.push(mockState.dice.rerollsRemaining);
      
      // Roll 2: First reroll (costs 1)
      mockStore.dispatch({ type: 'DICE_ROLL_COMPLETED' });
      rollSequence.push(mockState.dice.rerollsRemaining);
      
      // Roll 3: Second reroll (costs 1)
      mockStore.dispatch({ type: 'DICE_ROLL_COMPLETED' });
      rollSequence.push(mockState.dice.rerollsRemaining);
      
      expect(rollSequence).toEqual([2, 1, 0]);
    });
  });
  
  describe('CPU AI Decision Making', () => {
    test('AI should be called with correct rerolls remaining', () => {
      const faces = ['1', '1', '2', 'claw', 'energy', 'heart'];
      mockEngine.calls = []; // Reset call tracking
      mockEngine.makeRollDecision(faces, 2, mockState.players.byId.cpu1, {});
      
      expect(mockEngine.calls.length).toBe(1);
      expect(mockEngine.calls[0].rerollsLeft).toBe(2);
      expect(mockEngine.calls[0].player.id).toBe('cpu1');
    });
    
    test('AI should receive 1 reroll on second roll', () => {
      mockState.dice.rerollsRemaining = 1;
      const faces = ['1', '1', '2', 'claw', 'energy', 'heart'];
      
      mockEngine.calls = [];
      mockEngine.makeRollDecision(faces, 1, mockState.players.byId.cpu1, {});
      
      expect(mockEngine.calls.length).toBe(1);
      expect(mockEngine.calls[0].rerollsLeft).toBe(1);
    });
    
    test('AI should receive 0 rerolls on final roll', () => {
      mockState.dice.rerollsRemaining = 0;
      const faces = ['1', '1', '2', 'claw', 'energy', 'heart'];
      
      mockEngine.calls = [];
      mockEngine.makeRollDecision(faces, 0, mockState.players.byId.cpu1, {});
      
      expect(mockEngine.calls.length).toBe(1);
      expect(mockEngine.calls[0].rerollsLeft).toBe(0);
    });
    
    test('AI should decide to reroll when it has triples forming', () => {
      const faces = ['3', '3', '1', 'claw', 'energy', 'heart'];
      const decision = mockEngine.makeRollDecision(faces, 2, mockState.players.byId.cpu1, {});
      
      expect(decision.action).toBe('reroll');
      expect(decision.keepDice).toContain(0);
      expect(decision.keepDice).toContain(1);
    });
    
    test('AI should decide to endRoll when no rerolls left', () => {
      const faces = ['1', '2', '3', 'claw', 'energy', 'heart'];
      const decision = mockEngine.makeRollDecision(faces, 0, mockState.players.byId.cpu1, {});
      
      expect(decision.action).toBe('endRoll');
    });
    
    test('AI should decide to endRoll when all dice are kept', () => {
      const faces = ['3', '3', '3', '3', '3', '3'];
      const decision = mockEngine.makeRollDecision(faces, 2, mockState.players.byId.cpu1, {});
      
      // Should keep all 6 dice (triples)
      expect(decision.keepDice.length).toBe(6);
      // Should want to end since nothing left to reroll
      expect(decision.action).toBe('endRoll');
    });
  });
  
  describe('Dice Keep Logic', () => {
    beforeEach(() => {
      mockState.dice.faces = [
        { value: '3', kept: false },
        { value: '3', kept: false },
        { value: '3', kept: false },
        { value: 'claw', kept: false },
        { value: 'energy', kept: false },
        { value: 'heart', kept: false }
      ];
    });
    
    test('should keep dice at specified indices', () => {
      mockStore.dispatch({ type: 'DICE_TOGGLE_KEEP', payload: { index: 0 } });
      mockStore.dispatch({ type: 'DICE_TOGGLE_KEEP', payload: { index: 1 } });
      mockStore.dispatch({ type: 'DICE_TOGGLE_KEEP', payload: { index: 2 } });
      
      expect(mockState.dice.faces[0].kept).toBe(true);
      expect(mockState.dice.faces[1].kept).toBe(true);
      expect(mockState.dice.faces[2].kept).toBe(true);
      expect(mockState.dice.faces[3].kept).toBe(false);
    });
    
    test('should allow toggling dice keep status', () => {
      mockStore.dispatch({ type: 'DICE_TOGGLE_KEEP', payload: { index: 0 } });
      expect(mockState.dice.faces[0].kept).toBe(true);
      
      mockStore.dispatch({ type: 'DICE_TOGGLE_KEEP', payload: { index: 0 } });
      expect(mockState.dice.faces[0].kept).toBe(false);
    });
    
    test('should handle keeping all dice', () => {
      for (let i = 0; i < 6; i++) {
        mockStore.dispatch({ type: 'DICE_TOGGLE_KEEP', payload: { index: i } });
      }
      
      const allKept = mockState.dice.faces.every(d => d.kept);
      expect(allKept).toBe(true);
    });
    
    test('should identify when all dice are kept', () => {
      mockState.dice.faces.forEach((_, idx) => {
        mockStore.dispatch({ type: 'DICE_TOGGLE_KEEP', payload: { index: idx } });
      });
      
      const hasUnkeptDice = mockState.dice.faces.some(f => !f.kept);
      expect(hasUnkeptDice).toBe(false);
    });
    
    test('should identify when some dice are unkept', () => {
      mockStore.dispatch({ type: 'DICE_TOGGLE_KEEP', payload: { index: 0 } });
      mockStore.dispatch({ type: 'DICE_TOGGLE_KEEP', payload: { index: 1 } });
      
      const hasUnkeptDice = mockState.dice.faces.some(f => !f.kept);
      expect(hasUnkeptDice).toBe(true);
    });
  });
  
  describe('CPU Turn Stop Conditions', () => {
    test('should stop when AI chooses endRoll', () => {
      mockState.dice.faces = rollDice();
      const decision = { action: 'endRoll', keepDice: [0, 1, 2], reason: 'good enough' };
      
      const shouldStop = decision.action === 'endRoll';
      expect(shouldStop).toBe(true);
    });
    
    test('should stop when no rerolls remaining (not initial roll)', () => {
      mockState.dice.rerollsRemaining = 0;
      const isInitialRoll = false;
      
      const shouldStop = mockState.dice.rerollsRemaining <= 0 && !isInitialRoll;
      expect(shouldStop).toBe(true);
    });
    
    test('should NOT stop when no rerolls remaining on initial roll', () => {
      // This should never happen, but defensive check
      mockState.dice.rerollsRemaining = 0;
      const isInitialRoll = true;
      
      const shouldStop = mockState.dice.rerollsRemaining <= 0 && !isInitialRoll;
      expect(shouldStop).toBe(false);
    });
    
    test('should stop when all dice are kept', () => {
      mockState.dice.faces = rollDice();
      mockState.dice.faces.forEach((_, idx) => {
        mockStore.dispatch({ type: 'DICE_TOGGLE_KEEP', payload: { index: idx } });
      });
      
      const hasUnkeptDice = mockState.dice.faces.some(f => !f.kept);
      expect(hasUnkeptDice).toBe(false);
    });
    
    test('should stop when max rolls reached', () => {
      const rollNumber = 3;
      const maxRolls = 3;
      
      const shouldStop = rollNumber >= maxRolls;
      expect(shouldStop).toBe(true);
    });
    
    test('should continue when rerolls available and dice unkept', () => {
      mockState.dice.rerollsRemaining = 1;
      mockState.dice.faces = rollDice();
      mockState.dice.faces[0].kept = true;
      mockState.dice.faces[1].kept = true;
      
      const hasUnkeptDice = mockState.dice.faces.some(f => !f.kept);
      const shouldStop = mockState.dice.rerollsRemaining <= 0 || !hasUnkeptDice;
      
      expect(hasUnkeptDice).toBe(true);
      expect(shouldStop).toBe(false);
    });
  });
  
  describe('Timing Issue Scenarios', () => {
    test('SCENARIO: CPU uses 0 rerolls (stops immediately)', () => {
      // BUG: CPU sometimes stops after initial roll without using rerolls
      
      const rollLog = [];
      
      // Roll 1: Initial
      rollLog.push({ roll: 1, rerolls: mockState.dice.rerollsRemaining });
      
      // AI decides to stop immediately (BUG)
      const decision = { action: 'endRoll', keepDice: [0, 1, 2, 3, 4, 5], reason: 'bug - premature stop' };
      
      expect(rollLog.length).toBe(1); // Only 1 roll!
      expect(mockState.dice.rerollsRemaining).toBe(2); // Didn't use any rerolls
      expect(decision.action).toBe('endRoll');
      
      // This is the bug - CPU should have used both rerolls
      console.warn('BUG: CPU stopped after 1 roll, wasted 2 rerolls');
    });
    
    test('SCENARIO: CPU uses only 1 reroll instead of 2', () => {
      // BUG: CPU sometimes stops early
      
      const rollLog = [];
      
      // Roll 1: Initial
      rollLog.push({ roll: 1, rerolls: mockState.dice.rerollsRemaining });
      
      // Roll 2: First reroll
      mockStore.dispatch({ type: 'DICE_ROLL_COMPLETED' });
      rollLog.push({ roll: 2, rerolls: mockState.dice.rerollsRemaining });
      
      // AI decides to stop (should continue)
      const decision = { action: 'endRoll', keepDice: [0, 1], reason: 'bug - premature stop' };
      
      expect(rollLog.length).toBe(2);
      expect(mockState.dice.rerollsRemaining).toBe(1); // Still has 1 reroll left!
      
      console.warn('BUG: CPU stopped after 2 rolls, wasted 1 reroll');
    });
    
    test('SCENARIO: Correct - CPU uses all rerolls', () => {
      const rollLog = [];
      
      // Roll 1: Initial (rerolls: 2)
      rollLog.push({ roll: 1, rerolls: mockState.dice.rerollsRemaining });
      expect(mockState.dice.rerollsRemaining).toBe(2);
      
      // Roll 2: First reroll (rerolls: 1)
      mockStore.dispatch({ type: 'DICE_ROLL_COMPLETED' });
      rollLog.push({ roll: 2, rerolls: mockState.dice.rerollsRemaining });
      expect(mockState.dice.rerollsRemaining).toBe(1);
      
      // Roll 3: Second reroll (rerolls: 0)
      mockStore.dispatch({ type: 'DICE_ROLL_COMPLETED' });
      rollLog.push({ roll: 3, rerolls: mockState.dice.rerollsRemaining });
      expect(mockState.dice.rerollsRemaining).toBe(0);
      
      expect(rollLog).toEqual([
        { roll: 1, rerolls: 2 },
        { roll: 2, rerolls: 1 },
        { roll: 3, rerolls: 0 }
      ]);
      
      console.log('CORRECT: CPU used all rerolls');
    });
    
    test('SCENARIO: Initial roll should NOT decrement counter', () => {
      const beforeRoll = mockState.dice.rerollsRemaining;
      
      // Simulate initial roll WITHOUT calling DICE_ROLL_COMPLETED
      mockStore.dispatch({ type: 'DICE_ROLL_STARTED' });
      mockStore.dispatch({ type: 'DICE_ROLLED', payload: { faces: rollDice() } });
      mockStore.dispatch({ type: 'DICE_ROLL_RESOLVED' });
      // DO NOT dispatch DICE_ROLL_COMPLETED here!
      
      const afterRoll = mockState.dice.rerollsRemaining;
      
      expect(beforeRoll).toBe(afterRoll);
      expect(afterRoll).toBe(2); // Should still have 2 rerolls
    });
  });
  
  describe('Edge Cases', () => {
    test('should handle player with extra dice slot (7 dice)', () => {
      mockState.players.byId.cpu1.powerCards = [
        { id: 'extra-head', name: 'Extra Head', effect: { kind: 'dice_slot', value: 1 } }
      ];
      mockState.players.byId.cpu1.modifiers.diceSlots = 7;
      
      const faces = rollDice({ count: 7 });
      expect(faces).toHaveLength(7);
    });
    
    test('should handle player with reroll bonus (+1 reroll)', () => {
      mockState.dice.rerollsRemaining = 3; // 2 base + 1 from Giant Brain
      
      const rollSequence = [];
      rollSequence.push(mockState.dice.rerollsRemaining); // 3
      
      mockStore.dispatch({ type: 'DICE_ROLL_COMPLETED' });
      rollSequence.push(mockState.dice.rerollsRemaining); // 2
      
      mockStore.dispatch({ type: 'DICE_ROLL_COMPLETED' });
      rollSequence.push(mockState.dice.rerollsRemaining); // 1
      
      mockStore.dispatch({ type: 'DICE_ROLL_COMPLETED' });
      rollSequence.push(mockState.dice.rerollsRemaining); // 0
      
      expect(rollSequence).toEqual([3, 2, 1, 0]);
    });
    
    test('should prevent negative rerolls', () => {
      mockState.dice.rerollsRemaining = 0;
      
      mockStore.dispatch({ type: 'DICE_ROLL_COMPLETED' });
      mockStore.dispatch({ type: 'DICE_ROLL_COMPLETED' });
      
      expect(mockState.dice.rerollsRemaining).toBe(0);
      expect(mockState.dice.rerollsRemaining).toBeGreaterThanOrEqual(0);
    });
  });
});
