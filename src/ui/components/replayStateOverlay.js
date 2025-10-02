/** replayStateOverlay.js
 * Visual overlay component that display      <div class="replay-panel players-panel">
        <div class="panel-header">
          <h4>👹 Player Stats</h4>
          <span class="panel-badge" data-player-count>0</span>
        </div>
        <div class="replay-players-grid" data-players-grid>
          <!-- Player stat cards populated dynamically -->
        </div>
      </div>
      
      <div class="replay-panel phase-panel">
        <div class="panel-header">
          <h4>⚡ Game Phase</h4>
          <span class="panel-badge" data-turn-count>Turn 1</span>
        </div>
        <div class="replay-phase-display">
          <div class="current-phase" data-current-phase>Setup</div>
          <div class="active-player" data-active-player>No active player</div>
        </div>
      </div> state during replay
 * Shows dice faces, player stats, Tokyo occupancy, and replay progress
 */

export function createReplayStateOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'replay-state-overlay';
  overlay.className = 'replay-state-overlay';
  overlay.innerHTML = `
    <div class="replay-overlay-header">
      <div class="replay-title">
        <span class="replay-icon">📼</span>
        <span class="replay-text">REPLAY MODE</span>
        <button class="replay-minimize-btn" data-minimize title="Minimize overlay">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6H10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="replay-progress">
        <div class="replay-entry-info">
          <span class="replay-entry-count">Entry <span data-current-entry>0</span> of <span data-total-entries>0</span></span>
          <span class="replay-percentage" data-percentage>0%</span>
        </div>
        <div class="replay-progress-bar" data-progress-bar>
          <div class="replay-progress-fill" data-progress-fill></div>
          <div class="replay-progress-handle" data-progress-handle></div>
        </div>
      </div>
      <div class="replay-status" data-replay-status>Initializing...</div>
    </div>
    
    <div class="replay-state-panels" data-panels>
      <div class="replay-panel dice-panel">
        <div class="panel-header">
          <h4>🎲 Current Dice</h4>
          <span class="panel-badge" data-dice-count>6</span>
        </div>
        <div class="replay-dice-display" data-dice-display>
          <div class="replay-die" data-die="0">?</div>
          <div class="replay-die" data-die="1">?</div>
          <div class="replay-die" data-die="2">?</div>
          <div class="replay-die" data-die="3">?</div>
          <div class="replay-die" data-die="4">?</div>
          <div class="replay-die" data-die="5">?</div>
        </div>
      </div>
      
      <div class="replay-panel tokyo-panel">
        <div class="panel-header">
          <h4>🏙️ Tokyo Status</h4>
          <span class="panel-badge" data-tokyo-count>0/2</span>
        </div>
        <div class="replay-tokyo-status">
          <div class="tokyo-slot city-slot">
            <span class="slot-label">CITY</span>
            <span class="slot-occupant" data-tokyo-city-occupant">Empty</span>
          </div>
          <div class="tokyo-slot bay-slot">
            <span class="slot-label">BAY</span>
            <span class="slot-occupant" data-tokyo-bay-occupant">Empty</span>
          </div>
        </div>
      </div>
      
      <div class="replay-panel players-panel">
        <h4>👹 Player Stats</h4>
        <div class="replay-players-grid" data-players-grid>
          <!-- Player stat cards populated dynamically -->
        </div>
      </div>
      
      <div class="replay-panel phase-panel">
        <h4>⚡ Game Phase</h4>
        <div class="replay-phase-display">
          <div class="current-phase" data-current-phase">Setup</div>
          <div class="active-player" data-active-player">No active player</div>
        </div>
      </div>
    </div>
    
    <div class="replay-controls-overlay">
      <div class="replay-controls-row">
        <button class="replay-btn speed-btn" data-replay-action="speed" title="Replay Speed">
          <span data-speed-text>1x</span>
        </button>
        <button class="replay-btn" data-replay-action="pause">⏸️</button>
        <button class="replay-btn" data-replay-action="resume" disabled>▶️</button>
        <button class="replay-btn" data-replay-action="stop">⏹️</button>
      </div>
      <div class="replay-speed-controls" data-speed-controls style="display: none;">
        <button class="speed-option" data-speed="0.5">0.5x</button>
        <button class="speed-option" data-speed="1">1x</button>
        <button class="speed-option" data-speed="1.5">1.5x</button>
        <button class="speed-option active" data-speed="2">2x</button>
        <button class="speed-option" data-speed="4">4x</button>
      </div>
    </div>
  `;
  
  // Hide by default
  overlay.style.display = 'none';
  document.body.appendChild(overlay);
  
  return {
    show() {
      overlay.style.display = 'block';
      document.body.classList.add('replay-overlay-visible');
    },
    
    hide() {
      overlay.style.display = 'none';
      document.body.classList.remove('replay-overlay-visible');
    },
    
    updateProgress(current, total) {
      const currentEl = overlay.querySelector('[data-current-entry]');
      const totalEl = overlay.querySelector('[data-total-entries]');
      const fillEl = overlay.querySelector('[data-progress-fill]');
      const percentEl = overlay.querySelector('[data-percentage]');
      
      if (currentEl) currentEl.textContent = current;
      if (totalEl) totalEl.textContent = total;
      if (fillEl && total > 0) {
        const percent = (current / total) * 100;
        fillEl.style.width = `${percent}%`;
      }
      if (percentEl && total > 0) {
        const percent = Math.round((current / total) * 100);
        percentEl.textContent = `${percent}%`;
      }
    },
    
    minimize() {
      overlay.classList.add('minimized');
      const panels = overlay.querySelector('[data-panels]');
      if (panels) panels.style.display = 'none';
    },
    
    maximize() {
      overlay.classList.remove('minimized');
      const panels = overlay.querySelector('[data-panels]');
      if (panels) panels.style.display = 'block';
    },
    
    updateStatus(status) {
      const statusEl = overlay.querySelector('[data-replay-status]');
      if (statusEl) statusEl.textContent = status;
    },
    
    updateDice(diceResults) {
      if (!diceResults || !Array.isArray(diceResults)) return;
      
      const countBadge = overlay.querySelector('[data-dice-count]');
      let activeCount = 0;
      
      for (let i = 0; i < 6; i++) {
        const dieEl = overlay.querySelector(`[data-die="${i}"]`);
        if (dieEl) {
          if (i < diceResults.length && diceResults[i] !== null) {
            dieEl.textContent = getDiceSymbol(diceResults[i]);
            dieEl.className = 'replay-die active';
            activeCount++;
          } else {
            dieEl.textContent = '?';
            dieEl.className = 'replay-die inactive';
          }
        }
      }
      
      // Update dice count badge
      if (countBadge) countBadge.textContent = activeCount;
    },
    
    updateTokyo(tokyoState) {
      const cityEl = overlay.querySelector('[data-tokyo-city-occupant]');
      const bayEl = overlay.querySelector('[data-tokyo-bay-occupant]');
      const countBadge = overlay.querySelector('[data-tokyo-count]');
      
      let occupiedCount = 0;
      
      if (cityEl) {
        cityEl.textContent = tokyoState?.city || 'Empty';
        cityEl.className = tokyoState?.city ? 'slot-occupant occupied' : 'slot-occupant empty';
        if (tokyoState?.city) occupiedCount++;
      }
      if (bayEl) {
        bayEl.textContent = tokyoState?.bay || 'Empty';
        bayEl.className = tokyoState?.bay ? 'slot-occupant occupied' : 'slot-occupant empty';
        if (tokyoState?.bay) occupiedCount++;
      }
      
      // Update Tokyo count badge
      if (countBadge) countBadge.textContent = `${occupiedCount}/2`;
    },
    
    updatePlayers(players) {
      const grid = overlay.querySelector('[data-players-grid]');
      const countBadge = overlay.querySelector('[data-player-count]');
      if (!grid || !players) return;
      
      // Update player count badge
      if (countBadge) countBadge.textContent = players.length;
      
      grid.innerHTML = players.map(player => `
        <div class="replay-player-card ${player.status?.active ? 'active-player' : ''}" data-player-id="${player.id}">
          <div class="player-name">${player.name}</div>
          <div class="player-stats">
            <span class="stat health">♥${player.health}/10</span>
            <span class="stat energy">⚡${player.energy}</span>
            <span class="stat vp">🏆${player.victoryPoints}</span>
          </div>
          <div class="player-status">
            ${player.inTokyo ? '🏙️ Tokyo' : '🌊 Outside'}
            ${player.status?.active ? ' | ⭐ Active' : ''}
          </div>
        </div>
      `).join('');
    },
    
    updatePhase(phase, activePlayer) {
      const phaseEl = overlay.querySelector('[data-current-phase]');
      const playerEl = overlay.querySelector('[data-active-player]');
      
      if (phaseEl) phaseEl.textContent = phase || 'Unknown';
      if (playerEl) playerEl.textContent = activePlayer ? `${activePlayer} Turn` : 'No active player';
    },
    
    wireReplayControls(replayService) {
      const pauseBtn = overlay.querySelector('[data-replay-action="pause"]');
      const resumeBtn = overlay.querySelector('[data-replay-action="resume"]');
      const stopBtn = overlay.querySelector('[data-replay-action="stop"]');
      const speedBtn = overlay.querySelector('[data-replay-action="speed"]');
      const speedControls = overlay.querySelector('[data-speed-controls]');
      const minimizeBtn = overlay.querySelector('[data-minimize]');
      
      let currentSpeed = 1;
      let aidtThoughtBubble = null;
      
      // Initialize AIDT integration
      this.initializeAIDTIntegration(replayService);
      
      // Minimize/maximize functionality
      if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
          if (overlay.classList.contains('minimized')) {
            this.maximize();
          } else {
            this.minimize();
          }
        });
      }
      
      // Speed control functionality
      if (speedBtn) {
        speedBtn.addEventListener('click', () => {
          const isVisible = speedControls.style.display !== 'none';
          speedControls.style.display = isVisible ? 'none' : 'flex';
        });
      }
      
      // Speed option buttons
      const speedOptions = overlay.querySelectorAll('[data-speed]');
      speedOptions.forEach(option => {
        option.addEventListener('click', () => {
          const speed = parseFloat(option.dataset.speed);
          currentSpeed = speed;
          
          // Update active state
          speedOptions.forEach(opt => opt.classList.remove('active'));
          option.classList.add('active');
          
          // Update speed text
          const speedText = overlay.querySelector('[data-speed-text]');
          if (speedText) speedText.textContent = `${speed}x`;
          
          // Update replay service speed (if supported)
          if (replayService.setSpeed) {
            replayService.setSpeed(speed);
          }
          
          // Hide speed controls
          speedControls.style.display = 'none';
        });
      });
      
      if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
          replayService.pause();
          pauseBtn.disabled = true;
          resumeBtn.disabled = false;
          this.updateStatus('Paused');
        });
      }
      
      if (resumeBtn) {
        resumeBtn.addEventListener('click', () => {
          replayService.resume();
          resumeBtn.disabled = true;
          pauseBtn.disabled = false;
          this.updateStatus('Playing');
        });
      }
      
      if (stopBtn) {
        stopBtn.addEventListener('click', () => {
          replayService.stop();
          this.hide();
        });
      }
      
      // Set up event listeners for specific replay events
      const handlePhaseChange = (e) => {
        const entry = e.detail;
        if (entry.message && entry.message.includes('Phase:')) {
          const phase = entry.message.split('Phase:')[1]?.trim();
          this.updatePhase(phase, entry.player);
        }
      };
      
      const handleVPChange = (e) => {
        const entry = e.detail;
        this.updateStatus(`VP Change: ${entry.message}`);
        // Trigger animation on affected player cards
        this.highlightPlayerChange(entry.player);
      };
      
      const handleTokyoChange = (e) => {
        const entry = e.detail;
        this.updateStatus(`Tokyo Change: ${entry.message}`);
        // Highlight tokyo status changes
        const citySlot = overlay.querySelector('.city-slot');
        const baySlot = overlay.querySelector('.bay-slot');
        if (citySlot) citySlot.classList.add('state-changed');
        if (baySlot) baySlot.classList.add('state-changed');
        setTimeout(() => {
          if (citySlot) citySlot.classList.remove('state-changed');
          if (baySlot) baySlot.classList.remove('state-changed');
        }, 500);
      };
      
      const handleDiceRoll = (e) => {
        const entry = e.detail;
        this.updateStatus(`Dice Roll: ${entry.message}`);
        // Highlight dice display
        const diceDisplay = overlay.querySelector('.replay-dice-display');
        if (diceDisplay) {
          diceDisplay.classList.add('state-changed');
          setTimeout(() => diceDisplay.classList.remove('state-changed'), 500);
        }
      };
      
      const handleEnergyChange = (e) => {
        const entry = e.detail;
        this.updateStatus(`Energy: ${entry.message}`);
        this.highlightPlayerChange(entry.player);
      };
      
      const handleHealthChange = (e) => {
        const entry = e.detail;
        this.updateStatus(`Health: ${entry.message}`);
        this.highlightPlayerChange(entry.player);
      };
      
      // Add event listeners
      window.addEventListener('replay.phaseChange', handlePhaseChange);
      window.addEventListener('replay.vpChange', handleVPChange);
      window.addEventListener('replay.tokyoChange', handleTokyoChange);
      window.addEventListener('replay.diceRoll', handleDiceRoll);
      window.addEventListener('replay.energyChange', handleEnergyChange);
      window.addEventListener('replay.healthChange', handleHealthChange);
      
      // Store cleanup function
      this._cleanupEventListeners = () => {
        window.removeEventListener('replay.phaseChange', handlePhaseChange);
        window.removeEventListener('replay.vpChange', handleVPChange);
        window.removeEventListener('replay.tokyoChange', handleTokyoChange);
        window.removeEventListener('replay.diceRoll', handleDiceRoll);
        window.removeEventListener('replay.energyChange', handleEnergyChange);
        window.removeEventListener('replay.healthChange', handleHealthChange);
        document.removeEventListener('keydown', handleKeyboard);
      };
      
      // Keyboard shortcuts
      const handleKeyboard = (e) => {
        if (!overlay.style.display || overlay.style.display === 'none') return;
        
        switch(e.key) {
          case ' ': // Spacebar - pause/resume
            e.preventDefault();
            if (pauseBtn && !pauseBtn.disabled) {
              pauseBtn.click();
            } else if (resumeBtn && !resumeBtn.disabled) {
              resumeBtn.click();
            }
            break;
          case 'Escape': // Escape - stop
            e.preventDefault();
            if (stopBtn) stopBtn.click();
            break;
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
            e.preventDefault();
            const speedMap = { '1': '0.5', '2': '1', '3': '1.5', '4': '2', '5': '4' };
            const speedOption = overlay.querySelector(`[data-speed="${speedMap[e.key]}"]`);
            if (speedOption) speedOption.click();
            break;
          case 'm': // M - minimize/maximize
            e.preventDefault();
            if (minimizeBtn) minimizeBtn.click();
            break;
        }
      };
      
      document.addEventListener('keydown', handleKeyboard);
    },
    
    highlightPlayerChange(playerId) {
      if (!playerId) return;
      const playerCard = overlay.querySelector(`[data-player-id="${playerId}"]`);
      if (playerCard) {
        playerCard.classList.add('state-changed');
        setTimeout(() => playerCard.classList.remove('state-changed'), 500);
      }
    },
    
    /**
     * Initialize AIDT (AI Decision Tree) integration for replay
     * @param {Object} replayService - Replay service instance
     */
    initializeAIDTIntegration(replayService) {
      // Initialize AI thought bubble component
      const thoughtBubble = initializeAIThoughtBubble();
      
      // Check if AIDT data is available in replay
      if (replayService.hasAIDTData && replayService.hasAIDTData()) {
        console.log('[ReplayOverlay] AIDT data detected, initializing AI decision replay');
        
        // Initialize AIDT replay service with snapshot data
        const aidtSnapshot = replayService.getAIDTSnapshot();
        if (aidtSnapshot && initializeAIDTReplay(aidtSnapshot)) {
          console.log('[ReplayOverlay] AIDT replay initialized successfully');
          
          // Add AIDT indicator to overlay
          this.addAIDTIndicator();
          
          // Wire AIDT-specific event handlers
          this.wireAIDTEventHandlers(replayService);
        }
      } else {
        console.log('[ReplayOverlay] No AIDT data available for this replay');
      }
    },
    
    /**
     * Add visual indicator that AIDT is available
     */
    addAIDTIndicator() {
      const replayTitle = overlay.querySelector('.replay-title .replay-text');
      if (replayTitle && !overlay.querySelector('.aidt-indicator')) {
        const aidtIndicator = document.createElement('span');
        aidtIndicator.className = 'aidt-indicator';
        aidtIndicator.innerHTML = '🤖 AI';
        aidtIndicator.title = 'AI Decision Tree visualization available';
        replayTitle.appendChild(aidtIndicator);
      }
    },
    
    /**
     * Wire AIDT-specific event handlers
     * @param {Object} replayService - Replay service instance
     */
    wireAIDTEventHandlers(replayService) {
      // Listen for game log entry processing
      const handleLogEntry = (event) => {
        if (isAIDTReplaying()) {
          const { entry, index } = event.detail;
          processGameLogEntry(entry, index);
        }
      };
      
      // Listen for AIDT events
      const handleAIDTProgress = (event) => {
        const { current, total } = event.detail;
        this.updateAIDTProgress(current, total);
      };
      
      const handleAIDTDecision = (event) => {
        const { decision } = event.detail;
        this.highlightAIDecision(decision);
      };
      
      // Add event listeners
      window.addEventListener('replay.logEntry', handleLogEntry);
      window.addEventListener('aidt.replay.progress', handleAIDTProgress);
      window.addEventListener('aidt.decision.display', handleAIDTDecision);
      
      // Store cleanup function for AIDT events
      const originalCleanup = this._cleanupEventListeners;
      this._cleanupEventListeners = () => {
        if (originalCleanup) originalCleanup();
        window.removeEventListener('replay.logEntry', handleLogEntry);
        window.removeEventListener('aidt.replay.progress', handleAIDTProgress);
        window.removeEventListener('aidt.decision.display', handleAIDTDecision);
        stopAIDTReplay();
      };
    },
    
    /**
     * Update AIDT progress display
     * @param {number} current - Current AIDT entry
     * @param {number} total - Total AIDT entries
     */
    updateAIDTProgress(current, total) {
      // Add AIDT progress indicator if not exists
      let aidtProgress = overlay.querySelector('.aidt-progress');
      if (!aidtProgress) {
        const progressContainer = overlay.querySelector('.replay-progress');
        if (progressContainer) {
          aidtProgress = document.createElement('div');
          aidtProgress.className = 'aidt-progress';
          aidtProgress.innerHTML = `
            <div class="aidt-progress-label">🤖 AI Decisions:</div>
            <div class="aidt-progress-info">
              <span class="aidt-current">0</span> of <span class="aidt-total">0</span>
            </div>
          `;
          progressContainer.appendChild(aidtProgress);
        }
      }
      
      // Update AIDT progress values
      const currentEl = aidtProgress?.querySelector('.aidt-current');
      const totalEl = aidtProgress?.querySelector('.aidt-total');
      if (currentEl) currentEl.textContent = current;
      if (totalEl) totalEl.textContent = total;
    },
    
    /**
     * Highlight AI decision in overlay
     * @param {Object} decision - AI decision data
     */
    highlightAIDecision(decision) {
      // Add visual feedback to indicate AI decision
      const aidtIndicator = overlay.querySelector('.aidt-indicator');
      if (aidtIndicator) {
        aidtIndicator.classList.add('active');
        setTimeout(() => {
          aidtIndicator.classList.remove('active');
        }, 2000);
      }
      
      // Update status to show AI decision
      if (decision && decision.playerName) {
        this.updateStatus(`🤖 AI Decision: ${decision.playerName} - ${decision.action || 'processing'}`);
      }
    },

    destroy() {
      // Clean up event listeners
      if (this._cleanupEventListeners) {
        this._cleanupEventListeners();
      }
      overlay.remove();
      document.body.classList.remove('replay-overlay-visible');
    }
  };
}

function getDiceSymbol(value) {
  const symbols = {
    1: '👊', // Attack
    2: '👊', // Attack
    3: '⚡', // Energy
    'energy': '⚡',
    'attack': '👊',
    'heal': '❤️',
    'vp': '🏆'
  };
  
  // Handle number faces (4,5,6 for VP)
  if (typeof value === 'number') {
    if (value <= 3) return symbols[value] || value;
    return '🏆'; // 4,5,6 are VP
  }
  
  return symbols[value] || value;
}