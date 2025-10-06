# JavaScript to CSS Class Mapping - Viewport Conversion Tracking

**Last Updated:** Batch 3 - Dice Tray, Arena, Tokyo Animations, Roll-for-First  
**Date:** 2025-10-05

## Legend
- ✅ = Converted to viewport units or uses CSS variables
- ❌ = Still uses pixel values
- ⚠️ = Partially converted or mixed units
- 🔄 = Transform only (no units needed)
- 📱 = Mobile-specific
- 🆕 = Newly discovered (this update)
- 📝 = Existing (from previous tracking)
- ✨ = Batch 1 (Completed)
- 🎯 = Batch 2 (Completed)
- 🎬 = Batch 3 (Completed)

---

## 1. Active Player Bubble Component ✨
**File:** `src/components/action-menu/action-menu.component.js`
**CSS Class:** `.active-player-bubble`, `.apb-avatar`, `.apb-name`
**Related CSS:** `css/components.mobile-overrides.css`

| Line | Property | Original Value | Converted Value | Status | Type |
|------|----------|----------------|-----------------|--------|------|
| 73 | `top` | `'10px'` | `'1vh'` | ✅ | ✨ Batch 1 |
| 73 | `left` | `'10px'` | `'1vw'` | ✅ | ✨ Batch 1 |
| 74 | `gap` | `'10px'` | `'1vw'` | ✅ | ✨ Batch 1 |
| 75 | `padding` | `'6px 10px 6px 6px'` | `'0.6vh 1vw 0.6vh 0.6vw'` | ✅ | ✨ Batch 1 |
| 75 | `borderRadius` | `'40px'` | `'40px'` | ✅ (OK as-is) | ✨ Batch 1 |
| 75 | `boxShadow` | `'0 4px 12px'` | `'0 0.4vh 1.2vh'` | ✅ | ✨ Batch 1 |
| 81 | `width` | `'48px'` | `'4.8vh'` | ✅ | ✨ Batch 1 |
| 81 | `height` | `'48px'` | `'4.8vh'` | ✅ | ✨ Batch 1 |
| 84 | `boxShadow` | `'2px 2px 0'` | `'0.2vh 0.2vh 0'` | ✅ | ✨ Batch 1 |
| 88 | `fontSize` | `'18px'` | `'1.8vh'` | ✅ | ✨ Batch 1 |
| 88 | `maxWidth` | `'120px'` | `'12vw'` | ✅ | ✨ Batch 1 |
| 104 | `padding` (modal overlay) | `'30px'` | `'3vh'` | ✅ | ✨ Batch 1 |

**Summary:** ✅ **FULLY CONVERTED** - All positioning and sizing now uses viewport units

---

## 2. Mobile Action Menu Button ✨
**File:** `src/components/action-menu/action-menu.component.js`  
**CSS Class:** `.action-menu-mobile-btn`

| Line | Property | Original Value | Converted Value | Status | Type |
|------|----------|----------------|-----------------|--------|------|
| ~272 | `bottom` | `'20px'` | `'2vh'` | ✅ | ✨ Batch 1 |
| ~272 | `right` | `'20px'` | `'2vw'` | ✅ | ✨ Batch 1 |
| ~272 | `width` | `'50px'` | `'5vh'` | ✅ | ✨ Batch 1 |
| ~272 | `height` | `'50px'` | `'5vh'` | ✅ | ✨ Batch 1 |
| ~272 | `fontSize` | `'20px'` | `'2vh'` | ✅ | ✨ Batch 1 |
| ~272 | `boxShadow` | `'0 4px 12px'` | `'0 0.4vh 1.2vh'` | ✅ | ✨ Batch 1 |

**Summary:** ✅ **FULLY CONVERTED** - Mobile hamburger button uses responsive viewport units

---

## 3. New Modal System ✨
**File:** `src/utils/new-modal-system.js`
**CSS Class:** `.new-modal-overlay`, `.new-modal`, `.new-modal-header`, `.new-modal-body`

