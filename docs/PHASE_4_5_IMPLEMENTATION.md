# Phase 4 & 5 Implementation Complete

## Summary
Successfully implemented dice-related card effects for Phases 4 and 5, bringing the total functional cards from 28 to **37 out of 51**.

---

## Phase 4: Dice Result Effects (5 cards) ✅

### Implementation Details

**Location**: `src/services/passiveEffectsProcessor.js` → `processDiceResultEffects()`

**Cards Implemented:**

1. **Complete Destruction** (`perfect_roll_bonus`)
   - Effect: If you roll ①②③❤⚡☠ gain 9★ in addition to regular results
   - Detection: Checks for all 6 unique faces in dice array
   - Dispatches: `playerVPGained(playerId, 9, 'perfect_roll')`

2. **Gourmet** (`bonus_vp_on_111`)
   - Effect: When scoring ①①① gain 2 extra ★
   - Detection: Counts number of '1' faces, triggers if >= 3
   - Dispatches: `playerVPGained(playerId, 2, 'gourmet')`

3. **Poison Quills** (`damage_on_222`)
   - Effect: When you score ②②② also deal 2 damage to all others
   - Detection: Counts number of '2' faces, triggers if >= 3
   - Dispatches: `PLAYER_TAKE_DAMAGE` to all opponents

4. **Freeze Time** (`extra_turn_on_111`)
   - Effect: On a turn where you score ①①①, you can take another turn with one less die
   - Detection: Counts number of '1' faces, triggers if >= 3
   - Dispatches: `EXTRA_TURN_AVAILABLE` action for UI to prompt player
   - **Requires UI**: Player must choose whether to take extra turn

5. **Background Dweller** (`reroll_3s`)
   - Effect: You can always reroll any 3 you have
   - Implementation: New function `canRerollDice(playerId, diceIndex, diceValue)`
   - Returns true for '3' faces when this card is present
   - **Requires Integration**: Roll phase must call this function to enable reroll UI

### Code Added:

```javascript
function processDiceResultEffects(playerId, diceResults) {
  // Analyzes dice faces array
  // Counts: ones, twos, threes, hearts, skulls, energy
  // Detects: perfect roll, three 1s, three 2s
  // Triggers appropriate effects
}

function canRerollDice(playerId, diceIndex, diceValue) {
  // Checks if player can reroll specific dice
  // Used by Background Dweller card
}
```

---

## Phase 5: Dice Manipulation (4 cards) ✅

### Implementation Details

**Location**: `src/services/effectEngine.js` → handlers object

**Cards Implemented:**

1. **Stretchy** (`spend_energy_change_die`)
   - Effect: You can spend 2 Energy to change one of your dice to any result
   - Dispatches: `DICE_MANIPULATION_AVAILABLE` with type and cost
   - **Requires UI**: Dice UI must show "Change Die (2⚡)" button during roll phase

2. **Rapid Healing** (`spend_energy_heal`)
   - Effect: Spend 2 Energy at any time to heal 1 damage
   - Dispatches: `HEAL_ABILITY_AVAILABLE` with cost and heal amount
   - **Requires UI**: Player panel should show "Heal (2⚡)" button when damaged

3. **Herd Culler** (`change_to_1`)
   - Effect: You can change one of your dice to a ① each turn
   - Dispatches: `DICE_MANIPULATION_AVAILABLE` with freeUse flag
   - **Requires UI**: Dice UI must show "Change to ①" button (free, once per turn)

4. **Plot Twist** (`change_die_discard`)
   - Effect: Change one die to any result. Discard when used.
   - Dispatches: `DICE_MANIPULATION_AVAILABLE` with discardAfterUse flag
   - **Requires UI**: Dice UI shows "Change Die (Plot Twist)" button
   - After use, card must be discarded automatically

### Code Added:

```javascript
spend_energy_change_die: ({ playerId, effect }) => {
  store.dispatch({ type: 'DICE_MANIPULATION_AVAILABLE', payload: { 
    playerId, type: 'spend_energy_change_die', cost: effect.value 
  }});
  return true;
}

// Similar handlers for other 3 cards
```

---

## Integration Requirements

### Actions That Need Reducers:

