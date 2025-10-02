/** aiThoughtBubbleComponent.js
 * Component for displaying AI thought processes and decision rationale
 * Shows during replay to illustrate AI reasoning
 */

export class AIThoughtBubbleComponent {
  constructor() {
    this.container = null;
    this.isVisible = false;
    this.currentDecision = null;
    this.autoHideTimeout = null;
    
    this.initializeComponent();
    this.bindEvents();
  }
  
  /**
   * Initialize the thought bubble component
   */
  initializeComponent() {
    this.container = document.createElement('div');
    this.container.className = 'ai-thought-bubble';
    this.container.innerHTML = this.getTemplate();
    
    // Add to document body
    document.body.appendChild(this.container);
    
    console.log('[AIThoughtBubbleComponent] Initialized');
  }
  
  /**
   * Get the HTML template for the thought bubble
   * @returns {string}
   */
  getTemplate() {
    return `
      <div class="thought-bubble-container">
        <div class="thought-bubble-header">
          <div class="ai-avatar">🤖</div>
          <div class="ai-name">AI Player</div>
          <button class="close-btn" data-action="close">×</button>
        </div>
        
        <div class="thought-bubble-content">
          <div class="decision-context">
            <div class="context-item">
              <span class="context-label">Round:</span>
              <span class="context-value" data-context="round">-</span>
            </div>
            <div class="context-item">
              <span class="context-label">Turn:</span>
              <span class="context-value" data-context="turn">-</span>
            </div>
            <div class="context-item">
              <span class="context-label">Player:</span>
              <span class="context-value" data-context="player">-</span>
            </div>
          </div>
          
          <div class="dice-roll-display">
            <div class="section-title">🎲 Dice Roll</div>
            <div class="dice-faces" data-content="faces"></div>
          </div>
          
          <div class="ai-reasoning">
            <div class="section-title">🧠 AI Reasoning</div>
            <div class="reasoning-text" data-content="rationale">
              Loading AI thoughts...
            </div>
          </div>
          
          <div class="decision-outcome">
            <div class="section-title">⚡ Decision</div>
            <div class="decision-action" data-content="action">-</div>
            <div class="decision-score">
              <span class="score-label">Confidence Score:</span>
              <span class="score-value" data-content="score">-</span>
              <div class="score-bar">
                <div class="score-fill" data-score-bar></div>
              </div>
            </div>
          </div>
          
          <div class="probability-analysis" data-section="probabilities">
            <div class="section-title">📊 Probability Analysis</div>
            <div class="probability-items" data-content="probabilities"></div>
          </div>
        </div>
        
        <div class="thought-bubble-footer">
          <button class="btn-secondary" data-action="minimize">Minimize</button>
          <button class="btn-primary" data-action="next">Next Decision</button>
        </div>
      </div>
    `;
  }
  