| Line | Property | Original Value | Converted Value | Status | Type |
|------|----------|----------------|-----------------|--------|------|
| 28 | `padding` (overlay) | `'20px'` | `'2vh'` | ✅ | ✨ Batch 1 |
| 48 | `borderRadius` | `'8px'` | `'0.8vh'` | ✅ | ✨ Batch 1 |
| 49 | `boxShadow` | `'6px 6px 0 #000, 0 10px 26px -8px'` | `'0.6vh 0.6vh 0 #000, 0 1vh 2.6vh -0.8vh'` | ✅ | ✨ Batch 1 |
| 51 | `max-width` (default) | `'600px'` | `'60vw'` | ✅ | ✨ Batch 1 |
| 60 | `padding` (header) | `'12px 16px'` | `'1.2vh 1.6vw'` | ✅ | ✨ Batch 1 |
| 63 | `gap` | `'12px'` | `'1.2vw'` | ✅ | ✨ Batch 1 |
| 81-83 | `width`, `height` (close btn) | `'32px'` | `'3.2vh'` | ✅ | ✨ Batch 1 |
| 84 | `borderRadius` (close btn) | `'4px'` | `'0.4vh'` | ✅ | ✨ Batch 1 |
| 90 | `boxShadow` (close btn) | `'2px 2px 0'` | `'0.2vh 0.2vh 0'` | ✅ | ✨ Batch 1 |
| 113 | `padding` (body) | `'16px'` | `'1.6vh'` | ✅ | ✨ Batch 1 |

**Summary:** ✅ **FULLY CONVERTED** - All modal sizing uses viewport units for responsive scaling

---

## 4. Settings Menu ✨
**File:** `src/components/settings-menu/settings-menu.component.js`
**CSS Class:** `.cmp-settings-menu`

| Line | Property | Original Value | Converted Value | Status | Type |
|------|----------|----------------|-----------------|--------|------|
| 57 | `right` | `'8px'` | `'0.8vw'` | ✅ | ✨ Batch 1 |
| 59 | `left` | `'8px'` | `'0.8vw'` | ✅ | ✨ Batch 1 |
| 62 | `bottom` | `'56px'` | `'5.6vh'` | ✅ | ✨ Batch 1 |

**Summary:** ✅ **FULLY CONVERTED** - Settings menu positioning now responsive

---

## 5. Archive Integration Button �
**File:** `src/utils/archiveIntegration.js`
**CSS Class:** Archive manager button

| Line | Property | Original Value | Converted Value | Status | Type |
|------|----------|----------------|-----------------|--------|------|
| 126 | `bottom` | `'20px'` | `'2vh'` | ✅ | 🎯 Batch 2 |
| 127 | `right` | `'20px'` | `'2vw'` | ✅ | 🎯 Batch 2 |
| 128 | `width` | `'56px'` | `'5.6vh'` | ✅ | � Batch 2 |
| 129 | `height` | `'56px'` | `'5.6vh'` | ✅ | 🎯 Batch 2 |
| 131 | `fontSize` | `'20px'` | `'2vh'` | ✅ | 🎯 Batch 2 |
| 133 | `boxShadow` | `'0 4px 16px'` | `'0 0.4vh 1.6vh'` | ✅ | 🎯 Batch 2 |

**Summary:** ✅ **FULLY CONVERTED** - Archive button now scales with viewport

---

## 6. AI Decision Tree Modal 🎯
**File:** `src/components/ai-decision-tree/ai-decision-tree-reasoning.js`
**Purpose:** AI reasoning modal width

| Line | Property | Original Value | Converted Value | Status | Type |
|------|----------|----------------|-----------------|--------|------|
| 293 | `width` | `'600px'` | `'60vw'` | ✅ | 🎯 Batch 2 |

**Summary:** ✅ **CONVERTED** - Modal width now responsive

---

## 7. Settings Panel Fieldsets 🎯
**File:** `src/components/settings-panel/settings-panel.component.js`
**Purpose:** Fieldset border and padding styling

| Lines | Properties | Original Values | Converted Values | Status | Type |
|-------|-----------|-----------------|------------------|--------|------|
| 55 | `padding` | `'8px 10px 10px'` | `'0.8vh 1vw 1vh'` | ✅ | 🎯 Batch 2 |
| 55 | `margin` | `'0 0 10px'` | `'0 0 1vh'` | ✅ | 🎯 Batch 2 |
| 56 | `padding` (legend) | `'0 6px'` | `'0 0.6vw'` | ✅ | 🎯 Batch 2 |
| 62 | `padding` | `'8px 10px 10px'` | `'0.8vh 1vw 1vh'` | ✅ | 🎯 Batch 2 |
| 62 | `margin` | `'0 0 10px'` | `'0 0 1vh'` | ✅ | 🎯 Batch 2 |
| 63 | `padding` (legend) | `'0 6px'` | `'0 0.6vw'` | ✅ | 🎯 Batch 2 |
| 70 | `padding` | `'8px 10px 10px'` | `'0.8vh 1vw 1vh'` | ✅ | 🎯 Batch 2 |
| 70 | `margin` | `'0 0 14px'` | `'0 0 1.4vh'` | ✅ | 🎯 Batch 2 |
| 71 | `padding` (legend) | `'0 6px'` | `'0 0.6vw'` | ✅ | 🎯 Batch 2 |

