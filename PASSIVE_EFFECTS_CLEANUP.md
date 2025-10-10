# Passive Effects Processor Cleanup

## Summary
After rebuilding the card catalog from the official CSV source, the `passiveEffectsProcessor.js` file was cleaned up to remove obsolete effect handlers that no longer match the official cards.

## Changes Made

### 1. Turn Start Effects (`processTurnStartEffects`)
**Removed:**
- `turn_start_energy` - Gas Refinery is now discard, not keep
- `heal_turn_start` - Regeneration has different effect
- `low_health_bonus` - Rooting for the Underdog doesn't exist
- `outside_tokyo_energy` - Solar Powered has different effect

**Still Valid:**
- (None - all turn start effects need implementation)

### 2. Buy Phase Effects (`processBuyPhaseEffects`)
**Removed:**
- `buy_phase_energy` - Corner Store is now discard, not keep

**Still Valid:**
- (None - this section is empty now)

### 3. Dice Result Effects (`processDiceResultEffects`)
**Removed:**
- `heart_vp` - Friend of Children has different effect
- `three_hearts_bonus` - Herbivore has different effect
- `skull_energy` - Nuclear Power Plant doesn't exist
- `science_bonus` - Made in a Lab has different effect

**Still Valid:**
- (None - all dice effects need implementation)

### 4. VP Gain Effects (`processVPGainEffects`)
**Removed:**
- `tokyo_bonus_vp` - Dedicated News Team triggers on card purchase, not VP gain

**Still Valid:**
- (None - this section is empty now)

### 5. Damage Taken Effects (`processDamageTakenEffects`)
**Updated:**
- `energy_on_damage` - Updated to check threshold (2+ damage) instead of per-damage
  - We're Only Making It Stronger: "When you lose 2❤ or more gain 1 Energy"
  - Changed from `amount * value` to conditional check with threshold
  - Card updated to use `{ threshold: 2, value: 1 }`

### 6. Attack Bonus Effects (`getAttackBonus`)
**Still Valid:**
- `attack_bonus` - Used by Acid Attack card

### 7. Card Purchase Effects (`processCardPurchaseEffects`)
**Updated:**
- Changed from `heal_energy` to `vp_on_card_buy`
  - Dedicated News Team: "Gain 1★ whenever you buy a card"
- Added notes for unimplemented purchase effects:
  - `extra_turn` (Frenzy)
  - `peek_and_buy_top` (Made in a Lab)
  - `discard_for_energy` (Metamorph)

### 8. Card Cost Reduction (`getCardCostReduction`)
**Still Valid:**
- `cheaper_cards` - Used by Alien Metabolism card

## Currently Working Effect Kinds
Only 3 effect kinds are fully functional:
1. `attack_bonus` - Acid Attack (+1 damage)
2. `cheaper_cards` - Alien Metabolism (cards cost 1 less)
3. `vp_on_card_buy` - Dedicated News Team (+1★ on card purchase)
4. `energy_on_damage` - We're Only Making It Stronger (+1 energy when taking 2+ damage)

## Effect Kinds Needing Implementation
See `OFFICIAL_CARDS_REBUILD.md` for the full list of 30+ new effect kinds that need to be implemented for the official cards to work correctly.

## Files Modified
- `src/services/passiveEffectsProcessor.js` - Cleaned up obsolete handlers
- `src/domain/cards.js` - Fixed "We're Only Making It Stronger" effect structure

## Next Steps
1. Implement new effect kinds for official cards
2. Update resolution service to handle new effect types
3. Add action creators for new effect types
4. Test that all 51 official cards work correctly
5. Only after verification, add Dark Edition cards
