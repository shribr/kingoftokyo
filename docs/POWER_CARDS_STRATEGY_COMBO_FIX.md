# Power Cards Modal Strategy/Combo Text Fix

## Issue Summary

**Problem**: In desktop mode, the player power cards modal was showing the same generic strategy and combo text for every card instead of card-specific, contextual information.

**Example of Generic Text**:
- Strategy: "Use strategically to maximize your advantage."
- Combos: "Synergizes well with victory point and energy generation cards."

**Root Cause**: The desktop grid view was using simple inline helper functions (`getStrategyText` and `getCombosText`) that only provided fallback generic text, instead of using the sophisticated card-analysis functions (`generateStrategyText` and `generateComboTips`) that were already implemented in the same file.

## Fix Applied

**File**: `src/components/player-power-cards-modal/player-power-cards-modal.component.js`

### Lines 197-220: Removed Simple Helper Functions

**Before**: Simple inline helpers that always returned generic text
```javascript
// Helper to generate strategy text
const getStrategyText = (card) => {
  if (card.strategy) return card.strategy;
  if (card.type === 'keep') return 'Keep this card for ongoing benefits throughout the game.';
  if (card.type === 'discard') return 'Use this card for an immediate powerful effect, then discard.';
  return 'Use strategically to maximize your advantage.';
};

// Helper to generate combo text
const getCombosText = (card, allCards) => {
  if (card.combos) return card.combos;
  
  // Generate basic combo suggestions based on owned cards
  const cardTypes = allCards.map(c => c.type);
  if (cardTypes.filter(t => t === 'keep').length > 2) {
    return 'Combine with other Keep cards for stacking bonuses.';
  }
  return 'Synergizes well with victory point and energy generation cards.';
};
```

**After**: Added comment explaining we use the sophisticated functions
```javascript
// NOTE: Using the sophisticated generateStrategyText and generateComboTips functions
// defined at the bottom of this file instead of simple inline helpers
```

### Lines 211-222: Updated Function Calls

**Before**: Called simple helpers
```javascript
`<div class="ppcm-card-strategy">
  <h4>💡 Strategy</h4>
  <p>${getStrategyText(fullCard)}</p>
</div>
<div class="ppcm-card-combos">
  <h4>🔗 Combos</h4>
  <p>${getCombosText(fullCard, fullCards)}</p>
</div>`
```

**After**: Called sophisticated analysis functions
```javascript
`<div class="ppcm-card-strategy">
  <h4>💡 Strategy</h4>
  <p>${generateStrategyText(fullCard)}</p>
</div>
<div class="ppcm-card-combos">
  <h4>🔗 Combos</h4>
  <p>${generateComboTips(fullCard, fullCards)}</p>
</div>`
```

## What the Sophisticated Functions Do

### `generateStrategyText(card)` (Line 414)

1. **Card-Specific Strategies**: Has a lookup table for known cards:
   - SKYSCRAPER: "Evaluate timing: buy when its effect aligns with your immediate plan."
   - ENERGY_HOARDER: "Maximize value by accumulating energy before spending on expensive cards."
   - FIRE_BREATHING: "Best used when you need extra damage output against opponents."
   - HEALING_RAY: "Keep for emergencies when your health is low."
   - ARMOR_PLATING: "Strong defensive card for long-term survivability."

2. **Cost-Based Analysis**: If no specific strategy exists, generates contextual advice based on card cost:
   - **Low-cost (≤3)**: "Low-cost card: Consider early purchase for immediate benefit and board presence."
   - **Mid-cost (4-6)**: "Mid-cost card: Evaluate timing based on current game state and energy availability."
   - **High-cost (7+)**: "High-cost card: Save for late game when you have abundant energy and need powerful effects."

### `generateComboTips(card, allCards)` (Line 445)

1. **Synergy Detection**: Analyzes card names, effects, and descriptions to find:
   - Energy cards (for fueling attacks)
   - Attack cards (for sustained offense)
   - Health cards (for Tokyo survivability)

2. **Contextual Suggestions**: Generates specific combos like:
   - "Pair with GIANT_CLAW, FIRE_BLAST for sustained offense."
   - "Combine with ENERGY_HOARDER to fuel repeated attacks."
   - "Use HEALING_RAY, ARMOR_PLATING to stay in Tokyo longer."

3. **Keyword-Based Matching**: Finds cards with shared keywords for potential synergies

4. **Fallback**: If no combos detected: "Explore different combinations to discover synergies!"

## Example Output (Now Fixed)

### Before Fix
- **Every card showed**: "Use strategically to maximize your advantage."
- **Every combo showed**: "Synergizes well with victory point and energy generation cards."

### After Fix
- **FIRE_BREATHING**: "Best used when you need extra damage output against opponents."
- **HEALING_RAY**: "Keep for emergencies when your health is low."
- **Low-cost card**: "Low-cost card: Consider early purchase for immediate benefit and board presence."
- **Combo for energy card with attack cards owned**: "Pair with GIANT_CLAW for sustained offense."

## Components Affected

✅ **Desktop grid view**: Now shows contextual strategy and combo text
✅ **Mobile carousel view**: Already was using the correct functions (Lines 323-324)

## Testing Checklist

- [ ] Open player power cards modal in desktop mode
- [ ] Verify each card shows unique strategy text (not all the same)
- [ ] Cards with specific strategies (FIRE_BREATHING, HEALING_RAY, etc.) show their custom text
- [ ] Unknown cards show cost-based strategy (low/mid/high cost advice)
- [ ] Combo section shows card-specific synergies based on owned cards
- [ ] Combo text references actual card names owned by the player
- [ ] Mobile carousel view still works correctly (was already correct)

## Related Files

- ✅ `src/components/player-power-cards-modal/player-power-cards-modal.component.js` - Fixed
- ℹ️ Desktop grid view and mobile carousel now both use the same sophisticated functions
- ℹ️ No changes needed to CSS or other components

---

**Fixed**: October 9, 2025
**Issue**: Generic text for all cards in desktop power cards modal
**Solution**: Use sophisticated analysis functions instead of simple fallback helpers
