# Debug Configuration - Nested Settings Modal

## Overview
Enhanced the Settings Confirmation Modal to show expandable, detailed debug configuration changes in a side-by-side comparison view.

## Features

### 1. Expandable Debug Config Row
- Debug configuration changes now have a small **▶** triangle button next to the setting name
- Clicking the triangle expands a nested row showing detailed component breakdown
- Triangle changes to **▼** when expanded

### 2. Side-by-Side Comparison
When expanded, the debug configuration shows:
- **Left Column**: Previous Configuration (in red/pink color)
- **Right Column**: New Configuration (in green color)

### 3. Hierarchical Tree View
Each column displays:
- **Top-level categories** with emoji icons (🔧 Core Services, 🎮 Main Game Screen, etc.)
- **Component names** indented under categories (e.g., ├─ bootstrap, ├─ turnService)
- **Sub-components** further indented (e.g., └─ persistence)

### 4. Visual State Indicators
- **Enabled items**: Full opacity, colored text
- **Disabled items**: 40% opacity, line-through decoration, gray text
- Makes it easy to see what changed between old and new configurations

## Implementation Details

### Key Functions

#### `formatDebugConfigDetails(oldConfig, newConfig)`
Creates the expandable nested row HTML with two-column comparison layout.

#### `buildConfigTree(config, color)`
Recursively builds the tree structure for one configuration:
- Iterates through categories (services, gameScreen, panels, modals, ai, widgets)
- Shows enabled/disabled state with visual styling
- Displays components and sub-components in a hierarchical tree
- Uses Unicode box-drawing characters (├─, └─) for tree structure

### UI Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ ▶ 🔍 Debug Configuration │ Old Summary   │ New Summary  │ [✓] │
├─────────────────────────────────────────────────────────────────┤
│ Expanded Details Row (hidden by default)                       │
│ ┌─────────────────────────┬─────────────────────────┐         │
│ │ Previous Configuration  │ New Configuration       │         │
│ │ (red/pink color)        │ (green color)           │         │
│ ├─────────────────────────┼─────────────────────────┤         │
│ │ 🔧 Core Services        │ 🔧 Core Services        │         │
│ │ ├─ bootstrap            │ ├─ bootstrap            │         │
│ │ │  └─ persistence       │ │  └─ persistence       │         │
│ │ ├─ turnService          │ ├─ turnService          │         │
│ │ 🎮 Main Game Screen     │ 🎮 Main Game Screen     │         │
│ │ ├─ arena                │ ├─ arena                │         │
│ │ ...                     │ ...                     │         │
│ └─────────────────────────┴─────────────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### Modal Width
Increased from 700px to 800px to accommodate the two-column comparison layout.

## User Experience

1. **Compact Summary**: By default, debug config shows as a summary (e.g., "🎮 Main Game Screen (3), 📊 Side Panels (2)")
2. **Expand for Details**: Click the ▶ triangle to see exactly which components changed
3. **Easy Comparison**: Side-by-side layout makes it clear what's being enabled/disabled
4. **Visual Clarity**: Color coding (red for old, green for new) and opacity/strikethrough for disabled items

## Technical Notes

- Uses `table-row` display toggle for smooth expansion within table structure
- Prevents event propagation on expand button to avoid row selection issues
- Generates unique IDs for each expandable section using index
- Gracefully handles missing or undefined config values
- Works with all 6 debug categories and unlimited nesting depth

## Example Output

When expanded, you might see:

**Previous Configuration (red)**
```
🔧 Core Services (enabled)
├─ bootstrap (enabled)
│  └─ persistence (disabled)
├─ turnService (disabled)

🎮 Main Game Screen (disabled)
├─ arena (disabled)
```

**New Configuration (green)**
```
🔧 Core Services (enabled)
├─ bootstrap (enabled)
│  └─ persistence (enabled)
├─ turnService (enabled)

🎮 Main Game Screen (enabled)
├─ arena (enabled)
```

This makes it immediately obvious that:
- `persistence` was enabled
- `turnService` was enabled  
- The entire Main Game Screen category was enabled
