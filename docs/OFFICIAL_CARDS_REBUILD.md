# Official King of Tokyo Cards Rebuild

**Date**: October 9, 2025  
**Source**: [Official Card List CSV](https://github.com/maltize/KingOfTokyo-CardList/blob/master/KingOfTokyo_CardList%20-%20EN.csv)

## Summary

Completely rebuilt the power cards catalog from the official CSV source. The previous catalog had **many incorrect cards** with wrong costs, types, and effects.

## Card Count
- **51 unique official cards** (verified against CSV)
- **53 total cards** in deck (Extra Head and Evacuation Orders have 2 copies each)

## Major Changes

### Cards with WRONG TYPE Fixed
1. **Acid Attack**: Changed from `discard` → `keep` ✅
2. **Corner Store**: Changed from `keep` → `discard` ✅
3. **Energy Hoarder**: Changed from `discard` → `keep` ✅
4. **Gas Refinery**: Changed from `keep` → `discard` ✅
5. **Healing Ray**: Changed from `discard` → `keep` ✅
6. **Plot Twist**: Changed from `discard` → `keep` ✅
7. **Skyscraper**: Changed from `keep` → `discard` ✅

### Cards with WRONG COST Fixed
1. **Energize**: Changed from 2⚡ → **8⚡** ✅
2. **Fire Breathing**: Changed from 3⚡ → **4⚡** ✅
3. **Friend of Children**: Changed from 4⚡ → **3⚡** ✅
4. **Herbivore**: Changed from 3⚡ → **5⚡** ✅
5. **It Has a Child**: Changed from 2⚡ → **7⚡** ✅
6. **Mimic**: Changed from 2⚡ → **8⚡** ✅
7. **National Guard**: Changed from 2⚡ → **3⚡** ✅
8. **Poison Spit**: Changed from 6⚡ → **4⚡** ✅
9. **Shrink Ray**: Changed from 2⚡ → **6⚡** ✅
10. **We're Only Making It Stronger**: Changed from 5⚡ → **3⚡** ✅
11. **Complete Destruction**: Changed from 5⚡ → **3⚡** ✅

### Cards with COMPLETELY WRONG EFFECTS Fixed
1. **Acid Attack**: Now passive attack bonus, not damage all
2. **Background Dweller**: Reroll 3s, not stay in Tokyo
3. **Camouflage**: Heart armor, not untargetable
4. **Complete Destruction**: Perfect roll bonus (9★), not simple VP gain
5. **Dedicated News Team**: VP on card buy, not VP on scoring
6. **Energy Hoarder**: Converts energy to VP, not gains energy
7. **Evacuation Orders**: Steals 5★ from ALL others, not gains 5★
8. **Fire Breathing**: Neighbor damage, not attack bonus
9. **Friend of Children**: Energy on energy, not VP on hearts
10. **Gas Refinery**: VP + damage combo, not energy gain
11. **Healing Ray**: Heal others for payment, not heal all
12. **Herbivore**: VP for not attacking, not energy for hearts
13. **It Has a Child**: Resurrection card, not card draw
14. **Jets**: No damage on yield, not leave after attack
15. **Made in a Lab**: Peek and buy top card, not 123 bonus
16. **Poison Quills**: Damage on 222, not reflect damage
17. **Poison Spit**: Poison counters mechanic, not simple damage
18. **Psychic Probe**: Force reroll with discard condition, different mechanic
19. **Rapid Healing**: Spend energy to heal, not heal on card buy
20. **Regeneration**: Heal bonus, not heal at turn start
21. **Shrink Ray**: Shrink counters mechanic, not simple dice reduction
22. **Solar Powered**: Energy when zero, not energy outside Tokyo
23. **Stretchy**: Spend energy to change die, not reach bay
24. **Urbavore**: Tokyo bonuses, not building bonus
25. **We're Only Making It Stronger**: Energy on 2+ damage, not energy on damage

### NEW Cards Added (Were Missing)
1. **Alpha Monster** (5⚡, keep) - Gain 1★ when you attack
2. **Burrowing** (5⚡, keep) - Extra damage in/yielding Tokyo
3. **Commuter Train** (4⚡, discard) - +2★
4. **Drop from High Altitude** (5⚡, discard) - +2★ and take Tokyo
5. **Eater of the Dead** (4⚡, keep) - 3★ when monster eliminated
6. **Fire Blast** (3⚡, discard) - 2 damage to all
7. **Freeze Time** (5⚡, keep) - Extra turn on 111
8. **Frenzy** (7⚡, discard) - Extra turn immediately
9. **Gourmet** (4⚡, keep) - +2★ on 111
10. **Heal** (3⚡, discard) - Heal 2 damage
11. **Herd Culler** (3⚡, keep) - Change die to 1
12. **Jet Fighters** (5⚡, discard) - +5★ and take 4 damage
13. **Metamorph** (3⚡, keep) - Discard cards for energy refund

### Cards REMOVED (Not in Official List)
1. **Nuclear Power Plant** - Not in base game ❌
2. **Parasitic Tentacles** - Not in base game ❌
3. **Rooting for the Underdog** - Not in base game ❌

## New Effect Kinds Needed

Many cards now require NEW effect kinds that don't exist yet:

- `attack_bonus` with `passive: true` - Acid Attack
- `vp_on_attack` - Alpha Monster
- `reroll_3s` - Background Dweller
- `tokyo_attack_bonus` - Burrowing
- `heart_armor` - Camouflage
- `perfect_roll_bonus` - Complete Destruction
- `vp_on_card_buy` - Dedicated News Team
- `vp_and_take_tokyo` - Drop from High Altitude
- `vp_on_elimination` - Eater of the Dead
- `energy_to_vp` - Energy Hoarder
- `vp_steal_all` - Evacuation Orders
- `neighbor_damage` - Fire Breathing
- `extra_turn_on_111` - Freeze Time
- `extra_turn` - Frenzy
- `energy_on_energy` - Friend of Children
- `vp_and_damage` - Gas Refinery
- `bonus_vp_on_111` - Gourmet
- `heal_others` - Healing Ray
- `vp_no_damage` - Herbivore
- `change_to_1` - Herd Culler
- `damage_all_including_self` - High Altitude Bombing
- `resurrect` - It Has a Child
- `vp_and_take_damage` - Jet Fighters, National Guard
- `no_yield_damage` - Jets
- `peek_and_buy_top` - Made in a Lab
- `discard_for_energy` - Metamorph
- `change_die_discard` - Plot Twist
- `damage_on_222` - Poison Quills
- `poison_counters` - Poison Spit
- `force_reroll_discard` - Psychic Probe
- `spend_energy_heal` - Rapid Healing
- `heal_bonus` - Regeneration
- `shrink_counters` - Shrink Ray
- `energy_when_zero` - Solar Powered
- `spend_energy_change_die` - Stretchy
- `tokyo_bonuses` - Urbavore
- `energy_on_damage` - We're Only Making It Stronger (modified)

## Notes

1. **Backup created**: `cards.js.backup-before-csv-rebuild`
2. **No compilation errors**: File compiles successfully ✅
3. **Correct duplicates**: Extra Head and Evacuation Orders still marked for 2 copies ✅
4. **Dark Edition**: Still excluded pending verification

## Next Steps

1. ✅ Cards catalog rebuilt with official data
2. ⚠️ Need to implement new effect kinds
3. ⚠️ Need to update passive effects processor
4. ⚠️ Need to update effect resolution logic
5. ⚠️ Many cards will not work until new effect kinds are implemented

## Official Source Verification

All cards verified against: https://github.com/maltize/KingOfTokyo-CardList/blob/master/KingOfTokyo_CardList%20-%20EN.csv
