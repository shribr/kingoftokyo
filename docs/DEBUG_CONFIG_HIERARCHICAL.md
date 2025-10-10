# Debug Configuration System - Hierarchical Structure

## ✅ Fixed Issues
1. **No more "undefined" top-level entries** - Everything properly grouped
2. **Proper 3-level nesting** - Category → Component → Sub-component
3. **Logical grouping** - Services, Game Screen, Panels, Modals, AI, Widgets

## New Hierarchical Structure

### 🔧 Core Services
Top-level category for all game services and systems
- **Bootstrap & Initialization**
  - Configuration Loading
  - State Persistence
- **Turn Service**
  - Phase Transitions
  - Turn Actions
- **Effect Engine**
  - Effect Resolution
  - Passive Effects
- **Effect Queue**
  - Individual Effects
  - Effect Processing

### 🎮 Main Game Screen
Components directly visible on the main game screen
- **Arena**
  - Tokyo Slots (City/Bay)
  - Card Animations
- **Dice Tray**
  - Roll Results
  - Dice Animations
- **Actions Menu**
  - Button State Changes
  - Radial Menu (Mobile)
- **Toolbar**
  - Toolbar Buttons

### 📊 Side Panels
Persistent panels on left/right sides
- **Monsters Panel**
  - Player Profile Cards
  - Stats Updates (HP, VP, Energy)
- **Power Cards Panel**
  - Individual Cards
  - Shop Updates
  - Card Purchases

### 🪟 Modals & Overlays
Pop-up dialogs and overlays
- **Monster Selection**
  - Monster Cards Display
  - Selection Changes
- **Roll for First**
  - Player Rows
  - Dice Rolls
  - Roll Results
- **Settings**
  - Tab Navigation
  - Section Updates
  - Scenario Loading
- **Player Power Cards**
  - Card Display
  - Carousel Navigation
- **Card Detail**
- **Tokyo Yield Decision**
  - Decision Logic
- **Pause Overlay**

### 🤖 AI & Analysis
AI decision-making and game analysis
- **AI Decisions**
  - Decision Tree
  - Move Evaluation
  - Thought Bubble
- **Analysis & Insights**
  - Player Win Odds
  - Decision Tree Viewer
  - Game Statistics

### 🎨 UI Widgets
Small UI elements and indicators
- **Deck**
- **Round Counter**
- **Active Player Bubble**
- **Save Indicator**

## UI Example

```
Settings → Dev Tools → Component Debug Configuration

🔧 Core Services ▶ ☐
🎮 Main Game Screen ▼ ☑
  └─ Arena ▼ ☑
      ├─ ☑ Tokyo Slots (City/Bay)
      └─ ☐ Card Animations
  └─ Dice Tray ▶ ☐
  └─ Actions Menu ▶ ☐
  └─ Toolbar ▶ ☐
📊 Side Panels ▼ ☑
  └─ Monsters Panel ▼ ☑
      ├─ ☑ Player Profile Cards
      └─ ☑ Stats Updates (HP, VP, Energy)
  └─ Power Cards Panel ▶ ☐
🪟 Modals & Overlays ▶ ☐
🤖 AI & Analysis ▶ ☐
🎨 UI Widgets ▶ ☐
```

## Code Usage

### New Path-Based API

```javascript
import { debugLog, isDebugEnabled } from '../utils/debugConfig.js';

// Level 1: Category only
debugLog(['services'], 'Core services initialized');

// Level 2: Category → Component
debugLog(['gameScreen', 'arena'], 'Arena initialized');

// Level 3: Category → Component → Sub-component
debugLog(['gameScreen', 'arena', 'slots'], 'Slot 3 updated: Gigazaur');
debugLog(['panels', 'monstersPanel', 'statsUpdates'], 'HP: 10 → 8');
debugLog(['modals', 'rollForFirst', 'results'], 'Winner: Player 1');

// Check if enabled before expensive operations
if (isDebugEnabled(['ai', 'aiDecisions', 'evaluation'])) {
  const analysis = performExpensiveAnalysis();
  debugLog(['ai', 'aiDecisions', 'evaluation'], 'Analysis complete:', analysis);
}
```

