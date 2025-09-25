/** toolbar.component.js
 * MIGRATED TOOLBAR COMPONENT (legacy .game-toolbar removed)
 * Styling fully scoped in css/components.toolbar.css. Button visuals use local rules.
 * Next: remove legacy .game-toolbar selectors from legacy CSS (if still present) after QA.
 */
import { store } from '../../bootstrap/index.js';
import { uiSettingsOpen, uiGameLogOpen } from '../../core/actions.js';

export function build({ selector }) {
  const root = document.createElement('div');
  // Toolbar now relies on footer positioning (NO absolute top so it doesn't cover left panel header)
  root.className = selector.slice(1) + ' cmp-toolbar';
  root.setAttribute('data-draggable','true');
  // SVG icon set (placeholder vector approximations for legacy sprites)
  root.innerHTML = `
    ${iconBtn('settings', 'Settings', gearIcon())}
    ${iconBtn('log', 'Game Log', listIcon())}
    ${iconBtn('sound', 'Toggle Sound', soundIcon())}
    ${iconBtn('help', 'Help', helpIcon())}
    ${iconBtn('restart', 'Restart Game', restartIcon())}
    ${iconBtn('reset-positions', 'Reset Layout', layoutIcon())}
    ${iconBtn('about', 'About', infoIcon())}
  `;
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const a = btn.getAttribute('data-action');
    if (a === 'settings') {
      store.dispatch(uiSettingsOpen());
    } else if (a === 'log') {
      store.dispatch(uiGameLogOpen());
    } else if (a === 'reset-positions') {
      window.dispatchEvent(new CustomEvent('ui.positions.reset.request'));
    } else if (a === 'restart') {
      window.location.reload();
    } else if (a === 'sound') {
      // Placeholder: toggle a global mute flag in settings (future implementation)
      console.debug('sound toggle (placeholder)');
    } else if (a === 'help') {
      console.debug('help dialog (placeholder)');
    } else if (a === 'about') {
      console.debug('about dialog (placeholder)');
    }
  });
  window.addEventListener('ui.positions.reset.request', () => {
    // eventBus path already exists via eventsToActions using 'ui/positions/reset'
    import('../../core/eventBus.js').then(m => m.eventBus.emit('ui/positions/reset'));
  });
  return { root, update: () => {} };
}

// -------- Icon Button Helper & Inline SVGs ---------
function iconBtn(action, label, svg) {
  return `<button data-action="${action}" class="toolbar-btn" title="${label}" aria-label="${label}">${svg}<span class="vh">${label}</span></button>`;
}

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