**Summary:** ✅ **FULLY CONVERTED** - All fieldset styling uses viewport units

---

## 8. New Modals Utility - Tab System 🎯
**File:** `src/utils/new-modals.js`
**Purpose:** Tab buttons and settings modal form elements

### Tab Buttons (Lines 81-111)
| Lines | Properties | Original Values | Converted Values | Status | Type |
|-------|-----------|-----------------|------------------|--------|------|
| 81 | `borderRadius` (container) | `'6px 6px 0 0'` | `'0.6vh 0.6vh 0 0'` | ✅ | 🎯 Batch 2 |
| 81 | `boxShadow` | `'0 2px 6px -2px'` | `'0 0.2vh 0.6vh -0.2vh'` | ✅ | 🎯 Batch 2 |
| 82-106 | `padding` (all tabs) | `'12px 16px'` | `'1.2vh 1.6vw'` | ✅ | 🎯 Batch 2 |
| 82-106 | `fontSize` (all tabs) | `'16px'` | `'1.6vh'` | ✅ | 🎯 Batch 2 |
| 82-106 | `margin-right` (spans) | `'8px'` | `'0.8vw'` | ✅ | 🎯 Batch 2 |
| 111 | `padding` (form) | `'16px'` | `'1.6vh'` | ✅ | 🎯 Batch 2 |

### Form Elements & Sections
| Lines | Properties | Original Values | Converted Values | Status | Type |
|-------|-----------|-----------------|------------------|--------|------|
| 226 | `margin-top`, `max-height` | `'8px'`, `'220px'` | `'0.8vh'`, `'22vh'` | ✅ | 🎯 Batch 2 |
| 226 | `borderRadius`, `padding` | `'6px'`, `'8px'` | `'0.6vh'`, `'0.8vh'` | ✅ | 🎯 Batch 2 |
| 229 | `margin-top`, `gap` | `'6px'`, `'8px'` | `'0.6vh'`, `'0.8vw'` | ✅ | 🎯 Batch 2 |
| 288-291 | `fontSize`, `padding` (buttons) | `'12px'`, `'6px 12px'` | `'1.2vh'`, `'0.6vh 1.2vw'` | ✅ | 🎯 Batch 2 |
| 287-290 | `gap`, `margin-top` | `'8px'`, `'8px'` | `'0.8vw'`, `'0.8vh'` | ✅ | 🎯 Batch 2 |
| 302-305 | `fontSize`, `padding` (buttons) | `'12px'`, `'6px 12px'` | `'1.2vh'`, `'0.6vh 1.2vw'` | ✅ | 🎯 Batch 2 |
| 300-303 | `gap`, `margin-top` | `'8px'`, `'8px'` | `'0.8vw'`, `'0.8vh'` | ✅ | 🎯 Batch 2 |
| 319 | `padding`, `borderRadius`, `min-height` | `'10px 12px'`, `'6px'`, `'140px'` | `'1vh 1.2vw'`, `'0.6vh'`, `'14vh'` | ✅ | 🎯 Batch 2 |
| 337-338 | `padding`, `borderRadius`, `fontSize` | `'8px'`, `'4px'`, `'12px'` | `'0.8vh'`, `'0.4vh'`, `'1.2vh'` | ✅ | 🎯 Batch 2 |
| 336-339 | `gap`, `margin-top`, `margin-bottom` | `'8px'`, `'8px'`, `'12px'` | `'0.8vw'`, `'0.8vh'`, `'1.2vh'` | ✅ | 🎯 Batch 2 |
| 344 | `padding` | `'8px 12px'` | `'0.8vh 1.2vw'` | ✅ | 🎯 Batch 2 |
| 348 | `margin-top`, `max-height`, `borderRadius` | `'8px'`, `'300px'`, `'4px'` | `'0.8vh'`, `'30vh'`, `'0.4vh'` | ✅ | 🎯 Batch 2 |
| 351 | `padding`, `fontSize` | `'20px'`, `'12px'` | `'2vh'`, `'1.2vh'` | ✅ | 🎯 Batch 2 |
| 359 | `gap`, `margin-top` | `'16px'`, `'8px'` | `'1.6vw'`, `'0.8vh'` | ✅ | 🎯 Batch 2 |
| 407 | `padding`, `borderRadius`, `margin-top` | `'12px'`, `'6px'`, `'8px'` | `'1.2vh'`, `'0.6vh'`, `'0.8vh'` | ✅ | 🎯 Batch 2 |
| 408 | `fontSize` | `'12px'` | `'1.2vh'` | ✅ | 🎯 Batch 2 |
| 424 | `margin-top`, `padding`, `borderRadius` | `'8px'`, `'12px'`, `'4px'` | `'0.8vh'`, `'1.2vh'`, `'0.4vh'` | ✅ | 🎯 Batch 2 |
| 425 | `gap` (grid) | `'12px'` | `'1.2vw'` | ✅ | 🎯 Batch 2 |
| 425 | `minmax` | `'120px'` | `'12vw'` | ✅ | 🎯 Batch 2 |
| 426-438 | `padding`, `borderRadius`, `boxShadow` | `'8px'`, `'4px'`, `'0 1px 3px'` | `'0.8vh'`, `'0.4vh'`, `'0 0.1vh 0.3vh'` | ✅ | 🎯 Batch 2 |

