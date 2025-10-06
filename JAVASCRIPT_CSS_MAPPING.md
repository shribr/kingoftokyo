# JavaScript to CSS Class Mapping - Viewport Conversion Tracking

## Legend
- ✅ = Converted to viewport units or uses CSS variables
- ❌ = Still uses pixel values
- ⚠️ = Partially converted or mixed units
- 🔄 = Transform only (no units needed)
- 📱 = Mobile-specific

---

## 1. Dice Tray Component
**File:** `src/components/dice-tray/dice-tray.component.js`
**CSS Class:** `.cmp-dice-tray`
**Related CSS:** `css/components.dice-tray.css`

| Line | Property | Current Value | Status | Conversion Needed |
|------|----------|---------------|--------|-------------------|
| 47 | `bottom` | `'0'` | ✅ | CSS handles (70px mobile) |
| 49 | `right` | `'auto'` | ✅ | No conversion needed |
| 50 | `top` | `'auto'` | ✅ | No conversion needed |
| 51 | `transform` | `'translateX(0)'` | 🔄 | No units |
| 58 | `transform` | `'translateX(-100%)'` | 🔄 | Percentage OK |
| 62 | `transform` | `'translateX(-100%)' or 'translateX(0)'` | 🔄 | Percentage OK |
| 83 | `left` | `offset + 'px'` | ❌ | **NEEDS CONVERSION** |
| 85 | `width` | `calc(100vw - ${offset + 6}px)` | ⚠️ | **Partial - offset needs vw** |
| 88 | `transform` | `'translateX(-100%)' or 'translateX(0)'` | 🔄 | Percentage OK |
| 91 | `left` | `'0'` | ✅ | No conversion needed |
| 92 | `width` | `'calc(100vw - 10px)'` | ⚠️ | **10px should be vw** |
| 100 | `transform` | `'scale(0.9)'` | 🔄 | No units |
| 104 | `transform` | `'translateX(-100%)'` | 🔄 | Percentage OK |
| 105 | `transform` | `'scale(1)'` | 🔄 | No units |
| 123-128 | All positions | `''` (clearing) | ✅ | Clearing is OK |

**Summary:** Mobile offset calculation (line 83) needs to use vw instead of px.

---

## 2. Action Menu Component  
**File:** `src/components/action-menu/action-menu.component.js`
**CSS Class:** `.cmp-action-menu`
**Related CSS:** `css/layout.css` (line 473), `css/components.action-menu.css`

| Property | CSS Default | JavaScript Override | Status |
|----------|-------------|---------------------|--------|
| `position` | `fixed` | Set by positioningService | ✅ |
| `bottom` | `140px` | ❌ Overridden with px | ❌ **NEEDS CONVERSION** |
| `right` | `370px` | ❌ Overridden with px | ❌ **NEEDS CONVERSION** |
| `left` | Not set | ❌ Set with px | ❌ **NEEDS CONVERSION** |
| `top` | Not set | ❌ Set with px | ❌ **NEEDS CONVERSION** |

**Note:** Action menu positioning handled by `positioningService.js`

---

## 3. Positioning Service
**File:** `src/services/positioningService.js`
**Affects:** `.cmp-dice-tray`, `.cmp-action-menu`, all draggable elements

| Function | Lines | Properties Set | Current Units | Status |
|----------|-------|----------------|---------------|--------|
| `applyDefaultPositioning()` | 227-229 | `left`, `top`, `transform` | `vw/vh` | ✅ **CONVERTED** |
| `applyDefaultPositioning()` | 259-262 | `left`, `top`, `right`, `transform` | `vw/vh` | ✅ **CONVERTED** |
| `resetPositions()` | 341-343 | `left`, `top`, `transform` | `vw/vh` | ✅ **CONVERTED** |
| `resetPositions()` | 395-398 | `left`, `top`, `right`, `transform` | `vw/vh` | ✅ **CONVERTED** |
| `applyTransform()` | 283 | `transform` | `translate(vw, vh)` | ✅ **CONVERTED** |
| `currentTransform()` | 286-299 | N/A (parsing) | Supports both px & vw/vh | ✅ **UPDATED** |

