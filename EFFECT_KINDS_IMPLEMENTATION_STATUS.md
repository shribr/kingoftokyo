# Effect Kinds Implementation Status

## Overview
This document tracks all power card `effect.kind` values and their implementation status across the codebase.

## Effect Kinds Used in Cards (src/domain/cards.js)

### ✅ FULLY IMPLEMENTED

#### `dice_slot` 
- **Cards:** Extra Head
- **Description:** Add extra dice to roll
- **Implementation:**
  - `player.js` line 66: `recalcModifiers()` adds to `modifiers.diceSlots`
  - `effectEngine.js` line 34: Handler acknowledges effect
  - Works automatically when player has card

#### `reroll_bonus`
- **Cards:** Giant Brain
- **Description:** Add extra re-rolls per turn
- **Implementation:**
  - `player.js` line 68: `recalcModifiers()` adds to `modifiers.rerollBonus`
  - `dice.reducer.js` line 22-31: Reads `player.modifiers.rerollBonus` and adds to `rerollsRemaining`
  - `effectEngine.js` line 37: Handler acknowledges effect
  - Works automatically when DICE_ROLL_STARTED is dispatched

#### `vp_gain`
- **Cards:** Complete Destruction, Evacuation Orders
- **Description:** Immediate VP gain (discard cards)
- **Implementation:**
  - `effectEngine.js` line 18: Dispatches `playerVPGained` action
  - ✅ Fully functional

#### `energy_gain`
- **Cards:** Energize, Energy Hoarder
- **Description:** Immediate energy gain (discard cards)
- **Implementation:**
  - `effectEngine.js` line 21: Dispatches `playerGainEnergy` action
  - ✅ Fully functional

#### `heal_all`
- **Cards:** Healing Ray
- **Description:** All monsters heal
- **Implementation:**
  - `effectEngine.js` line 24: Dispatches `healPlayerAction` for all players
  - ✅ Fully functional

#### `heal_self`
- **Cards:** Adrenaline Surge
- **Description:** Heal yourself
- **Implementation:**
  - `effectEngine.js` line 49: Dispatches `healPlayerAction`
  - ✅ Fully functional

#### `damage_all`
- **Cards:** Acid Attack, Seismic Blast
- **Description:** Deal damage to all other monsters
- **Implementation:**
  - `effectEngine.js` line 41: Dispatches `applyPlayerDamage` to all opponents
  - ✅ Fully functional

#### `damage_tokyo_only`
- **Cards:** National Guard, Focused Beam
- **Description:** Deal damage only to monsters in Tokyo
- **Implementation:**
  - `effectEngine.js` line 86: Checks tokyo.city and tokyo.bay, applies damage
  - ✅ Fully functional

#### `damage_select`
- **Cards:** Surgical Strike
- **Description:** Select specific monsters to damage
- **Implementation:**
  - `effectEngine.js` line 93: Starts target selection UI, applies damage when confirmed
  - ✅ Fully functional (with UI flow)

#### `energy_steal`
- **Cards:** Power Siphon
- **Description:** Steal energy from opponents
- **Implementation:**
  - `effectEngine.js` line 53: Deducts from opponents, adds to player
  - ✅ Fully functional

#### `vp_steal`
- **Cards:** Fame Heist
- **Description:** Steal VP from opponents
- **Implementation:**
  - `effectEngine.js` line 69: Deducts VP from opponents, adds to player
  - ✅ Fully functional

### ⚠️ PARTIALLY IMPLEMENTED (Passive Effects - Need Trigger Logic)

These effects are recognized but need game phase integration to trigger at the right time.

#### `turn_start_energy`
- **Cards:** Gas Refinery
- **Description:** Gain energy at start of turn
- **Status:** ⚠️ Needs turn start hook
- **Implementation Needed:** Phase controller should check for this effect kind and dispatch `playerGainEnergy`

#### `cheaper_cards`
- **Cards:** Alien Metabolism
- **Description:** Power cards cost less energy
- **Status:** ⚠️ Needs card purchase integration
- **Implementation Needed:** Card shop should check for this effect and reduce displayed/actual cost

#### `attack_bonus`
- **Cards:** Fire Breathing
- **Description:** Deal extra damage when attacking
- **Status:** ⚠️ Needs combat resolution integration
- **Implementation Needed:** Combat system should check for this effect and add to damage

#### `three_hearts_bonus`
- **Cards:** Herbivore
- **Description:** Gain energy when rolling 3+ hearts
- **Status:** ⚠️ Needs dice resolution integration
- **Implementation Needed:** Dice results processor should count hearts and trigger energy gain

#### `heal_turn_start`
- **Cards:** Regeneration
- **Description:** Heal at start of turn
- **Status:** ⚠️ Needs turn start hook
- **Implementation Needed:** Phase controller should check for this effect and heal player