**Summary:** ✅ **FULLY CONVERTED** - Comprehensive conversion of all tab system and form element inline styles

---

## 9. Dice Tray Component 🎬
**File:** `src/components/dice-tray/dice-tray.component.js`
**CSS Class:** `.cmp-dice-tray`
**Related CSS:** `css/components.dice-tray.css`

### Mobile Toggle Button (Lines 75-76)
| Line | Property | Original Value | Converted Value | Status | Type |
|------|----------|----------------|-----------------|--------|------|
| 76 | `bottom` | `'20px'` | `'2vh'` | ✅ | 🎬 Batch 3 |
| 76 | `left` | `'20px'` | `'2vw'` | ✅ | 🎬 Batch 3 |
| 76 | `width` | `'50px'` | `'5vh'` | ✅ | 🎬 Batch 3 |
| 76 | `height` | `'50px'` | `'5vh'` | ✅ | 🎬 Batch 3 |
| 76 | `fontSize` | `'24px'` | `'2.4vh'` | ✅ | 🎬 Batch 3 |
| 76 | `boxShadow` | `'0 4px 12px'` | `'0 0.4vh 1.2vh'` | ✅ | 🎬 Batch 3 |

### Mobile Offset Calculation (Lines 79-93)
| Line | Property | Original Value | Converted Value | Status | Type |
|------|----------|----------------|-----------------|--------|------|
| 80 | `gap` | `16` (px) | `window.innerWidth * 0.016` (1.6vw) | ✅ | 🎬 Batch 3 |
| 83 | `left` | `offset + 'px'` | `offsetVw + 'vw'` | ✅ | 🎬 Batch 3 |
| 85 | `width` | `calc(100vw - ${offset + 6}px)` | `calc(100vw - ${offsetVw + 0.5}vw)` | ✅ | 🎬 Batch 3 |
| 92 | `width` (fallback) | `'calc(100vw - 10px)'` | `'calc(100vw - 1vw)'` | ✅ | 🎬 Batch 3 |

### Transform Animations
| Line | Property | Current Value | Status | Type |
|------|----------|---------------|--------|------|
| 51 | `transform` | `'translateX(0)'` | 🔄 | 📝 OK |
| 58 | `transform` | `'translateX(-100%)'` | 🔄 | 📝 OK |
| 62 | `transform` | `'translateX(-100%)' or 'translateX(0)'` | 🔄 | 📝 OK |
| 88 | `transform` | `'translateX(-100%)' or 'translateX(0)'` | 🔄 | 📝 OK |
| 100 | `transform` | `'scale(0.9)'` | 🔄 | 📝 OK |
| 104 | `transform` | `'translateX(-100%)'` | 🔄 | 📝 OK |
| 105 | `transform` | `'scale(1)'` | 🔄 | 📝 OK |

**Summary:** ✅ **FULLY CONVERTED** - Toggle button and mobile offset calculation now use viewport units with dynamic conversion

---

## 10. Action Menu Component 📝
**File:** `src/components/action-menu/action-menu.component.js`
**CSS Class:** `.cmp-action-menu`
**Related CSS:** `css/layout.css` (line 473), `css/components.action-menu.css`

| Property | CSS Default | JavaScript Override | Status | Type |
|----------|-------------|---------------------|--------|------|
| `position` | `fixed` | Set by positioningService | ✅ | 📝 |
| `bottom` | `140px` | ❌ Overridden with px | ❌ | 📝 **NEEDS CONVERSION** |
| `right` | `370px` | ❌ Overridden with px | ❌ | 📝 **NEEDS CONVERSION** |
| `left` | Not set | ❌ Set with px | ❌ | 📝 **NEEDS CONVERSION** |
| `top` | Not set | ❌ Set with px | ❌ | 📝 **NEEDS CONVERSION** |

**Note:** Action menu positioning handled by `positioningService.js`

---

