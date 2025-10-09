# Mobile Radial Action Menu - Technical Documentation

## Overview

The mobile radial action menu is a touch-optimized carousel-style navigation system that appears in the bottom corner of the screen on mobile devices. It features a pie-chart toggle button and action buttons arranged in a clock-hand sweeping arc.

---

## Architecture

### Core Components

1. **Pie Toggle Button** (`#action-menu-mobile-btn`)
   - SVG-based pie chart with 6 slices
   - Positioned in bottom-left or bottom-right corner (user preference)
   - Animates slices individually to show menu state

2. **Radial Container** (`#radial-action-menu`)
   - Contains all action buttons
   - Positioned relative to toggle button
   - Controls button arc layout and animations

3. **Action Buttons** (`.radial-action-btn`)
   - ROLL, KEEP, ACCEPT DICE, POWER CARDS, YIELD, END TURN
   - Arranged in clock positions from 9 o'clock to 12 o'clock
   - Only one button active at a time (carousel navigation)

---

## Visual States

### Collapsed State (Menu Closed)

**What's Visible:**
- Only the pie toggle button in bottom corner
- 6 pie slices with black outlines (`stroke="#333"`)
- No fill color (transparent interior)
- All action buttons hidden (`scale(0)`, `opacity: 0`)

```
[🥧] ← Pie button in corner
     (Empty slices, black outlines only)
     No other UI elements visible
```

### Expanded State (Menu Open)

**What's Visible:**
- Pie toggle button with all slices filled orange
- Action buttons arranged in arc from 9 o'clock to 12 o'clock
- Active button is larger and fully opaque
- Inactive buttons are smaller and dimmed

```
Right Corner Layout:
                [Button 6] ← 12:00 (270°) - Top
           [Button 5]  [Button 4]
        [Button 3]          [Button 2]
    [Button 1]                    [🥧]
    9:00 (180°)                   Center

Left Corner Layout:
    [Button 1] ← 6:00 (90°) - Bottom-right
        [Button 2]  [Button 3]
           [Button 4]      [Button 5]
                [Button 6]          [🥧]
                9:00 (180°)         Center
```

---

## Animation System

### 1. Pie Slice Animation

**Purpose:** Visual feedback showing menu state transition

**Opening Sequence** (Clockwise from bottom):
```javascript
// Each slice fills individually with 50ms delay
slices.forEach((slice, index) => {
  setTimeout(() => {
    slice.setAttribute('fill', '#ffb300'); // Orange fill
  }, index * 50);
});
```

**Timing:**
- Slice 1 (bottom): 0ms
- Slice 2: 50ms
- Slice 3: 100ms
- Slice 4: 150ms
- Slice 5: 200ms
- Slice 6: 250ms
- **Total duration:** 300ms

**Closing Sequence** (Counter-clockwise, reverse order):
```javascript
// Last slice empties first
slices.forEach((slice, index) => {
  setTimeout(() => {
    slice.setAttribute('fill', 'none');
  }, (slices.length - 1 - index) * 50);
});
```

**CSS Transition:**
```css
.action-menu-mobile-btn .pie-slice {
  transition: fill 0.15s ease-in-out;
}
```

**Visual Effect:**
- Each slice smoothly transitions over 150ms
- Creates a "loading indicator" appearance
- Clear visual communication of state change

---

### 2. Radial Button Animation

**Concept:** "Clock Hand Sweep with Drop-Off"

The animation mimics a clock hand sweeping around the circle, dropping off buttons at specific time positions as it moves.

#### Initial State (Collapsed)
```javascript
buttons.forEach((btn) => {
  btn.style.transform = 'translate(0, 0) scale(0)';
  btn.style.opacity = '0';
});
```
- All buttons hidden behind toggle button
- Not visible or interactive
- Zero scale and opacity

#### Opening Animation

**Clock Positions** (Right Corner):
- Button 0: 9:00 position (180°) - Left horizontal
- Button 1: 9:30 position (195°)
- Button 2: 10:00 position (210°)
- Button 3: 10:30 position (225°)
- Button 4: 11:00 position (240°)
- Button 5: 11:30 position (255°)
- Button 6: 12:00 position (270°) - Top vertical

**Clock Positions** (Left Corner):
- Button 0: 6:00 position (90°) - Bottom-right
- Button 1: 6:30 position (105°)
- Button 2: 7:00 position (120°)
- Button 3: 7:30 position (135°)
- Button 4: 8:00 position (150°)
- Button 5: 8:30 position (165°)
- Button 6: 9:00 position (180°) - Left horizontal

