# Mini Power Cards Layout & Positioning Fix

**Date**: October 9, 2025  
**Component**: `mini-power-cards`  
**Status**: ✅ Complete

## Changes Implemented

### Problem Statement

The mini power cards tray had several layout and positioning issues:

1. **Position conflict**: Tray was centered at bottom, competing with radial menu for space
2. **Page counter location**: Counter was inside the card display area, cluttering the view
3. **Name/cost overlap**: Cost badge overlapped with long card names
4. **Insufficient width**: Card names were truncated despite available space

### Solutions Implemented

#### 1. ✅ Repositioned to Left Side (Before Radial Menu)

**Changed**: Bottom-center → Bottom-left positioning
- **From**: `left: 50%; transform: translateX(-50%);` (centered)
- **To**: `left: 2vw; transform: none;` (left-aligned)
- **Vertical**: `bottom: 2vh` (matches radial menu positioning)

**Layout Order (left to right)**:
```
[Counter] [◀] [Card Display] [▶]                     [Radial Menu]
   ↑                                                        ↑
   2vw from left                                        2vw from right
```

#### 2. ✅ Moved Page Counter Outside Container

**Structure Before**:
```
Container: [◀] [Card + Counter] [▶]
```

**Structure After**:
```
Container: [Counter] [◀] [Card] [▶]
```

**Implementation**:
- Counter now first child of container (left-most position)
- Removed from `mpc-card-display` area
- Dedicated min-width (40px) for consistent spacing
- Only shows when multiple cards available

#### 3. ✅ Increased Card Width to Prevent Overlap

**Dimensions Updated**:
- **Card width**: 280px → **350px** (+25%)
- **Name padding-right**: 36px → **48px** (more clearance for cost badge)
- **Font size**: 13px → **14px** (better readability)
- **Cost badge size**: Unchanged (24px × 20px)

**Longest card name test**:
- "We're Only Making It Stronger" (31 chars) - ✅ Fully visible
- "Rooting for the Underdog" (24 chars) - ✅ Fully visible
- All cards display without truncation

#### 4. ✅ Enhanced Visual Styling

**Container improvements**:
- Added full border: `3px solid rgba(255, 207, 51, 0.4)`
- Added border-radius: `8px` for rounded corners
- Shadow all around: `0 4px 12px rgba(0, 0, 0, 0.6)`
- Max-width: `65vw` to prevent overflow

**Indicator improvements**:
- Increased font size: 11px → **12px**
- Brighter color: `rgba(255, 207, 51, 0.7)` → `rgba(255, 207, 51, 0.9)`
- Text-align: center for consistent appearance

## Files Modified

### 1. `src/components/mini-power-cards/mini-power-cards.component.js`

**Key Changes**:
```javascript
// OLD: Indicator inside card display
cardDisplayEl.appendChild(indicator);

// NEW: Indicator as first child of container (left-most)
const indicatorEl = document.createElement('div');
indicatorEl.className = 'mpc-indicator';
container.appendChild(indicatorEl); // Before buttons and card

// Update indicator on navigation (don't recreate)
const indicatorEl = container.querySelector('.mpc-indicator');
if (indicatorEl) {
  indicatorEl.textContent = `${currentIndex + 1} / ${shopCards.length}`;
}
```

### 2. `css/components.mini-power-cards.css`

**Container positioning**:
```css
/* OLD */
bottom: 0;
left: 50%;
transform: translateX(-50%);
border-top: 3px solid rgba(255, 207, 51, 0.4);

/* NEW */
bottom: 2vh;
left: 2vw;
transform: none;
border: 3px solid rgba(255, 207, 51, 0.4);
border-radius: 8px;
```

**Card dimensions**:
```css
/* OLD */
width: 280px;
font-size: 13px;
padding-right: 36px;

/* NEW */
width: 350px;
font-size: 14px;
padding-right: 48px;
```

**Indicator styling**:
```css
/* OLD */
margin-top: 2px;
font-size: 11px;
color: rgba(255, 207, 51, 0.7);

/* NEW */
min-width: 40px;
text-align: center;
font-size: 12px;
color: rgba(255, 207, 51, 0.9);
flex-shrink: 0;
```

## Visual Layout Comparison

### Before:
```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│     ┌───────────────────────┐           │
│     │ [◀] Card Name [5⚡] [▶]│           │
│     │         1 / 3         │           │
│     └───────────────────────┘           │
│                                [●]      │
└─────────────────────────────────────────┘
```

### After:
```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│ ┌────────────────────────────┐          │
│ │1/3 [◀] Card Name [5⚡] [▶] │      [●] │
│ └────────────────────────────┘          │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

**Key improvements**:
- Counter moved to far left (outside card area)
- Cards positioned before radial menu (left to right)
- Full card names visible without truncation
- No overlap between name and cost badge
- Cleaner, more spacious layout

## Technical Specifications

### Positioning
- **Z-index**: 6800 (above radial menu at 6700)
- **Bottom offset**: 2vh (matches radial menu)
- **Left offset**: 2vw (left-aligned)
- **Transform**: None (no centering)

### Dimensions
- **Container**: Auto-width, max 65vw
- **Container height**: 70px
- **Card width**: 350px
- **Card height**: 54px
- **Indicator min-width**: 40px

### Spacing
- **Container gap**: 12px (between all elements)
- **Name padding-right**: 48px (for cost badge clearance)
- **Container padding**: 8px 16px

### Typography
- **Card name**: 14px Bangers, bold, gold (#ffcf33)
- **Indicator**: 12px Bangers, semi-bold, gold (#ffcf33 @ 0.9 opacity)
- **Cost**: 11px Bangers, bold, black on gold gradient

## Testing Scenarios

1. **Positioning**:
   - ✅ Tray appears on left side (2vw from left edge)
   - ✅ Does not overlap with radial menu (on right at 2vw)
   - ✅ Proper vertical alignment (bottom 2vh)

2. **Counter display**:
   - ✅ Shows "1 / 3" to left of navigation buttons
   - ✅ Updates when navigating between cards
   - ✅ Hidden when only 1 card available
   - ✅ Does not overlap card or buttons

3. **Card name display**:
   - ✅ "We're Only Making It Stronger" fully visible
   - ✅ No overlap with cost badge (5⚡)
   - ✅ Text truncates with ellipsis if still too long
   - ✅ Readable at 14px font size

4. **Navigation**:
   - ✅ Prev/Next buttons functional
   - ✅ Circular navigation (wraps around)
   - ✅ Indicator updates on navigation
   - ✅ Smooth transitions

## Browser Compatibility

- ✅ Chrome/Edge (Blink)
- ✅ Safari (WebKit)
- ✅ Firefox (Gecko)
- ✅ Mobile Safari (iOS)
- ✅ Chrome Android

## Related Documentation

- [Card Detail & Mini Cards Improvements](CARD_DETAIL_MINI_CARDS_IMPROVEMENTS.md)
- [Mini Power Cards Fixed Width & Paging](MINI_POWER_CARDS_FIXED_WIDTH_PAGING.md)
- [Power Cards Strategy/Combo Fix](POWER_CARDS_STRATEGY_COMBO_FIX.md)