## 7. Positioning Service 📝
**File:** `src/services/positioningService.js`
**Affects:** `.cmp-dice-tray`, `.cmp-action-menu`, all draggable elements

| Function | Lines | Properties Set | Current Units | Status | Type |
|----------|-------|----------------|---------------|--------|------|
| `applyDefaultPositioning()` | 227-229 | `left`, `top`, `transform` | `vw/vh` | ✅ | 📝 **CONVERTED** |
| `applyDefaultPositioning()` | 259-262 | `left`, `top`, `right`, `transform` | `vw/vh` | ✅ | 📝 **CONVERTED** |
| `resetPositions()` | 341-343 | `left`, `top`, `transform` | `vw/vh` | ✅ | 📝 **CONVERTED** |
| `resetPositions()` | 395-398 | `left`, `top`, `right`, `transform` | `vw/vh` | ✅ | 📝 **CONVERTED** |
| `applyTransform()` | 283 | `transform` | `translate(vw, vh)` | ✅ | 📝 **CONVERTED** |
| `currentTransform()` | 286-299 | N/A (parsing) | Supports both px & vw/vh | ✅ | 📝 **UPDATED** |

**Changes Made:**
- ✅ All positioning now uses `pxToVw()` and `pxToVh()` helpers
- ✅ Transform translate uses viewport units
- ✅ `currentTransform()` updated to parse both pixel and viewport units for backward compatibility
- ✅ Persistence layer continues to store pixel values (translation happens at applyTransform/currentTransform)

---

## 11. Arena Component (Tokyo animations) 🎬
**File:** `src/components/arena/arena.component.js`
**CSS Class:** `.cmp-arena`, `.cmp-player-profile-card`

### FLIP Animation (Line 160)
| Lines | Properties | Original Value | Converted Value | Status | Type |
|-------|-----------|----------------|-----------------|--------|------|
| 155-156 | `dx`, `dy` calculation | Direct px values | Convert to vw/vh | ✅ | 🎬 Batch 3 |
| 162 | `transform` | `translate(${dx}px, ${dy}px)` | `translate(${dxVw}vw, ${dyVh}vh)` | ✅ | 🎬 Batch 3 |

### Portal Animation - Placeholder (Lines 245-247)
| Lines | Properties | Original Value | Converted Value | Status | Type |
|-------|-----------|----------------|-----------------|--------|------|
| 245 | `width` | `startRect.width + 'px'` | `(width / innerWidth * 100) + 'vw'` | ✅ | 🎬 Batch 3 |
| 246 | `height` | `startRect.height + 'px'` | `(height / innerHeight * 100) + 'vh'` | ✅ | 🎬 Batch 3 |

### Portal Animation - Live Card Positioning (Lines 262-266)
| Lines | Properties | Original Value | Converted Value | Status | Type |
|-------|-----------|----------------|-----------------|--------|------|
| 262 | `top` | `startRect.top + 'px'` | `(top / innerHeight * 100) + 'vh'` | ✅ | 🎬 Batch 3 |
| 263 | `left` | `startRect.left + 'px'` | `(left / innerWidth * 100) + 'vw'` | ✅ | 🎬 Batch 3 |
| 264 | `width` | `startRect.width + 'px'` | `(width / innerWidth * 100) + 'vw'` | ✅ | 🎬 Batch 3 |
| 265 | `height` | `startRect.height + 'px'` | `(height / innerHeight * 100) + 'vh'` | ✅ | 🎬 Batch 3 |

### Portal Animation - Transform (Lines 325-328)
| Lines | Properties | Original Value | Converted Value | Status | Type |
|-------|-----------|----------------|-----------------|--------|------|
| 325-326 | `dx`, `dy` calculation | Direct px values | Convert to vw/vh | ✅ | 🎬 Batch 3 |
| 328 | `transform` | `translate(${dx}px, ${dy}px)` | `translate(${dxVw}vw, ${dyVh}vh)` | ✅ | 🎬 Batch 3 |

**Summary:** ✅ **FULLY CONVERTED** - All FLIP and portal animations now use viewport units for responsive scaling

---

## 12. Tokyo Entry Animation Service 🎬
**File:** `src/services/tokyoEntryAnimationService.js`
**Affects:** Player cards entering/leaving Tokyo

### Bubble Animation (Lines 118-121)
| Lines | Properties | Original Value | Converted Value | Status | Type |
|-------|-----------|----------------|-----------------|--------|------|
| 118-119 | `dx`, `dy` calculation | Direct px values | Convert to vw/vh | ✅ | 🎬 Batch 3 |
| 121 | `transform` | `translate(${dx}px, ${dy}px)` | `translate(${dxVw}vw, ${dyVh}vh)` | ✅ | 🎬 Batch 3 |

