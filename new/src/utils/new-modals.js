/**
 * new-modals.js
 * Content creators for the new modal system
 */

import { newModalSystem } from './new-modal-system.js';

export function createSettingsModal() {
  const content = document.createElement('div');
  content.innerHTML = `
    <form class="new-settings-form">
      <div class="field" style="margin-bottom: 16px;">
        <label style="display: block; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 4px; opacity: 0.9;">CPU Speed</label>
        <select name="cpuSpeed" style="background: #fff; border: 2px solid #000; color: #000; padding: 6px 10px; font-size: 0.875rem; border-radius: 4px; box-shadow: 2px 2px 0 #000; width: 100%;">
          <option value="slow">Slow</option>
          <option value="normal">Normal</option>
          <option value="fast">Fast</option>
        </select>
      </div>
      
      <div class="field" style="margin-bottom: 16px;">
        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.875rem;">
          <input type="checkbox" name="showThoughtBubbles" style="margin: 0;">
          Show Thought Bubbles
        </label>
      </div>
      
      <div class="field" style="margin-bottom: 16px;">
        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.875rem;">
          <input type="checkbox" name="autoActivateMonsters" style="margin: 0;">
          Auto Activate Monsters
        </label>
      </div>
      
      <div class="field" style="margin-bottom: 24px;">
        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.875rem;">
          <input type="checkbox" name="autoStartInTest" style="margin: 0;">
          Auto Start In Test (skipintro)
        </label>
      </div>
      
      <div class="actions" style="display: flex; justify-content: flex-end; gap: 8px;">
        <button type="button" class="close-btn" style="background: #2a2a2a; color: #e4e4e4; border: 1px solid #444; padding: 6px 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; box-shadow: 2px 2px 0 #000; cursor: pointer; border-radius: 4px;">
          Close
        </button>
      </div>
    </form>
  `;

  // Handle form changes
  const form = content.querySelector('.new-settings-form');
  form.addEventListener('change', async (e) => {
    const formData = new FormData(form);
    const settings = {
      cpuSpeed: formData.get('cpuSpeed'),
      showThoughtBubbles: form.querySelector('input[name="showThoughtBubbles"]').checked,
      autoActivateMonsters: form.querySelector('input[name="autoActivateMonsters"]').checked,
      autoStartInTest: form.querySelector('input[name="autoStartInTest"]').checked
    };
    
    // Update settings in store if available
    if (window.__KOT_NEW__?.store) {
      try {
        const { settingsUpdated } = await import('../core/actions.js');
        window.__KOT_NEW__.store.dispatch(settingsUpdated(settings));
        console.log('[NEW-SETTINGS] Settings updated:', settings);
      } catch (e) {
        console.error('[NEW-SETTINGS] Failed to update settings:', e);
      }
    }
  });

  // Close button
  content.querySelector('.close-btn').addEventListener('click', () => {
    newModalSystem.closeModal('settings');
  });

  // Load current settings
  if (window.__KOT_NEW__?.store) {
    const state = window.__KOT_NEW__.store.getState();
    const settings = state.settings || {};
    
    const cpuSelect = content.querySelector('select[name="cpuSpeed"]');
    if (cpuSelect && settings.cpuSpeed) cpuSelect.value = settings.cpuSpeed;
    
    const thoughtBubbles = content.querySelector('input[name="showThoughtBubbles"]');
    if (thoughtBubbles) thoughtBubbles.checked = !!settings.showThoughtBubbles;
    
    const autoActivate = content.querySelector('input[name="autoActivateMonsters"]');
    if (autoActivate) autoActivate.checked = !!settings.autoActivateMonsters;
    
    const autoStart = content.querySelector('input[name="autoStartInTest"]');
    if (autoStart) autoStart.checked = !!settings.autoStartInTest;
  }

  return newModalSystem.createModal('settings', 'Game Settings', content, { width: '400px' });
}