**Animation Code:**
```javascript
const angleStep = (endAngle - startAngle) / (buttons.length - 1);

buttons.forEach((btn, index) => {
  const angle = (startAngle + (angleStep * index)) * (Math.PI / 180);
  const x = Math.cos(angle) * radius; // vh units
  const y = Math.sin(angle) * radius; // vh units
  
  const delay = index * 50; // 50ms between each button
  setTimeout(() => {
    btn.style.opacity = '1'; // Fade in
    btn.style.transform = `translate(${x}vh, ${y}vh) scale(1)`;
  }, delay);
});
```

**Sequential Reveal:**
```
0ms:   First button appears at 9:00
50ms:  Second button appears at 9:30
100ms: Third button appears at 10:00
150ms: Fourth button appears at 10:30
200ms: Fifth button appears at 11:00
250ms: Sixth button appears at 11:30
300ms: Seventh button appears at 12:00
```

**Visual Effect:**
1. Click pie button
2. Pie slices start filling orange (one-by-one)
3. Simultaneously, buttons "pop out" sequentially
4. Each button fades in and scales from 0 → 1
5. Creates sweeping motion around the arc
6. Like dealing cards in a fan pattern

#### Closing Animation

**Reverse Sweep:**
```javascript
const reverseDelay = (buttons.length - 1 - index) * 40;
setTimeout(() => {
  btn.style.opacity = '0';
  btn.style.transform = 'translate(0, 0) scale(0)';
}, reverseDelay);
```

**Sequential Collapse:**
- Last button (12:00) disappears first at 0ms
- Second-to-last disappears at 40ms
- Third-to-last disappears at 80ms
- Continues counter-clockwise
- First button (9:00) disappears last at 240ms

**Visual Effect:**
- Buttons "picked up" in reverse order
- Each button fades out and shrinks back to center
- Synchronized with pie slices emptying
- Clean, reversible animation

---

## Carousel Navigation

### Active/Inactive States

**Active Button:**
- Size: 14vh × 14vh (larger)
- Opacity: 1.0 (fully visible)
- Interactive: `pointer-events: auto`
- Visual: Enhanced glow and border
- Icon: 5.2vh font size
- Label: 2.2vh font size

**Inactive Buttons:**
- Size: 10vh × 10vh (smaller)
- Opacity: 0.5 (dimmed)
- Interactive: `pointer-events: none` (not clickable)
- Visual: Standard styling
- Icon: Default size
- Label: Default size

### Navigation Methods

#### 1. Touch Swipe (Vertical)
```javascript
// Swipe UP → Next button (clockwise)
// Swipe DOWN → Previous button (counter-clockwise)

radialContainer.addEventListener('touchmove', (e) => {
  const deltaY = e.touches[0].clientY - touchStartY;
  if (Math.abs(deltaY) > 30) { // 30px threshold
    if (deltaY < 0) nextButton();
    else previousButton();
  }
});
```

#### 2. Mouse Wheel
```javascript
// Scroll UP → Next button
// Scroll DOWN → Previous button

radialContainer.addEventListener('wheel', (e) => {
  if (e.deltaY > 0) nextButton();
  else previousButton();
});
```

#### 3. Keyboard Arrows (Container Focus)
```javascript
// ArrowUp or ArrowRight → Next button
// ArrowDown or ArrowLeft → Previous button

radialContainer.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
    nextButton();
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
    previousButton();
  }
});
```

#### 4. Keyboard Arrows (Toggle Button Focus)
```javascript
// When pie button has focus, arrow keys navigate buttons
btn.addEventListener('keydown', (e) => {
  if (expanded && e.key === 'ArrowUp') nextButton();
  if (expanded && e.key === 'ArrowDown') previousButton();
});
```

---

## Corner Positioning System

### User Preference

Users can choose which corner the menu appears in via Settings → Interface → Mobile.

**Options:**
- **Right Corner** (default): Bottom-right corner at `right: 2vw`
- **Left Corner**: Bottom-left corner at `left: 2vw`

**Storage:**
- Store: `state.settings.mobileMenuCorner` ('left' or 'right')
- LocalStorage: `kot_mobile_corner`

### Position Calculations

#### Right Corner (Default)
```javascript
// Toggle button
position: 'fixed'
bottom: '2vh'
right: '2vw'

// Arc angles: 9 o'clock → 12 o'clock
startAngle: 180° (left horizontal)
endAngle: 270° (top vertical)
```

#### Left Corner
```javascript
// Toggle button
position: 'fixed'
bottom: '2vh'
left: '2vw'

// Arc angles: 6 o'clock → 9 o'clock
startAngle: 90° (bottom)
endAngle: 180° (left horizontal)
```

### CSS Positioning