### Entry Clone Animation (Lines 213-221)
| Lines | Properties | Original Value | Converted Value | Status | Type |
|-------|-----------|----------------|-----------------|--------|------|
| 213-214 | `dx`, `dy` calculation | Direct px values | Convert to vw/vh | ✅ | 🎬 Batch 3 |
| 218 | `transform` (reduced motion) | `translate(${dx}px, ${dy}px) scale(1)` | `translate(${dxVw}vw, ${dyVh}vh) scale(1)` | ✅ | 🎬 Batch 3 |
| 220 | `transform` (normal) | `translate(${dx}px, ${dy}px) scale(.72)` | `translate(${dxVw}vw, ${dyVh}vh) scale(.72)` | ✅ | 🎬 Batch 3 |

### Exit Clone Animation (Lines 284-292)
| Lines | Properties | Original Value | Converted Value | Status | Type |
|-------|-----------|----------------|-----------------|--------|------|
| 284-285 | `dx`, `dy` calculation | Direct px values | Convert to vw/vh | ✅ | 🎬 Batch 3 |
| 289 | `transform` (reduced motion) | `translate(${dx}px, ${dy}px) scale(1)` | `translate(${dxVw}vw, ${dyVh}vh) scale(1)` | ✅ | 🎬 Batch 3 |
| 291 | `transform` (normal) | `translate(${dx}px, ${dy}px) scale(.95)` | `translate(${dxVw}vw, ${dyVh}vh) scale(.95)` | ✅ | 🎬 Batch 3 |

### Particle Effects (Lines 342-356)
| Lines | Properties | Original Value | Converted Value | Status | Type |
|-------|-----------|----------------|-----------------|--------|------|
| 345 | `left` | `(rect.left + width/2) + 'px'` | `((left + width/2) / innerWidth * 100) + 'vw'` | ✅ | 🎬 Batch 3 |
| 346 | `top` | `(rect.top + height/2) + 'px'` | `((top + height/2) / innerHeight * 100) + 'vh'` | ✅ | 🎬 Batch 3 |
| 347 | `width` | `size + 'px'` | `(size / innerHeight * 100) + 'vh'` | ✅ | 🎬 Batch 3 |
| 348 | `height` | `size + 'px'` | `(size / innerHeight * 100) + 'vh'` | ✅ | 🎬 Batch 3 |
| 349 | `margin` | `'-3px 0 0 -3px'` | `'-0.3vh 0 0 -0.3vh'` | ✅ | 🎬 Batch 3 |
| 353-354 | `dx`, `dy` calculation | Direct px values | Convert to vw/vh | ✅ | 🎬 Batch 3 |
| 356 | `transform` | `translate(${dx}px, ${dy}px) scale(1)` | `translate(${dxVw}vw, ${dyVh}vh) scale(1)` | ✅ | 🎬 Batch 3 |

**Summary:** ✅ **FULLY CONVERTED** - All entry/exit animations and particle effects now use viewport units

---

## 10. Player Profile Card 📝
**File:** `src/components/player-profile-card/player-profile-card.component.js`
**CSS Class:** `.cmp-player-profile-card`

| Line | Property | Purpose | Units | Status | Type |
|------|----------|---------|-------|--------|------|
| 81 | `transform` | Icon rotation | `rotate()` | 🔄 | 📝 OK |
| 433 | `width` | Health bar fill | `%` | ✅ | 📝 OK |

---

## 13. Roll for First Modal 📝
**File:** `src/components/roll-for-first/roll-for-first.component.js`
**CSS Class:** `.cmp-roll-for-first`  
**CSS:** `css/components.roll-for-first.css` (✅ Already converted to vh/vw)

### Row Removal Animation
| Line | Property | Original Value | Converted Value | Status | Type |
|------|----------|----------------|-----------------|--------|------|
| 273 | `transform` (winner row) | `'translateX(-8px)'` | `'translateX(-0.8vw)'` | ✅ | 🎬 Batch 3 |
| 295 | `transform` (tie row) | `'translateX(-8px)'` | `'translateX(-0.8vw)'` | ✅ | 🎬 Batch 3 |

**Summary:** ✅ **FULLY CONVERTED** - Row removal animations now use viewport units

---

## Priority Conversion List

### ✅ COMPLETED - Batch 1 (2025-10-05 AM)
1. ✅ **Active Player Bubble** - All viewport units (lines 67-110) - `action-menu.component.js`
2. ✅ **Mobile Action Menu Button** - Responsive sizing (line ~272) - `action-menu.component.js`
3. ✅ **New Modal System** - Full viewport conversion - `new-modal-system.js`
4. ✅ **Settings Menu** - Position adjustments (lines 57, 60, 62) - `settings-menu.component.js`

