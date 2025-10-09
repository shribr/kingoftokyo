# Settings Panel Debug Logging & Dialog Centering Updates

## Summary
Added debug logging configuration controls to the Settings panel and fixed the reset confirmation dialog positioning.

## Changes Made

### 1. Debug Logging Section in Settings Panel
**File:** `/Users/amischreiber/source/repos/kingoftokyo/src/components/settings-panel/settings-panel.component.js`

#### Added New Fieldset
Added a "Debug Logging" section with checkboxes for all available debug flags:
- **Component Updates** - `logComponentUpdates`
- **CPU/AI Decisions** - `logCPUDecisions`
- **Store Updates** - `logStoreUpdates`
- **Subscriptions** - `logSubscriptions`
- **Modal Lifecycle** - `logModals`

#### Event Handler Updates
- Added handler for `[data-log-flag]` checkboxes
- Directly updates `window.__KOT_DEBUG__[flagName]` when toggled
- Provides console feedback when flags are enabled/disabled

#### Sync Function Updates
- Added logic to read current state from `window.__KOT_DEBUG__`
- Syncs checkbox states on panel initialization and updates
- Ensures UI reflects actual debug flag states

### 2. Reset Confirmation Dialog Centering
**File:** `/Users/amischreiber/source/repos/kingoftokyo/css/components.monster-selection.css`

#### Changed Positioning
- Changed `.reset-confirmation-overlay` from `position: absolute` to `position: fixed`
- This ensures the dialog is centered relative to the viewport, not its parent container
- Prevents the dialog from being off-center when the monster selection modal is scrolled or positioned

## Features

### Debug Logging Controls
1. **Real-time Toggle**: Changes take effect immediately without reload
2. **Persistent State**: Settings panel remembers current debug flag states
3. **Visual Feedback**: Console logs when flags are enabled/disabled
4. **URL Parameter Hint**: Help text mentions `?debug=all` URL parameter option

### Reset Dialog
1. **Always Centered**: Fixed positioning ensures dialog is always in center of screen
2. **Overlay Coverage**: Full viewport overlay with semi-transparent background
3. **High Z-index**: Dialog appears above all other content (z-index: 1000)

## User Experience

### Accessing Debug Settings
1. Open Settings panel (Developer Tools section)
2. Expand "Debug Logging" fieldset
3. Toggle individual logging categories on/off
4. Changes apply immediately

### Debug Logging Benefits
- **No Code Changes**: Enable/disable logging without editing files
- **Selective Debugging**: Turn on only the logs you need
- **Performance Friendly**: All logging off by default
- **Quick Access**: Faster than using URL parameters for frequent debugging

### Reset Dialog UX
- Dialog appears centered on screen regardless of scroll position
- Clear visual hierarchy with backdrop dimming the rest of the UI
- Smooth fade-in/out animation
- Proper focus containment

## Technical Details

### Debug Flag Storage
- Flags stored in `window.__KOT_DEBUG__` object (initialized by debugFlags.js)
- Settings panel reads and writes directly to this object
- No Redux action needed (flags are for development only)

### CSS Positioning Strategy
```css
.reset-confirmation-overlay {
  position: fixed;      /* Viewport-relative */
  inset: 0;            /* Full screen coverage */
  display: flex;       /* Flexbox for centering */
  align-items: center; /* Vertical center */
  justify-content: center; /* Horizontal center */
}
```

## Integration with Existing Debug System

The Settings panel debug controls integrate seamlessly with:
1. **URL Parameters**: `?debug=all`, `?debug=components,cpu`, etc.
2. **Console Commands**: Manual `window.__KOT_DEBUG__.logCPUDecisions = true`
3. **Code Checks**: `if (window.__KOT_DEBUG__?.logComponentUpdates) { ... }`

All three methods work together - the Settings panel is just another interface to the same underlying system.

## Files Modified

1. `/Users/amischreiber/source/repos/kingoftokyo/src/components/settings-panel/settings-panel.component.js`
   - Added debug logging fieldset to template
   - Added event handler for log flag checkboxes
   - Added sync logic for log flags

2. `/Users/amischreiber/source/repos/kingoftokyo/css/components.monster-selection.css`
   - Changed reset-confirmation-overlay position from absolute to fixed

## Testing Checklist

- [ ] Settings panel displays Debug Logging section
- [ ] All 5 log flag checkboxes are present
- [ ] Toggling checkboxes updates `window.__KOT_DEBUG__` immediately
- [ ] Console logs confirmation message when flags change
- [ ] Checkboxes reflect current state when panel is opened
- [ ] URL parameters still work (`?debug=all` enables all flags and checkboxes)
- [ ] Reset confirmation dialog appears centered on screen
- [ ] Dialog remains centered when monster selection modal is scrolled
- [ ] Dialog backdrop covers entire viewport
- [ ] Dialog animation works smoothly

## Future Enhancements

Potential additions to debug settings:
- **Log Level Control**: Error, Warn, Info, Debug levels
- **Log Filtering**: Text filter for console output
- **Export Logs**: Download debug session as file
- **Performance Monitoring**: FPS counter, memory usage
- **Clear Console Button**: Quick console.clear()
- **Log History**: View recent debug messages in panel