**Radial Container:**
```css
.radial-action-menu {
  position: fixed;
  bottom: 2vh;
  right: 2vw; /* or left: 2vw for left corner */
  width: 50vh;
  height: 50vh;
  background: radial-gradient(circle at bottom right, rgba(0,0,0,0.85) 0%, transparent 70%);
}

.radial-action-menu[data-corner="left"] {
  left: 2vw;
  right: auto;
  background: radial-gradient(circle at bottom left, rgba(0,0,0,0.85) 0%, transparent 70%);
}
```

**Action Buttons:**
```css
.radial-action-btn {
  position: absolute;
  bottom: 0;
  right: 0; /* Anchor to bottom-right */
}

.radial-action-menu[data-corner="left"] .radial-action-btn {
  left: 0; /* Anchor to bottom-left instead */
  right: auto;
}
```

### Dynamic Corner Changes

When user changes corner preference in settings:

```javascript
window.addEventListener('settings:mobileCornerChanged', (e) => {
  const newCorner = e.detail?.corner || 'right';
  radialContainer.setAttribute('data-corner', newCorner);
  
  // Reapply positions with new angles
  if (radialContainer._applyRadialPositions) {
    radialContainer._applyRadialPositions(true);
  }
  
  // Maintain active button
  if (radialContainer._setActiveButton) {
    const currentIndex = radialContainer._getCurrentActiveIndex();
    radialContainer._setActiveButton(currentIndex);
  }
});
```

---

## Technical Implementation

### File Structure

**JavaScript:**
- `src/components/action-menu/action-menu.component.js`
  - Lines 130-350: Mobile setup and radial positioning
  - Lines 470-630: Pie toggle button creation and event handlers
  - Lines 700-730: Corner change event listener

**CSS:**
- `css/components.action-menu.css`
  - Lines 470-495: Radial container and corner variants
  - Lines 495-560: Individual button styles and states
  - Lines 655-660: Pie slice transition

### Key Functions

**`applyRadialPositions(expanded)`**
- Calculates button positions on arc
- Applies staggered animations
- Handles both expand and collapse

**`setActiveButton(index)`**
- Toggles active/inactive classes
- Updates button sizes and opacity
- Manages interaction states

**`animatePieSlices(expand)`**
- Sequentially fills/empties pie slices
- Creates visual state feedback
- Synchronized with button animations

### Event Flow

**Opening Sequence:**
1. User clicks pie button
2. `animatePieSlices(true)` called → Slices fill orange
3. `applyRadialPositions(true)` called → Buttons fan out
4. `data-expanded="true"` set on radial container
5. `data-action-menu-open="true"` set on body

**Closing Sequence:**
1. User clicks pie button (or any action button)
2. `animatePieSlices(false)` called → Slices empty
3. `applyRadialPositions(false)` called → Buttons collapse
4. `data-expanded="false"` set on radial container
5. `data-action-menu-open` removed from body

---

## Performance Considerations

### CSS Transitions
```css
.radial-action-btn {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
              opacity 0.3s ease,
              width 0.3s ease,
              height 0.3s ease;
  will-change: transform, opacity, width, height;
}
```

**Optimizations:**
- `will-change` hints browser to optimize animations
- Hardware acceleration via transform properties
- Cubic-bezier for natural bouncy effect
- Opacity transitions are GPU-accelerated

### Memory Management
- Event listeners properly scoped to mobile check
- Functions stored on element references for cleanup
- No memory leaks from repeated setup/teardown

### Touch Performance
- 30px swipe threshold prevents accidental triggers
- Passive event listeners where possible
- Throttled animation frame requests

---

## Accessibility

### ARIA Attributes
```html
<button aria-label="Expand Action Menu" aria-expanded="false">
  <!-- Pie SVG -->
</button>
```

**Updates:**
- `aria-expanded` toggles between "true" and "false"
- `aria-label` updates to "Collapse Action Menu" when open
- Screen readers announce state changes

### Keyboard Navigation
- **Tab**: Focus pie toggle button
- **Enter/Space**: Open/close menu
- **Arrow Keys**: Navigate between action buttons (when expanded)
- **Escape**: Close menu (handled by modal system)

### Focus Management
- Radial container: `tabindex="0"` (focusable)
- Toggle button: `tabindex="0"` (focusable)
- Active button: Auto-focused on expand
- Focus trapped within menu when open

---

## Edge Cases & Error Handling

### Missing Elements
```javascript
const radialMenu = document.getElementById('radial-action-menu');
if (!radialMenu) return; // Graceful failure
```

### Store Access
```javascript
const savedCorner = store.getState().settings?.mobileMenuCorner || 
                   localStorage.getItem('kot_mobile_corner') || 
                   'right';
```

### Animation Cleanup
```javascript
// Clear existing timeouts before starting new animation
buttons.forEach((btn) => {
  if (btn._animationTimeout) {
    clearTimeout(btn._animationTimeout);
  }
});
```

### Resize Handling
```javascript
window.addEventListener('resize', setupMobile);
// Reinitializes mobile layout if viewport changes
```

