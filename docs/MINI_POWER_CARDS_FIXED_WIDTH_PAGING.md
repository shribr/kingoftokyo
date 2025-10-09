# Mini Power Cards Fixed Width & Paging Implementation

**Date**: October 9, 2025  
**Component**: `mini-power-cards`  
**Status**: ✅ Complete

## Problem Statement

The mini power cards component had inconsistent sizing issues:
- Cards varied in width based on card name length
- Card names could wrap to multiple lines
- All 3 shop cards might not fit in viewport
- No way to navigate to hidden cards

## Requirements

1. **Fixed Dimensions**: All cards must be same height and width regardless of name length
2. **No Text Wrapping**: Card names must stay on single line with ellipsis if too long
3. **Full Name Display**: Card width must accommodate longest card name without truncation
4. **Viewport Fitting**: Tray stretches to fit cards without overflow/hiding
5. **Paging**: If cards don't fit in viewport, provide paging buttons to navigate

## Solution

### Card Sizing
- **Fixed width**: 200px (fits longest name "We're Only Making It Stronger" - 31 chars)
- **Fixed height**: 54px (consistent for all cards)
- **No wrapping**: `white-space: nowrap` with `text-overflow: ellipsis`
- **Font size**: 12px Bangers font with proper letter spacing

### Layout Architecture
```
┌─────────────────────────────────────────────────┐
│ cmp-mini-power-cards (full width container)    │
│ ┌──┐ ┌────────────────────────────┐ ┌──┐       │
│ │◀ │ │ mpc-cards-viewport         │ │▶ │       │
│ │  │ │ ┌────────────────────────┐ │ │  │       │
│ │  │ │ │ mpc-cards-container    │ │ │  │       │
│ │  │ │ │ ┌────┐ ┌────┐ ┌────┐  │ │ │  │       │
│ │  │ │ │ │Card│ │Card│ │Card│  │ │ │  │       │
│ │  │ │ │ └────┘ └────┘ └────┘  │ │ │  │       │
│ │  │ │ └────────────────────────┘ │ │  │       │
│ │  │ └────────────────────────────┘ │  │       │
│ └──┘                                 └──┘       │
│ Prev                                 Next       │
└─────────────────────────────────────────────────┘
```

### Paging System
- **Prev/Next buttons**: Circular 32px buttons on left/right
- **Auto-disable**: Buttons disable when at start/end of scroll
- **Smooth scroll**: 212px per click (200px card + 12px gap)
- **Scroll detection**: Listener updates button states dynamically
- **5px threshold**: Prevents edge-case flickering at scroll end

## Files Modified

### 1. CSS: `css/components.mini-power-cards.css`

**Changes:**
- Removed duplicate CSS rules
- Changed card width from 110px → 200px
- Added `.mpc-cards-viewport` wrapper for scrolling
- Changed `.mpc-card-name` from 2-line clamp → single line nowrap
- Added `.mpc-page-btn` styles for paging buttons
- Container now full width with margins: `calc(100vw - 40px)`
- Removed deprecated `-webkit-overflow-scrolling`

### 2. Component: `src/components/mini-power-cards/mini-power-cards.component.js`

**New Features:**
```javascript
// Structure with paging
container
├── prevBtnEl (◀ button)
├── viewportEl (scrollable area)
│   └── cardsContainerEl (cards wrapper)
│       ├── card 1 (200px fixed)
│       ├── card 2 (200px fixed)
│       └── card 3 (200px fixed)
└── nextBtnEl (▶ button)
```

**Paging Logic:**
- `setupPaging()`: Configures scroll detection and button clicks
- `updatePagingButtons()`: Disables prev/next at boundaries
- Scroll listener: Updates button states on scroll
- Click handlers: Smooth scroll by card width + gap

## Longest Card Names

Analysis of card catalog:
1. "We're Only Making It Stronger" - 31 characters
2. "Rooting for the Underdog" - 24 characters
3. "Dedicated News Team" - 19 characters

200px width accommodates all names at 12px font size.

## Technical Details

### CSS Specifications
```css
.mini-power-card {
  width: 200px;          /* Fixed width */
  height: 54px;          /* Fixed height */
}

.mpc-card-name {
  font-size: 12px;
  white-space: nowrap;   /* No wrapping */
  overflow: hidden;
  text-overflow: ellipsis;
}

.mpc-cards-viewport {
  overflow-x: auto;
  scroll-behavior: smooth;
}
```

### JavaScript Paging
```javascript
// Scroll by one card width
const cardWidth = 200 + 12; // card + gap
viewportEl.scrollBy({ left: cardWidth, behavior: 'smooth' });

// Disable at boundaries
if (scrollLeft <= 0) prevBtn.classList.add('disabled');
if (scrollLeft + clientWidth >= scrollWidth - 5) {
  nextBtn.classList.add('disabled');
}
```

## User Experience

### Before
- ❌ Cards different sizes (90px to 150px)
- ❌ Names wrapped to 2 lines
- ❌ Long names truncated prematurely
- ❌ No navigation for overflow

### After
- ✅ All cards exactly 200px × 54px
- ✅ Single line names with ellipsis
- ✅ Longest names fit fully
- ✅ Paging buttons for navigation
- ✅ Auto-disable at boundaries
- ✅ Smooth scrolling

## Testing Scenarios

1. **3 cards fit in viewport**: Paging buttons both disabled (or hidden)
2. **Cards overflow**: Next enabled, prev disabled initially
3. **Scroll to middle**: Both buttons enabled
4. **Scroll to end**: Next disabled, prev enabled
5. **Long card name**: Displays in full without wrapping
6. **Touch devices**: Native smooth scrolling works
7. **Narrow viewports**: Paging provides navigation

## Browser Compatibility

- ✅ Chrome/Edge (Blink)
- ✅ Safari (WebKit) - vendor prefixes added
- ✅ Firefox (Gecko)
- ✅ Mobile Safari (iOS)
- ✅ Chrome Android

## Related Documentation

- [Power Cards Strategy/Combo Fix](POWER_CARDS_STRATEGY_COMBO_FIX.md)
- [Power Cards Count Fix](POWER_CARDS_COUNT_FIX.md)
- Card catalog: `src/domain/cards.js`

## Future Enhancements

- [ ] Add page indicator dots (e.g., • • •)
- [ ] Keyboard navigation (arrow keys)
- [ ] Touch swipe gestures
- [ ] Auto-hide paging buttons when not needed
- [ ] Animate card appearance on shop update
