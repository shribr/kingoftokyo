/** toolbar.component.js
 * MIGRATED TOOLBAR COMPONENT (legacy .game-toolbar removed)
 * Styling fully scoped in css/components.toolbar.css. Button visuals use local rules.
 * Next: remove legacy .game-toolbar selectors from legacy CSS (if still present) after QA.
 */
import { store } from '../../bootstrap/index.js';
import { uiSettingsOpen, uiGameLogOpen, uiInstructionsOpen, settingsUpdated, uiConfirmOpen, uiAboutOpen, gamePaused, gameResumed } from '../../core/actions.js';
import { createPositioningService } from '../../services/positioningService.js';
import { newModalSystem } from '../../utils/new-modal-system.js';
import { createSettingsModal, createGameLogModal, createHelpModal, createAIDecisionModal, createAboutModal } from '../settings-modal/settings-modal.component.js';

export function build({ selector }) {
  const root = document.createElement('div');
  // Toolbar now relies on footer positioning (NO absolute top so it doesn't cover left panel header)
  root.id = 'toolbar-menu';
  root.className = 'cmp-toolbar';
  root.setAttribute('data-draggable','true');
  // SVG icon set (placeholder vector approximations for legacy sprites)
  root.innerHTML = `
    ${iconBtn('settings', 'Settings', gearIcon())}
    ${iconBtn('log', 'Game Log', listIcon())}
    ${iconBtn('ai-decision', 'AI Decision Tree', sparkleIcon())}
    ${iconBtn('scenarios', 'Scenarios', beakerIcon())}
  ${iconBtn('win-odds', 'Player Win Odds', `<svg viewBox='0 0 24 24' width='24' height='24' aria-hidden='true'><path d='M4 5h16v10H4z' stroke='currentColor' stroke-width='2' fill='none'/><path d='M6 13l3-4 3 2 2-3 4 5' fill='none' stroke='currentColor' stroke-width='2' stroke-linejoin='round' stroke-linecap='round'/><rect x='9' y='17' width='6' height='2' fill='currentColor'/></svg>`)}
    ${iconBtn('pause', 'Pause Game', pauseIcon())}
    ${iconBtn('sound', 'Toggle Sound (M)', soundIcon())}
    ${iconBtn('dark-mode', 'Toggle Dark Mode', darkModeIcon())}
  ${iconBtn('help', 'Help / Instructions', helpIcon())}
    ${iconBtn('restart', 'Restart Game', restartIcon())}
    ${iconBtn('reset-positions', 'Reset Layout', layoutIcon())}
    ${iconBtn('about', 'About', infoIcon())}
  `;
  // Mobile action menu button is now handled by the action-menu component itself
  // Bind each button explicitly to ensure correct modal routing
  const onClick = (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    console.log('[toolbar] Button clicked:', btn.getAttribute('data-action')); // DEBUG
    const a = btn.getAttribute('data-action');
    if (a === 'settings') {
      try { window.__KOT_BLACKOUT__?.hide(); } catch(_) {}
      // Close action menu if open to avoid overlay conflicts
      try { window.dispatchEvent(new CustomEvent('ui.actionMenu.forceClose')); } catch(_){ }
      createSettingsModal();
      newModalSystem.showModal('settings');
      return;
    }
    if (a === 'scenarios') {
      try { window.__KOT_BLACKOUT__?.hide(); } catch(_) {}
      try { window.dispatchEvent(new CustomEvent('ui.actionMenu.forceClose')); } catch(_){ }
      // Persist desired tab first so createSettingsModal restoration picks it up
      try { localStorage.setItem('KOT_SETTINGS_LAST_TAB','scenarios'); } catch(_) {}
      createSettingsModal();
      newModalSystem.showModal('settings');
      // Fallback: explicit click after render frames (two attempts in case of async mount)
      let attempts = 0;
      const tryActivate = () => {
        attempts++;
        try {
          const tabBtn = document.querySelector('.nm-modal .tab-button[data-tab="scenarios"]');
          if (tabBtn && !tabBtn.classList.contains('active')) {
            tabBtn.click();
          }
        } catch(_) {}
        if (attempts < 3) setTimeout(tryActivate, 40 * attempts);
      };
      setTimeout(tryActivate, 20);
      return;
    }
    if (a === 'log') { 
      createGameLogModal();
      newModalSystem.showModal('gameLog');
      return; 
    }
    if (a === 'win-odds') {
      import('../settings-modal/settings-modal.component.js').then(m => m.openWinOddsQuickModal());
      return;
    }
    if (a === 'ai-decision') {
      createAIDecisionModal();
      newModalSystem.showModal('aiDecision');
      return;
    }
    if (a === 'sound') { toggleSound(store, btn); return; }
  if (a === 'dark-mode') { toggleDarkMode(btn); return; }
    if (a === 'pause') { togglePause(store, btn); return; }
    if (a === 'help') { 
      createHelpModal();
      newModalSystem.showModal('help');
      return; 
    }
    if (a === 'restart') { store.dispatch(uiConfirmOpen('restart-game', 'Restart the game and reload the page?\nUnsaved progress will be lost.', 'Restart', 'Cancel')); return; }
    if (a === 'reset-positions') { window.dispatchEvent(new CustomEvent('ui.positions.reset.request')); return; }
    if (a === 'about') { 
      createAboutModal();
      newModalSystem.showModal('about');
      return; 
    }
  };
  root.addEventListener('click', onClick);
  // DEBUG: Add event listener to detect if events are being blocked
  root.addEventListener('click', (e) => {
    console.log('[toolbar] Click event:', e.target, 'defaultPrevented:', e.defaultPrevented);
  }, true);
  // Handle confirm accept events (restart)
  window.addEventListener('ui.confirm.accepted', (e) => {
    if (e.detail?.confirmId === 'restart-game') {
      window.location.reload();
    }
  });
  window.addEventListener('ui.positions.reset.request', () => {
    // eventBus path already exists via eventsToActions using 'ui/positions/reset'
    import('../../core/eventBus.js').then(m => m.eventBus.emit('ui/positions/reset'));
  });
  try {
    const positioning = createPositioningService(store);
    positioning.hydrate();
    positioning.makeDraggable(root, 'toolbar', { snapEdges: true, snapThreshold: 12 });
  } catch(e) { /* non-fatal */ }
  // Keyboard shortcut for mute (M)
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'm' && !e.repeat) {
      const b = root.querySelector('[data-action="sound"]');
      if (b) toggleSound(store, b);
    }
  });
  return { root, update: () => syncToolbarState(root) };
}

