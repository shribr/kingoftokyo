/** replayStateOverlay.js
 * Visual overlay component that displays current game state during replay
 * Shows dice faces, player stats, Tokyo occupancy, and replay progress
 */

export function createReplayStateOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'replay-state-overlay';
  overlay.className = 'replay-state-overlay';
  overlay.innerHTML = `
    <div class="replay-overlay-header">
      <div class="replay-title">📼 REPLAY MODE</div>
      <div class="replay-progress">
        <span class="replay-entry-count">Entry <span data-current-entry>0</span> of <span data-total-entries>0</span></span>
        <div class="replay-progress-bar">
          <div class="replay-progress-fill" data-progress-fill></div>
        </div>
      </div>
      <div class="replay-status" data-replay-status>State Restored</div>
    </div>
    
    <div class="replay-state-panels">
      <div class="replay-panel dice-panel">
        <h4>🎲 Current Dice</h4>
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
        <h4>🏙️ Tokyo Status</h4>
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
      <button class="replay-btn" data-replay-action="pause">⏸️ Pause</button>
      <button class="replay-btn" data-replay-action="resume" disabled>▶️ Resume</button>
      <button class="replay-btn" data-replay-action="stop">⏹️ Stop</button>
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
      
      if (currentEl) currentEl.textContent = current;
      if (totalEl) totalEl.textContent = total;
      if (fillEl && total > 0) {
        const percent = (current / total) * 100;
        fillEl.style.width = `${percent}%`;
      }
    },
    
    updateStatus(status) {
      const statusEl = overlay.querySelector('[data-replay-status]');
      if (statusEl) statusEl.textContent = status;
    },
    
    updateDice(diceResults) {
      if (!diceResults || !Array.isArray(diceResults)) return;
      
      for (let i = 0; i < 6; i++) {
        const dieEl = overlay.querySelector(`[data-die="${i}"]`);
        if (dieEl) {
          if (i < diceResults.length && diceResults[i] !== null) {
            dieEl.textContent = getDiceSymbol(diceResults[i]);
            dieEl.className = 'replay-die active';
          } else {
            dieEl.textContent = '?';
            dieEl.className = 'replay-die inactive';
          }
        }
      }
    },
    
    updateTokyo(tokyoState) {
      const cityEl = overlay.querySelector('[data-tokyo-city-occupant]');
      const bayEl = overlay.querySelector('[data-tokyo-bay-occupant]');
      
      if (cityEl) {
        cityEl.textContent = tokyoState?.city || 'Empty';
        cityEl.className = tokyoState?.city ? 'slot-occupant occupied' : 'slot-occupant empty';
      }
      if (bayEl) {
        bayEl.textContent = tokyoState?.bay || 'Empty';
        bayEl.className = tokyoState?.bay ? 'slot-occupant occupied' : 'slot-occupant empty';
      }
    },
    
    updatePlayers(players) {
      const grid = overlay.querySelector('[data-players-grid]');
      if (!grid || !players) return;
      
      grid.innerHTML = players.map(player => `
        <div class="replay-player-card" data-player-id="${player.id}">
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
      };
    },
    
    highlightPlayerChange(playerId) {
      if (!playerId) return;
      const playerCard = overlay.querySelector(`[data-player-id="${playerId}"]`);
      if (playerCard) {
        playerCard.classList.add('state-changed');
        setTimeout(() => playerCard.classList.remove('state-changed'), 500);
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