---

## Integration Points

### Game State
- Buttons disabled/enabled based on game phase
- "ROLL" available during roll phase
- "KEEP" available after rolling
- "YIELD" available when in Tokyo
- "END TURN" always available

### Event Bus
```javascript
btn.addEventListener('click', () => {
  eventBus.emit('action.roll');
  // Auto-collapse menu after action
  applyRadialPositions(false);
});
```

### Settings System
- Corner preference stored in global settings
- Changes dispatched via `settingsUpdated` action
- Custom event `settings:mobileCornerChanged` for real-time updates

---

## Browser Compatibility

### Supported
- ✅ iOS Safari 14+
- ✅ Chrome Mobile 90+
- ✅ Firefox Mobile 88+
- ✅ Samsung Internet 14+

### Required Features
- CSS `transform` and `translate3d`
- SVG with inline `fill` attribute manipulation
- Touch events (`touchstart`, `touchmove`, `touchend`)
- CSS `will-change` property
- CSS custom properties (`--tx`, `--ty`)

### Fallbacks
- Desktop: Carousel navigation still works with mouse/keyboard
- No touch: Mouse wheel and keyboard provide full functionality
- No SVG: Pie button still clickable (just no visual animation)

---

## Testing Checklist

### Visual
- [ ] Pie slices fill individually (not all at once)
- [ ] Buttons appear sequentially in clock positions
- [ ] Active button is larger and brighter than others
- [ ] Animations are smooth (no jank)
- [ ] Corner positioning works for both left and right

### Interaction
- [ ] Touch swipe navigates between buttons
- [ ] Mouse wheel navigates between buttons
- [ ] Keyboard arrows navigate between buttons
- [ ] Clicking pie button opens/closes menu
- [ ] Clicking action button executes action AND closes menu

### State
- [ ] Menu starts closed (only pie button visible)
- [ ] Menu stays closed after page refresh
- [ ] Corner preference persists across sessions
- [ ] Changing corner in settings updates position immediately
- [ ] Game state properly enables/disables buttons

### Accessibility
- [ ] Screen reader announces menu state
- [ ] Keyboard can fully navigate menu
- [ ] Focus visible on all interactive elements
- [ ] ARIA labels are accurate

---

## Future Enhancements

### Potential Features
- [ ] Haptic feedback on button changes (iOS/Android)
- [ ] Sound effects for open/close/navigation
- [ ] Customizable arc radius via settings
- [ ] Alternative arc patterns (full circle, semi-circle)
- [ ] Gesture to quick-access specific buttons
- [ ] Animation speed preference
- [ ] Color themes for pie slices

### Performance Improvements
- [ ] Intersection Observer for visibility detection
- [ ] Reduced motion mode support
- [ ] Pre-calculate positions for faster expansion
- [ ] Debounce rapid navigation inputs

---

## Changelog

### V2.1 - October 2025
- 🎨 Redesigned radial menu with pie chart toggle
- ✨ Added clock hand sweep animation
- 🎯 Implemented carousel-style navigation
- 📱 Added corner positioning preference
- ♿ Improved accessibility with ARIA support
- 🎭 Individual pie slice animations
- ⌨️ Full keyboard navigation support
- 🔄 Auto-collapse after action selection

### Previous Versions
- V2.0: Basic radial menu with static positioning
- V1.x: Horizontal bottom menu (deprecated)

---

## Support & Troubleshooting

### Common Issues

**Q: Buttons don't appear when clicking pie button**
- Check browser console for JavaScript errors
- Verify `radial-action-menu` element exists in DOM
- Ensure mobile detection is working (`checkMobile()` returns true)

**Q: Pie slices all change at once instead of individually**
- Check CSS transition is present: `.pie-slice { transition: fill 0.15s }`
- Verify JavaScript delays are being applied (50ms per slice)
- Test in different browser (may be browser-specific issue)

**Q: Navigation doesn't work**
- Ensure menu is expanded (`data-expanded="true"`)
- Check event listeners are attached
- Verify radial container is focusable (`tabindex="0"`)

**Q: Corner change doesn't take effect**
- Clear localStorage and refresh
- Check settings are being saved to store
- Verify event listener for `settings:mobileCornerChanged` is active

---

## Credits

**Design Concept:** Carousel-style radial navigation with clock hand sweep
**Animation Timing:** 50ms stagger for sequential reveal
**Arc Radius:** 16vh for optimal thumb accessibility
**Corner System:** User-configurable left/right positioning

**Key Design Decisions:**
- Sequential "drop-off" creates clear cause-effect relationship
- Individual pie slice animation provides granular state feedback
- Clock positions create familiar, intuitive spatial arrangement
- Carousel navigation reduces tap targets while maintaining accessibility
