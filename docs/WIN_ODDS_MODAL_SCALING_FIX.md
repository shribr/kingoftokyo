# Win Odds Modal Scaling Fix

**Date:** October 10, 2025  
**Issue:** Win odds modal content remained tiny regardless of modal resize  
**Root Cause:** Changes were being applied to wrong implementation file  

## Problem Summary

The win odds modal displayed all content (charts, fonts, icons) at a fixed tiny size that didn't scale when the modal was resized. Investigation revealed two separate implementations of `openWinOddsQuickModal()`:

1. `src/utils/new-modals.js` (line 2027) - **Not being used**
2. `src/components/settings-modal/settings-modal.component.js` (line 2646) - **Active implementation**

The toolbar (`src/components/toolbar/toolbar.component.js` line 76) imports from `settings-modal.component.js`, not from `new-modals.js`. Initial fixes were applied to the wrong file, resulting in no visible changes.

## Solution Implemented

### 1. Dynamic Scaling System

Added responsive scaling calculations to `renderMini()` function in `settings-modal.component.js`:

```javascript
// Calculate scaling factor based on modal dimensions
const modalWidth = wrapper.offsetWidth || 420;
const modalHeight = wrapper.offsetHeight || 500;
const baseWidth = 420;
const baseHeight = 500;
const scaleX = modalWidth / baseWidth;
const scaleY = modalHeight / baseHeight;
const avgScale = (scaleX + scaleY) / 2;
```

### 2. Responsive Sizing Variables

All spacing, fonts, and visual elements now scale proportionally:

```javascript
const gap1 = Math.round(4 * avgScale);    // Small gaps
const gap2 = Math.round(6 * avgScale);    // Medium gaps
const gap3 = Math.round(8 * avgScale);    // Large gaps
const gap4 = Math.round(10 * avgScale);   // Extra large gaps
const pad1 = Math.round(8 * avgScale);    // Padding
const fontSize1 = Math.round(11 * avgScale);  // Primary font
const fontSize2 = Math.round(10 * avgScale);  // Secondary font
const iconSize1 = Math.round(8 * avgScale);   // Small icons
const iconSize2 = Math.round(10 * avgScale);  // Medium icons
const barHeight = Math.round(10 * avgScale);  // Bar chart height
const sparkHeight = Math.round(12 * avgScale); // Sparkline height
const sparkWidth = Math.round(3 * avgScale);   // Sparkline width
```

### 3. Updated All View Modes

Applied scaling to all five visualization modes:

#### Bars Mode
- Scaled gaps, padding, font-size, icon sizes, bar height
- Dynamic bar shadows and border radius

#### Table Mode
- Scaled cell padding, font-size, icon sizes
- Proportional table layout

#### Compact Mode
- Scaled gaps, padding, font-size, icon sizes
- Responsive chip/badge sizing

#### Stacked Mode
- Scaled height, padding, font-size, border radius
- Proportional segment display

#### Monitor Mode (Line Graph)
- Scaled cell size (30px → scaled)
- Scaled stroke width (2px → scaled)
- Scaled icon sizes and legend fonts
- SVG maintains aspect ratio while content scales

### 4. Resize Event Handlers

Added dynamic rescaling on modal resize:

```javascript
// Scaling helper method
wrapper._scaleContent = function() {
  console.log('[WIN ODDS] _scaleContent called, triggering renderMini');
  renderMini(true);
};

// Window resize handler
window.addEventListener('resize', () => {
  if (document.body.contains(wrapper)) {
    console.log('[WIN ODDS] Window resize detected, rescaling content');
    wrapper._scaleContent();
  }
});
```

### 5. Manual Resize Integration

Updated the manual resize handlers to trigger content scaling:

```javascript
function onMove(e) {
  // ... resize calculations ...
  wrapper._scaleContent?.();  // Scale during resize
}

function onUp() {
  // ... cleanup ...
  wrapper._scaleContent?.();  // Scale on resize complete
}
```

### 6. Debug Logging

Added console output to track scaling values:

```javascript
console.log('[WIN ODDS SCALING]', {
  modalWidth, modalHeight, baseWidth, baseHeight,
  scaleX: scaleX.toFixed(2), 
  scaleY: scaleY.toFixed(2), 
  avgScale: avgScale.toFixed(2)
});
```

## Files Modified

### Primary Changes
- **`src/components/settings-modal/settings-modal.component.js`**
  - Updated `renderMini()` function (line ~2791)
  - Added scaling calculations
  - Updated all view mode renderers
  - Added `_scaleContent()` method
  - Added resize event handlers

### Supporting Changes (Previously Completed)
- **`css/components.win-odds-mini.css`**
  - Updated to use relative em units
  - Base font-size: 13px
  - Responsive font sizes: 1.1em (title), 1.2em (buttons), 0.85em (footer)

## Testing

To verify the fix:

1. Open the game and click the win odds icon in the toolbar
2. Check browser console for scaling output:
   ```
   [WIN ODDS SCALING] { modalWidth: 420, modalHeight: 500, scaleX: "1.00", scaleY: "1.00", avgScale: "1.00" }
   ```
3. Resize the modal by dragging edges/corners
4. Observe:
   - Charts/graphics scale proportionally
   - Font sizes increase/decrease with modal size
   - Icons and spacing maintain proper proportions
   - All content remains readable at any size

## Behavior

- **Small modal (300x300)**: Content scales down (avgScale ~0.6-0.7)
- **Default modal (420x500)**: Content at 1.0x scale
- **Large modal (800x800)**: Content scales up (avgScale ~1.7-1.9)
- **Window resize**: All modals re-scale automatically
- **All view modes**: Bars, Table, Compact, Stacked, Monitor all scale correctly

## Related Work

This fix complements earlier modal enhancements:
- AI Decision Tree modal made draggable and resizable
- New modal system with resize handles
- Modal positioning and persistence

## Lessons Learned

1. **Always verify import paths** when multiple implementations exist
2. **Check toolbar/component imports** to find active code paths
3. **Duplicate code creates maintenance issues** - consider consolidating implementations
4. **Debug logging is essential** for tracking down issues like this
5. **Use grep to find all implementations** before making changes

## Future Improvements

Consider:
- Consolidating the two `openWinOddsQuickModal()` implementations
- Removing unused code in `new-modals.js` to prevent future confusion
- Adding min/max scale constraints to prevent extreme sizing
- Applying similar scaling to other modals in the game
