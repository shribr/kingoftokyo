/** archiveIntegration.js
 * Integration utility to add archive management access to existing UI components
 * Provides buttons and menu items to launch the archive manager
 */

import { showArchiveManager } from '../ui/components/archiveManagerComponent.js';

/**
 * Add archive management button to game log viewer
 * @param {Element} gameLogViewerElement - Game log viewer container
 */
export function addArchiveButtonToGameLogViewer(gameLogViewerElement) {
  const toolbar = gameLogViewerElement.querySelector('header');
  if (!toolbar) return;
  
  // Check if button already exists
  if (toolbar.querySelector('[data-archive-manager]')) return;
  
  const archiveButton = document.createElement('button');
  archiveButton.className = 'toolbar-btn archive-manager-btn';
  archiveButton.dataset.archiveManager = 'true';
  archiveButton.innerHTML = '📁 Archive Manager';
  archiveButton.title = 'Open Archive Manager';
  
  archiveButton.addEventListener('click', () => {
    showArchiveManager();
  });
  
  // Insert after existing buttons
  const lastButton = toolbar.querySelector('button:last-of-type');
  if (lastButton) {
    lastButton.parentNode.insertBefore(archiveButton, lastButton.nextSibling);
  } else {
    toolbar.appendChild(archiveButton);
  }
  
  console.log('[ArchiveIntegration] Added archive manager button to game log viewer');
}

/**
 * Add archive management to dev panel
 * @param {Element} devPanelElement - Dev panel container
 */
export function addArchiveButtonToDevPanel(devPanelElement) {
  // Check if button already exists
  if (devPanelElement.querySelector('[data-archive-manager]')) return;
  
  const archiveButton = document.createElement('button');
  archiveButton.className = 'dev-panel-btn archive-manager-btn';
  archiveButton.dataset.archiveManager = 'true';
  archiveButton.innerHTML = '📁 Archives';
  archiveButton.title = 'Open Archive Manager';
  
  archiveButton.addEventListener('click', () => {
    showArchiveManager();
  });
  
  devPanelElement.appendChild(archiveButton);
  
  console.log('[ArchiveIntegration] Added archive manager button to dev panel');
}

/**
 * Add archive management to settings menu
 * @param {Element} settingsElement - Settings menu container
 */
export function addArchiveButtonToSettings(settingsElement) {
  const advancedSection = settingsElement.querySelector('.advanced-section') || settingsElement;
  
  // Check if option already exists
  if (advancedSection.querySelector('[data-archive-manager]')) return;
  
  const archiveOption = document.createElement('div');
  archiveOption.className = 'settings-option';
  archiveOption.innerHTML = `
    <div class="setting-info">
      <div class="setting-label">Archive Manager</div>
      <div class="setting-description">Manage saved game logs and AI decision archives</div>
    </div>
    <button class="setting-btn" data-archive-manager="true">
      📁 Open Manager
    </button>
  `;
  
  const button = archiveOption.querySelector('[data-archive-manager]');
  button.addEventListener('click', () => {
    showArchiveManager();
  });
  
  advancedSection.appendChild(archiveOption);
  
  console.log('[ArchiveIntegration] Added archive manager option to settings');
}

/**
 * Add global keyboard shortcut for archive manager
 */
export function addGlobalArchiveShortcut() {
  document.addEventListener('keydown', (event) => {
    // Ctrl/Cmd + Shift + A to open archive manager
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'A') {
      event.preventDefault();
      showArchiveManager();
    }
  });
  
  console.log('[ArchiveIntegration] Added global keyboard shortcut (Ctrl/Cmd+Shift+A)');
}

/**
 * Add floating archive access button
 * @param {Object} options - Configuration options
 */
export function addFloatingArchiveButton(options = {}) {
  // Check if button already exists
  if (document.querySelector('.floating-archive-btn')) return;
  
  const button = document.createElement('button');
  button.className = 'floating-archive-btn';
  button.innerHTML = '📁';
  button.title = 'Archive Manager (Ctrl+Shift+A)';
  
  // Apply default styles
  Object.assign(button.style, {
    position: 'fixed',
    bottom: options.bottom || '20px',
    right: options.right || '20px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    border: 'none',
    color: 'white',
    fontSize: '20px',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
    zIndex: '9999',
    transition: 'all 0.3s ease',
    display: options.hidden ? 'none' : 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  });
  
  // Add hover effects
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
    button.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.3)';
  });
  
  button.addEventListener('click', () => {
    showArchiveManager();
  });
  
  document.body.appendChild(button);
  
  console.log('[ArchiveIntegration] Added floating archive button');
  return button;
}

/**
 * Auto-integrate archive management into existing UI components
 */
export function autoIntegrateArchiveManager() {
  // Add global shortcut
  addGlobalArchiveShortcut();
  
  // Watch for game log viewer
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check for game log viewer
          const gameLogViewer = node.querySelector?.('.log-viewer') || 
                               (node.classList?.contains('log-viewer') ? node : null);
          if (gameLogViewer) {
            addArchiveButtonToGameLogViewer(gameLogViewer);
          }
          
          // Check for dev panel
          const devPanel = node.querySelector?.('.dev-panel') || 
                          (node.classList?.contains('dev-panel') ? node : null);
          if (devPanel) {
            addArchiveButtonToDevPanel(devPanel);
          }
          
          // Check for settings menu
          const settingsMenu = node.querySelector?.('.settings-menu') || 
                              (node.classList?.contains('settings-menu') ? node : null);
          if (settingsMenu) {
            addArchiveButtonToSettings(settingsMenu);
          }
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('[ArchiveIntegration] Auto-integration initialized');
  
  // Check existing elements
  setTimeout(() => {
    const existingLogViewer = document.querySelector('.log-viewer');
    if (existingLogViewer) {
      addArchiveButtonToGameLogViewer(existingLogViewer);
    }
    
    const existingDevPanel = document.querySelector('.dev-panel');
    if (existingDevPanel) {
      addArchiveButtonToDevPanel(existingDevPanel);
    }
    
    const existingSettings = document.querySelector('.settings-menu');
    if (existingSettings) {
      addArchiveButtonToSettings(existingSettings);
    }
  }, 1000);
}

/**
 * Initialize archive management integration
 * Call this function to set up archive management throughout the application
 */
export function initializeArchiveIntegration() {
  // Auto-integrate into existing components
  autoIntegrateArchiveManager();
  
  // Add floating button (hidden by default, can be shown via settings)
  const floatingButton = addFloatingArchiveButton({ hidden: true });
  
  // Show floating button in dev mode
  if (window.location.hash.includes('dev')) {
    floatingButton.style.display = 'flex';
  }
  
  console.log('[ArchiveIntegration] Archive management integration initialized');
}