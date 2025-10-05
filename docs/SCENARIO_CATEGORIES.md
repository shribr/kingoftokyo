# Scenario Categories System

## Overview
Scenarios now include a `category` property that defines which player stats they affect. This makes the system easier to maintain and provides better visual feedback to users.

## Categories

### Available Categories
- **`health`** - Affects player health/HP
- **`energy`** - Affects energy cubes
- **`vp`** - Affects victory points
- **`cards`** - Affects power cards

### Category Usage

Categories are defined as an array in each scenario's definition in `src/scenarios/catalog.js`:

```javascript
{
  id: ScenarioIds.NEAR_DEATH,
  label: 'On Verge of Death',
  description: 'Sets health to a critically low value (still alive).',
  category: ['health'], // Single category
  // ...
}

{
  id: ScenarioIds.BURST_RESOURCES,
  label: 'Burst Resources (VP+Energy)',
  description: 'Sets VP and Energy to configured burst values.',
  category: ['vp', 'energy'], // Multiple categories
  // ...
}
```

## Visual Indicators

### Player Card Asterisks
When scenarios are active for a player, **red asterisks (*)** appear on the affected stat tiles:

- **Health scenarios** → Asterisk at top-right of health bar
- **Energy scenarios** → Asterisk at bottom-right of energy tile
- **VP scenarios** → Asterisk at bottom-right of points tile  
- **Cards scenarios** → Asterisk at bottom-right of cards tile

The asterisks are positioned and styled in `css/components.player-profile-card.css`.

### Scenarios Tab Category Column
The scenario assignments table shows emoji badges for affected categories:

- ❤️ Health
- ⚡ Energy
- ⭐ Victory Points
- 🃏 Power Cards

This helps users quickly understand what each scenario assignment will modify.

## Implementation Details

### Adding New Scenarios
When adding a new scenario to `src/scenarios/catalog.js`:

1. Add the scenario ID to `ScenarioIds` object
2. Add the scenario definition to `listScenarios()` array
3. **Include the `category` property** with appropriate categories
4. The category system will automatically handle visual indicators

### Adding New Categories
If you need to add a new category (e.g., `attack`):

1. Add the category to scenario definitions in `catalog.js`
2. Update `getPlayerScenarioCategories()` in `player-profile-card.component.js` to handle the new category
3. Add a corresponding data attribute and indicator element to the player card template
4. Add CSS styling for the new indicator
5. Update the emoji mapping in `scenarios-tab.component.js` for table display

### Note on Attack Category
Attack is currently not represented as a category because:
- There's no attack stat tile on player cards (no room, no use case)
- Attack scenarios (like `HIGH_DAMAGE_INCOMING`) are categorized by the stat they affect (e.g., `health`)
- Attack is contextual (affects other players) rather than a direct player stat

## Files Modified

### Core Logic
- **`src/scenarios/catalog.js`** - Added `category` property to all scenarios
- **`src/components/player-profile-card/player-profile-card.component.js`** - Reads categories to show asterisks
- **`src/components/scenarios-tab/scenarios-tab.component.js`** - Displays category badges in table

### Styling
- **`css/components.player-profile-card.css`** - Asterisk indicator styling
- **`css/components.scenarios.css`** - Category badge and column styling

## Benefits

1. **Maintainability** - Categories defined once in catalog, used everywhere
2. **Consistency** - All systems read from the same source of truth
3. **Extensibility** - Easy to add new categories or scenarios
4. **User Feedback** - Clear visual indicators of what scenarios affect
5. **No Hard-Coding** - Mapping logic uses category property instead of hard-coded lists
