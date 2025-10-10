# Vertical Splitter Feature

## What Was Added

A draggable vertical splitter between the player list (top) and power card analysis (bottom) sections in the Win Odds mini modal.

## Features

### 1. **Resizable Sections**
- Top section (chart/player list): Shows win odds visualization
- Bottom section (insights): Shows power card analysis
- Default split: 50/50
- Range: 20% to 80% (prevents sections from being too small)

### 2. **Visual Splitter**
- 4px gray bar between sections
- Horizontal handle indicator in the center
- Hover effect (darkens on hover)
- `ns-resize` cursor to indicate draggability

### 3. **Double-Click Auto-Fit** ⭐ NEW
- Double-click the splitter to automatically adjust section sizes
- If content overflows: Splits proportionally based on content height
- If content fits: Returns to 50/50 split
- Useful for quickly fitting all visible content

### 4. **Drag Threshold**
- Prevents accidental resizing on single clicks
- Must move mouse 3+ pixels to trigger resize
- Single clicks now do nothing (only drag or double-click work)

### 5. **Independent Scrolling**
- Each section scrolls independently
- Top section can scroll if player list is long
- Bottom section can scroll if many cards

### 6. **Persistent State**
- Split ratio saved to localStorage: `KOT_WIN_ODDS_SPLIT`
- Restored on next modal open
- Survives page refresh

### 7. **Constraints**
- Minimum 20% for top section (always see some players)
- Maximum 80% for top section (always see some analysis)
- Smooth dragging with mouse

## How to Use

### Manual Resize (Drag)
1. **Open Win Odds modal**
2. **Look for the gray horizontal bar** between player list and analysis
3. **Click and hold** on the splitter bar
4. **Drag up or down** to adjust the split
5. **Release** to set the new size

### Auto-Fit (Double-Click) ⭐ NEW
1. **Double-click the splitter bar**
2. Sections automatically adjust based on content:
   - **Content overflows**: Proportional split based on content height
   - **Content fits**: Returns to 50/50 split
3. **Use case**: After selecting a player with many power cards, double-click to auto-fit both sections
3. **Hover over it** - cursor changes to `↕` (ns-resize)
4. **Click and drag** up or down
5. **Release** to set the split
6. **Position is saved** - next time you open modal, it remembers

## Visual Indicators

- **Splitter bar**: Dark gray (#1e242b)
- **Splitter handle**: Small horizontal pill in center
- **Hover state**: Lighter gray (#2c3440)
- **Cursor**: ns-resize (↕)

## Technical Details

### HTML Structure:
```
mini-wo-body (flex column, overflow hidden)
├── mini-wo-chart (flex: 0 0 50%, overflow auto)
├── mini-wo-splitter (flex: 0 0 4px, draggable)
└── mini-wo-insights (flex: 1 1 auto, overflow auto)
```

### Drag Logic:
1. Mouse down on splitter → start drag
2. Mouse move → calculate delta Y
3. Convert delta to percentage of total height
4. Update chart section flex-basis
5. Constrain between 20-80%
6. Save to localStorage

### Storage:
- Key: `KOT_WIN_ODDS_SPLIT`
- Value: Number (percentage, e.g., "60")
- Loaded on modal initialization

## Testing

1. **Hard refresh** page (`Cmd + Shift + R`)
2. **Open Win Odds modal**
3. **Look for gray splitter bar** between sections
4. **Try dragging** it up and down
5. **Close and reopen** modal - position should be remembered

## Common Use Cases

### See More Players:
- Drag splitter **down** to give more space to player list
- Good when many players in game

### See More Card Details:
- Drag splitter **up** to give more space to power card analysis
- Good when player has many cards or shop is full

### Balanced View:
- Leave at default 50/50 split
- Good for quick overview of both sections

## Browser Console Commands

```javascript
// Check saved split ratio
localStorage.getItem('KOT_WIN_ODDS_SPLIT')

// Set custom split (e.g., 30% top, 70% bottom)
localStorage.setItem('KOT_WIN_ODDS_SPLIT', '30')

// Reset to default
localStorage.removeItem('KOT_WIN_ODDS_SPLIT')

// Then reopen modal to see changes
```

## Benefits

1. ✅ **Flexibility**: Adjust to your preference
2. ✅ **No truncation**: Can always scroll to see all content
3. ✅ **Persistent**: Remembers your preference
4. ✅ **Intuitive**: Standard splitter UI pattern
5. ✅ **Smooth**: Fluid dragging experience
6. ✅ **Constrained**: Can't accidentally hide sections