  /**
   * Bind event listeners
   */
  bindEvents() {
    // Listen for AIDT decision display events
    window.addEventListener('aidt.decision.display', (event) => {
      this.displayDecision(event.detail.decision, event.detail.logEntry);
    });
    
    // Listen for replay state changes
    window.addEventListener('aidt.replay.stopped', () => {
      this.hide();
    });
    
    window.addEventListener('aidt.replay.paused', () => {
      this.pauseAutoHide();
    });
    
    window.addEventListener('aidt.replay.resumed', () => {
      this.resumeAutoHide();
    });
    
    // Handle button clicks
    this.container.addEventListener('click', (event) => {
      const action = event.target.dataset.action;
      this.handleAction(action);
    });
    
    // Handle keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      if (this.isVisible) {
        this.handleKeyboard(event);
      }
    });
  }
  
  /**
   * Display an AI decision in the thought bubble
   * @param {Object} decision - AI decision data
   * @param {Object} logEntry - Corresponding game log entry
   */
  displayDecision(decision, logEntry) {
    if (!decision) return;
    
    this.currentDecision = decision;
    
    // Update context information
    this.updateContext(decision);
    
    // Update dice roll display
    this.updateDiceDisplay(decision.faces);
    
    // Update AI reasoning
    this.updateReasoning(decision.rationale || 'No reasoning provided');
    
    // Update decision outcome
    this.updateDecisionOutcome(decision);
    
    // Update probability analysis if available
    this.updateProbabilityAnalysis(decision);
    
    // Show the thought bubble
    this.show();
    
    // Auto-hide after delay
    this.setAutoHide(8000); // 8 seconds
    
    console.log('[AIThoughtBubbleComponent] Displaying decision:', decision);
  }
  
  /**
   * Update context information
   * @param {Object} decision - AI decision data
   */
  updateContext(decision) {
    const contextElements = this.container.querySelectorAll('[data-context]');
    
    contextElements.forEach(element => {
      const context = element.dataset.context;
      switch (context) {
        case 'round':
          element.textContent = decision.roundNumber || '-';
          break;
        case 'turn':
          element.textContent = decision.turnNumber || '-';
          break;
        case 'player':
          element.textContent = decision.playerName || 'AI Player';
          break;
      }
    });
  }
  
  /**
   * Update dice roll display
   * @param {string|Array} faces - Dice faces
   */
  updateDiceDisplay(faces) {
    const facesElement = this.container.querySelector('[data-content="faces"]');
    if (!facesElement) return;
    
    let facesArray = [];
    if (typeof faces === 'string') {
      facesArray = faces.split(',').map(f => f.trim());
    } else if (Array.isArray(faces)) {
      facesArray = faces;
    }
    
    const facesHtml = facesArray.map(face => {
      const emoji = this.getFaceEmoji(face);
      return `<span class="dice-face" data-face="${face}">${emoji} ${face}</span>`;
    }).join('');
    
    facesElement.innerHTML = facesHtml;
  }
  
  /**
   * Update AI reasoning text
   * @param {string} reasoning - AI reasoning text
   */
  updateReasoning(reasoning) {
    const reasoningElement = this.container.querySelector('[data-content="rationale"]');
    if (!reasoningElement) return;
    
    // Animate typing effect
    this.typeText(reasoningElement, reasoning, 30); // 30ms per character
  }
  
  /**
   * Update decision outcome
   * @param {Object} decision - AI decision data
   */
  updateDecisionOutcome(decision) {
    // Update action
    const actionElement = this.container.querySelector('[data-content="action"]');
    if (actionElement) {
      actionElement.textContent = decision.action || 'No action';
      actionElement.className = `decision-action action-${decision.action}`;
    }
    
    // Update score
    const scoreElement = this.container.querySelector('[data-content="score"]');
    const scoreBar = this.container.querySelector('[data-score-bar]');
    
    if (scoreElement && typeof decision.score === 'number') {
      scoreElement.textContent = decision.score.toFixed(1);
      
      if (scoreBar) {
        const percentage = Math.min(100, Math.max(0, decision.score * 10)); // Assuming score is 0-10
        scoreBar.style.width = `${percentage}%`;
        scoreBar.className = `score-fill score-${this.getScoreClass(decision.score)}`;
      }
    }
  }
  
  /**
   * Update probability analysis
   * @param {Object} decision - AI decision data
   */
  updateProbabilityAnalysis(decision) {
    const probabilitiesSection = this.container.querySelector('[data-section="probabilities"]');
    const probabilitiesContent = this.container.querySelector('[data-content="probabilities"]');
    
    if (!probabilitiesContent) return;
    
    // Check if decision has probability data
    if (decision.probabilities || decision.analysis) {
      probabilitiesSection.style.display = 'block';
      
      const probData = decision.probabilities || decision.analysis || {};
      const probHtml = Object.entries(probData).map(([key, value]) => {
        const percentage = typeof value === 'number' ? (value * 100).toFixed(1) : value;
        return `
          <div class="probability-item">
            <span class="prob-label">${key}:</span>
            <span class="prob-value">${percentage}${typeof value === 'number' ? '%' : ''}</span>
            <div class="prob-bar">
              <div class="prob-fill" style="width: ${typeof value === 'number' ? value * 100 : 0}%"></div>
            </div>
          </div>
        `;
      }).join('');
      
      probabilitiesContent.innerHTML = probHtml;
    } else {
      probabilitiesSection.style.display = 'none';
    }
  }
  
  /**
   * Get emoji for dice face
   * @param {string} face - Dice face name
   * @returns {string}
   */
  getFaceEmoji(face) {
    const faceEmojis = {
      '1': '⚀',
      '2': '⚁',
      '3': '⚂',
      'claw': '🗲',
      'heart': '💖',
      'energy': '⚡'
    };
    
    return faceEmojis[face.toLowerCase()] || '🎲';
  }
  
  /**
   * Get CSS class for score
   * @param {number} score - Decision score
   * @returns {string}
   */
  getScoreClass(score) {
    if (score >= 8) return 'excellent';
    if (score >= 6) return 'good';
    if (score >= 4) return 'average';
    if (score >= 2) return 'poor';
    return 'terrible';
  }
  
  /**
   * Type text with animation effect
   * @param {Element} element - Target element
   * @param {string} text - Text to type
   * @param {number} speed - Typing speed in ms
   */
  typeText(element, text, speed = 50) {
    element.textContent = '';
    let index = 0;
    
    const typeInterval = setInterval(() => {
      if (index < text.length) {
        element.textContent += text[index];
        index++;
      } else {
        clearInterval(typeInterval);
      }
    }, speed);
  }
  
  /**
   * Show the thought bubble
   */
  show() {
    this.container.classList.add('visible');
    this.isVisible = true;
    
    // Trigger entrance animation
    setTimeout(() => {
      this.container.classList.add('animated-in');
    }, 10);
  }
  
  /**
   * Hide the thought bubble
   */
  hide() {
    this.container.classList.remove('animated-in');
    this.isVisible = false;
    
    setTimeout(() => {
      this.container.classList.remove('visible');
    }, 300);
    
    this.clearAutoHide();
  }
  
  /**
   * Minimize the thought bubble
   */
  minimize() {
    this.container.classList.add('minimized');
  }
  
  /**
   * Maximize the thought bubble
   */
  maximize() {
    this.container.classList.remove('minimized');
  }
  
  /**
   * Set auto-hide timeout
   * @param {number} delay - Delay in milliseconds
   */
  setAutoHide(delay) {
    this.clearAutoHide();
    this.autoHideTimeout = setTimeout(() => {
      this.hide();
    }, delay);
  }
  
  /**
   * Clear auto-hide timeout
   */
  clearAutoHide() {
    if (this.autoHideTimeout) {
      clearTimeout(this.autoHideTimeout);
      this.autoHideTimeout = null;
    }
  }
  
  /**
   * Pause auto-hide
   */
  pauseAutoHide() {
    this.clearAutoHide();
  }
  
  /**
   * Resume auto-hide
   */
  resumeAutoHide() {
    if (this.isVisible) {
      this.setAutoHide(5000); // Resume with 5 second delay
    }
  }
  
  /**
   * Handle action buttons
   * @param {string} action - Action to handle
   */
  handleAction(action) {
    switch (action) {
      case 'close':
        this.hide();
        break;
      case 'minimize':
        this.minimize();
        break;
      case 'maximize':
        this.maximize();
        break;
      case 'next':
        // Request next decision from replay service
        window.dispatchEvent(new CustomEvent('aidt.request.next'));
        break;
    }
  }
  
  /**
   * Handle keyboard shortcuts
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyboard(event) {
    switch (event.code) {
      case 'Escape':
        this.hide();
        event.preventDefault();
        break;
      case 'Space':
        this.pauseAutoHide();
        event.preventDefault();
        break;
      case 'KeyM':
        if (this.container.classList.contains('minimized')) {
          this.maximize();
        } else {
          this.minimize();
        }
        event.preventDefault();
        break;
      case 'KeyN':
        this.handleAction('next');
        event.preventDefault();
        break;
    }
  }
  
  /**
   * Get current thought bubble state
   * @returns {Object}
   */
  getState() {
    return {
      isVisible: this.isVisible,
      isMinimized: this.container.classList.contains('minimized'),
      currentDecision: this.currentDecision
    };
  }
  
  /**
   * Destroy the component
   */
  destroy() {
    this.clearAutoHide();
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    // Remove event listeners
    window.removeEventListener('aidt.decision.display', this.displayDecision);
    
    console.log('[AIThoughtBubbleComponent] Destroyed');
  }
}

// Auto-initialize when module loads
let thoughtBubbleInstance = null;

/**
 * Initialize AI thought bubble component
 * @returns {AIThoughtBubbleComponent}
 */
export function initializeAIThoughtBubble() {
  if (!thoughtBubbleInstance) {
    thoughtBubbleInstance = new AIThoughtBubbleComponent();
  }
  return thoughtBubbleInstance;
}

/**
 * Get active thought bubble instance
 * @returns {AIThoughtBubbleComponent|null}
 */
export function getAIThoughtBubble() {
  return thoughtBubbleInstance;
}

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
    update: () => {} // No-op for now as component manages its own state
  };
}

/**
 * Component system update function
 * @param {Object} ctx - Component context
 */
export function update(ctx) {
  // AI thought bubble manages its own updates via events
  // No action needed here
}