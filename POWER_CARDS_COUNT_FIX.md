# Power Cards Count Display Fix

## Issue Summary

**Problem**: Player cards tile on desktop player profile cards was showing "0" for the power cards count, even when players owned power cards. The red asterisk (scenario indicator) appeared correctly, and clicking the tile showed the correct cards in the modal, but the count display remained at zero.

**Root Cause**: The `selectPlayerPowerCards` selector in `src/core/selectors.js` was accessing the wrong property name (`cards` instead of `powerCards`), causing it to return an empty array.

## Files Fixed

### 1. Core Selector (PRIMARY FIX)
**File**: `src/core/selectors.js`
- **Line 34**: Changed selector to use correct property
- **Before**: `state.players.byId[playerId]?.cards || []`
- **After**: `state.players.byId[playerId]?.powerCards || []`
- **Impact**: This is the main selector used by player profile cards to get owned power cards count

### 2. Power Card Market Display
**File**: `src/utils/power-card-market.js`
- **Line 93**: Fixed player cards count display
- **Before**: `activePlayer.cards?.length || 0`
- **After**: `activePlayer.powerCards?.length || 0`
- **Impact**: Market modal now shows correct owned cards count

### 3. Player Cards Modal (Duplicate Component)
**File**: `src/components/player-cards-modal/player-cards-modal.component.js`
- **Line 130**: Fixed empty check
- **Before**: `!player.cards.length`
- **After**: `!player.powerCards || !player.powerCards.length`
- **Line 133**: Fixed card mapping
- **Before**: `player.cards.map`
- **After**: `player.powerCards.map`
- **Line 183**: Fixed carousel initialization
- **Before**: `player.cards`
- **After**: `player.powerCards`
- **Note**: This appears to be a duplicate/legacy component, but fixed for safety

### 4. Legacy Game Save/Load
**File**: `src/legacy/game.js`
- **Line 3174**: Fixed save state serialization
- **Before**: `cards: player.cards`
- **After**: `powerCards: player.powerCards`
- **Line 3219**: Fixed load state deserialization with backward compatibility
- **Before**: `player.cards = playerData.cards;`
- **After**: `player.powerCards = playerData.powerCards || playerData.cards || [];`
- **Impact**: Saved games now use correct property, with fallback for old saves

## Components Already Correct

The following components were already using the correct `powerCards` property:

- ✅ `src/components/player-profile-card/player-profile-card.component.js` (Line 416)
- ✅ `src/legacy/main.js` (Lines 2120, 2169, 2277)
- ✅ `src/components/player-power-cards-modal/player-power-cards-modal.component.js`
- ✅ `src/components/action-menu/action-menu.component.js`
- ✅ `src/components/mini-player-card/mini-player-card.component.js`

## How the Bug Manifested

1. **Player owns 4 power cards** (e.g., via "Loaded with Power Cards" scenario)
2. **Scenario indicator shows correctly** (red asterisk appears)
3. **Modal shows cards correctly** (clicking tile opens modal with 4 cards)
4. **But count displays as "0"** on the tile

### Why This Happened

```javascript
// Player profile card calls selector:
const cards = selectPlayerPowerCards(state, playerId) || [];

// Selector was returning wrong data:
export const selectPlayerPowerCards = (state, playerId) => 
  state.players.byId[playerId]?.cards || [];  // ❌ WRONG - should be .powerCards

// Count update uses result:
cardsCountEl.textContent = cards.length;  // Always 0 because cards array was empty
```

### Why Modal Worked

The modal component accessed `player.powerCards` directly, bypassing the broken selector:

```javascript
// Modal directly accesses correct property:
const player = selectPlayerById(state, ui.playerId);
if (!player.powerCards || !player.powerCards.length) { ... }
```

## Testing Checklist

- [ ] Apply "Loaded with Power Cards" scenario to human player
- [ ] Verify card count shows "4" on player profile card tiles (both active and inactive)
- [ ] Verify red asterisk appears next to cards stat
- [ ] Click cards tile → modal should show 4 cards
- [ ] Verify power card market shows correct owned count
- [ ] Save and load game → verify cards persist correctly
- [ ] Buy a power card → verify count increments
- [ ] Discard a power card → verify count decrements

## Property Standardization Context

This fix is part of the larger `powerCards` property standardization effort documented in `POWERCARD_PROPERTY_STANDARDIZATION.md`. The application is migrating from the ambiguous `cards` property to the explicit `powerCards` property for clarity.

**Why `powerCards` instead of `cards`?**
- Clear semantic meaning (cards owned by player, not shop cards)
- Avoids confusion with `state.cards` (shop/deck state)
- Matches actual game terminology

## Resolution

All player power card references now consistently use `player.powerCards`. The selector bug is fixed, and both active and inactive player cards will show the correct owned power cards count.

---

**Fixed**: October 9, 2025
**Related Docs**: 
- `POWERCARD_PROPERTY_STANDARDIZATION.md`
- `DESKTOP_MODAL_SCENARIO_FIXES.md`
