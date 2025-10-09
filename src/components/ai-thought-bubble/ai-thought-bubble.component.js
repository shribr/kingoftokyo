/** aiThoughtBubbleComponent.js
 * Component for displaying AI thought processes as simple one-line comments
 * Shows contextually relevant phrases to the right of the King of Tokyo header
 * Desktop only - hidden on mobile
 */

export class AIThoughtBubbleComponent {
  constructor() {
    this.container = null;
    this.isVisible = false;
    this.currentText = '';
    this.autoHideTimeout = null;
    this.phrases = null;
    
    this.initializeComponent();
    this.loadPhrases();
    this.bindEvents();
  }
  
  /**
   * Initialize the thought bubble component
   */
  initializeComponent() {
    this.container = document.createElement('div');
    this.container.className = 'ai-thought-bubble';
    
    // Add to document body
    document.body.appendChild(this.container);
    
    if (window.__KOT_DEBUG__?.logComponentUpdates) {
      console.log('[AIThoughtBubbleComponent] Initialized (simple mode)');
    }
  }
  
  /**
   * Load AI phrases from configuration
   */
  async loadPhrases() {
    try {
      const response = await fetch('/config/ai-phrases.json');
      this.phrases = await response.json();
      if (window.__KOT_DEBUG__?.logComponentUpdates) {
        console.log('[AIThoughtBubbleComponent] Loaded phrases');
      }
    } catch (error) {
      console.error('[AIThoughtBubbleComponent] Failed to load phrases:', error);
      // Fallback phrases
      this.phrases = {
        analyzing: ['Calculating probabilities...', 'Evaluating options...'],
        strategic: ['Planning ahead...', 'Building combos...'],
        aggressive: ['Time to strike!', 'No mercy!'],
        defensive: ['Playing it safe...', 'Protecting position...']
      };
    }
  }
  
  /**
   * Bind event listeners
   */
  bindEvents() {
    // Listen for live CPU decision events
    if (typeof window !== 'undefined' && window.__KOT_NEW__?.eventBus) {
      const eventBus = window.__KOT_NEW__.eventBus;
      eventBus.on('ai/decision/made', (data) => {
        // Check if thought bubbles are enabled in settings
        try {
          const store = window.__KOT_NEW__?.store;
          if (store) {
            const settings = store.getState().settings;
            if (settings.showThoughtBubbles === false) {
              return;
            }
          }
        } catch (err) {
          console.error('[AIThoughtBubbleComponent] Error checking settings:', err);
        }
        
        this.showPhrase(data);
      });
    }
  }
  
  /**
   * Show a contextual phrase based on AI decision data
   * @param {Object} data - AI decision event data
   */
  showPhrase(data) {
    if (!this.phrases) {
      return;
    }
    
    // Select appropriate phrase based on context
    let phrase = this.selectPhrase(data);
    
    // Replace placeholders with actual values
    phrase = this.replacePlaceholders(phrase, data);
    
    // Display the phrase
    this.container.textContent = phrase;
    this.container.classList.add('visible', 'animated-in');
    this.isVisible = true;
    
    // Auto-hide after 6 seconds
    clearTimeout(this.autoHideTimeout);
    this.autoHideTimeout = setTimeout(() => {
      this.hide();
    }, 6000);
    
    if (window.__KOT_DEBUG__?.logCPUDecisions) {
      console.log('[AIThoughtBubbleComponent] Showing:', phrase);
    }
  }
  
  /**
   * Select appropriate phrase based on AI decision data
   * @param {Object} data - AI decision event data
   * @returns {string}
   */
  selectPhrase(data) {
    const decision = data.decision || {};
    const action = decision.action || 'reroll';
    const confidence = decision.confidence || 0.5;
    
    // Determine category based on action and confidence
    let category = 'analyzing';
    
    if (action === 'keep') {
      if (confidence > 0.8) {
        category = 'strategic';
      } else {
        category = 'defensive';
      }
    } else if (action === 'attack' || confidence > 0.7) {
      category = 'aggressive';
    } else if (confidence < 0.4) {
      category = 'defensive';
    }
    
    // Get phrases from category
    const phrases = this.phrases[category] || this.phrases.analyzing;
    
    // Return random phrase from category
    return phrases[Math.floor(Math.random() * phrases.length)];
  }
  
  /**
   * Replace placeholders in phrase with actual values
   * @param {string} phrase - Phrase template
   * @param {Object} data - AI decision event data
   * @returns {string}
   */
  replacePlaceholders(phrase, data) {
    let result = phrase;
    
    // Replace {playerName}
    if (data.playerName) {
      result = result.replace('{playerName}', data.playerName);
    }
    
    // Replace {opponent}
    if (data.opponent) {
      result = result.replace('{opponent}', data.opponent);
    }
    
    // Remove icon placeholders like {icons:heal:5} for now
    result = result.replace(/\{icons:[^}]+\}/g, '');
    
    return result.trim();
  }
  
  /**
   * Hide the thought bubble
   */
  hide() {
    this.container.classList.remove('visible', 'animated-in');
    this.isVisible = false;
    clearTimeout(this.autoHideTimeout);
  }
  
  /**
   * Destroy the component
   */
  destroy() {
    clearTimeout(this.autoHideTimeout);
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}

// Auto-initialize when module loads
let thoughtBubbleInstance = null;

/**
 * Component system build function
 * @param {Object} ctx - Component context
 * @returns {Object} Component instance
 */
export function build(ctx) {
  if (!thoughtBubbleInstance) {
    thoughtBubbleInstance = new AIThoughtBubbleComponent();
  }
  
  return {
    root: thoughtBubbleInstance.container,
    update: () => {}
  };
}

/**
 * Component system update function
 * @param {Object} ctx - Component context
 */
export function update(ctx) {
  // AI thought bubble manages its own updates via events
}
