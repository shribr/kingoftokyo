/**
 * Save Status Indicator Component
 * Shows "Last saved: X seconds ago" as a bottom-left toast notification
 */

import { getLastSaveTimestamp, getSaveInfo } from '../../services/gameStatePersistence.js';

export function createSaveStatusIndicator() {
  const toast = document.createElement('div');
  toast.className = 'save-status-toast';
  toast.innerHTML = `
    <svg class="save-status-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 1H3C1.89543 1 1 1.89543 1 3V13C1 14.1046 1.89543 15 3 15H13C14.1046 15 15 14.1046 15 13V3C15 1.89543 14.1046 1 13 1Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M11 1V6H5V1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M5 11H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M5 13H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span class="save-status-text">No save</span>
  `;

  let updateInterval = null;
  let hideTimeout = null;

  const updateStatus = () => {
    const saveInfo = getSaveInfo();
    const textEl = toast.querySelector('.save-status-text');
    const iconEl = toast.querySelector('.save-status-icon');
    
    if (!saveInfo) {
      textEl.textContent = 'No save';
      toast.classList.remove('has-save');
      toast.classList.remove('visible');
      return;
    }

    const age = Math.floor((Date.now() - saveInfo.timestamp) / 1000);
    let ageStr;
    
    if (age < 10) {
      ageStr = 'Saved';
      iconEl.classList.add('pulse');
      setTimeout(() => iconEl.classList.remove('pulse'), 1000);
      
      // Show toast for 3 seconds after save
      toast.classList.add('visible');
      if (hideTimeout) clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        toast.classList.remove('visible');
      }, 3000);
    } else if (age < 60) {
      ageStr = `Saved ${age}s ago`;
    } else if (age < 3600) {
      ageStr = `Saved ${Math.floor(age / 60)}m ago`;
    } else {
      ageStr = `Saved ${Math.floor(age / 3600)}h ago`;
    }
    
    textEl.textContent = ageStr;
    toast.classList.add('has-save');
    
    // Set tooltip with full details
    toast.title = `Last save: ${new Date(saveInfo.timestamp).toLocaleString()}\nRound: ${saveInfo.round}\nPlayers: ${saveInfo.playerCount}`;
  };

  const startUpdating = () => {
    updateStatus();
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(updateStatus, 5000); // Update every 5 seconds
  };

  const stopUpdating = () => {
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  };

  // Listen for save events
  window.addEventListener('game-saved', () => {
    updateStatus();
  });

  // Show on hover
  toast.addEventListener('mouseenter', () => {
    if (getSaveInfo()) {
      toast.classList.add('visible');
      if (hideTimeout) clearTimeout(hideTimeout);
    }
  });

  toast.addEventListener('mouseleave', () => {
    if (hideTimeout) clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      const age = Math.floor((Date.now() - (getSaveInfo()?.timestamp || 0)) / 1000);
      if (age >= 10) { // Only hide if not just saved
        toast.classList.remove('visible');
      }
    }, 1000);
  });

  // Start updating
  startUpdating();

  // Cleanup
  toast.destroy = () => {
    stopUpdating();
    toast.remove();
  };

  return toast;
}

/**
 * Initialize save status indicator as bottom-left toast
 */
export function initializeSaveStatusIndicator() {
  // Wait for body to be ready
  const init = () => {
    const toast = createSaveStatusIndicator();
    document.body.appendChild(toast);
    console.log('[save-indicator] Initialized as bottom-left toast');
  };

  if (document.body) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
}