export function createGameLogModal() {
  const content = document.createElement('div');
  content.innerHTML = `
    <div class="new-game-log" style="font-family: monospace; font-size: 0.8rem; background: #141414; padding: 12px; border: 1px solid #000; border-radius: 4px; max-height: 50vh; overflow: auto;">
      <div class="log-loading">Loading game log...</div>
    </div>
    <div class="actions" style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
      <button type="button" class="close-btn" style="background: #2a2a2a; color: #e4e4e4; border: 1px solid #444; padding: 6px 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; box-shadow: 2px 2px 0 #000; cursor: pointer; border-radius: 4px;">
        Close
      </button>
    </div>
  `;

  // Load log entries
  if (window.__KOT_NEW__?.store) {
    const state = window.__KOT_NEW__.store.getState();
    const logEntries = state.log?.entries || [];
    const logContainer = content.querySelector('.new-game-log');
    
    if (logEntries.length === 0) {
      logContainer.innerHTML = '<div style="color: #888; font-style: italic;">No log entries yet.</div>';
    } else {
      logContainer.innerHTML = logEntries
        .map(entry => `<div class="log-entry" style="padding: 2px 0; border-bottom: 1px dashed rgba(255,255,255,0.08);">${entry.message || entry.text || JSON.stringify(entry)}</div>`)
        .join('');
    }
  }

  // Close button
  content.querySelector('.close-btn').addEventListener('click', () => {
    newModalSystem.closeModal('gameLog');
  });

  return newModalSystem.createModal('gameLog', 'Game Log', content, { width: '600px' });
}

export function createHelpModal() {
  const content = document.createElement('div');
  content.innerHTML = `
    <div class="new-help-content" style="line-height: 1.6;">
      <h3 style="color: #ffd700; margin-top: 0;">Game Controls</h3>
      <ul style="padding-left: 20px; margin-bottom: 20px;">
        <li><strong>Roll Dice:</strong> Click the "Roll" button or press Space</li>
        <li><strong>Keep Dice:</strong> Click on dice to keep them before rerolling</li>
        <li><strong>Buy Cards:</strong> Click on power cards in the shop</li>
        <li><strong>Enter Tokyo:</strong> Click "Enter Tokyo" when prompted</li>
        <li><strong>Attack:</strong> Roll claws to attack other monsters</li>
      </ul>
      
      <h3 style="color: #ffd700;">Winning Conditions</h3>
      <ul style="padding-left: 20px; margin-bottom: 20px;">
        <li>Reach <strong>20 Victory Points</strong></li>
        <li>Be the <strong>last monster standing</strong></li>
        <li>Control Tokyo and survive attacks</li>
      </ul>
      
      <h3 style="color: #ffd700;">Dice Symbols</h3>
      <ul style="padding-left: 20px; margin-bottom: 20px;">
        <li><strong>1, 2, 3:</strong> Victory Points (need 3+ of same number)</li>
        <li><strong>Energy:</strong> Buy power cards</li>
        <li><strong>Health:</strong> Heal damage (not in Tokyo)</li>
        <li><strong>Attack:</strong> Deal damage to other monsters</li>
      </ul>
      
      <h3 style="color: #ffd700;">Keyboard Shortcuts</h3>
      <ul style="padding-left: 20px;">
        <li><strong>Space:</strong> Roll dice</li>
        <li><strong>M:</strong> Toggle sound</li>
        <li><strong>Escape:</strong> Close modals</li>
      </ul>
    </div>
    <div class="actions" style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px;">
      <button type="button" class="close-btn" style="background: #2a2a2a; color: #e4e4e4; border: 1px solid #444; padding: 6px 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; box-shadow: 2px 2px 0 #000; cursor: pointer; border-radius: 4px;">
        Close
      </button>
    </div>
  `;

  // Close button
  content.querySelector('.close-btn').addEventListener('click', () => {
    newModalSystem.closeModal('help');
  });

  return newModalSystem.createModal('help', 'Help / Instructions', content, { width: '500px' });
}