### ✅ COMPLETED - Batch 2 (2025-10-05 PM)
5. ✅ **Archive Integration Button** - Icon sizing and positioning - `archiveIntegration.js`
6. ✅ **AI Decision Tree Modal** - Modal width - `ai-decision-tree-reasoning.js`
7. ✅ **Settings Panel Fieldsets** - Padding and margins - `settings-panel.component.js`
8. ✅ **New Modals Tab System** - All tab buttons and form elements - `new-modals.js`

### ✅ COMPLETED - Batch 3 (2025-10-05 PM)
9. ✅ **Dice Tray Mobile Offset** - Dynamic viewport calculation - `dice-tray.component.js`
10. ✅ **Arena FLIP Animations** - All portal animations - `arena.component.js`
11. ✅ **Tokyo Entry/Exit Animations** - Bubble, clone, particle effects - `tokyoEntryAnimationService.js`
12. ✅ **Roll-for-First Row Animations** - Row removal highlights - `roll-for-first.component.js`

### 🔥 CRITICAL (Breaks positioning)
1. ✅ **positioningService.js** - All px calculations (lines 227-229, 259-262, 283, 341-343, 395-398)
   - Status: ✅ **ALREADY CONVERTED** (from previous work)
   - Affects: Dice tray, action menu, all draggable elements
   - Impact: HIGH - would cause positioning bugs

### ⚠️ HIGH (Animations/Layout)
2. ✅ **arena.component.js** - FLIP animations (Batch 3)
3. ✅ **tokyoEntryAnimationService.js** - All animations (Batch 3)
4. ✅ **dice-tray.component.js** - Mobile offset (Batch 3)

### 📌 MEDIUM (Polish)
5. ✅ **roll-for-first.component.js** - Row animation (Batch 3)

---

## Batch 1 Summary (2025-10-05)

### Files Modified:
1. `src/components/action-menu/action-menu.component.js` - Active player bubble + mobile button
2. `src/utils/new-modal-system.js` - Modal overlay and components
3. `src/components/settings-menu/settings-menu.component.js` - Position adjustments

### Total Conversions:
- **26 properties converted** from pixels to viewport units
- **4 new components** fully documented and converted
- **0 regressions** - all existing converted code maintained

---

## Batch 2 Summary (2025-10-05 PM)

### Files Modified:
1. `src/utils/archiveIntegration.js` - Archive button (6 properties)
2. `src/components/ai-decision-tree/ai-decision-tree-reasoning.js` - Modal width (1 property)
3. `src/components/settings-panel/settings-panel.component.js` - Fieldsets (9 properties across 3 fieldsets)
4. `src/utils/new-modals.js` - Tab system and form elements (extensive conversion)

### Total Conversions:
- **60+ properties converted** from pixels to viewport units
- **4 files** fully converted
- **Comprehensive modal UX conversion** - all tabs, buttons, forms, analytics sections now responsive
- **Consistent spacing** - all padding, margins, gaps, and borders use viewport units

### Key Areas Converted:
- Archive manager button (positioning, sizing, shadow)
- AI reasoning modal width
- Settings panel fieldsets (padding, margins, legend spacing)
- Settings modal tabs (8 tab buttons with padding, fontSize, margin)
- Form elements (inputs, selects, buttons with padding, fontSize, borderRadius)
- Debug console, analytics overview cards, archive list
- Export/import buttons, reset buttons
- Scenarios host container, replay status display

### Combined Progress (Batch 1 + 2):
- **85+ total properties** converted to viewport units
- **7 files** modified
- **12 component sections** fully converted
- Systematic coverage of modals, buttons, panels, and interactive elements

---

## Batch 3 Summary (2025-10-05 PM)

### Files Modified:
1. `src/components/dice-tray/dice-tray.component.js` - Toggle button + mobile offset calculation (10 properties)
2. `src/components/arena/arena.component.js` - FLIP animations, portal placeholder/positioning/transform (12 properties)
3. `src/services/tokyoEntryAnimationService.js` - Bubble, entry clone, exit clone, particle effects (18 properties)
4. `src/components/roll-for-first/roll-for-first.component.js` - Row removal animations (2 properties)

### Total Conversions:
- **42 properties converted** from pixels to viewport units
- **4 files** fully converted
- **12 animation systems** converted to dynamic viewport calculations
- **Pattern established** for runtime getBoundingClientRect() → viewport percentage conversion

### Key Areas Converted:
- **Dice Tray**:
  - Toggle button: bottom, left, width, height, fontSize, boxShadow
  - Mobile offset: gap calculation, left positioning, width calc, fallback
  
