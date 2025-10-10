/** debugConfig.js
 * Centralized debug configuration and logging system
 * Provides hierarchical debug output control for components and services
 */

// Debug configuration structure with proper hierarchical levels
export const DEBUG_CONFIG = {
  // === CORE SERVICES ===
  services: {
    label: '🔧 Core Services',
    enabled: false,
    children: {
      bootstrap: {
        label: 'Bootstrap & Initialization',
        enabled: false,
        children: {
          config: { label: 'Configuration Loading', enabled: false },
          persistence: { label: 'State Persistence', enabled: false }
        }
      },
      turnService: {
        label: 'Turn Service',
        enabled: false,
        children: {
          phases: { label: 'Phase Transitions', enabled: false },
          actions: { label: 'Turn Actions', enabled: false }
        }
      },
      effectEngine: {
        label: 'Effect Engine',
        enabled: false,
        children: {
          resolution: { label: 'Effect Resolution', enabled: false },
          passive: { label: 'Passive Effects', enabled: false }
        }
      },
      effectQueue: {
        label: 'Effect Queue',
        enabled: false,
        children: {
          effects: { label: 'Individual Effects', enabled: false },
          processing: { label: 'Effect Processing', enabled: false }
        }
      }
    }
  },
  
  // === MAIN GAME SCREEN ===
  gameScreen: {
    label: '🎮 Main Game Screen',
    enabled: false,
    children: {
      arena: {
        label: 'Arena',
        enabled: false,
        children: {
          slots: { label: 'Tokyo Slots (City/Bay)', enabled: false },
          animations: { label: 'Card Animations', enabled: false }
        }
      },
      diceTray: {
        label: 'Dice Tray',
        enabled: false,
        children: {
          rolls: { label: 'Roll Results', enabled: false },
          animations: { label: 'Dice Animations', enabled: false }
        }
      },
      actionMenu: {
        label: 'Actions Menu',
        enabled: false,
        children: {
          buttons: { label: 'Button State Changes', enabled: false },
          radial: { label: 'Radial Menu (Mobile)', enabled: false }
        }
      },
      toolbar: {
        label: 'Toolbar',
        enabled: false,
        children: {
          buttons: { label: 'Toolbar Buttons', enabled: false }
        }
      }
    }
  },
  
  // === PANELS ===
  panels: {
    label: '📊 Side Panels',
    enabled: false,
    children: {
      monstersPanel: {
        label: 'Monsters Panel',
        enabled: false,
        children: {
          playerCards: { label: 'Player Profile Cards', enabled: false },
          statsUpdates: { label: 'Stats Updates (HP, VP, Energy)', enabled: false }
        }
      },
      powerCardsPanel: {
        label: 'Power Cards Panel',
        enabled: false,
        children: {
          cards: { label: 'Individual Cards', enabled: false },
          shop: { label: 'Shop Updates', enabled: false },
          purchases: { label: 'Card Purchases', enabled: false }
        }
      }
    }
  },
  
  // === MODALS ===
  modals: {
    label: '🪟 Modals & Overlays',
    enabled: false,
    children: {
      monsterSelection: {
        label: 'Monster Selection',
        enabled: false,
        children: {
          cards: { label: 'Monster Cards Display', enabled: false },
          selection: { label: 'Selection Changes', enabled: false }
        }
      },
      rollForFirst: {
        label: 'Roll for First',
        enabled: false,
        children: {
          players: { label: 'Player Rows', enabled: false },
          dice: { label: 'Dice Rolls', enabled: false },
          results: { label: 'Roll Results', enabled: false }
        }
      },
      settingsModal: {
        label: 'Settings',
        enabled: false,
        children: {
          tabs: { label: 'Tab Navigation', enabled: false },
          sections: { label: 'Section Updates', enabled: false },
          scenarios: { label: 'Scenario Loading', enabled: false }
        }
      },
      playerPowerCardsModal: {
        label: 'Player Power Cards',
        enabled: false,
        children: {
          cards: { label: 'Card Display', enabled: false },
          carousel: { label: 'Carousel Navigation', enabled: false }
        }
      },
      cardDetailModal: {
        label: 'Card Detail',
        enabled: false,
        children: {}
      },
      tokyoYieldModal: {
        label: 'Tokyo Yield Decision',
        enabled: false,
        children: {
          decision: { label: 'Decision Logic', enabled: false }
        }
      },
      pauseOverlay: {
        label: 'Pause Overlay',
        enabled: false,
        children: {}
      }
    }
  },
  
  // === AI & ANALYSIS ===
  ai: {
    label: '🤖 AI & Analysis',
    enabled: false,
    children: {
      aiDecisions: {
        label: 'AI Decisions',
        enabled: false,
        children: {
          tree: { label: 'Decision Tree', enabled: false },
          evaluation: { label: 'Move Evaluation', enabled: false },
          thoughtBubble: { label: 'Thought Bubble', enabled: false }
        }
      },
      analysis: {
        label: 'Analysis & Insights',
        enabled: false,
        children: {
          winOdds: { label: 'Player Win Odds', enabled: false },
          decisionTree: { label: 'Decision Tree Viewer', enabled: false },
          statistics: { label: 'Game Statistics', enabled: false }
        }
      }
    }
  },
  
  // === UI WIDGETS ===
  widgets: {
    label: '🎨 UI Widgets',
    enabled: false,
    children: {
      deck: {
        label: 'Deck',
        enabled: false,
        children: {}
      },
      roundCounter: {
        label: 'Round Counter',
        enabled: false,
        children: {}
      },
      activePlayerTile: {
        label: 'Active Player Bubble',
        enabled: false,
        children: {}
      },
      saveIndicator: {
        label: 'Save Indicator',
        enabled: false,
        children: {}
      }
    }
  }
};

