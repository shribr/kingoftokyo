# Polaroid Card Unification

## Summary
Unified the polaroid card styling between the splash screen and monster selection modal by creating a shared `polaroidHTML()` function with an optional transform parameter.

## Changes Made

### 1. Created Shared Utility Function
**File:** `/Users/amischreiber/source/repos/kingoftokyo/src/utils/polaroid.js`
- New shared function `polaroidHTML(monster, index, useTransform = true)`
- Accepts monster object, index, and optional useTransform flag (defaults to true)
- When `useTransform = true`: Applies rotation transforms for the polaroid effect (splash screen)
- When `useTransform = false`: Sets rotation to 0deg for straight alignment (monster selection)
- Maintains monster color tinting via `--monster-tint` CSS variable
- Uses rotation array for natural variety: `[-15, 12, -8, 18, -12, 9]` degrees

### 2. Updated Splash Screen Component
**File:** `/Users/amischreiber/source/repos/kingoftokyo/src/components/splash-screen/splash-screen.component.js`
- Added import: `import { polaroidHTML } from '../../utils/polaroid.js';`
- Removed local `polaroidHTML()` function (now using shared version)
- No changes to calling code needed (defaults to `useTransform = true`)

### 3. Updated Monster Selection Component
**File:** `/Users/amischreiber/source/repos/kingoftokyo/src/components/monster-selection/monster-selection.component.js`
- Added import: `import { polaroidHTML } from '../../utils/polaroid.js';`
- Updated `card()` function to use polaroid structure:
  ```javascript
  function card(m, selected) {
    const cls = selected ? 'monster-card selected' : 'monster-card';
    return `<div class="${cls}" data-monster-card data-id="${m.id}">
      ${polaroidHTML(m, 0, false)}  // useTransform = false
    </div>`;
  }
  ```
- Removed old `.monster-photo` and `.monster-name` structure

### 4. Added Polaroid CSS for Monster Selection
**File:** `/Users/amischreiber/source/repos/kingoftokyo/css/components.monster-selection.css`

#### Base Polaroid Styles
- Gradient background with vintage photo appearance
- Box shadows for depth and dimension
- Border and border-radius matching splash screen
- Image styling with subtle filters for authentic look
- Caption positioning with handwritten font (Kalam)
- Hover effects: lift, scale, and remove rotation
- Selected/unavailable states with opacity and grayscale

#### Responsive Sizing
- **Desktop (> 768px)**: 130px × 160px cards
- **Tablet (≤ 768px)**: 110px × 140px cards  
- **Mobile (≤ 480px)**: 100px × 130px cards

#### Cleanup
- Removed old `.monster-photo` and `.monster-name` CSS rules
- Removed responsive overrides for deleted classes
- Updated `.monster-card` base styles to work with polaroid structure

## Visual Result

### Splash Screen (useTransform = true)
- Polaroids displayed with rotation transforms
- Cards tilted at various angles (-15° to 18°)
- Floating animation preserved
- Scattered positioning maintained

### Monster Selection Modal (useTransform = false)
- Polaroids displayed without rotation (0deg)
- Straight alignment for grid layout
- Same vintage polaroid aesthetic
- Hover effect removes any rotation and lifts card

## Benefits

1. **Code Reuse**: Single source of truth for polaroid HTML structure
2. **Consistency**: Same visual style across both components
3. **Maintainability**: Updates to polaroid appearance only need to be made in one place
4. **Flexibility**: `useTransform` flag allows customization per use case
5. **Clean Separation**: Shared utility separates presentation logic from component logic

## Testing Checklist

- [ ] Splash screen polaroids still display with rotation
- [ ] Splash screen hover effects work correctly
- [ ] Monster selection cards display as straight polaroids (no rotation)
- [ ] Monster selection hover effects work (lift + remove rotation)
- [ ] Monster color tinting applies correctly in both components
- [ ] Responsive sizing works across all breakpoints
- [ ] Selected/unavailable states display correctly in monster selection
- [ ] Drag and drop functionality still works with new structure

## Future Enhancements

The shared `polaroidHTML()` function can be extended with additional parameters:
- `showCaption` - Toggle caption visibility
- `customRotation` - Override rotation angle
- `size` - Preset size variants (small, medium, large)
- `style` - Different polaroid themes (vintage, modern, dark)
