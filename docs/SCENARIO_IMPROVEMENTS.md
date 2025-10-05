# Scenario System Improvements

## Recent Updates (Latest Session)

### ✅ 1. One Row Per Scenario in Assignment Table
**File**: `src/components/scenarios-tab/scenarios-tab.component.js`

- Changed table structure to display each scenario on its own row
- Previously: All scenarios for a target were shown in one row, comma-separated
- Now: Each scenario gets its own row with the same target label
- Makes it easier to see individual scenarios and their categories
- Each row shows:
  - **Target**: Who receives the scenario (e.g., "👤 Human", "🤖 CPU 1-2")
  - **Scenario**: Individual scenario name (e.g., "On Cusp of Victory")
  - **Categories**: Emoji badges showing affected stats (❤️⚡⭐🃏)
  - **Remove**: X button to remove just that scenario

**Remove Button Behavior**:
- Clicking ✕ removes only that specific scenario from the assignment
- If removing the last scenario in an assignment, the entire assignment is deleted
- Updates are saved to localStorage automatically

### ✅ 2. Success Notification After Applying Scenarios
**File**: `src/bootstrap/index.js`

Added bottom-left corner notification that appears when scenarios are applied:

**Success Notification**:
- Green background (#2d5016)
- Shows: "✓ Scenarios Applied Successfully (X scenarios)"
- Appears at bottom-left corner
- Slides in from left
- Auto-dismisses after 3 seconds
- Appears when clicking "Apply Scenarios to Game" button

**Error Notification** (fallback):
- Red background (#5c1616)
- Shows: "✗ Failed to Apply Scenarios"
- Same positioning and animation

**Functions Added**:
- `showScenarioAppliedNotification(assignments)` - Success notification
- `showScenarioErrorNotification()` - Error notification

### ✅ 3. Scenarios Persist and Load from localStorage

**Already Working** - Scenarios are:
- **Saved**: Automatically saved to `localStorage` under key `kot_new_settings_v1`
- **Loaded**: Automatically loaded on game start in bootstrap
- **Applied**: Applied to players after game initialization (see `bootstrap/index.js` lines 264-271)

**Verification**:
1. Settings service (`src/services/settingsService.js`) persists on `SCENARIO_CONFIG_UPDATED` action
2. Bootstrap loads settings via `loadSettings(store)` 
3. After game starts, scenarios are applied if present in settings
4. Toast notification appears showing which scenarios were applied on game load

### ✅ 4. Cards Tile Click Opens Power Cards Modal
**File**: `src/components/player-profile-card/player-profile-card.component.js`

- Removed check that prevented opening modal when player has no cards
- Now clicking on **ANY player's cards tile** opens their power card wallet
- Works for human player and all CPU players
- Shows empty state if player has no cards

### ✅ 5. Enhanced Debug Logging
**File**: `src/services/scenarioService.js`

Added comprehensive console logging to track scenario application:
- 🎬 When `applyScenarios()` is called
- 🎯 Which player is receiving scenarios
- 📋 Which scenarios are being applied
- 🔧 The patch object returned by each scenario
- ⭐ VP changes (current → target)
- ⚡ Energy changes (current → target)  
- ❤️ Health changes (current → target)
- 🃏 Card additions (count and names)
- 🔮 Effect queue operations

**How to Use**:
1. Open browser console (F12)
2. Apply scenarios from Settings tab
3. Watch detailed logs showing exactly what's happening

## How It All Works Together

### Scenario Application Flow

1. **User assigns scenarios** in Settings → Scenarios tab
   - Select scenarios from list
   - Choose target (Human/CPUs/Both)
   - Click "Add to List"
   - Each scenario appears in its own row in the table

2. **User applies scenarios**
   - Click "Apply Scenarios to Game" button
   - `scenarioApplyRequest` action is dispatched
   - Bootstrap subscriber catches the action
   - `applyScenarios()` function is called
   - Success notification appears at bottom-left
   - Console shows detailed logs

3. **Scenarios update player state**
   - VP/Energy/Health: Actions dispatched to update counters
   - Cards: `playerCardGained` dispatched for each new card
   - Player cards tile shows updated count
   - Power cards button becomes enabled

4. **Settings are persisted**
   - Scenario config saved to `localStorage`
   - Key: `kot_new_settings_v1`
   - Includes all assignments and parameters

5. **On next game load**
   - Settings loaded from `localStorage`
   - Scenarios automatically applied after game starts
   - Toast notification appears at top showing applied scenarios
   - Player stats reflect scenario modifications

### Checking If Scenarios Are Working

**In Console** (F12):
```
🎬 applyScenarios called with config: {...}
🎯 Applying scenarios to player Alice (p1): ["almostWin", "powerLoaded"]
  📋 Applying scenario "On Cusp of Victory" (almostWin)
  🔧 Patch returned: {victoryPoints: 18}
  ⭐ VP delta: 18 (current: 0, target: 18)
  📋 Applying scenario "Loaded With Power Cards" (powerLoaded)
  🔧 Patch returned: {cards: [...]}
  🃏 Cards: 4 new cards to add (total in patch: 4, existing: 0)
    📇 Adding card 1/4: "Alien Metabolism" (alienMetabolism)
    📇 Adding card 2/4: "Energy Hoarder" (energyHoarder)
    ...
```

**In UI**:
- ✓ Bottom-left notification: "Scenarios Applied Successfully (X scenarios)"
- ✓ Player card shows updated VP/Energy/Health/Cards count
- ✓ Power cards button (green) becomes clickable
- ✓ Asterisks (*) appear on affected stat tiles
- ✓ Hovering over asterisks shows tooltip with scenario names

**In localStorage** (DevTools → Application → Local Storage):
- Key: `kot_new_settings_v1`
- Contains: `{"scenarioConfig": {"assignments": [...]}}`

## Files Modified

1. `src/components/scenarios-tab/scenarios-tab.component.js` - One row per scenario
2. `src/bootstrap/index.js` - Notifications for scenario application
3. `src/components/player-profile-card/player-profile-card.component.js` - Cards tile click
4. `src/services/scenarioService.js` - Debug logging
5. `src/services/settingsService.js` - Already handles persistence (no changes needed)

## Known Behavior

- Scenarios are applied via **actions/reducers**, not direct state mutation
- Changes are **additive**: VP/Energy/Health use deltas, cards check for duplicates
- **Global scenarios** (e.g., MULTI_NEAR_WIN) apply to all players
- **Parameters** are preserved per scenario (e.g., VP target, energy minimum)
- **Removal** of individual scenarios from table works correctly
- **localStorage** persistence is automatic on any scenario config change