**Changes Made:**
- ✅ All positioning now uses `pxToVw()` and `pxToVh()` helpers
- ✅ Transform translate uses viewport units
- ✅ `currentTransform()` updated to parse both pixel and viewport units for backward compatibility
- ✅ Persistence layer continues to store pixel values (translation happens at applyTransform/currentTransform)

**This should fix the dice-tray and action-menu positioning bugs!**

---

## 4. Arena Component (Tokyo animations)
**File:** `src/components/arena/arena.component.js`
**CSS Class:** `.cmp-arena`, `.cmp-player-profile-card`

| Lines | Properties | Purpose | Units | Status |
|-------|----------|---------|-------|--------|
| 160 | `transform` | FLIP animation | `px` in translate | ❌ **NEEDS CONVERSION** |
| 243-244 | `width`, `height` | Placeholder sizing | `px` | ❌ **NEEDS CONVERSION** |
| 260-264 | `top`, `left`, `width`, `height`, `margin` | Live card positioning | `px` | ❌ **NEEDS CONVERSION** |
| 328 | `transform` | Animation translate/scale | `px` in translate | ❌ **NEEDS CONVERSION** |

---

## 5. Tokyo Entry Animation Service
**File:** `src/services/tokyoEntryAnimationService.js`
**Affects:** Player cards entering/leaving Tokyo

| Lines | Properties | Purpose | Units | Status |
|-------|-----------|---------|-------|--------|
| 120 | `transform` | Bubble animation | `px` in translate | ❌ **NEEDS CONVERSION** |
| 148-150 | `left`, `top`, `transform` | Card clone positioning | `%` and scale | ✅/⚠️ |
| 203-204 | `width`, `height` | Placeholder | `px` | ❌ **NEEDS CONVERSION** |
| 215, 217 | `transform` | Clone translate | `px` in translate | ❌ **NEEDS CONVERSION** |
| 284, 287 | `transform` | Clone translate | `px` in translate | ❌ **NEEDS CONVERSION** |
| 340-344 | `left`, `top`, `width`, `height`, `margin` | Particle effects | `px` | ❌ **NEEDS CONVERSION** |
| 352 | `transform` | Particle translate | `px` in translate | ❌ **NEEDS CONVERSION** |

---

## 6. Player Profile Card
**File:** `src/components/player-profile-card/player-profile-card.component.js`
**CSS Class:** `.cmp-player-profile-card`

| Line | Property | Purpose | Units | Status |
|------|----------|---------|-------|--------|
| 81 | `transform` | Icon rotation | `rotate()` | 🔄 OK |
| 433 | `width` | Health bar fill | `%` | ✅ OK |

---

## 7. Settings Menu
**File:** `src/components/settings-menu/settings-menu.component.js`  
**CSS Class:** `.cmp-settings-menu`

| Lines | Properties | Purpose | Units | Status |
|-------|-----------|---------|-------|--------|
| 57 | `right`, `left` | Position adjustment | `8px` | ❌ **NEEDS CONVERSION** |
| 60 | `left`, `right` | Position adjustment | `8px` | ❌ **NEEDS CONVERSION** |
| 62 | `top`, `bottom` | Position adjustment | `auto`, `56px` | ⚠️ **56px needs conversion** |

---

## 8. Roll for First Modal
**File:** `src/components/roll-for-first/roll-for-first.component.js`
**CSS Class:** `.cmp-roll-for-first`  
**CSS:** `css/components.roll-for-first.css` (✅ Already converted to vh/vw)

| Lines | Properties | Purpose | Units | Status |
|-------|-----------|---------|-------|--------|
| 273, 295 | `transform` | Row highlight animation | `-8px` translate | ❌ **NEEDS CONVERSION** |

---

## Priority Conversion List

### 🔥 CRITICAL (Breaks positioning)
1. **positioningService.js** - All px calculations (lines 227-229, 259-262, 283, 341-343, 395-398)
   - Affects: Dice tray, action menu, all draggable elements
   - Impact: HIGH - causes positioning bugs

### ⚠️ HIGH (Animations/Layout)
2. **arena.component.js** - FLIP animations (lines 160, 243-264, 328)
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