### Backwards Compatibility

The old 2-parameter format still works but is deprecated:

```javascript
// Old format (still works)
debugLog('arena', 'message');  // → logs as [arena]
debugLog('arena', 'slots', 'message');  // → logs as [arena:slots]

// New format (preferred)
debugLog(['gameScreen', 'arena'], 'message');  // → logs as [gameScreen:arena]
debugLog(['gameScreen', 'arena', 'slots'], 'message');  // → logs as [gameScreen:arena:slots]
```

## Console Output Format

```javascript
// Level 1
[services] Core services initialized

// Level 2
[gameScreen:arena] Arena initialized
[panels:monstersPanel] Monsters panel updated

// Level 3
[gameScreen:arena:slots] Slot 3 updated: Gigazaur
[panels:monstersPanel:statsUpdates] HP: 10 → 8
[modals:rollForFirst:results] Winner: Player 1
[ai:aiDecisions:evaluation] Analysis complete: {...}
```

## Migration Guide

### For Bootstrap/Services
```javascript
// OLD
debugLog('bootstrap', 'services', 'Creating services...');
debugLog('turnService', 'Phase changed to ROLL');
debugLog('effectEngine', 'resolution', 'Resolving effect...');

// NEW
debugLog(['services', 'bootstrap'], 'Creating services...');
debugLog(['services', 'turnService', 'phases'], 'Phase changed to ROLL');
debugLog(['services', 'effectEngine', 'resolution'], 'Resolving effect...');
```

### For Game Screen Components
```javascript
// OLD
debugLog('arena', 'slots', 'Slot updated');
debugLog('diceTray', 'rolls', 'Roll started');

// NEW
debugLog(['gameScreen', 'arena', 'slots'], 'Slot updated');
debugLog(['gameScreen', 'diceTray', 'rolls'], 'Roll started');
```

### For Panels
```javascript
// OLD
debugLog('monstersPanel', 'cards', 'Card updated');
debugLog('powerCardsPanel', 'shop', 'Shop refreshed');

// NEW
debugLog(['panels', 'monstersPanel', 'playerCards'], 'Card updated');
debugLog(['panels', 'powerCardsPanel', 'shop'], 'Shop refreshed');
```

### For Modals
```javascript
// OLD
debugLog('monsterSelection', 'selection', 'Monster selected');
debugLog('settingsModal', 'tabs', 'Tab changed');

// NEW
debugLog(['modals', 'monsterSelection', 'selection'], 'Monster selected');
debugLog(['modals', 'settingsModal', 'tabs'], 'Tab changed');
```

### For AI
```javascript
// OLD
debugLog('aiDecisions', 'evaluation', 'Evaluating move');
debugLog('analysis', 'winOdds', 'Win probability: 45%');

// NEW
debugLog(['ai', 'aiDecisions', 'evaluation'], 'Evaluating move');
debugLog(['ai', 'analysis', 'winOdds'], 'Win probability: 45%');
```

### For Widgets
```javascript
// OLD
debugLog('deck', 'Deck shuffled');
debugLog('roundCounter', 'Round: 3');

// NEW
debugLog(['widgets', 'deck'], 'Deck shuffled');
debugLog(['widgets', 'roundCounter'], 'Round: 3');
```

## Benefits

1. **Clear Organization** - Instantly see where a component fits in the architecture
2. **Logical Grouping** - Related components grouped together (all modals, all services, etc.)
3. **Scalable** - Easy to add new categories or reorganize as needed
4. **No Undefined Entries** - All components have proper parent categories
5. **Intuitive Navigation** - Expand categories to find specific components
6. **Consistent Paths** - `['category', 'component', 'subComponent']` everywhere