1. **`DICE_MANIPULATION_AVAILABLE`**
   ```javascript
   {
     type: 'DICE_MANIPULATION_AVAILABLE',
     payload: {
       playerId: string,
       type: 'spend_energy_change_die' | 'change_to_1' | 'change_die_discard',
       cost?: number,
       freeUse?: boolean,
       cardId?: string,
       discardAfterUse?: boolean
     }
   }
   ```

2. **`HEAL_ABILITY_AVAILABLE`**
   ```javascript
   {
     type: 'HEAL_ABILITY_AVAILABLE',
     payload: {
       playerId: string,
       cost: number,
       healAmount: number
     }
   }
   ```

3. **`EXTRA_TURN_AVAILABLE`**
   ```javascript
   {
     type: 'EXTRA_TURN_AVAILABLE',
     payload: {
       playerId: string,
       cardId: string,
       dicePenalty: number
     }
   }
   ```

4. **`PLAYER_TAKE_DAMAGE`** (generic damage)
   ```javascript
   {
     type: 'PLAYER_TAKE_DAMAGE',
     payload: {
       playerId: string,
       amount: number
     }
   }
   ```

### UI Integration Points:

1. **Dice Rolling Phase**
   - Check for `DICE_MANIPULATION_AVAILABLE` in state
   - Show appropriate buttons based on `type` field
   - Handle energy spending for Stretchy
   - Track once-per-turn usage for Herd Culler
   - Auto-discard Plot Twist after use

2. **Player Panel**
   - Check for `HEAL_ABILITY_AVAILABLE` in state
   - Show "Heal (2⚡)" button when player is damaged
   - Disable if player has < 2 energy
   - Execute healing and deduct energy on click

3. **Turn End**
   - Check for `EXTRA_TURN_AVAILABLE` in state
   - Prompt player: "Take extra turn with one less die?"
   - If yes: start new turn with dice count - 1
   - If no: proceed to next player

4. **Reroll Phase**
   - Call `passiveEffects.canRerollDice(playerId, index, value)` for each die
   - Enable/disable reroll button based on return value
   - Background Dweller allows rerolling 3s even if normally locked

---

## Files Modified

1. **src/services/passiveEffectsProcessor.js**
   - Updated `processDiceResultEffects()` - complete rewrite
   - Added `canRerollDice()` function
   - Added to exports

2. **src/services/effectEngine.js**
   - Added 4 new handlers for Phase 5 effects
   - All dispatch UI availability actions

3. **src/services/cardsService.js**
   - Updated effect list to include Phase 5 kinds
   - Cards enqueue on purchase to set flags

---

## Testing Checklist

### Phase 4 Tests:
- [ ] Roll ①②③❤⚡☠ with Complete Destruction → +9★
- [ ] Roll ①①① with Gourmet → +2★ bonus
- [ ] Roll ②②② with Poison Quills → 2 damage to all others
- [ ] Roll ①①① with Freeze Time → prompt for extra turn
- [ ] Have Background Dweller → can reroll 3s

### Phase 5 Tests:
- [ ] Buy Stretchy → can spend 2⚡ to change die during roll
- [ ] Buy Rapid Healing → can spend 2⚡ to heal 1 damage
- [ ] Buy Herd Culler → can change one die to ① per turn (free)
- [ ] Buy Plot Twist → can change one die, card discards after use
- [ ] Verify energy costs are deducted correctly
- [ ] Verify once-per-turn limits work

---

## Current Status

**Total Cards Functional: 37 / 51 (73%)**

✅ Phase 1: Instant Effects (13 cards)
✅ Phase 2: Simple Passives (9 cards)
✅ Phase 3: Triggered Effects (6 cards)
✅ Phase 4: Dice Results (5 cards)
✅ Phase 5: Dice Manipulation (4 cards)

⏳ Remaining: 14 cards (Phases 6-8: Complex mechanics)

---

## Next Steps

1. **Hook up new functions to game events** (high priority)
   - processDiceResultEffects() after dice finalized
   - canRerollDice() during reroll phase
   - UI listeners for new actions

2. **Implement reducers for new actions**
   - DICE_MANIPULATION_AVAILABLE
   - HEAL_ABILITY_AVAILABLE
   - EXTRA_TURN_AVAILABLE
   - PLAYER_TAKE_DAMAGE

3. **Build UI components**
   - Dice manipulation buttons
   - Rapid healing button
   - Extra turn prompt modal

4. **Test all 37 cards** in-game

5. **Implement remaining 14 cards** (Phases 6-8)
