# Debugging Power Card Analysis Feature

## Changes Made (Latest)

### 1. Added Safety Check
- Click handler now checks if `mini.chart` exists before attaching
- Logs error if chart element not found

### 2. Added Debug Logging
- Logs when mini object is created
- Shows which elements were found
- Logs every step of the click process

### 3. Visual Indicators
- Selected rows now have brighter purple background
- Selected rows show 👉 emoji
- Thicker border (2px) on selected rows
- Cursor: pointer should be visible on hover

### 4. Inline Click Handler (Testing)
- Added onclick="console.log(...)" directly on `<tr>` elements
- This will fire even if event delegation fails
- Look for "INLINE CLICK on player:" in console

## Testing Steps

1. **Open Chrome DevTools** (Cmd + Option + I) FIRST
2. **Hard refresh** index.html (Cmd + Shift + R)
3. **Watch Console** for these messages:
   ```
   [WIN ODDS] ===== openWinOddsQuickModal called - NEW VERSION WITH POWER CARD ANALYSIS =====
   [WIN ODDS] Mini object created: {hasChart: true, ...}
   [WIN ODDS] Setting up click handler on chart element: [object HTMLDivElement]
   ```

4. **Start a game** and open Win Odds modal
5. **Switch to Table mode** (click mode button until you see table)
6. **Click anywhere on a player row**

## What Should Happen

### If Inline Handler Works:
- Console: `INLINE CLICK on player: p1` (or whatever player ID)
- **This means the row IS clickable, event delegation might be the issue**

### If Event Delegation Works:
- Console: `[WIN ODDS] Chart clicked [object HTMLElement]`
- Console: `[WIN ODDS] Closest row with data-player-id: [object HTMLTableRowElement]`
- Console: `[WIN ODDS] Player selected: p1`
- Console: `[WIN ODDS] Rendering insights, selectedPlayer: p1`
- Console: `[POWER CARD ANALYSIS] Starting analysis for player: {...}`
- **UI: Row highlights in bright purple with 👉 emoji**
- **UI: Insights panel shows power card analysis**

### If Nothing Works:
- No console logs when clicking
- **Possible causes:**
  - Another element is overlaying the table (z-index issue)
  - Table not being rendered
  - JavaScript error preventing modal from opening

## Console Commands to Test

Open console and run these to debug:

```javascript
// Check if modal exists
document.getElementById('mini-win-odds-floating')

// Check if chart element exists
document.querySelector('#mini-win-odds-chart')

// Check if table rows exist
document.querySelectorAll('[data-player-id]')

// Manually trigger click on first row
document.querySelector('[data-player-id]')?.click()

// Check current win odds mode
window.__KOT_WIN_ODDS__?.obj?.mode

// Force table mode
if (window.__KOT_WIN_ODDS__?.obj) {
  window.__KOT_WIN_ODDS__.obj.mode = 'table';
  window.dispatchEvent(new Event('open-win-odds-modal'));
}
```

## If Still Not Working

### Check for these issues:

1. **Wrong file being loaded**
   - Check file timestamp: `Settings-modal.component.js` should be Oct 10, 17:2X
   - Check file size: Should be ~203KB

2. **Browser cache**
   - Try incognito/private window
   - Clear all cache (Cmd + Shift + Delete)
   - Close browser completely and reopen

3. **JavaScript errors**
   - Check console for red error messages
   - Errors might prevent modal from initializing

4. **Module not loading**
   - Check Network tab in DevTools
   - Find `settings-modal.component.js`
   - Should be status 200, not 304 (cached)
   - Right-click → "Clear browser cache" then refresh

## Next Steps After Testing

**Share these with me:**
1. What console logs do you see when opening modal?
2. Does the inline onclick work? (`INLINE CLICK on player:` message)
3. Can you see the table with player rows?
4. Do rows have `cursor: pointer` on hover?
5. Any red error messages in console?
