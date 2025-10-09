# Modal State Persistence & Settings Improvements

**Date:** October 9, 2025  
**Feature:** Track and restore open modals and settings tab state across page reloads

## 🎯 Features Implemented

### 1. Modal State Restoration
Track which modal is currently open and restore it after page reload.

### 2. Settings Tab Persistence  
Remember which settings tab was active and restore it on modal reopening (already existed, now works with modal restoration).

### 3. Fixed Dirty State Detection
Fixed checkboxes that weren't triggering the "Save Settings" button:
- "Capture AI Decision Data" in Dev Tools
- Game State Persistence controls (Auto-save, Confirm before leaving)

## 📍 Changes Made

### File: `src/utils/new-modal-system.js`

**Added localStorage tracking:**
```javascript
showModal(id) {
  // ... existing code ...
  
  // Track open modal in localStorage for page reload restoration
  try {
    localStorage.setItem('KOT_OPEN_MODAL', id);
  } catch(_) {}
}

closeModal(id) {
  // ... existing code ...
  
  // Clear tracked modal from localStorage
  try {
    localStorage.removeItem('KOT_OPEN_MODAL');
  } catch(_) {}
}
```

**Added restoration method:**
```javascript
restoreModalState() {
  try {
    const savedModal = localStorage.getItem('KOT_OPEN_MODAL');
    if (savedModal) {
      console.log(`[NEW-MODAL] Restoring modal from page reload: ${savedModal}`);
      // Dispatch event so components can reopen their modals
      window.dispatchEvent(new CustomEvent('modal:restore', { 
        detail: { modalId: savedModal } 
      }));
    }
  } catch(err) {
    console.warn('[NEW-MODAL] Failed to restore modal state:', err);
  }
}
```

### File: `src/components/toolbar/toolbar.component.js`

**Added restoration trigger:**
```javascript
// Restore any modal that was open before page reload
// Run after a short delay to ensure components are ready
setTimeout(() => {
  newModalSystem.restoreModalState();
}, 100);
```

### File: `src/components/settings-modal/settings-modal.component.js`

**Added restoration listener:**
```javascript
// Listen for modal restoration after page reload
window.addEventListener('modal:restore', (e) => {
  if (e.detail?.modalId === 'settings') {
    console.log('[Settings Modal] Restoring settings modal from page reload');
    newModalSystem.showModal('settings');
  }
});
```

**Fixed dirty state tracking - added persistence controls to collectSettingsFromForm:**
```javascript
function collectSettingsFromForm() {
  return {
    // ... existing settings ...
    
    // Game State Persistence settings (from Advanced tab)
    autoSaveGame: content.querySelector('[data-persistence-check="auto-save"]')?.checked || false,
    confirmBeforeUnload: content.querySelector('[data-persistence-check="confirm-unload"]')?.checked || false
  };
}
```

**Added dirty state triggers to persistence checkboxes:**
```javascript
if (autoSaveCheck) {
  autoSaveCheck.addEventListener('change', (e) => {
    toggleAutoSave(e.target.checked);
    showToast(e.target.checked ? '✅ Auto-save enabled' : '⏸️ Auto-save disabled');
    handlePotentialDirty(e); // Trigger dirty state check ← NEW
  });
}

if (confirmCheck) {
  confirmCheck.addEventListener('change', (e) => {
    toggleUnloadConfirmation(e.target.checked);
    showToast(e.target.checked ? '✅ Unload confirmation enabled' : '⏸️ Unload confirmation disabled');
    handlePotentialDirty(e); // Trigger dirty state check ← NEW
  });
}
```

**Added persistence settings restoration:**
```javascript
function applySettingsToForm(settings) {
  // ... existing restorations ...
  
  // Game State Persistence settings
  const autoSaveCheck = content.querySelector('[data-persistence-check="auto-save"]');
  if (autoSaveCheck) autoSaveCheck.checked = settings.autoSaveGame !== undefined ? !!settings.autoSaveGame : isAutoSaveActive();
  
  const confirmCheck = content.querySelector('[data-persistence-check="confirm-unload"]');
  if (confirmCheck) confirmCheck.checked = settings.confirmBeforeUnload !== undefined ? !!settings.confirmBeforeUnload : isUnloadConfirmationEnabled();
}
```

