# Power Cards Property Standardization

## Summary
Standardized all player power card references to use `player.powerCards` instead of the ambiguous `player.cards` property.

## Changes Made

### 1. Redux Reducer ✅
**File**: `/src/core/reducers/players.reducer.js`
- Changed `existing.cards` → `existing.powerCards` 
- Updated to handle empty array case: `[...(existing.powerCards || [])]`

### 2. Scenario Catalog ✅
**File**: `/src/scenarios/catalog.js`
- Changed `player.cards` → `player.powerCards` in POWER_LOADED scenario
- Updated return value: `{ cards: merged }` → `{ powerCards: merged }`

### 3. Scenario Service ✅
**File**: `/src/services/scenarioService.js`
- Updated logging: `player.cards?.length` → `player.powerCards?.length`
- Changed patch checking: `patch.cards` → `patch.powerCards`
- Updated existing cards check: `player.cards` → `player.powerCards`

### 4. Mini Player Card Component ✅
**File**: `/src/components/mini-player-card/mini-player-card.component.js`
- Changed: `player.powerCards?.length || 0` (already correct, kept as is)

### 5. Player Power Cards Modal ✅
**File**: `/src/components/player-power-cards-modal/player-power-cards-modal.component.js`
- Updated empty check: `!player.cards.length` → `!player.powerCards || !player.powerCards.length`
- Changed mapping: `player.cards.map` → `player.powerCards.map`
- Updated carousel init: `player.cards` → `player.powerCards`

### 6. Action Menu Component ✅
**File**: `/src/components/action-menu/action-menu.component.js`
- Added import: `uiPlayerPowerCardsOpen`
- Fixed "My Cards" button handler to dispatch Redux action instead of event
- Updated card count: `active?.cards?.length` → `active?.powerCards?.length`

### 7. Mini Power Cards Component ✅
**File**: `/src/components/mini-power-cards/mini-power-cards.component.js`
- Updated check: `activePlayer.cards` → `activePlayer.powerCards`
- Updated iteration: `activePlayer.cards.forEach` → `activePlayer.powerCards.forEach`

## Desktop Modal Fix

### Issue
Clicking "MY CARDS" from the power cards submenu in the desktop action menu did not open the player power cards modal.

### Root Cause
The button handler was emitting an event (`eventBus.emit('ui/modal/showPlayerPowerCards')`) that nothing was listening to.

### Solution
Changed to dispatch the proper Redux action:
```javascript
case 'show-my-cards': {
  const st = store.getState();
  const activePlayerIndex = st.meta?.activePlayerIndex ?? 0;
  const activePlayerId = st.players?.order?.[activePlayerIndex];
  if (activePlayerId) {
    store.dispatch(uiPlayerPowerCardsOpen(activePlayerId));
  }
  // Hide submenu after action
  const submenu = root.querySelector('.power-cards-submenu');
  if (submenu) {
    submenu.setAttribute('hidden', '');
  }
  break;
}
```

## Benefits

1. **Clarity**: `powerCards` is unambiguous - clearly refers to the player's owned power cards
2. **Consistency**: All components now use the same property name
3. **Maintainability**: Future developers will have less confusion
4. **Debugging**: Easier to trace power card related issues

## Testing Checklist

- [ ] Apply "Loaded with Power Cards" scenario to human player
- [ ] Verify card count shows "4" on mini player card
- [ ] Verify red asterisk appears next to cards stat
- [ ] Click mini player card → modal should show 4 cards
- [ ] Desktop: Click Action Menu → Power Cards → MY CARDS
- [ ] Desktop: Verify modal opens with player's cards
- [ ] Mobile: Tap mini player card → verify carousel appears
- [ ] Mobile: Swipe between cards in carousel

## Files Modified

1. `/src/core/reducers/players.reducer.js`
2. `/src/scenarios/catalog.js`
3. `/src/services/scenarioService.js`
4. `/src/components/player-power-cards-modal/player-power-cards-modal.component.js`
5. `/src/components/action-menu/action-menu.component.js`
6. `/src/components/mini-power-cards/mini-power-cards.component.js`
7. `/src/components/mini-player-card/mini-player-card.component.js` (already using powerCards)