#### `low_health_bonus`
- **Cards:** Rooting for the Underdog
- **Description:** Gain energy if health ≤5 at turn start
- **Status:** ⚠️ Needs turn start hook with conditional
- **Implementation Needed:** Phase controller should check health and trigger energy gain

#### `armor`
- **Cards:** Armor Plating
- **Description:** Chance to ignore damage
- **Status:** ⚠️ Needs damage application integration
- **Implementation Needed:** Damage handler should roll dice and potentially negate damage

#### `stay_tokyo`
- **Cards:** Background Dweller
- **Description:** Never forced to leave Tokyo
- **Status:** ⚠️ Needs Tokyo yield logic integration
- **Implementation Needed:** Tokyo yield prompt should be suppressed for this player

#### `untargetable`
- **Cards:** Camouflage
- **Description:** Cannot be targeted by other monsters
- **Status:** ⚠️ Needs target selection integration
- **Implementation Needed:** Target selection UI should exclude player with this card

#### `buy_phase_energy`
- **Cards:** Corner Store
- **Description:** Gain energy at start of buy phase
- **Status:** ⚠️ Needs buy phase hook
- **Implementation Needed:** Phase controller entering BUY phase should trigger energy gain

#### `tokyo_bonus_vp`
- **Cards:** Dedicated News Team
- **Description:** Gain extra VP whenever scoring points
- **Status:** ⚠️ Needs VP gain interception
- **Implementation Needed:** playerVPGained action should check for this card and add bonus

#### `health_bonus`
- **Cards:** Even Bigger
- **Description:** Increase maximum health
- **Status:** ⚠️ Needs max health system
- **Implementation Needed:** Player creation/card attachment should increase maxHealth property

#### `draw_cards`
- **Cards:** It Has A Child
- **Description:** Draw extra power cards
- **Status:** ⚠️ Needs card draw integration
- **Implementation Needed:** Card shop should trigger special draw flow (3 cards, keep 2)

#### `leave_tokyo_attack`
- **Cards:** Jets
- **Description:** Can leave Tokyo after attacking
- **Status:** ⚠️ Needs combat flow integration
- **Implementation Needed:** After attack resolves, offer Tokyo exit option

#### `science_bonus`
- **Cards:** Made in a Lab
- **Description:** Gain VP for rolling 1-2-3
- **Status:** ⚠️ Needs dice resolution pattern matching
- **Implementation Needed:** Dice results processor should detect 1-2-3 sequence and award VP

#### `full_heal`
- **Cards:** Metamorphosis
- **Description:** Heal to maximum
- **Status:** ⚠️ Needs max health awareness
- **Implementation Needed:** Should heal to player.maxHealth (default 10, +2 with Even Bigger)

#### `skull_energy`
- **Cards:** Nuclear Power Plant
- **Description:** Gain energy for each skull rolled
- **Status:** ⚠️ Needs dice resolution integration
- **Implementation Needed:** Dice results processor should count skulls and award energy

#### `steal_energy_attack`
- **Cards:** Parasitic Tentacles
- **Description:** Steal energy from monsters you damage
- **Status:** ⚠️ Needs combat integration
- **Implementation Needed:** Damage application should check attacker cards and transfer energy

#### `change_dice`
- **Cards:** Plot Twist
- **Description:** Change one die to any face
- **Status:** ⚠️ Needs dice manipulation UI
- **Implementation Needed:** Special UI to select die and choose new face

#### `force_reroll`
- **Cards:** Psychic Probe
- **Description:** Force opponent to reroll dice
- **Status:** ⚠️ Needs opponent turn integration
- **Implementation Needed:** Target selection + forced reroll during opponent's turn

#### `heal_energy`
- **Cards:** Rapid Healing
- **Description:** Heal when buying cards
- **Status:** ⚠️ Needs card purchase integration
- **Implementation Needed:** Card purchase action should check for this card and heal

#### `tokyo_immunity`
- **Cards:** Skyscraper
- **Description:** Cannot be forced to leave Tokyo
- **Status:** ⚠️ Same as stay_tokyo
- **Implementation Needed:** Tokyo yield logic should check for this

#### `outside_tokyo_energy`
- **Cards:** Solar Powered
- **Description:** Gain energy if outside Tokyo at turn start
- **Status:** ⚠️ Needs turn start hook with location check
- **Implementation Needed:** Phase controller should check Tokyo status and award energy

#### `vp_energy_bonus`
- **Cards:** Stretch Goals
- **Description:** Gain energy when gaining VP
- **Status:** ⚠️ Needs VP gain interception
- **Implementation Needed:** playerVPGained action should trigger energy gain