## 🔄 How It Works

### Modal Restoration Flow

```
1. User has Settings modal open on Advanced tab
   ↓
2. Page reloads (F5, navigation, crash recovery, etc.)
   ↓
3. localStorage contains: "KOT_OPEN_MODAL" = "settings"
   ↓
4. Toolbar component builds (100ms after mount)
   ↓
5. Calls newModalSystem.restoreModalState()
   ↓
6. Dispatches 'modal:restore' event with modalId: "settings"
   ↓
7. Settings modal component hears event
   ↓
8. Calls newModalSystem.showModal('settings')
   ↓
9. Settings modal reopens automatically
   ↓
10. Tab restoration already exists (localStorage: "KOT_SETTINGS_LAST_TAB")
    ↓
11. Settings modal opens on the last active tab! ✨
```

### Tab Persistence (Already Existed)

```
User switches to "Dev Tools" tab
   ↓
localStorage.setItem('KOT_SETTINGS_LAST_TAB', 'devtools')
   ↓
Settings modal closed/reopened
   ↓
Reads localStorage and restores "Dev Tools" tab
```

### Dirty State Detection (Fixed)

```
User changes "Capture AI Decision Data" checkbox
   ↓
Change event fires → handlePotentialDirty(e)
   ↓
collectSettingsFromForm() reads all settings (now includes enableDecisionTreeCapture)
   ↓
Compares to baseline settings
   ↓
Dirty = true → "Save Settings" button enabled ✓
```

## 🧪 Testing

### Test Modal Restoration

1. Open Settings modal
2. Switch to Advanced tab
3. Reload page (F5)
4. **Expected:** Settings modal reopens on Advanced tab automatically

### Test Settings Tab Persistence

1. Open Settings modal
2. Switch to Dev Tools tab
3. Close modal
4. Reopen Settings modal
5. **Expected:** Dev Tools tab is active

### Test Dirty State - Persistence Controls

1. Open Settings → Advanced tab
2. Toggle "Auto-save every 5 minutes" checkbox
3. **Expected:** "Save Settings" button becomes enabled
4. Toggle "Confirm before leaving page" checkbox
5. **Expected:** "Save Settings" button stays enabled

### Test Dirty State - Dev Tools

1. Open Settings → Dev Tools tab
2. Toggle "Capture AI Decision Data" checkbox
3. **Expected:** "Save Settings" button becomes enabled
4. Toggle "Enable Floating Dev Panel" checkbox
5. **Expected:** "Save Settings" button stays enabled

## 📝 localStorage Keys Used

| Key | Value | Purpose |
|-----|-------|---------|
| `KOT_OPEN_MODAL` | Modal ID (e.g., "settings") | Track currently open modal for restoration |
| `KOT_SETTINGS_LAST_TAB` | Tab name (e.g., "devtools") | Remember last active settings tab |

## 💡 Benefits

### User Experience
- **Seamless recovery** from page reloads
- **No lost context** - modal and tab state preserved
- **Fewer clicks** - don't need to reopen and re-navigate

### Development
- **Easier debugging** - F5 reload doesn't lose dev tools tab position
- **Better testing workflow** - can reload without losing settings context
- **Crash recovery** - if page crashes, modal state preserved

### Settings Management
- **Consistent behavior** - all checkboxes trigger dirty state
- **Clear feedback** - Save button enables when ANY setting changes
- **No silent failures** - persistence settings are properly tracked

## 🔧 Technical Notes

- Modal restoration runs 100ms after toolbar mount to ensure DOM is ready
- Uses event-driven architecture (`modal:restore` custom event)
- Backwards compatible - works without localStorage
- Tab persistence already existed, now enhanced by modal restoration
- Dirty state now includes ALL settings (persistence controls were missing)

## 🚀 Future Enhancements

Possible improvements:
- Track nested modal chains (currently only top-level)
- Save modal-specific state (scroll position, form data)
- Support multiple modals open simultaneously
- Add "Restore Session" confirmation dialog
- Track modal open/close history for analytics
