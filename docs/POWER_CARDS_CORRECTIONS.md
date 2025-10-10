# Power Card Corrections - October 9, 2025

## Issue
User reported incorrect power card descriptions in the game. Giant Brain showed "you may have 2 extra cards in your hand" which is completely wrong - it should allow rolling an extra die, and there is NO hand limit in King of Tokyo.

## Source of Truth
All power card data is stored in: `/src/domain/cards.js`

## Corrected Cards

### Giant Brain ⭐ CRITICAL FIX
- **Cost:** 5 (unchanged)
- **Type:** Keep (unchanged)
- **OLD Effect:** `{ kind: 'card_limit', value: 2 }` ❌
- **NEW Effect:** `{ kind: 'reroll_bonus', value: 1 }` ✅
- **OLD Description:** "You may have 2 extra cards in hand." ❌
- **NEW Description:** "You have 1 extra re-roll each turn." ✅
- **Notes:** Was completely wrong. Giant Brain gives 1 extra re-roll, not an extra die. No hand limit exists in KoT.
- **Implementation Status:** ✅ FULLY IMPLEMENTED - dice.reducer.js reads player.modifiers.rerollBonus, player.js recalcModifiers() adds reroll_bonus cards to modifier

### Acid Attack
- **OLD:** "Deal 1 extra damage to all other monsters."
- **NEW:** "Deal 1 damage to all other monsters (even if you roll no Claws)."
- **Notes:** Clarified that it doesn't require attacking to use.

### Alien Metabolism
- **OLD:** "Buying cards costs 1 less energy (minimum 1)."
- **NEW:** "Buying cards costs 1 less energy (minimum 0)."
- **Notes:** Cards can cost 0 with this effect.

### Dedicated News Team
- **OLD:** "Gain 1 extra Victory Point when gaining points from Tokyo."
- **NEW:** "Gain 1 extra Victory Point each time you score points."
- **Notes:** Works for ANY VP gain, not just Tokyo bonuses.

### Even Bigger
- **OLD:** "Gain 2 extra Health (maximum 12)."
- **NEW:** "Your maximum Health is increased by 2 (to 12)."
- **Notes:** It increases the max, not just current health.

### Fire Breathing
- **OLD:** "Deal 1 extra damage when you attack."
- **NEW:** "Deal 1 extra damage each turn you attack."
- **Notes:** Clarified timing.

### Friend of Children ⭐ MAJOR FIX
- **OLD Effect:** `{ kind: 'heart_energy', value: 1 }` ❌
- **NEW Effect:** `{ kind: 'heart_vp', value: 1 }` ✅
- **OLD:** "Gain 1 Energy for each Heart you roll."
- **NEW:** "Gain 1★ at the start of your turn if you rolled at least 1 Heart."
- **Notes:** Was giving energy instead of VP! Complete wrong effect.

### It Has A Child
- **OLD:** "Draw 1 extra Power card this turn."
- **NEW:** "Draw 3 extra Power cards (keep 2, discard 1)."
- **Notes:** Official rules: draw 3, keep 2, discard 1.

### Jets
- **OLD:** "You may leave Tokyo after attacking."
- **NEW:** "You may leave Tokyo after attacking (before counter-attack)."
- **Notes:** Clarified timing window.

### Made in a Lab
- **OLD:** "Gain 2 Victory Points for each set of 1-2-3 you roll."
- **NEW:** "Gain 2★ for each set of 1-2-3 you roll."
- **Notes:** Used star symbol for consistency.

### Metamorphosis
- **OLD:** "Heal to full Health."
- **NEW:** "Heal to your maximum Health."
- **Notes:** More precise wording (respects Even Bigger).

### Parasitic Tentacles
- **OLD Emoji:** ⚡
- **NEW Emoji:** 🐙
- **Notes:** More thematic emoji.

### Plot Twist
- **OLD:** "Change one die to any face."
- **NEW:** "Change one die to any face you want."
- **Notes:** Clarified player choice.

### Psychic Probe
- **OLD:** "Force other monsters to reroll specific dice."
- **NEW:** "Force another monster to reroll 2 of their dice."
- **OLD Emoji:** refreshSVG with lightEmoji flag
- **NEW Emoji:** 🌀
- **Notes:** Was too vague. Official: target 1 monster, they reroll 2 dice.

### Rapid Healing
- **OLD:** "Gain 1 Health when you gain Energy."
- **NEW:** "Gain 1 Health when you buy a Power card."
- **Notes:** Official rule: triggers when buying cards, not gaining energy.

### Regeneration
- **OLD:** "Heal 1 Health at the start of your turn."
- **NEW:** "Heal 1 Health at the start of your turn if not at maximum."
- **Notes:** Clarified can't exceed max health.

### Rooting for the Underdog
- **OLD:** "Gain 1 Energy for each Health you are missing."
- **NEW:** "Gain 1 Energy at the start of your turn if your Health is 5 or less."
- **Notes:** Was WAY overpowered in old description. Official: just +1 energy if ≤5 health.

## Cards Verified as Correct
- Extra Head: `{ kind: 'dice_slot', value: 1 }` ✅ (same effect as Giant Brain)
- Camouflage, Complete Destruction, Corner Store, Energize, Energy Hoarder
- Evacuation Orders, Healing Ray, Herbivore
- National Guard, Nuclear Power Plant, Shrink Ray, Skyscraper
- Solar Powered, Stretch Goals, Telling Everyone, Urbavore
- We're Only Making It Stronger
- All Dark Edition cards (custom content)
- All Additional Utility cards (custom content)

## Effect Kind Changes Needed
Some cards have the wrong `effect.kind` which will need code implementation updates:

1. **Friend of Children**: Changed from `heart_energy` → `heart_vp`
   - Need to implement this new effect kind in game logic

## Next Steps
1. ✅ Update card descriptions in `/src/domain/cards.js`
2. ⚠️ Implement new effect kind: `heart_vp` for Friend of Children
3. ⚠️ Verify AI card evaluation logic uses correct effect kinds
4. ⚠️ Test all corrected cards in-game
5. ⚠️ Check if legacy/cards.js needs updating (likely deprecated)

## Hand Limit Clarification
**IMPORTANT:** There is NO hand limit in King of Tokyo. The old Giant Brain description suggesting "2 extra cards in hand" implies a limit exists - this is completely false. Players can hold as many Keep cards as they want (discard cards are discarded after use).