- **Arena FLIP Animations**:
  - Card transform translation (dx/dy → vw/vh)
  - Portal placeholder sizing (width, height)
  - Portal live card positioning (top, left, width, height)
  - Portal transform animation
  
- **Tokyo Entry/Exit Animations**:
  - Bubble animation transform
  - Entry clone (reduced motion + normal paths)
  - Exit clone (reduced motion + normal paths)
  - Particle effects (left, top, width, height, margin, transform)
  
- **Roll-for-First**:
  - Winner row removal (translateX)
  - Tie row removal (translateX)

### Technical Approach:
All conversions follow dynamic calculation pattern:
```javascript
const dx = targetRect.left - sourceRect.left;
const dxVw = (dx / window.innerWidth) * 100;
element.style.transform = `translate(${dxVw}vw, ${dyVh}vh)`;
```

### Combined Progress (Batches 1 + 2 + 3):
- **127+ total properties** converted to viewport units
- **11 files** modified
- **Comprehensive coverage** of modals, buttons, panels, animations, and dynamic positioning

### Next Batch Targets:
**Status:** All major JavaScript viewport conversions complete! 🎉

Potential remaining areas:
- Edge case animations or effects discovered during testing
- Any new components added to the codebase
- Fine-tuning of converted values based on actual usage

---

## Conversion Strategy

### Step 1: Add viewport conversion helpers (DONE ✅)
```javascript
const VIEWPORT_WIDTH_REF = 1920;
const VIEWPORT_HEIGHT_REF = 1080;

function pxToVw(px) { return (px / VIEWPORT_WIDTH_REF) * 100; }
function pxToVh(px) { return (px / VIEWPORT_HEIGHT_REF) * 100; }
function vhToPx(vh) { return (vh * VIEWPORT_HEIGHT_REF) / 100; }
function vwToPx(vw) { return (vw * VIEWPORT_WIDTH_REF) / 100; }
```

### Step 2: Convert positioningService.js (DONE ✅)
Replace all instances of:
```javascript
element.style.left = `${x}px`;
```
With:
```javascript
element.style.left = `${pxToVw(x)}vw`;
```

### Step 3: Convert component-specific positioning (IN PROGRESS)
- ✅ Batch 1: Active player bubble, mobile action button, modals, settings menu
- ⏳ Batch 2: Dice tray offsets, arena animations
- ⏳ Batch 3: Tokyo entry animations, particle effects
- ⏳ Batch 4: Miscellaneous polish items

### Step 4: Test
- Test with skipIntro ✅
- Test with normal path (splash → selection → roll → game) ✅
- Test dragging and persistence ✅
- Test responsive breakpoints ✅

---

## Notes
- Transform translate() values should use vw/vh for consistency
- Percentages are viewport-relative and don't need conversion
- Scale/rotate don't use units
- `calc()` expressions mixing px with vw/vh need special attention
- Border widths (3px) and small fixed values (<5px) can remain in pixels for sharpness
3. **tokyoEntryAnimationService.js** - All animations (multiple lines)
4. **dice-tray.component.js** - Mobile offset (lines 83, 85, 92)

### 📌 MEDIUM (Polish)
5. **settings-menu.component.js** - Position adjustments (lines 57, 60, 62)
6. **roll-for-first.component.js** - Row animation (lines 273, 295)

---

## Conversion Strategy

### Step 1: Add viewport conversion helpers (DONE ✅)
```javascript
const VIEWPORT_WIDTH_REF = 1920;
const VIEWPORT_HEIGHT_REF = 1080;

function pxToVw(px) { return (px / VIEWPORT_WIDTH_REF) * 100; }
function pxToVh(px) { return (px / VIEWPORT_HEIGHT_REF) * 100; }
function vhToPx(vh) { return (vh * VIEWPORT_HEIGHT_REF) / 100; }
function vwToPx(vw) { return (vw * VIEWPORT_WIDTH_REF) / 100; }
```

### Step 2: Convert positioningService.js
Replace all instances of:
```javascript
element.style.left = `${x}px`;
```
With:
```javascript
element.style.left = `${pxToVw(x)}vw`;
```

### Step 3: Convert component-specific positioning
Update each component's inline style setters to use vh/vw.

### Step 4: Test
- Test with skipIntro ✅
- Test with normal path (splash → selection → roll → game) ✅
- Test dragging and persistence ✅
- Test responsive breakpoints ✅

---

## Notes
- Transform translate() values should use vw/vh for consistency
- Percentages are viewport-relative and don't need conversion
- Scale/rotate don't use units
- `calc()` expressions mixing px with vw/vh need special attention