// -------- Icon Button Helper & Inline SVGs ---------
function iconBtn(action, label, svg) {
  return `<button data-action="${action}" class="toolbar-btn" title="${label}" aria-label="${label}">${svg}<span class="vh">${label}</span></button>`;
}

function syncToolbarState(root) {
  try {
    const st = window.__KOT_NEW__?.store?.getState();
    if (!st) return;
    const muted = !!st.settings?.soundMuted;
    const paused = !!st.game?.isPaused;
    const snd = root.querySelector('[data-action="sound"]');
    if (snd) snd.classList.toggle('is-muted', muted);
    const pauseBtn = root.querySelector('[data-action="pause"]');
    if (pauseBtn) {
      pauseBtn.classList.toggle('is-paused', paused);
      pauseBtn.innerHTML = paused ? 
        `${playIcon()}<span class="vh">Resume Game</span>` : 
        `${pauseIcon()}<span class="vh">Pause Game</span>`;
      pauseBtn.title = paused ? 'Resume Game' : 'Pause Game';
    }
    // Dark mode pressed state
    const darkBtn = root.querySelector('[data-action="dark-mode"]');
    if (darkBtn) {
      const isDark = document.body.classList.contains('dark-mode');
      darkBtn.classList.toggle('is-active', isDark);
      // Update icon to match current state
      const iconContainer = darkBtn.querySelector('.ico');
      if (iconContainer && iconContainer.parentNode) {
        iconContainer.parentNode.innerHTML = darkModeIcon();
      }
    }
  } catch(_){ }
}

function toggleSound(store, btn) {
  try {
    const st = store.getState();
    const muted = !st.settings?.soundMuted;
    store.dispatch(settingsUpdated({ soundMuted: muted }));
    btn.classList.toggle('is-muted', muted);
    btn.setAttribute('aria-pressed', String(muted));
    btn.title = muted ? 'Unmute (M)' : 'Mute (M)';
  } catch(_) { }
}

function togglePause(store, btn) {
  try {
    const st = store.getState();
    const currentlyPaused = !!st.game?.isPaused;
    
    if (currentlyPaused) {
      // Resume game
      const pausedAt = st.game.pausedAt;
      const now = Date.now();
      const pausedTime = now - pausedAt;
      store.dispatch(gameResumed(now, pausedTime));
      console.log(`🎮 Game resumed after ${Math.round(pausedTime / 1000)}s pause`);
    } else {
      // Pause game - capture current context
      const context = {
        phase: st.phase?.current,
        activePlayer: st.players?.activeId,
        diceState: st.dice?.phase
      };
      store.dispatch(gamePaused(Date.now(), context));
      console.log('🎮 Game paused', context);
    }
  } catch(_) { }
}

// Removed temporary light modal + ad-hoc log modal. Instructions now use dedicated component.

