# Power Cards Cleanup - October 9, 2025

## Issue
User correctly identified that several cards in the catalog were made up and don't exist in official King of Tokyo. Also noted that no official cards give benefits to opponents (that would be self-defeating).

## Cards REMOVED (Fake/Made-up) ❌
1. **Telling Everyone** - Gave energy to all monsters (helps opponents!)
2. **Stretch Goals** - Made-up card
3. **Clairvoyance** - Not in official game
4. **Adrenaline Surge** - Made-up healing card
5. **Power Siphon** - Made-up steal card
6. **Fame Heist** - Made-up VP steal card
7. **Seismic Blast** - Made-up damage card
8. **Focused Beam** - Duplicate of National Guard
9. **Surgical Strike** - Made-up targeted damage

## Cards ADDED (Missing Official) ✅
1. **Apartment Building** (5⚡) - Destroy for 3 Victory Points
2. **High Altitude Bombing** (4⚡) - Deal 3 damage to all, lose 2★
3. **Mimic** (2⚡) - Copy another Keep card
4. **Poison Quills** (4⚡) - Reflect 2 damage when attacked
5. **Poison Spit** (6⚡) - Deal 3 damage to 1 monster
6. **Stretchy** (3⚡) - Attack Tokyo Bay from outside

## Dark Edition Cards ADDED ✅
1. **Ancient Curse** (3⚡) - All others gain 1 Curse
2. **Burrowing** (5⚡) - Leave Tokyo before damage
3. **Corruption** (5⚡) - Give Curse to all others
4. **Devilish Body** (6⚡) - Gain Wickedness when attacked
5. **Devoted Following** (4⚡) - +1★ per 3 Wickedness
6. **Eerie Music** (2⚡) - All others lose 1⚡
7. **Feeding Frenzy** (6⚡) - Heal 3 when eliminate
8. **It's Alive!** (4⚡) - Resurrect with 6 HP
9. **Lurker** (3⚡) - Gain Wickedness entering Tokyo
10. **Regeneration** (4⚡) - Same as base (Dark Edition version)
11. **Shadow Double** (7⚡) - Roll extra die
12. **Shadow Form** (5⚡) - Immune to damage for turn
13. **Sinister Plot** (4⚡) - +1★ per 3 Wickedness  
14. **Sleep Walker** (2⚡) - Gain Wickedness, draw card
15. **Smoke Stack** (4⚡) - +1⚡ per Wickedness
16. **Terror of the Deep** (3⚡) - Gain Wickedness outside Tokyo
17. **Twisted Mind** (3⚡) - Immune to Curses
18. **Unholy Pact** (3⚡) - Spend Wickedness for resources

## Important Note on Healing Ray ✅
**Healing Ray IS official** - It heals ALL monsters including yourself. This is one of the few cards that provides a benefit to everyone, but it's strategic (heal yourself for more than the 1 HP opponents get when you're low).

## New Effect Kinds for Dark Edition
- `curse_all` - Give Curse to all other monsters
- `curse_immunity` - Immune to Curse effects
- `wickedness_energy` - Gain energy per Wickedness
- `wickedness_vp` - Gain VP per Wickedness
- `eliminate_heal` - Heal when eliminating monsters
- `attacked_wickedness` - Gain Wickedness when attacked
- `tokyo_entry_wickedness` - Gain Wickedness entering Tokyo
- `outside_tokyo_wickedness` - Gain Wickedness outside Tokyo
- `spend_wickedness` - Trade Wickedness for resources
- `wickedness_draw` - Gain Wickedness and draw cards
- `all_lose_energy` - All others lose energy
- `leave_before_damage` - Escape Tokyo before damage
- `resurrect` - Return from elimination
- `immune_turn` - Immune to damage for turn
- `destroy_for_vp` - Destroy building for VP
- `damage_all_lose_vp` - Damage all but lose VP
- `copy_card` - Copy another player's card
- `reflect_damage` - Deal damage back to attacker
- `reach_bay` - Attack Tokyo Bay from outside
- `spread_curse` - Give Curse to each other monster

## Total Card Count
- **Base Game**: 42 unique cards (2 have duplicates = 44 cards in deck)
  - Extra Head ×2
  - Evacuation Orders ×2
- **Dark Edition**: 18 cards
- **Total Catalog**: 60 unique cards

## Files Modified
- `/src/domain/cards.js` - Removed 9 fake cards, added 24 official cards
- `/src/services/passiveEffectsProcessor.js` - Removed Stretch Goals handler
- `/OFFICIAL_CARDS_AUDIT.md` - Created audit document
- `/POWER_CARDS_CLEANUP.md` - This document
