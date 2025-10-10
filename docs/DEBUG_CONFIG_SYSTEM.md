# Debug Configuration System Implementation

## Overview
Implemented a comprehensive hierarchical debug logging system with a Settings UI for granular control over console output during development.

## Components Created/Modified

### 1. Core Debug Configuration Module
**File:** `src/utils/debugConfig.js`
- **Purpose:** Centralized debug configuration management
- **Features:**
  - Hierarchical configuration structure (parent → children)
  - 20+ component categories with sub-components
  - Runtime enable/disable of debug logging
  - Settings persistence integration
  
**Key Functions:**
- `initDebugConfig(settings)` - Initialize from saved settings
- `getDebugConfig()` - Get current configuration
- `updateDebugConfig(key, value)` - Update configuration
- `isDebugEnabled(component, subComponent)` - Check if logging enabled
- `debugLog(component, subComponent, ...args)` - Conditional logging
- `getFlatDebugOptions()` - Get flattened list for UI

**Component Categories:**
- Bootstrap (services, config, persistence)
- Arena (slots, animations)
- Dice Tray (rolls, animations)
- Action Menu (buttons, radial)
- Toolbar
- Power Cards Panel (cards, shop, purchases)
- Monsters Panel (cards, updates)
- Effect Queue (effects, processing)
- Monster Selection (cards, selection)
- Roll For First (players, dice, results)
- Settings Modal (tabs, sections, scenarios)
- Pause Overlay
- Player Power Cards Modal (cards, carousel)
- Card Detail Modal
- Tokyo Yield Modal (decision)
- Turn Service (phases, actions)
- Effect Engine (resolution, passive)
- AI Decisions (tree, evaluation, thoughtBubble)
- Analysis (winOdds, decisionTree, statistics)
- Deck
- Round Counter
- Active Player Tile
- Save Indicator

### 2. Settings Modal UI
**File:** `src/components/settings-modal/settings-modal.component.js`

**Added:**
- Import of debugConfig utilities
- New "Component Debug Configuration" section in Dev Tools tab
- `buildDebugConfigTree()` function - builds nested checkbox UI
- `formatDebugKey()` helper - formats keys for display
- Expand/collapse functionality for component sub-categories
- Checkbox change handlers with parent-child relationships
- Integration with `collectSettingsFromForm()` and `applySettingsToForm()`

**UI Features:**
- Dark themed nested grid/table
- Parent checkboxes for top-level components
- Expandable sections showing sub-components
- Auto-enable parent when child is checked
- Auto-disable all children when parent is unchecked
- Real-time config updates
- Scrollable container (max 400px height)

### 3. Bootstrap Integration
**File:** `src/bootstrap/index.js`

**Changes:**
- Added import for `initDebugConfig` and `debugLog`
- Initialize debug config from loaded settings: `initDebugConfig(currentSettings)`
- Converted console.log calls to `debugLog('bootstrap', 'services', ...)`
- Service initialization logging with debug config
- AI thought bubble and save indicator logging

### 4. Mount Root Integration
**File:** `src/ui/mountRoot.js`

**Changes:**
- Added import for `debugLog`
- Created `getDebugKey()` mapping function (component name → config key)
- Replaced all console.log calls with `debugLog(key, message)`
- Component initialization logging for all 20+ components

## Usage

### In Settings UI
1. Open Settings (gear icon or ⚙️)
2. Navigate to "Dev Tools" tab
3. Scroll to "Component Debug Configuration" section
4. Check/uncheck parent components for high-level logging
5. Click ▶ to expand and enable specific sub-components
6. Click "Save Settings" to persist configuration

### In Code
```javascript
import { debugLog } from '../utils/debugConfig.js';

// Parent-level logging
debugLog('arena', 'Tokyo slots initialized');

// Child-level logging
debugLog('arena', 'slots', 'Slot 3 updated: Monster A');
debugLog('diceTray', 'animations', 'Roll animation started');

// Check if enabled before expensive operations
if (isDebugEnabled('aiDecisions', 'evaluation')) {
  const expensiveData = computeComplexAnalysis();
  debugLog('aiDecisions', 'evaluation', 'Analysis:', expensiveData);
}
```

## Configuration Structure

```javascript
{
  bootstrap: true,  // Enable all bootstrap logging
  arena: {          // Enable arena with sub-components
    slots: true,
    animations: false
  },
  diceTray: false,  // Disable all dice tray logging
  // ... etc
}
```

## Settings Persistence

Debug configuration is stored in `settings.debug.componentLogging` and persists across sessions via the settings service.

**Storage Location:** `localStorage` → `KOT_SETTINGS` → `debug.componentLogging`

## Benefits

1. **Clean Console Output:** Only see logs for components you're actively debugging
2. **Hierarchical Control:** Enable high-level categories or drill down to specific features
3. **No Code Changes:** Toggle logging through UI without modifying source
4. **Performance:** Avoid expensive logging operations when disabled
5. **Persistent:** Configuration saved with other game settings
6. **Scalable:** Easy to add new components/sub-components

## Next Steps (Optional Enhancements)

1. Add debug logging to remaining components:
   - arena.component.js (slots, animations)
   - dice-tray.component.js (rolls, animations)
   - power-cards-panel.component.js (cards, shop, purchases)
   - All other configured components

2. Add timestamp and color coding options
3. Add log level support (info, warn, error)
4. Add export/import of debug configurations
5. Add quick presets (e.g., "Debug Turn Flow", "Debug AI Decisions")

## Files Modified
- `src/utils/debugConfig.js` (NEW - 289 lines)
- `src/components/settings-modal/settings-modal.component.js` (added ~150 lines)
- `src/bootstrap/index.js` (modified initialization logging)
- `src/ui/mountRoot.js` (converted to debugLog)

## Status
✅ Core system implemented
✅ Settings UI created
✅ Bootstrap integrated
✅ MountRoot integrated
⏳ Component-specific integration ongoing