// Current debug configuration (loaded from settings or defaults)
let currentConfig = null;

/**
 * Initialize debug config from settings
 */
export function initDebugConfig(settings) {
  if (settings?.debug?.componentLogging) {
    currentConfig = settings.debug.componentLogging;
  } else {
    currentConfig = createDefaultConfig();
  }
}

/**
 * Create a deep copy of the default config with only enabled flags
 */
function createDefaultConfig() {
  const config = {};
  
  function processLevel(source, target) {
    Object.keys(source).forEach(key => {
      const item = source[key];
      target[key] = {
        enabled: item.enabled || false
      };
      
      if (item.children && Object.keys(item.children).length > 0) {
        target[key].children = {};
        processLevel(item.children, target[key].children);
      }
    });
  }
  
  processLevel(DEBUG_CONFIG, config);
  return config;
}

/**
 * Get current debug configuration
 */
export function getDebugConfig() {
  if (!currentConfig) {
    currentConfig = createDefaultConfig();
  }
  return currentConfig;
}

/**
 * Update debug configuration at a specific path
 * @param {string[]} path - Path to the config item (e.g., ['services', 'turnService'])
 * @param {boolean} enabled - Whether to enable or disable
 */
export function updateDebugConfig(path, enabled) {
  const config = getDebugConfig();
  
  // Navigate to the correct level
  let current = config;
  for (let i = 0; i < path.length - 1; i++) {
    if (!current[path[i]]) {
      current[path[i]] = { enabled: false, children: {} };
    }
    if (!current[path[i]].children) {
      current[path[i]].children = {};
    }
    current = current[path[i]].children;
  }
  
  // Set the value
  const key = path[path.length - 1];
  if (!current[key]) {
    current[key] = { enabled: false };
  }
  current[key].enabled = enabled;
  
  // If disabling, also disable all children recursively
  if (!enabled && current[key].children) {
    function disableChildren(obj) {
      Object.keys(obj).forEach(k => {
        obj[k].enabled = false;
        if (obj[k].children) {
          disableChildren(obj[k].children);
        }
      });
    }
    disableChildren(current[key].children);
  }
}

/**
 * Check if debug logging is enabled for a component path
 * @param {string|string[]} pathOrComponent - Path array or single component key
 * @param {string} subComponent - Optional sub-component for backwards compatibility
 */
export function isDebugEnabled(pathOrComponent, subComponent = null) {
  const config = getDebugConfig();
  
  // Handle backwards compatibility (component, subComponent) format
  if (typeof pathOrComponent === 'string' && subComponent) {
    // Try to find it in the new structure
    // This is a fallback - components should migrate to path arrays
    return isEnabledAtPath(config, [pathOrComponent, subComponent]);
  }
  
  // Handle path array
  const path = Array.isArray(pathOrComponent) ? pathOrComponent : [pathOrComponent];
  return isEnabledAtPath(config, path);
}

/**
 * Check if enabled at a specific path
 */
function isEnabledAtPath(config, path) {
  let current = config;
  
  for (const segment of path) {
    if (!current[segment]) return false;
    if (!current[segment].enabled) return false;
    
    if (current[segment].children) {
      current = current[segment].children;
    }
  }
  
  return true;
}

/**
 * Debug logger with component filtering
 * @param {string|string[]} pathOrComponent - Path array or component key
 * @param {string} subComponentOrMessage - Sub-component or message
 * @param {...any} args - Additional arguments
 */
export function debugLog(pathOrComponent, subComponentOrMessage, ...args) {
  // Handle different call signatures
  let path, message, data;
  
  if (Array.isArray(pathOrComponent)) {
    // New format: debugLog(['services', 'turnService'], 'message', data)
    path = pathOrComponent;
    message = subComponentOrMessage;
    data = args;
  } else if (typeof subComponentOrMessage === 'string' && args.length === 0) {
    // Old format: debugLog('component', 'message')
    path = [pathOrComponent];
    message = subComponentOrMessage;
    data = [];
  } else if (typeof subComponentOrMessage === 'string' && args.length > 0) {
    // Old format with sub: debugLog('component', 'subComponent', 'message', data)
    path = [pathOrComponent, subComponentOrMessage];
    message = args[0];
    data = args.slice(1);
  } else {
    return; // Invalid format
  }
  
  if (!isDebugEnabled(path)) return;
  
  const prefix = `[${path.join(':')}]`;
  
  if (data.length > 0) {
    console.log(prefix, message, ...data);
  } else {
    console.log(prefix, message);
  }
}

/**
 * Get hierarchical debug options for UI
 */
export function getDebugTree() {
  function buildNode(key, item, path = []) {
    const currentPath = [...path, key];
    const config = getDebugConfig();
    const enabled = isEnabledAtPath(config, currentPath);
    
    const node = {
      key,
      path: currentPath,
      label: item.label,
      enabled,
      children: []
    };
    
    if (item.children && Object.keys(item.children).length > 0) {
      node.children = Object.keys(item.children).map(childKey =>
        buildNode(childKey, item.children[childKey], currentPath)
      );
    }
    
    return node;
  }
  
  return Object.keys(DEBUG_CONFIG).map(key =>
    buildNode(key, DEBUG_CONFIG[key])
  );
}

// Backwards compatibility - flatten for old code
export function getFlatDebugOptions() {
  console.warn('getFlatDebugOptions is deprecated, use getDebugTree instead');
  return [];
}
