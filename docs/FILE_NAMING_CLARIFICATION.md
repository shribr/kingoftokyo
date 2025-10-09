# File Naming Clarification - Settings Architecture

## ✅ RESOLVED - Files Renamed and Organized

As of this update, the confusing naming has been fixed:

### Current Architecture (ACTIVE):

1. **`src/components/settings-modal/settings-modal.component.js`** - The Settings Modal ✅
   - Contains `createSettingsModal()`, `createGameLogModal()`, `createHelpModal()`, etc.
   - This is what displays when you click "Settings" in the toolbar
   - Has all the tabs: Gameplay, Interface, Themes, Advanced, Scenarios, Archives, Replay, AI, Dev Tools
   - Used by: `toolbar.component.js`, `power-cards-panel.component.js`
   - **Properly named and located** ✅
   - Disabled in `components.config.json` (used via direct imports, not component system)

2. **`src/components/settings-menu/settings-menu.component.js`** - Mobile Tools Menu ✅
   - Lightweight menu for mobile devices
   - Anchors to bottom-right, expands upward
   - Has buttons for: Settings, Help, Log, About, Reset Positions, Restart, Mute
   - Has game state persistence controls (Save Now, Export, Import, Clear, etc.)
   - Registered in `components.config.json` as "settingsMenu"
   - **Correctly named and functional** ✅

### What Was Changed:

**Before (Confusing):**
- Actual settings modal was in `src/utils/new-modals.js` (generic name)
- Unused legacy code was in `src/components/settings-modal/settings-modal.component.js`
- This caused multiple mistakes where wrong files were edited

**After (Clear):**
- ✅ Moved `src/utils/new-modals.js` → `src/components/settings-modal/settings-modal.component.js`
- ✅ Deleted old unused legacy settings-modal code
- ✅ Updated all imports in `toolbar.component.js` and `power-cards-panel.component.js`
- ✅ Fixed import path inside the moved file (new-modal-system.js)
- ✅ Updated file header comment
- ✅ Disabled component in config (file used via direct imports)
- ✅ Deleted backup file `new-modals.js.bak`

## Settings Modal Flow (Current):

```
Toolbar "Settings" button 
  → calls createSettingsModal() from settings-modal.component.js
    → newModalSystem.showModal('settings')
      → Shows the settings modal with 9 tabs
```

## Settings Menu Flow (Mobile Tools):

```
Mobile UI shows settings-menu component
  → Floating menu with action buttons
    → One button opens Settings Modal (dispatches uiSettingsOpen)
    → Other buttons for Help, Log, About, etc.
    → Persistence controls for Save, Export, Import
```

## Files Updated:

1. ✅ `src/components/settings-modal/settings-modal.component.js` - Renamed from new-modals.js
2. ✅ `src/components/toolbar/toolbar.component.js` - Updated imports
3. ✅ `src/components/power-cards-panel/power-cards-panel.component.js` - Updated imports  
4. ✅ `components.config.json` - Disabled settings-modal component (not used by component system)
5. ✅ Deleted `src/utils/new-modals.js.bak`

## Benefits:

- ✅ File names now match their actual purpose
- ✅ Settings modal is in the settings-modal directory where it belongs
- ✅ No more confusion about which file to edit
- ✅ Git history preserved via `git mv`
- ✅ Clear separation between settings modal and mobile tools menu