#### `all_gain_energy`
- **Cards:** Telling Everyone
- **Description:** All monsters gain energy
- **Status:** ⚠️ Could reuse heal_all pattern
- **Implementation Needed:** Similar to heal_all but calls playerGainEnergy for all

#### `building_bonus`
- **Cards:** Urbavore
- **Description:** Gain VP for destroying buildings
- **Status:** ⚠️ Needs building destruction tracking
- **Implementation Needed:** If buildings are implemented, destruction should check for this card

#### `damage_energy`
- **Cards:** We're Only Making It Stronger
- **Description:** Gain energy when taking damage
- **Status:** ⚠️ Needs damage application integration
- **Implementation Needed:** applyPlayerDamage should check victim's cards and award energy

#### `reduce_dice`
- **Cards:** Shrink Ray
- **Description:** Target rolls fewer dice
- **Status:** ⚠️ Needs temporary dice modifier system
- **Implementation Needed:** Target selection + temporary modifier on opponent's dice count

#### `peek`
- **Cards:** Clairvoyance
- **Description:** Peek at top card of deck
- **Status:** ⚠️ Has UI modal but needs activation integration
- **Implementation Needed:** Player action to spend energy and view card

### ❌ NOT YET IMPLEMENTED (New Effect Kinds from Corrections)

#### `heart_vp`
- **Cards:** Friend of Children
- **Description:** Gain 1★ at turn start if rolled at least 1 Heart
- **Status:** ❌ NEW - Needs implementation
- **Implementation Needed:**
  1. Track whether player rolled hearts on their previous dice roll
  2. At turn start (before new roll), check this flag
  3. If true, dispatch `playerVPGained(playerId, 1, 'friend_of_children')`
  4. Clear flag for next turn

### 🎨 DARK EDITION EFFECTS (Custom Content)

#### `wickedness_energy`
- **Cards:** Smoke Stack
- **Description:** Gain energy for wickedness
- **Status:** ⚠️ Needs Wickedness system implementation

#### `curse_immunity`
- **Cards:** Twisted Mind
- **Description:** Immune to curses
- **Status:** ⚠️ Needs Curse system implementation

#### `spread_curse`
- **Cards:** Corruption
- **Description:** Give curse to each monster
- **Status:** ⚠️ Needs Curse system implementation

#### `wickedness_vp`
- **Cards:** Sinister Plot
- **Description:** Gain VP for wickedness
- **Status:** ⚠️ Needs Wickedness system implementation

#### `eliminate_heal`
- **Cards:** Feeding Frenzy
- **Description:** Heal when eliminating monsters
- **Status:** ⚠️ Needs elimination event integration

#### `curse_all`
- **Cards:** Ancient Curse
- **Description:** All monsters gain curse
- **Status:** ⚠️ Needs Curse system implementation

## Implementation Priority

### High Priority (Affects Core Gameplay)
1. ✅ `heart_vp` - Friend of Children is a base game card
2. `turn_start_energy` - Gas Refinery
3. `attack_bonus` - Fire Breathing
4. `cheaper_cards` - Alien Metabolism
5. `three_hearts_bonus` - Herbivore
6. `heal_turn_start` - Regeneration

### Medium Priority (Strategic Cards)
7. `tokyo_bonus_vp` - Dedicated News Team
8. `health_bonus` - Even Bigger (need max health system)
9. `science_bonus` - Made in a Lab
10. `skull_energy` - Nuclear Power Plant
11. `outside_tokyo_energy` - Solar Powered
12. `vp_energy_bonus` - Stretch Goals

### Low Priority (Edge Cases / Complex)
13. `armor` - Armor Plating (RNG-based)
14. `draw_cards` - It Has A Child (special UI flow)
15. `change_dice` - Plot Twist (manipulation UI)
16. `force_reroll` - Psychic Probe (opponent interaction)
17. `peek` - Clairvoyance (optional strategic tool)

## Recommended Next Steps

1. **Add `heart_vp` handler** to effectEngine.js or create passive effect processor
2. **Create passive effect trigger system** in phase controller for turn start/end effects
3. **Integrate card modifiers into combat** for attack_bonus, armor, etc.
4. **Add dice result processors** for symbol-based triggers (hearts, skulls, 1-2-3)
5. **Implement max health system** for Even Bigger and healing caps
6. **Add card purchase hooks** for cheaper_cards, heal_energy triggers

## Files Needing Updates

- `src/services/effectEngine.js` - Add new immediate effect handlers
- `src/services/phaseController.js` - Add turn start/end passive effect triggers
- `src/services/combatResolver.js` - Integrate attack modifiers
- `src/services/diceResultsProcessor.js` - Create new service for symbol-based triggers
- `src/domain/player.js` - Add maxHealth property and related logic
- `src/components/card-shop/*.js` - Integrate card cost modifiers
