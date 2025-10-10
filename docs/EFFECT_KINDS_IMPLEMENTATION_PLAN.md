# Effect Kinds Implementation Plan

## Current Status: 4 Working / 47 Need Implementation

### ✅ Already Implemented (4)
1. `attack_bonus` - Acid Attack (+1 damage) ✅
2. `cheaper_cards` - Alien Metabolism (cards cost 1 less) ✅
3. `vp_on_card_buy` - Dedicated News Team (+1★ on purchase) ✅
4. `energy_on_damage` - We're Only Making It Stronger (+1 energy when taking 2+ damage) ✅

---

## 🎯 Phase 1: Simple Instant Effects (Discard Cards) - PRIORITY
These are straightforward one-time effects that trigger when played.

### VP Gain (4 cards)
- `vp_gain` - Apartment Building (+3★), Commuter Train (+2★), Corner Store (+1★), Skyscraper (+4★)

### Energy Gain (1 card)
- `energy_gain` - Energize (+9 Energy)

### Heal (1 card)
- `heal` - Heal (heal 2 damage)

### Damage All (2 cards)
- `damage_all` - Fire Blast (deal 2 to all others)
- `damage_all_including_self` - High Altitude Bombing (3 damage to ALL including self)

### Combined Effects (5 cards)
- `vp_and_damage` - Gas Refinery (+2★ and 3 damage to all others)
- `vp_and_take_damage` - Jet Fighters (+5★ and take 4), National Guard (+2★ and take 2)
- `vp_and_take_tokyo` - Drop from High Altitude (+2★ and take Tokyo)
- `vp_steal_all` - Evacuation Orders (all others lose 5★)

**Total: 13 cards**

---

## 🎯 Phase 2: Simple Passive Keep Effects
These modify ongoing game stats or provide bonuses.

### Stat Bonuses (3 cards)
- `health_bonus` - Even Bigger (+2 max health)
- `dice_slot` - Extra Head (+1 die)
- `reroll_bonus` - Giant Brain (+1 reroll per turn)

### Damage Modification (4 cards)
- `armor` - Armor Plating (ignore 1 damage)
- `tokyo_attack_bonus` - Burrowing (+1 damage in Tokyo)
- `neighbor_damage` - Fire Breathing (neighbors take +1 when you deal damage)
- `no_yield_damage` - Jets (no damage when yielding Tokyo)

### Turn-Based Effects (2 cards)
- `tokyo_bonuses` - Urbavore (+1★ at start in Tokyo, +1 damage from Tokyo)
- `energy_when_zero` - Solar Powered (+1 energy at end if 0 energy)

**Total: 9 cards**

---

## 🎯 Phase 3: Triggered Keep Effects
These trigger based on player actions or events.

### Attack/Damage Triggers (3 cards)
- `vp_on_attack` - Alpha Monster (+1★ when you attack)
- `vp_no_damage` - Herbivore (+1★ if you don't damage anyone)
- `vp_on_elimination` - Eater of the Dead (+3★ when monster eliminated)

### Energy Bonuses (2 cards)
- `energy_on_energy` - Friend of Children (+1 energy when you gain any energy)
- `energy_to_vp` - Energy Hoarder (1★ per 6 energy at end of turn)

### Heal Bonuses (1 card)
- `heal_bonus` - Regeneration (+1 when healing)

**Total: 6 cards**

---

## 🎯 Phase 4: Dice Result Effects
These trigger on specific dice combinations.

### Number Combinations (5 cards)
- `perfect_roll_bonus` - Complete Destruction (+9★ for ①②③❤⚡☠)
- `bonus_vp_on_111` - Gourmet (+2★ for ①①①)
- `damage_on_222` - Poison Quills (2 damage for ②②②)
- `extra_turn_on_111` - Freeze Time (extra turn for ①①①)
- `reroll_3s` - Background Dweller (can always reroll 3s)

**Total: 5 cards**

---

## 🎯 Phase 5: Dice Manipulation (Spend Energy)
These allow spending energy to change dice.

### Energy-Based Manipulation (3 cards)
- `spend_energy_change_die` - Stretchy (spend 2 energy to change a die)
- `spend_energy_heal` - Rapid Healing (spend 2 energy to heal 1) ✅ KEEP effect exists
- `change_to_1` - Herd Culler (change one die to ① each turn)

### One-Time Use (1 card)
- `change_die_discard` - Plot Twist (change one die, then discard card)

**Total: 4 cards**

---

## 🎯 Phase 6: Advanced Defensive Effects
These provide complex defensive abilities.

### Armor Variations (1 card)
- `heart_armor` - Camouflage (roll die for each damage, ❤ = negate)

### Healing Others (1 card)
- `heal_others` - Healing Ray (heal others with ❤, they pay 2 energy each)

**Total: 2 cards**

---

## 🎯 Phase 7: Counter/Status Effects
These apply ongoing debuffs to opponents.

### Counter Mechanics (2 cards)
- `poison_counters` - Poison Spit (poison = 1 damage/turn, remove with ❤)
- `shrink_counters` - Shrink Ray (shrink = -1 die, remove with ❤)

### Other Monster Interaction (1 card)
- `force_reroll_discard` - Psychic Probe (reroll opponent die, discard on ❤)

**Total: 3 cards**

---

## 🎯 Phase 8: Complex/Special Mechanics
These require significant game logic changes.

### Purchase Mechanics (2 cards)
- `extra_turn` - Frenzy (take another turn after this one)
- `peek_and_buy_top` - Made in a Lab (peek and buy from deck top)

### Card Management (1 card)
- `discard_for_energy` - Metamorph (discard keep cards for refund)

### Resurrection (1 card)
- `resurrect` - It Has a Child (come back at 10❤, lose cards/VP)

### Card Copying (1 card)
- `copy_card` - Mimic (copy another player's card)

**Total: 5 cards**

---

## Summary by Priority

| Phase | Description | Cards | Difficulty |
|-------|-------------|-------|------------|
| ✅ Current | Already working | 4 | Done |
| 1 | Instant effects | 13 | Easy |
| 2 | Simple passives | 9 | Easy |
| 3 | Triggered passives | 6 | Medium |
| 4 | Dice result effects | 5 | Medium |
| 5 | Dice manipulation | 4 | Medium |
| 6 | Advanced defense | 2 | Hard |
| 7 | Counter/status | 3 | Hard |
| 8 | Complex mechanics | 5 | Very Hard |

**Total: 51 unique cards**

## Implementation Strategy

1. **Start with Phase 1**: All discard cards with instant effects - most impactful for gameplay
2. **Then Phase 2**: Simple stat bonuses and passive effects
3. **Then Phase 3**: Triggered effects on player actions
4. **Save Phases 6-8 for last**: Require most complex logic changes