function gearIcon() {
  return `<svg viewBox="0 0 24 24" class="ico" role="img" aria-hidden="true"><path fill="currentColor" d="M10.9 2h2.2l.6 2.4c.5.1 1 .3 1.5.6l2.2-1.1 1.6 1.6-1.1 2.2c.3.5.5 1 .6 1.5L22 11v2l-2.4.6c-.1.5-.3 1-.6 1.5l1.1 2.2-1.6 1.6-2.2-1.1c-.5.3-1 .5-1.5.6L13.1 22h-2.2l-.6-2.4c-.5-.1-1-.3-1.5-.6l-2.2 1.1-1.6-1.6 1.1-2.2c-.3-.5-.5-1-.6-1.5L2 13v-2l2.4-.6c.1-.5.3-1 .6-1.5L3.9 6.7 5.5 5l2.2 1.1c.5-.3 1-.5 1.5-.6L10.9 2Zm1.1 6a4 4 0 100 8 4 4 0 000-8Z"/></svg>`;
}
function listIcon() {
  return `<svg viewBox="0 0 24 24" class="ico" role="img" aria-hidden="true"><path fill="currentColor" d="M4 5h16v2H4V5Zm0 6h16v2H4v-2Zm0 6h16v2H4v-2Z"/></svg>`;
}
function soundIcon() {
  return `<svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4Zm10.5 3a3.5 3.5 0 00-1.7-3.02v6.04A3.5 3.5 0 0014.5 12Zm-1.7-7.94a7 7 0 010 15.88v-1.99a5 5 0 000-11.9V4.06Z"/></svg>`;
}
function helpIcon() {
  return `<svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 100 20 10 10 0 000-20Zm.2 15.5h-2v-2h2v2Zm2.6-7.4-.9.9c-.7.7-1.1 1.2-1.1 2.5h-2v-.5c0-1.1.4-2.1 1.1-2.8l1.2-1.2a1.7 1.7 0 00-1.2-2.9c-1 0-1.8.6-2 1.5l-2-.5a3.7 3.7 0 016.2-2.2 3.7 3.7 0 01-.4 5.2Z"/></svg>`;
}
function restartIcon() {
  return `<svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path fill="currentColor" d="M12 5V1L7 6l5 5V7a5 5 0 11-5 5H5a7 7 0 107-7Z"/></svg>`;
}
function layoutIcon() {
  return `<svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path fill="currentColor" d="M3 3h8v8H3V3Zm10 0h8v5h-8V3ZM3 13h8v8H3v-8Zm10-3h8v11h-8V10Z"/></svg>`;
}
function sparkleIcon() {
  return `<svg viewBox="0 0 24 24" class="ico" aria-hidden="true">
    <!-- Background rounded square -->
    <rect x="2" y="2" width="20" height="20" rx="6" ry="6" fill="currentColor" opacity="0.1"/>
    <!-- Large 4-pointed star -->
    <path fill="currentColor" d="M16 6l1.2 2.8L20 10l-2.8 1.2L16 14l-1.2-2.8L12 10l2.8-1.2L16 6z"/>
    <!-- Medium 4-pointed star -->
    <path fill="currentColor" d="M8.5 8l0.8 1.8L11 10.5l-1.7 0.7L8.5 13l-0.8-1.8L6 10.5l1.7-0.7L8.5 8z"/>
    <!-- Small 4-pointed star -->
    <path fill="currentColor" d="M10 16l0.5 1.2L12 18l-1.5 0.8L10 20l-0.5-1.2L8 18l1.5-0.8L10 16z"/>
  </svg>`;
}
function infoIcon() {
  return `<svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 100 20 10 10 0 000-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z"/></svg>`;
}
function pauseIcon() {
  return `<svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path fill="currentColor" d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>`;
}
function playIcon() {
  return `<svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>`;
}
function darkModeIcon(){
  // Show moon in light mode (click to go dark), sun in dark mode (click to go light)
  const isDark = document.body.classList.contains('dark-mode');
  if (isDark) {
    // Sun icon (light mode)
    return `<svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor"/><path fill="currentColor" d="M12 2v3m0 14v3M2 12h3m14 0h3M4.2 4.2l2.1 2.1m11.4 11.4l2.1 2.1M4.2 19.8l2.1-2.1m11.4-11.4l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  } else {
    // Moon icon (dark mode)
    return `<svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path fill="currentColor" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`;
  }
}
function toggleDarkMode(btn){
  try {
    const enabled = document.body.classList.toggle('dark-mode');
    btn.classList.toggle('is-active', enabled);
    btn.setAttribute('aria-pressed', String(enabled));
    // Update icon to reflect new state
    const iconContainer = btn.querySelector('.ico');
    if (iconContainer && iconContainer.parentNode) {
      iconContainer.parentNode.innerHTML = darkModeIcon();
    }
    try { localStorage.setItem('KOT_DARK_MODE', enabled? '1':'0'); } catch(_) {}
  } catch(_) {}
}
// On load, apply persisted dark mode
try { if (localStorage.getItem('KOT_DARK_MODE') === '1') document.body.classList.add('dark-mode'); } catch(_) {}
function beakerIcon() {
  return `<svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path fill="currentColor" d="M6 2h12v2h-1v5.59l3.36 6.72A3 3 0 0117.64 20H6.36a3 3 0 01-2.72-3.69L7 9.59V4H6V2zm3 2v6.41l-3.14 6.28a1 1 0 00.9 1.31h11.28a1 1 0 00.9-1.31L15 10.41V4H9zm1.5 9a1.5 1.5 0 013 0c0 .83-.67 1.5-1.5 1.5S10.5 13.83 10.5 13z"/></svg>`;
}
