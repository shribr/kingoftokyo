# Splitter Click-to-Resize Bug Fix

## Issue
When clicking the vertical splitter, it would immediately shrink the top pane. This happened because:
1. `mousedown` event fired on click
2. Start position and flex values were captured
3. Even without moving the mouse, a single click would sometimes trigger a small resize
4. No way to auto-fit content to optimal size

## Solution

### 1. Drag Threshold (Prevents Accidental Resize)
Added a 3-pixel movement threshold before resizing begins:

```javascript
function onMove(e) {
  if (!isDragging) return;
  
  const deltaY = Math.abs(e.clientY - startY);
  // Only start resizing if mouse moved more than 3 pixels
  if (deltaY < 3 && !hasMoved) return;
  
  hasMoved = true;
  // ... rest of resize logic
}
```

**Result:** Single clicks now do nothing - you must drag at least 3 pixels to trigger a resize.

### 2. Double-Click Auto-Fit (Smart Sizing)
Added double-click handler to automatically adjust sections based on content:

```javascript
splitter.addEventListener('dblclick', (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  const chartContent = chartSection.scrollHeight;
  const insightsContent = insightsSection.scrollHeight;
  const totalContent = chartContent + insightsContent;
  
  if (totalContent > bodyHeight) {
    // Content overflows: split proportionally
    const chartPercent = Math.max(20, Math.min(80, (chartContent / totalContent) * 100));
    chartSection.style.flex = `0 0 ${chartPercent}%`;
  } else {
    // Content fits: return to 50/50
    chartSection.style.flex = '0 0 50%';
  }
});
```

**Result:** Double-click intelligently sizes sections to fit content optimally.

## Behavior Comparison

### Before
| Action | Result |
|--------|--------|
| Single click | ❌ Accidentally resized |
| Drag | ✅ Resized |
| Double-click | ❌ Nothing |

### After
| Action | Result |
|--------|--------|
| Single click | ✅ Does nothing (safe) |
| Drag (3+ pixels) | ✅ Resizes smoothly |
| Double-click | ✅ Auto-fits content |

## Use Cases for Double-Click Auto-Fit

### Scenario 1: Player with Many Power Cards
1. Select player with 5+ power cards
2. Bottom section shows long list of cards
3. **Double-click splitter** → Bottom section expands to show all cards

### Scenario 2: Reset to Default View
1. Manually adjusted split to 70/30
2. Want to return to balanced view
3. **Double-click splitter** → Returns to 50/50 (if content fits)

### Scenario 3: 6+ Players in Game
1. Top section shows many players
2. Player list is cut off
3. **Double-click splitter** → Top section expands proportionally

## Technical Details

### Variables
- `isDragging`: Tracks if mouse button is down
- `hasMoved`: Tracks if mouse moved more than threshold (prevents click resize)
- `startY`: Initial Y position when mousedown
- `startChartFlex`: Initial flex percentage of chart section

### Threshold Logic
```javascript
const deltaY = Math.abs(e.clientY - startY);
if (deltaY < 3 && !hasMoved) return; // Ignore tiny movements
hasMoved = true; // Once threshold crossed, allow all movements
```

### Auto-Fit Logic
1. Measure `scrollHeight` of both sections (actual content height)
2. Compare to available space (`bodyHeight`)
3. If content overflows:
   - Calculate proportional split: `(chartContent / totalContent) * 100`
   - Constrain to 20-80% range
4. If content fits:
   - Return to default 50/50 split

### localStorage Persistence
Both manual drag and double-click auto-fit save the result:
```javascript
localStorage.setItem('KOT_WIN_ODDS_SPLIT', chartPercent.toString());
```

## Testing Steps

1. **Test Single Click (Should Do Nothing)**
   - Open Win Odds modal
   - Click splitter once
   - ✅ Nothing should change

2. **Test Drag Threshold**
   - Click and hold splitter
   - Move mouse 1-2 pixels
   - ✅ Nothing changes
   - Move mouse 5+ pixels
   - ✅ Sections resize smoothly

3. **Test Double-Click with Overflow**
   - Select player with many cards (e.g., 5+ power cards)
   - Bottom section should overflow
   - Double-click splitter
   - ✅ Bottom section expands to show more content

4. **Test Double-Click with Content Fit**
   - Manually drag splitter to 70/30
   - Delete cards so content fits easily
   - Double-click splitter
   - ✅ Returns to 50/50 split

5. **Test Persistence**
   - Drag splitter to custom position
   - Close and reopen modal
   - ✅ Split position restored

## Edge Cases Handled

1. **Rapid Clicks**: Prevented by threshold check
2. **Click Without Movement**: `hasMoved` flag prevents resize
3. **Double-Click During Drag**: `preventDefault()` stops interference
4. **Content Taller Than Modal**: Constrained to 20-80% range
5. **Empty Sections**: Auto-fit defaults to 50/50

## Browser Compatibility

- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support
- Event listeners: `mousedown`, `mousemove`, `mouseup`, `dblclick`
- All standard DOM APIs used

## Code Location

**File:** `src/components/settings-modal/settings-modal.component.js`
**Function:** `enableSplitter()` (lines ~2920-2980)
**CSS:** `css/components.win-odds-mini.css` (`.mini-wo-splitter`)

## Related Features

- [Win Odds Table Interaction](WIN_ODDS_TABLE_FIXES.md)
- [Power Card Analysis](POWER_CARD_ANALYSIS_IMPLEMENTATION.md)
- [Vertical Splitter Feature](VERTICAL_SPLITTER_FEATURE.md)
