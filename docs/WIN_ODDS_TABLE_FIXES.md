# Win Odds Table Interaction Fixes

## Issues Fixed

### 1. ✅ Player Rows Not Clickable
**Problem:** Table rows had inline `onclick` handlers that were likely interfering with event delegation
**Solution:** Removed inline handlers, added CSS classes `.wo-player-row` and `.wo-player-row.selected` for styling

### 2. ✅ No Hover Effect
**Problem:** Hover effects were inline and not working properly
**Solution:** Added CSS rules for consistent hover behavior:
```css
.wo-player-row:hover {
  background: rgba(99, 102, 241, 0.12) !important;
}
```

### 3. ✅ Cursor Not Changing
**Problem:** No visual indicator that rows are clickable
**Solution:** Added `cursor: pointer` to `.wo-player-row` class

### 4. ✅ Default Size Too Small
**Problem:** Modal defaulted to 340x340, cutting off player list
**Solution:** Increased default size to 650x550 (from 340x340) while keeping max at 900x800

### 5. ✅ Visible Scrollbars
**Problem:** Scrollbars visible in table and insights sections
**Solution:** Added cross-browser scrollbar hiding:
```css
.mini-wo-chart::-webkit-scrollbar,
.mini-wo-insights::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}
.mini-wo-chart,
.mini-wo-insights {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}
```

## Changes Made

### JavaScript (settings-modal.component.js)

**Before:**
```javascript
const rowStyle = isSelected 
  ? `background:rgba(99,102,241,0.25);border:2px solid rgba(99,102,241,0.8);cursor:pointer;` 
  : `cursor:pointer;transition:background 0.2s;border:2px solid transparent;`;
html += `<tr data-player-id="${p.id}" style='${rowStyle}' 
  onmouseover="this.style.background='rgba(99,102,241,0.08)'" 
  onmouseout="this.style.background='${isSelected ? 'rgba(99,102,241,0.25)' : ''}'"
  onclick="console.log('INLINE CLICK on player:', '${p.id}')">
```

**After:**
```javascript
const rowClass = isSelected ? 'wo-player-row selected' : 'wo-player-row';
html += `<tr data-player-id="${p.id}" class="${rowClass}">
```

**Default Size Change:**
```javascript
// Before: 340x340 default
const width = Math.min(600, Math.max(240, stored?.width || stored?.size || 340));
const height = Math.min(600, Math.max(200, stored?.height || stored?.size || 340));

// After: 650x550 default, 900x800 max
const width = Math.min(900, Math.max(240, stored?.width || stored?.size || 650));
const height = Math.min(800, Math.max(200, stored?.height || stored?.size || 550));
```

### CSS (components.win-odds-mini.css)

**Added:**
```css
/* Hide scrollbars but keep scrolling */
.mini-wo-chart::-webkit-scrollbar,
.mini-wo-insights::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}
.mini-wo-chart,
.mini-wo-insights {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

/* Player row hover effects */
.wo-player-row {
  cursor: pointer;
  transition: background 0.2s ease;
  border: 2px solid transparent;
}
.wo-player-row:hover {
  background: rgba(99, 102, 241, 0.12) !important;
}
.wo-player-row.selected {
  background: rgba(99, 102, 241, 0.25);
  border: 2px solid rgba(99, 102, 241, 0.8);
}
.wo-player-row.selected:hover {
  background: rgba(99, 102, 241, 0.3) !important;
}
```

## How to Test

1. **Hard refresh** (Cmd+Shift+R) to clear cache
2. **Open Win Odds modal** from Analytics tab
3. **Verify default size** shows all players without scrolling (650x550)
4. **Hover over player rows** - should see subtle blue highlight
5. **Cursor changes** to pointer when over rows
6. **Click player row** - should select with purple highlight and 👉 emoji
7. **Scroll both sections** - no visible scrollbars
8. **Resize modal** - hover/click still work at any size

## Technical Notes

- **Event Delegation:** Click handler on `.mini-wo-chart` uses `e.target.closest('[data-player-id]')`
- **CSS Priority:** Using `!important` on hover to override inline styles during render
- **Browser Support:** Webkit scrollbar hiding for Chrome/Safari, scrollbar-width for Firefox, -ms-overflow-style for IE/Edge
- **State Management:** Selected player stored in `mini.selectedPlayer`, persists through re-renders
- **Visual Feedback:** 
  - Unselected hover: `rgba(99, 102, 241, 0.12)`
  - Selected: `rgba(99, 102, 241, 0.25)` with border
  - Selected hover: `rgba(99, 102, 241, 0.3)`

## Size Recommendations

| Players | Recommended Size |
|---------|-----------------|
| 2-4     | Default (650x550) is perfect |
| 5-6     | May need to resize taller or use splitter |
| 7-8     | Resize to 700x650 or adjust splitter |

## Persistence

All settings persist to localStorage:
- Modal size: `KOT_WIN_ODDS_MINI_SIZE`
- Modal position: `KOT_WIN_ODDS_MINI_SIZE.pos`
- Split ratio: `KOT_WIN_ODDS_SPLIT`
- Selected player: In-memory only (resets on modal reopen)
