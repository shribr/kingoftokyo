/** toolbar.component.js
 * MIGRATED TOOLBAR COMPONENT (legacy .game-toolbar removed)
 * Styling fully scoped in css/components.toolbar.css. Button visuals use local rules.
 * Next: remove legacy .game-toolbar selectors from legacy CSS (if still present) after QA.
 */
import { store } from '../../bootstrap/index.js';
import { uiSettingsOpen, uiGameLogOpen, uiInstructionsOpen, settingsUpdated, uiConfirmOpen, uiAboutOpen } from '../../core/actions.js';
import { createPositioningService } from '../../services/positioningService.js';

export function build({ selector }) {
  const root = document.createElement('div');
  // Toolbar now relies on footer positioning (NO absolute top so it doesn't cover left panel header)
  root.className = selector.slice(1) + ' cmp-toolbar';
  root.setAttribute('data-draggable','true');
  // SVG icon set (placeholder vector approximations for legacy sprites)
  root.innerHTML = `
    ${iconBtn('settings', 'Settings', gearIcon())}
    ${iconBtn('log', 'Game Log', listIcon())}
    ${iconBtn('sound', 'Toggle Sound (M)', soundIcon())}
  ${iconBtn('help', 'Help / Instructions', helpIcon())}
    ${iconBtn('restart', 'Restart Game', restartIcon())}
    ${iconBtn('reset-positions', 'Reset Layout', layoutIcon())}
    ${iconBtn('about', 'About', infoIcon())}
  `;
  // Create mobile text buttons (bottom corners) for Actions and Tools
  // These are always created but only visible under mobile CSS breakpoints.
  try {
    const actionsBtn = document.createElement('button');
    actionsBtn.className = 'toolbar-hamburger toolbar-hamburger--left';
    actionsBtn.setAttribute('type','button');
  actionsBtn.setAttribute('aria-label','Open Actions Menu');
  actionsBtn.textContent = 'Actions Menu';
    actionsBtn.addEventListener('click', (ev) => {
      const rect = actionsBtn.getBoundingClientRect();
      window.dispatchEvent(new CustomEvent('ui.actionMenu.hamburgerToggle', { detail: { anchorRect: { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height } } }));
    });
    // Tools hamburger is not needed on mobile per latest request; keep element but hidden via CSS and do not append.
    document.body.appendChild(actionsBtn);

    // Add a small dice toggle button above the left hamburger to slide the dice tray in/out
    const diceToggle = document.createElement('button');
    diceToggle.className = 'dice-toggle-btn';
    diceToggle.setAttribute('type','button');
    diceToggle.setAttribute('aria-label','Toggle Dice Tray');
    diceToggle.innerHTML = '<span class="ico">🎲</span>';
    diceToggle.addEventListener('click', () => {
      // Show dice tray on mobile and temporarily disable dragging on tray and action menu
      try {
        const tray = document.querySelector('.cmp-dice-tray');
        if (tray) {
          tray.removeAttribute('data-collapsed');
          // Temporarily disable drag cursor/behavior visually
          tray.setAttribute('data-draggable','false');
          setTimeout(() => { tray.setAttribute('data-draggable','false'); }, 0);
        }
        const am = document.querySelector('.cmp-action-menu');
        if (am) {
          am.setAttribute('data-draggable','false');
        }
      } catch(_) {}
    });
    document.body.appendChild(diceToggle);
  } catch(_) { /* non-fatal */ }
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const a = btn.getAttribute('data-action');
    switch(a) {
      case 'settings':
        store.dispatch(uiSettingsOpen()); break;
      case 'log':
        store.dispatch(uiGameLogOpen()); break; // proper component handles rendering
      case 'reset-positions':
        window.dispatchEvent(new CustomEvent('ui.positions.reset.request')); break;
      case 'restart': {
        // Open custom confirm modal; listen for acceptance externally
        store.dispatch(uiConfirmOpen('restart-game', 'Restart the game and reload the page?\nUnsaved progress will be lost.', 'Restart', 'Cancel'));
        break; }
      case 'sound':
        toggleSound(store, btn); break;
      case 'help':
        store.dispatch(uiInstructionsOpen()); break;
      case 'about':
        store.dispatch(uiAboutOpen());
        break;
    }
  });
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
    const snd = root.querySelector('[data-action="sound"]');
    if (snd) snd.classList.toggle('is-muted', muted);
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
  } catch(e) { console.warn('sound toggle failed', e); }
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
function infoIcon() {
  return `<svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 100 20 10 10 0 000-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z"/></svg>`;
}
