// Main UI controller for King of Tokyo

// Initialize splash screen
document.addEventListener('DOMContentLoaded', function() {
    const splashScreen = document.getElementById('splash-screen');
    const gameContainer = document.getElementById('game-container');
    const enterBattleBtn = document.getElementById('enter-battle-btn');
    
    enterBattleBtn.addEventListener('click', function() {
        console.log('Splash screen subtitle clicked!');
        splashScreen.classList.add('fade-out');
        setTimeout(() => {
            splashScreen.style.display = 'none';
            gameContainer.classList.add('show');
            
            // Wait for required objects with timeout and fallback
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait
            
            const waitForGameAssets = () => {
                attempts++;
                console.log(`🔍 Checking for required game assets (attempt ${attempts}/${maxAttempts})...`);
                
                const monstersAvailable = typeof MONSTERS !== 'undefined';
                const cardsAvailable = typeof POWER_CARDS !== 'undefined'; // Fixed: should be POWER_CARDS not CARDS
                const gameAvailable = typeof KingOfTokyoGame !== 'undefined'; // Fixed: should be KingOfTokyoGame not Game
                
                console.log('🔍 Asset status:', {
                    MONSTERS: monstersAvailable,
                    POWER_CARDS: cardsAvailable,
                    KingOfTokyoGame: gameAvailable
                });
                
                // Check what globals are actually available
                const gameGlobals = Object.keys(window).filter(key => 
                    key === 'MONSTERS' || key === 'POWER_CARDS' || key === 'KingOfTokyoGame' || 
                    key.startsWith('King') || key.startsWith('Player') || key.startsWith('CARD')
                );
                console.log('🔍 Available game-related globals:', gameGlobals);
                
                if (monstersAvailable && cardsAvailable && gameAvailable) {
                    console.log('✅ All game assets loaded, initializing UI...');
                    window.gameUI = new KingOfTokyoUI();
                } else if (attempts >= maxAttempts) {
                    console.error('❌ Timeout waiting for game assets. Trying to initialize with available assets...');
                    console.error('❌ Missing:', {
                        MONSTERS: !monstersAvailable,
                        POWER_CARDS: !cardsAvailable,
                        KingOfTokyoGame: !gameAvailable
                    });
                    
                    // Try to initialize anyway - maybe only MONSTERS is needed for the monster selection
                    if (monstersAvailable) {
                        console.log('🔧 MONSTERS is available, attempting partial initialization...');
                        window.gameUI = new KingOfTokyoUI();
                    } else {
                        alert('Failed to load game assets. Please refresh the page.');
                    }
                } else {
                    console.log(`⏳ Waiting for game assets to load, retrying in 100ms... (${attempts}/${maxAttempts})`);
                    setTimeout(waitForGameAssets, 100);
                }
            };
            
            waitForGameAssets();
        }, 500);
    });
});

class KingOfTokyoUI {
    constructor() {
        // Verify critical objects are available (MONSTERS is essential for monster selection)
        if (typeof MONSTERS === 'undefined') {
            console.error('❌ MONSTERS not available during UI construction!');
            throw new Error('MONSTERS object is required but not available');
        }
        
        // Warn about missing objects but continue
        if (typeof POWER_CARDS === 'undefined') {
            console.warn('⚠️ POWER_CARDS object not available - power cards may not work');
        }
        if (typeof KingOfTokyoGame === 'undefined') {
            console.warn('⚠️ KingOfTokyoGame class not available - game functionality may be limited');
        }
        
        this.game = null;
        this.elements = {};
        this.selectedMonsters = [];
        this.currentPlayerCount = 4; // Default to 4 players
        this.tempSetupLog = []; // Store setup actions before game is created
        this.messageTimeout = null; // Track message timeout
        this.previousRound = 1; // Track previous round for animation
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeDarkMode();
        this.showSetupModal();
        
        // End turn button functionality now handled in dice controls
        // No need to add duplicate button
    }

    // Helper function to convert hex color to rgba
    hexToRgba(hex, alpha = 1) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
        }
        return `rgba(255, 152, 0, ${alpha})`; // fallback to orange
    }

    // Helper function to lighten a hex color
    lightenColor(hex, percent = 20) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            const r = Math.min(255, parseInt(result[1], 16) + Math.round(255 * percent / 100));
            const g = Math.min(255, parseInt(result[2], 16) + Math.round(255 * percent / 100));
            const b = Math.min(255, parseInt(result[3], 16) + Math.round(255 * percent / 100));
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }
        return hex; // fallback to original color
    }

    // Initialize DOM element references
    initializeElements() {
        console.log('initializeElements called');
        this.elements = {
            // Modals
            setupModal: document.getElementById('setup-modal'),
            gameOverModal: document.getElementById('game-over-modal'),
            decisionModal: document.getElementById('decision-modal'),
            
            // Decision modal elements
            decisionTitle: document.getElementById('decision-title'),
            decisionContext: document.getElementById('decision-context'),
            decisionMessage: document.getElementById('decision-message'),
            decisionMonster: document.getElementById('decision-monster'),
            decisionOption1: document.getElementById('decision-option-1'),
            decisionOption2: document.getElementById('decision-option-2'),
            
            // Setup elements
            playerCount: document.getElementById('player-count-dropdown'),
            dropdownSelected: document.getElementById('dropdown-selected'),
            dropdownOptions: document.getElementById('dropdown-options'),
            monsterGrid: document.getElementById('monster-grid'),
            startGameBtn: document.getElementById('start-game'),
            
            // Game elements
            roundCounter: document.getElementById('round-counter'),
            playersContainer: document.getElementById('players-container'),
            tokyoCitySlot: document.getElementById('tokyo-city-monster'),
            tokyoBaySlot: document.getElementById('tokyo-bay-monster'),
            
            // Dice elements
            diceContainer: document.getElementById('dice-container'),
            rollDiceBtn: document.getElementById('roll-dice'),
            keepDiceBtn: document.getElementById('keep-dice'),
            endTurnBtn: document.getElementById('end-turn'),
            // buyCardsBtn: document.getElementById('buy-cards'),
            rollsLeft: document.getElementById('rolls-left'),
            
            // Cards elements
            // currentEnergy: document.getElementById('current-energy'),
            availableCards: document.getElementById('available-cards'),
            
            // Game over elements
            winnerAnnouncement: document.getElementById('winner-announcement'),
            newGameBtn: document.getElementById('new-game'),
            
            // Toolbar elements
            gameLogBtn: document.getElementById('game-log-btn'),
            storageMgmtBtn: document.getElementById('storage-mgmt-btn'),
            saveGameToolbarBtn: document.getElementById('save-game-toolbar-btn'),
            settingsBtn: document.getElementById('settings-btn'),
            gameLogModal: document.getElementById('game-log-modal'),
            storageMgmtModal: document.getElementById('storage-mgmt-modal'),
            settingsModal: document.getElementById('settings-modal'),
            gameLogContent: document.getElementById('game-log-content'),
            clearLogBtn: document.getElementById('clear-log-btn'),
            saveGameBtn: document.getElementById('save-game-btn'),
            exportGameBtn: document.getElementById('export-game-btn'),
            clearStorageBtn: document.getElementById('clear-storage-btn'),
            storageStats: document.getElementById('storage-stats'),
            storageInfoBtn: document.getElementById('storage-info-btn'),
            storageAboutPanel: document.getElementById('storage-about-panel'),
            closeStorageAboutBtn: document.getElementById('close-storage-about'),
            closeGameLogBtn: document.getElementById('close-game-log'),
            closeStorageMgmtBtn: document.getElementById('close-storage-mgmt'),
            closeSettingsBtn: document.getElementById('close-settings'),
            darkModeToggle: document.getElementById('dark-mode-toggle')
        };
        
        // Debug: Check which elements are null
        const nullElements = [];
        for (const [key, element] of Object.entries(this.elements)) {
            if (!element) {
                nullElements.push(key);
            }
        }
        
        if (nullElements.length > 0) {
            console.warn('Null elements found:', nullElements);
        }
    }

    // Attach event listeners
    attachEventListeners() {
        // Use UIUtilities to validate required elements
        const requiredElements = [
            'dropdownSelected', 'playerCount', 'dropdownOptions', 'startGameBtn',
            'rollDiceBtn', 'keepDiceBtn', 'endTurnBtn'
        ];
        
        if (!UIUtilities.validateRequiredElements(this.elements, requiredElements)) {
            return; // Exit early if required elements are missing
        }
        
        // Setup modal events - Custom Dropdown
        this.elements.dropdownSelected.addEventListener('click', () => {
            this.toggleDropdown();
        });

        // Handle clicking outside dropdown to close it
        document.addEventListener('click', (e) => {
            if (!this.elements.playerCount.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Handle dropdown option selection
        this.elements.dropdownOptions.addEventListener('click', (e) => {
            if (e.target.classList.contains('dropdown-option')) {
                const value = parseInt(e.target.dataset.value);
                this.selectPlayerCount(value, e.target.textContent);
            }
        });

        this.elements.startGameBtn.addEventListener('click', async (e) => {
            console.log('Start game button clicked');
            console.log('Button disabled:', this.elements.startGameBtn.disabled);
            console.log('Selected monsters:', this.selectedMonsters.length);
            console.log('Required players:', this.currentPlayerCount);
            
            // Don't prevent default if button is disabled
            if (this.elements.startGameBtn.disabled) {
                console.log('Button is disabled, not starting game');
                return;
            }
            
            e.preventDefault();
            
            // Disable button during game initialization
            this.elements.startGameBtn.disabled = true;
            this.elements.startGameBtn.textContent = 'Starting Game...';
            
            try {
                await this.startGame();
            } catch (error) {
                console.error('Failed to start game:', error);
                alert('Failed to start game: ' + error.message);
            } finally {
                // Re-enable button if still on setup screen
                if (this.elements.startGameBtn) {
                    this.elements.startGameBtn.disabled = false;
                    this.elements.startGameBtn.textContent = 'Start Game';
                }
            }
        });

        // Game control events
        this.elements.rollDiceBtn.addEventListener('click', () => {
            this.rollDice();
        });

        this.elements.keepDiceBtn.addEventListener('click', () => {
            this.keepDiceAndEndRolling();
        });

        this.elements.endTurnBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (this.elements.endTurnBtn.disabled) {
                console.log('End turn button clicked but is disabled');
                console.log('🐛 FORCED DEBUG: Checking if we can force turn end...');
                
                // Debug check for stuck turns
                const gameState = this.game.getGameState();
                const diceState = this.game.diceRoller.getState();
                
                if (gameState.turnPhase === 'rolling' && diceState.rollsRemaining === 0) {
                    console.log('🐛 FORCED: Turn seems stuck - dice finished but phase not changed to resolving');
                    console.log('🐛 FORCED: Attempting to force dice resolution...');
                    
                    // Force dice resolution if stuck
                    try {
                        this.game.currentTurnPhase = 'resolving';
                        const results = this.game.diceCollection.getResults();
                        this.game.resolveDiceEffects(results);
                        this.game.triggerEvent('turnPhaseChanged', { phase: 'resolving' });
                        console.log('🐛 FORCED: Dice resolution forced, try end turn again');
                        this.updateDiceControls();
                        return;
                    } catch (error) {
                        console.error('🐛 FORCED: Error forcing dice resolution:', error);
                    }
                }
                return;
            }
            
            console.log('End turn button clicked - calling endTurn()');
            this.endTurn();
        });

        // this.elements.buyCardsBtn.addEventListener('click', () => {
        //     this.showCardBuyingInterface();
        // });

                // Game over modal events
        this.elements.newGameBtn.addEventListener('click', () => {
            UIUtilities.hideModal(this.elements.gameOverModal);
            this.showSetupModal();
        });

        // Decision modal keyboard support
        document.addEventListener('keydown', (e) => {
            if (!this.elements.decisionModal.classList.contains('hidden')) {
                if (e.key === 'Escape') {
                    // Default to "Leave Tokyo" on escape (safer choice)
                    this.elements.decisionOption2.click();
                } else if (e.key === 'Enter' || e.key === ' ') {
                    // Default to "Stay in Tokyo" on enter/space (aggressive choice)
                    e.preventDefault();
                    this.elements.decisionOption1.click();
                }
            }
        });

        // Card purchase events (will be attached dynamically)
        
        // Toolbar events
        this.elements.gameLogBtn.addEventListener('click', async () => {
            await this.showGameLog();
        });

        this.elements.storageMgmtBtn.addEventListener('click', async () => {
            await this.showStorageManagement();
        });

        this.elements.saveGameToolbarBtn.addEventListener('click', async () => {
            await this.saveGameManually();
        });

        this.elements.settingsBtn.addEventListener('click', () => {
            this.showSettings();
        });

        this.elements.closeGameLogBtn.addEventListener('click', () => {
            UIUtilities.hideModal(this.elements.gameLogModal);
        });

        this.elements.closeStorageMgmtBtn.addEventListener('click', () => {
            UIUtilities.hideModal(this.elements.storageMgmtModal);
            // Also hide the about panel when closing the main modal
            if (this.elements.storageAboutPanel) {
                this.elements.storageAboutPanel.classList.remove('visible');
                this.elements.storageAboutPanel.classList.add('hidden');
            }
        });

        // Storage info button event listener using UIUtilities
        UIUtilities.safeAddEventListener(this.elements.storageInfoBtn, 'click', 
            () => this.toggleStorageAboutPanel(), 'Storage info button not found');

        // Close storage about panel button using UIUtilities
        UIUtilities.safeAddEventListener(this.elements.closeStorageAboutBtn, 'click', 
            () => this.hideStorageAboutPanel(), 'Close storage about button not found');

        // Settings modal close button using UIUtilities
        UIUtilities.safeAddEventListener(this.elements.closeSettingsBtn, 'click', 
            () => UIUtilities.hideModal(this.elements.settingsModal), 
            'Close settings button not found');

        this.elements.clearLogBtn.addEventListener('click', () => {
            this.clearGameLog();
        });

        // Storage management controls
        if (this.elements.saveGameBtn) {
            this.elements.saveGameBtn.addEventListener('click', async () => {
                await this.saveGameManually();
            });
        }

        if (this.elements.exportGameBtn) {
            this.elements.exportGameBtn.addEventListener('click', async () => {
                await this.exportGameData();
            });
        }

        if (this.elements.clearStorageBtn) {
            this.elements.clearStorageBtn.addEventListener('click', async () => {
                await this.clearAllStorage();
            });
        }

        // Dark mode toggle using UIUtilities
        UIUtilities.safeAddEventListener(this.elements.darkModeToggle, 'change', 
            () => this.toggleDarkMode(), 'Dark mode toggle not found');

        // Close modals when clicking outside using UIUtilities
        UIUtilities.safeAddEventListener(this.elements.gameLogModal, 'click', 
            UIUtilities.createModalClickOutsideHandler(this.elements.gameLogModal));

        UIUtilities.safeAddEventListener(this.elements.storageMgmtModal, 'click', 
            UIUtilities.createModalClickOutsideHandler(this.elements.storageMgmtModal));

        UIUtilities.safeAddEventListener(this.elements.settingsModal, 'click', 
            UIUtilities.createModalClickOutsideHandler(this.elements.settingsModal));
    }

    // Show setup modal
    showSetupModal() {
        // Hide the game toolbar during setup
        const gameToolbar = document.getElementById('game-toolbar');
        if (gameToolbar) {
            gameToolbar.classList.remove('show');
        }
        
        UIUtilities.showModal(this.elements.setupModal);
        // Set default dropdown text to 4 players AND set the internal value
        this.currentPlayerCount = 4;
        this.elements.dropdownSelected.querySelector('.dropdown-text').textContent = '4 Players';
        
        // Update monster selection
        this.updateMonsterSelection();
        
        // Ensure monsters are visible after a short delay
        setTimeout(() => {
            const monsterOptions = this.elements.monsterGrid.querySelectorAll('.monster-option');
            monsterOptions.forEach(option => {
                // Force visibility with important styles
                option.style.setProperty('display', 'flex', 'important');
                option.style.setProperty('visibility', 'visible', 'important');
                option.style.setProperty('opacity', '1', 'important');
                option.style.setProperty('pointer-events', 'auto', 'important');
            });
        }, 100);
    }
    
    // Hide setup modal
    hideSetupModal() {
        UIUtilities.hideModal(this.elements.setupModal);
    }

    // Custom dropdown methods
    toggleDropdown() {
        this.elements.playerCount.classList.toggle('open');
    }

    closeDropdown() {
        this.elements.playerCount.classList.remove('open');
    }

    selectPlayerCount(value, text) {
        this.currentPlayerCount = value;
        this.elements.dropdownSelected.querySelector('.dropdown-text').textContent = text;
        this.closeDropdown();
        
        console.log('🎯 Player count selected:', value, 'Updating monster selection...');
        
        // Log player count selection if we have a game instance
        if (this.game) {
            this.game.logSetupAction(`👥 Changed to ${value} players`, 'player-count-change', 'player-selection');
        }
        
        // Since UI is only initialized after MONSTERS is available, we can call directly
        if (typeof MONSTERS === 'undefined') {
            console.error('❌ MONSTERS object missing during player count change! This should not happen.');
            console.error('❌ Available globals:', Object.keys(window).filter(k => k.toUpperCase() === k));
            
            // Fallback: Try to reinitialize from window
            if (window.MONSTERS) {
                console.log('🔧 Found MONSTERS on window, setting global...');
                window.MONSTERS = window.MONSTERS;
            }
            
            // Still try to update
            setTimeout(() => this.updateMonsterSelection(), 100);
        } else {
            console.log('✅ MONSTERS object available, updating immediately');
            this.updateMonsterSelection();
        }
    }

    // Update monster selection grid
    updateMonsterSelection() {
        console.log('👺 === UPDATE MONSTER SELECTION CALLED ===');
        console.log('👺 Current player count:', this.currentPlayerCount);
        console.log('👺 MONSTERS available:', typeof MONSTERS !== 'undefined');
        console.log('👺 Monster grid element:', !!this.elements.monsterGrid);
        
        // Debug: Check if MONSTERS is available
        if (typeof MONSTERS === 'undefined') {
            console.error('❌ MONSTERS object is not defined! Check if monsters.js is loaded.');
            console.error('❌ Available global objects:', Object.keys(window));
            return;
        }
        
        const monsters = Object.values(MONSTERS);
        console.log('👺 Available monsters:', monsters.length, monsters);
        console.log('👺 Monster details:', monsters.map(m => ({ id: m.id, name: m.name, image: m.image })));
        
        // Debug: Check if monster grid element exists
        if (!this.elements.monsterGrid) {
            console.error('❌ Monster grid element is null! Check if DOM is ready.');
            console.error('❌ Available elements:', Object.keys(this.elements));
            return;
        }
        
        console.log('👺 Monster grid element found:', this.elements.monsterGrid);
        
        this.selectedMonsters = [];

        const monstersHTML = monsters.map(monster => `
            <div class="monster-option" data-monster-id="${monster.id}">
                <div class="monster-image-container">
                    <img src="${monster.image}" alt="${monster.name}" class="monster-image" />
                </div>
                <div class="monster-name">${monster.name}</div>
            </div>
        `).join('');
        
        console.log('Generated monsters HTML length:', monstersHTML.length);
        console.log('First 300 chars of HTML:', monstersHTML.substring(0, 300));
        
        this.elements.monsterGrid.innerHTML = monstersHTML;

        console.log('Monster grid HTML set, innerHTML length:', this.elements.monsterGrid.innerHTML.length);
        console.log('Monster grid children count:', this.elements.monsterGrid.children.length);

        // ALWAYS enable monster options regardless of player count at this stage
        const monsterOptions = this.elements.monsterGrid.querySelectorAll('.monster-option');
        console.log('Found monster options:', monsterOptions.length);
        
        monsterOptions.forEach((option, index) => {
            console.log(`Setting up monster option ${index}:`, option.dataset.monsterId);
            
            // Alternate between left and right lean patterns
            // Use modulo to cycle through all 6 rotation classes
            const rotationClass = `rotate-${(index % 6) + 1}`;
            option.classList.add(rotationClass);
            
            option.addEventListener('click', () => {
                this.toggleMonsterSelection(option);
            });
            // Always make them visible
            option.style.pointerEvents = 'auto';
            option.style.opacity = '1';
            option.style.display = 'flex';
            option.style.visibility = 'visible';
        });

        console.log('👺 Monster options enabled, count:', monsterOptions.length);

        // Force absolute visibility with CSS override
        setTimeout(() => {
            console.log('👺 Applying emergency CSS visibility fixes...');
            monsterOptions.forEach((option, index) => {
                // Apply multiple visibility overrides
                option.style.cssText = `
                    display: flex !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    pointer-events: auto !important;
                    position: relative !important;
                    width: auto !important;
                    height: auto !important;
                `;
                console.log(`👺 Emergency CSS applied to monster ${index}:`, option.dataset.monsterId);
            });
            
            // Also check grid visibility
            this.elements.monsterGrid.style.cssText = `
                display: grid !important;
                visibility: visible !important;
                opacity: 1 !important;
            `;
            console.log('👺 Emergency CSS applied to monster grid');
        }, 200);

        // Auto-select all monsters if 6 players is chosen
        if (this.currentPlayerCount === 6) {
            this.selectedMonsters = [...monsters]; // Select all monsters
            monsterOptions.forEach(option => {
                option.classList.add('selected');
            });
            console.log('Auto-selected all 6 monsters for 6-player game');
        }

        this.updateStartButton();
    }

    // Toggle monster selection
    toggleMonsterSelection(optionElement) {
        const monsterId = optionElement.dataset.monsterId;
        const monster = MONSTERS[monsterId];

        console.log('Toggle monster selection:', monsterId, monster);

        if (optionElement.classList.contains('selected')) {
            // Deselect
            optionElement.classList.remove('selected');
            this.selectedMonsters = this.selectedMonsters.filter(m => m.id !== monsterId);
            console.log('Deselected monster, now have:', this.selectedMonsters.length);
            
            // Log deselection if we have a game instance
            if (this.game) {
                this.game.logSetupAction(`❌ Deselected ${monster.name}`, 'monster-deselection', 'monster-selection');
            }
        } else if (this.selectedMonsters.length < this.currentPlayerCount) {
            // Select
            optionElement.classList.add('selected');
            this.selectedMonsters.push(monster);
            console.log('Selected monster, now have:', this.selectedMonsters.length);
            
            // Don't log individual selections here - they'll be logged during game start in proper order
            // if (this.game) {
            //     const playerNumber = this.selectedMonsters.length;
            //     this.game.logSetupAction(`✅ Player ${playerNumber} selected ${monster.name}`, 'monster-selection', 'monster-selection');
            // }
        } else {
            console.log('Cannot select more monsters, already at limit');
        }

        // Update other options
        this.elements.monsterGrid.querySelectorAll('.monster-option').forEach(opt => {
            if (this.selectedMonsters.length >= this.currentPlayerCount && !opt.classList.contains('selected')) {
                opt.classList.add('taken');
            } else {
                opt.classList.remove('taken');
            }
        });

        this.updateStartButton();
    }

    // Update start button state
    updateStartButton() {
        const hasPlayerCount = this.currentPlayerCount > 0;
        const canStart = hasPlayerCount && this.selectedMonsters.length === this.currentPlayerCount;
        console.log('Update start button - canStart:', canStart, 'selected:', this.selectedMonsters.length, 'required:', this.currentPlayerCount);
        
        this.elements.startGameBtn.disabled = !canStart;
        
        if (!hasPlayerCount) {
            this.elements.startGameBtn.textContent = 'Select Number of Players';
            console.log('Button disabled with text: Select Number of Players');
        } else if (canStart) {
            this.elements.startGameBtn.textContent = 'Start Game';
            console.log('Button enabled with text: Start Game');
        } else {
            this.elements.startGameBtn.textContent = `Select ${this.currentPlayerCount - this.selectedMonsters.length} more monsters`;
            console.log('Button disabled with text:', this.elements.startGameBtn.textContent);
        }
    }

    // Start the game
    async startGame() {
        console.log('startGame called');
        console.log('Selected monsters count:', this.selectedMonsters.length);
        console.log('Current player count:', this.currentPlayerCount);
        
        if (this.selectedMonsters.length !== this.currentPlayerCount) {
            console.log('Not enough monsters selected, returning early');
            alert(`Please select exactly ${this.currentPlayerCount} monsters to start the game. Currently selected: ${this.selectedMonsters.length}`);
            return;
        }

        console.log('Creating new game...');
        try {
            // Initialize storage system
            console.log('🔧 Initializing game storage system...');
            const storageManager = new GameStorageManager();
            await storageManager.initialize();
            console.log('✅ Storage system initialized');

            // Create new game with storage
            console.log('About to create KingOfTokyoGame instance');
            this.game = new KingOfTokyoGame(storageManager);
            console.log('Game instance created successfully:', !!this.game);
            
            // Set up event callback
            this.game.setEventCallback((eventType, data) => {
                this.handleGameEvent(eventType, data);
            });

            // Log setup actions in proper sequence using storage-enabled logging
            // 1. Log player selection with monster details as a main entry
            const monsterNames = this.selectedMonsters.map(monster => monster.name).join(', ');
            await this.game.logSetupActionWithStorage(`👥 ${this.currentPlayerCount} players selected`, 'setup');
            
            // 1a. Log individual monster selections as follow-up entries
            for (let i = 0; i < this.selectedMonsters.length; i++) {
                const monster = this.selectedMonsters[i];
                await this.game.logSetupActionWithStorage(`    ├─ Player ${i + 1}: ${monster.name}`, 'monster-selection');
            }
            
            // 2. Log game start
            await this.game.logSetupActionWithStorage('🎯 Starting new King of Tokyo game!', 'game-start');
            
            // 3. Log who goes first
            await this.game.logSetupActionWithStorage(`🎲 ${this.selectedMonsters[0].name} goes first!`, 'ready-to-start');

            // Initialize game (this will also save initial game state)
            console.log('About to initialize game with monsters:', this.selectedMonsters);
            const result = await this.game.initializeGame(this.selectedMonsters, this.currentPlayerCount);
            console.log('Game initialization result:', result);
            
            if (result.success) {
                this.hideSetupModal();
                
                // Show the game toolbar now that the game has started
                const gameToolbar = document.getElementById('game-toolbar');
                if (gameToolbar) {
                    gameToolbar.classList.add('show');
                }
                
                // Add player count class to game board for CSS styling
                const gameBoard = document.querySelector('.game-board');
                if (gameBoard) {
                    gameBoard.className = 'game-board'; // Reset classes
                    if (this.currentPlayerCount === 5) {
                        gameBoard.classList.add('five-players');
                    } else if (this.currentPlayerCount === 6) {
                        gameBoard.classList.add('six-players');
                    }
                }
                
                this.updateGameDisplay();
                this.showMessage(`Game started! ${result.currentPlayer.monster.name} goes first!`);
                
                // Log storage statistics
                const stats = await this.game.getStorageStats();
                if (stats) {
                    console.log('📊 Storage Statistics:', stats);
                }
                
                console.log('Game started successfully!');
            } else {
                console.error('Game initialization failed:', result);
                alert('Failed to initialize game: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error starting game:', error);
            alert('Error starting game: ' + error.message);
        }
    }

    // Handle game events
    handleGameEvent(eventType, data) {
        switch (eventType) {
            case 'diceUpdated':
                this.updateDiceDisplay(data);
                this.updateDiceControls(); // Also update dice controls when dice are updated
                break;
            case 'diceRollComplete':
                this.handleDiceRollComplete(data);
                break;
            case 'turnPhaseChanged':
                this.updateTurnPhase(data);
                break;
            case 'statsUpdated':
                console.log('Stats updated event received');
                this.updateGameDisplay(); // Refresh entire game display when stats change
                break;
            case 'cardPurchased':
                console.log('Card purchased event received:', data);
                this.updateGameDisplay(); // Refresh to show new card and updated energy
                this.updateCardsDisplay(); // Refresh available cards
                break;
            case 'pendingDecision':
                this.showDecisionModal(data);
                break;
            case 'turnEnded':
                this.updateGameDisplay();
                break;
            case 'gameEnded':
                this.showGameOverModal(data);
                break;
            case 'playerEntersTokyo':
                this.animatePlayerToTokyo(data);
                break;
            case 'playerLeavesTokyo':
                this.animatePlayerFromTokyo(data);
                break;
            case 'tokyoChanged':
                this.updateTokyoDisplay(data);
                break;
            case 'playerAttacked':
                this.animatePlayerAttacked(data.playerId);
                break;
            case 'playerHealed':
                this.animatePlayerHealing(data.playerId, data.healAmount);
                break;
            case 'playerGainedPoints':
                this.animateVictoryPoints(data.playerId, data.pointsGained);
                break;
            case 'turnStarted':
                this.updateGameDisplay(); // Update UI to show new current player
                break;
            case 'logUpdated':
                this.updateGameLogDisplay(); // Update game log when new entries are added
                break;
        }
    }

    // Animate round indicator when round changes
    animateRoundChange(newRound) {
        const roundIndicator = document.getElementById('round-indicator');
        
        // Add spinning class to start animation
        roundIndicator.classList.add('spinning');
        
        // After animation completes, update the number and remove class
        setTimeout(() => {
            this.elements.roundCounter.textContent = newRound;
            roundIndicator.classList.remove('spinning');
        }, 750); // Update number halfway through the 1.5s animation
    }

    // Update complete game display
    updateGameDisplay() {
        console.log('updateGameDisplay called, game exists:', !!this.game);
        if (!this.game) {
            console.log('No game instance in updateGameDisplay, returning');
            return;
        }

        const gameState = this.game.getGameState();
        
        // Check if round has changed and animate if so
        if (gameState.round > this.previousRound) {
            this.animateRoundChange(gameState.round);
            this.previousRound = gameState.round;
        } else {
            // Normal update without animation
            this.elements.roundCounter.textContent = gameState.round;
        }
        
        // Update players
        this.updatePlayersDisplay(gameState.players);
        
        // Update Tokyo
        this.updateTokyoDisplay(gameState);
        
        // Update dice controls
        this.updateDiceControls();
        
        // Only update dice display if dice are in initial state or explicitly requested
        // Don't overwrite rolled dice with empty dice
        const diceData = this.game.diceCollection.getAllDiceData();
        const allDiceEmpty = diceData.every(d => d.face === null);
        const currentTurnPhase = this.game.currentTurnPhase;
        
        console.log(`🎲 Dice update check - Turn phase: ${currentTurnPhase}, All dice empty: ${allDiceEmpty}`);
        
        // Only update dice display if:
        // 1. All dice are empty (initial state), OR
        // 2. We're in rolling phase (beginning of turn)
        if (allDiceEmpty || currentTurnPhase === 'rolling') {
            console.log(`🎲 Updating dice display`);
            this.updateInitialDiceDisplay();
        } else {
            console.log(`🎲 Skipping dice display update - dice have been rolled`);
        }
        
        // Update cards
        this.updateCardsDisplay();
        
        // Update current player energy
        // this.elements.currentEnergy.textContent = gameState.currentPlayer.energy;
    }

    // Update players display - separate active player from stack
    updatePlayersDisplay(players) {
        const currentPlayer = this.game.getCurrentPlayer();
        
        // Separate active and non-active players
        const nonActivePlayers = players.filter(player => player.id !== currentPlayer.id);
        const activePlayer = players.find(player => player.id === currentPlayer.id);
        
        // Render non-active players in the regular container
        this.elements.playersContainer.innerHTML = nonActivePlayers.map(player => `
            <div class="player-dashboard ${player.isEliminated ? 'eliminated' : ''}" 
                 data-player-id="${player.id}" data-monster="${player.monster.id}">
                <div class="player-info">
                    <div class="player-name-container">
                        <div class="player-name">${player.monster.name}</div>
                        ${player.isInTokyo ? `<div class="tokyo-indicator-inline">In Tokyo ${player.tokyoLocation === 'city' ? 'City' : 'Bay'}</div>` : ''}
                    </div>
                    <div class="monster-avatar" data-monster="${player.monster.id}">
                        <img src="${player.monster.image}" alt="${player.monster.name}" class="monster-avatar-image" />
                    </div>
                </div>
                <div class="player-stats">
                    <div class="stat power-cards" data-player-id="${player.id}">
                        <span class="stat-label">Cards</span>
                        <span class="stat-value">${player.powerCards.length}</span>
                    </div>
                    <div class="stat energy">
                        <span class="stat-label">Energy</span>
                        <span class="stat-value">${player.energy}</span>
                    </div>
                    <div class="stat points">
                        <span class="stat-label">Points</span>
                        <span class="stat-value">${player.victoryPoints}</span>
                    </div>
                </div>
                <div class="health-bar-container">
                    <div class="health-bar-label">Health ${player.health}/${player.maxHealth}</div>
                    <div class="health-bar">
                        <div class="health-bar-fill ${this.getHealthBarClass(player.health, player.maxHealth)}" style="width: ${(player.health / player.maxHealth) * 100}%"></div>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Create or update active player container
        let activePlayerContainer = document.getElementById('active-player-container');
        if (!activePlayerContainer) {
            activePlayerContainer = document.createElement('div');
            activePlayerContainer.id = 'active-player-container';
            activePlayerContainer.className = 'active-player-container';
            document.body.appendChild(activePlayerContainer); // Append directly to body for proper positioning
        }
        
        // Render active player in separate container
        if (activePlayer) {
            activePlayerContainer.innerHTML = `
                <div class="player-dashboard active" 
                     data-player-id="${activePlayer.id}" data-monster="${activePlayer.monster.id}">
                    <div class="player-info">
                        <div class="player-name-container">
                            <div class="player-name">${activePlayer.monster.name}</div>
                            ${activePlayer.isInTokyo ? `<div class="tokyo-indicator-inline">In Tokyo ${activePlayer.tokyoLocation === 'city' ? 'City' : 'Bay'}</div>` : ''}
                        </div>
                        <div class="monster-avatar" data-monster="${activePlayer.monster.id}">
                            <img src="${activePlayer.monster.image}" alt="${activePlayer.monster.name}" class="monster-avatar-image" />
                        </div>
                    </div>
                    <div class="player-stats">
                        <div class="stat power-cards" data-player-id="${activePlayer.id}">
                            <span class="stat-label">Cards</span>
                            <span class="stat-value">${activePlayer.powerCards.length}</span>
                        </div>
                        <div class="stat energy">
                            <span class="stat-label">Energy</span>
                            <span class="stat-value">${activePlayer.energy}</span>
                        </div>
                        <div class="stat points">
                            <span class="stat-label">Points</span>
                            <span class="stat-value">${activePlayer.victoryPoints}</span>
                        </div>
                    </div>
                    <div class="health-bar-container">
                        <div class="health-bar-label">Health ${activePlayer.health}/${activePlayer.maxHealth}</div>
                        <div class="health-bar">
                            <div class="health-bar-fill ${this.getHealthBarClass(activePlayer.health, activePlayer.maxHealth)}" style="width: ${(activePlayer.health / activePlayer.maxHealth) * 100}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Re-attach event listeners for power card stats (both regular and active player)
        this.attachPowerCardTabListeners();

        // Set CSS custom properties for monster-specific colors
        players.forEach(player => {
            const playerElement = document.querySelector(`[data-player-id="${player.id}"]`);
            if (playerElement && player.monster.color) {
                const monsterColor = player.monster.color;
                const lighterColor = this.lightenColor(monsterColor, 20);
                const glowColor = this.hexToRgba(monsterColor, 0.4);
                const strongGlowColor = this.hexToRgba(monsterColor, 0.7);
                
                playerElement.style.setProperty('--monster-color', monsterColor);
                playerElement.style.setProperty('--monster-color-light', lighterColor);
                playerElement.style.setProperty('--monster-glow-color', glowColor);
                playerElement.style.setProperty('--monster-glow-strong', strongGlowColor);
            }
        });

        // Add click listeners for power card tabs
        this.attachPowerCardTabListeners();
    }

    // Attach click listeners to power card stat tiles
    attachPowerCardTabListeners() {
        // Add click listeners for power cards stat tiles
        const powerCardStats = document.querySelectorAll('.stat.power-cards');
        powerCardStats.forEach(stat => {
            stat.addEventListener('click', (e) => {
                e.stopPropagation();
                const playerId = stat.dataset.playerId;
                this.showPlayerPowerCardsModal(playerId);
            });
        });
    }

    // Show all power cards for a player in a modal
    showPlayerPowerCardsModal(playerId) {
        if (!this.game) return;

        const player = this.game.players.find(p => p.id === playerId);
        if (!player) return;

        // Handle empty power cards case
        if (player.powerCards.length === 0) {
            // Create modal HTML for empty power cards using proper structure
            const modalHtml = `
                <div class="power-cards-collection-modal" id="power-cards-modal">
                    <div class="power-cards-modal-content">
                        <div class="power-cards-modal-header">
                            <div>
                                <h2 class="power-cards-modal-title">${player.monster.name}'s Power Cards</h2>
                                <div class="power-cards-subtitle">No active power cards</div>
                            </div>
                            <button class="power-cards-close-btn">&times;</button>
                        </div>
                        <div class="power-cards-grid">
                            <div class="no-active-power-cards">No active power cards</div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = document.querySelector('.power-cards-collection-modal');
            const closeBtn = modal.querySelector('.power-cards-close-btn');
            
            closeBtn.addEventListener('click', () => this.closePowerCardsModal());
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closePowerCardsModal();
            });
            
            return;
        }

        // Create modal HTML with all power cards using the new CSS classes
        const cardsHtml = player.powerCards.map(card => `
            <div class="power-card-item" data-card-id="${card.id}" data-player-id="${playerId}">
                <div class="power-card-cost">⚡${card.cost}</div>
                <div class="power-card-name">${card.name}</div>
                <div class="power-card-effect">${card.description}</div>
            </div>
        `).join('');

        const modalHtml = `
            <div class="power-cards-collection-modal" id="power-cards-modal">
                <div class="power-cards-modal-content">
                    <div class="power-cards-modal-header">
                        <div>
                            <h2 class="power-cards-modal-title">${player.monster.name}'s Power Cards</h2>
                            <div class="power-cards-subtitle">Click any card to view details</div>
                        </div>
                        <button class="power-cards-close-btn">&times;</button>
                    </div>
                    ${player.powerCards.length > 0 ? `
                        <div class="power-cards-grid">
                            ${cardsHtml}
                        </div>
                    ` : `
                        <div class="no-power-cards">
                            No Power Cards Owned
                        </div>
                    `}
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Add close listeners
        const modal = document.getElementById('power-cards-modal');
        const closeBtn = modal.querySelector('.power-cards-close-btn');
        
        closeBtn.addEventListener('click', () => this.closePowerCardsModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closePowerCardsModal();
            }
        });

        // Add click listeners to individual cards for detailed view
        const cardItems = modal.querySelectorAll('.power-card-item');
        cardItems.forEach(cardItem => {
            cardItem.addEventListener('click', (e) => {
                e.stopPropagation();
                const cardId = cardItem.dataset.cardId;
                const playerIdFromCard = cardItem.dataset.playerId;
                this.showPowerCardDetailModal(cardId, playerIdFromCard);
            });
        });

        // Close on Escape key
        const closeOnEscape = (e) => {
            if (e.key === 'Escape') {
                this.closePowerCardsModal();
                document.removeEventListener('keydown', closeOnEscape);
            }
        };
        document.addEventListener('keydown', closeOnEscape);
    }

    // Close power cards collection modal
    closePowerCardsModal() {
        const modal = document.getElementById('power-cards-modal');
        if (modal) {
            modal.remove();
        }
    }

    // Show detailed power card information in a separate modal
    showPowerCardDetailModal(cardId, playerId) {
        if (!this.game) return;

        // Close any existing modal first
        this.closePowerCardDetailModal();

        const player = this.game.players.find(p => p.id === playerId);
        if (!player) return;

        const card = player.powerCards.find(c => c.id === cardId);
        if (!card) return;

        // Create detailed card modal HTML
        const modalHtml = `
            <div class="power-card-detail-modal" id="power-card-detail-modal">
                <div class="power-card-detail-content">
                    <div class="power-card-detail-header">
                        <h2 class="power-card-detail-title">${card.name}</h2>
                        <button class="power-cards-close-btn">&times;</button>
                    </div>
                    <div class="power-card-detail-body">
                        <div class="power-card-detail-cost">Energy Cost: ⚡${card.cost}</div>
                        <div class="power-card-detail-type">Type: ${card.type.toUpperCase()}</div>
                        <div class="power-card-detail-description">${card.description}</div>
                        <div class="power-card-detail-owner">Owned by: ${player.monster.name}</div>
                    </div>
                    <div class="power-card-detail-footer">
                        <button class="back-to-wallet-btn">← Back to Power Cards</button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page and set up event handling using UIUtilities
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('power-card-detail-modal');
        
        if (modal) {
            // Use UIUtilities for cleaner event handling
            const closeBtn = modal.querySelector('.power-cards-close-btn');
            const backBtn = modal.querySelector('.back-to-wallet-btn');
            
            UIUtilities.safeAddEventListener(closeBtn, 'click', 
                UIUtilities.createSafeEventHandler(() => this.closePowerCardDetailModal()));
            
            UIUtilities.safeAddEventListener(backBtn, 'click', 
                UIUtilities.createSafeEventHandler(() => this.closePowerCardDetailModal()));
            
            UIUtilities.safeAddEventListener(modal, 'click', 
                UIUtilities.createModalClickOutsideHandler(modal));

            // Close on Escape key
            const closeOnEscape = (e) => {
                if (e.key === 'Escape') {
                    this.closePowerCardDetailModal();
                    document.removeEventListener('keydown', closeOnEscape);
                }
            };
            document.addEventListener('keydown', closeOnEscape);
        }
    }

    // Close power card detail modal
    closePowerCardDetailModal() {
        const modal = document.getElementById('power-card-detail-modal');
        if (modal) {
            modal.remove();
        }
    }

    // Show power card details in a modal
    showPowerCardModal(cardId, playerId) {
        if (!this.game) return;

        const player = this.game.players.find(p => p.id === playerId);
        if (!player) return;

        const card = player.powerCards.find(c => c.id === cardId);
        if (!card) return;

        // Create modal HTML
        const modalHtml = `
            <div class="power-card-modal-overlay" id="power-card-modal">
                <div class="power-card-modal">
                    <div class="power-card-display" data-effect="${card.effect}">
                        <button class="modal-close-btn">&times;</button>
                        <div class="card-cost">⚡${card.cost}</div>
                        <div class="card-name">${card.name}</div>
                        <div class="card-type">${card.type.toUpperCase()}</div>
                        <div class="card-description">${card.description}</div>
                        <div class="card-owner">Owned by: ${player.monster.name}</div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page and use UIUtilities for event handling
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('power-card-modal');
        const closeBtn = modal.querySelector('.modal-close-btn');
        
        UIUtilities.safeAddEventListener(closeBtn, 'click', () => this.closePowerCardModal());
        UIUtilities.safeAddEventListener(modal, 'click', UIUtilities.createModalClickOutsideHandler(modal));

        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closePowerCardModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    // Close power card modal
    closePowerCardModal() {
        const modal = document.getElementById('power-card-modal');
        if (modal) {
            modal.remove();
        }
    }

    // Animate player entering Tokyo
    animatePlayerToTokyo(data) {
        console.log('Animating player to Tokyo:', data);
        
        // Find the player card in the player area
        const playerCard = document.querySelector(`[data-player-id="${data.playerId}"]`);
        const tokyoSlot = data.location === 'city' 
            ? document.getElementById('tokyo-city-monster')
            : document.getElementById('tokyo-bay-monster');
        
        if (!playerCard || !tokyoSlot) {
            console.error('Could not find player card or Tokyo slot for animation');
            this.updateTokyoDisplay(this.game.getGameState());
            return;
        }
        
        // Create a clone of the monster avatar for animation
        const monsterAvatar = playerCard.querySelector('.monster-avatar');
        if (!monsterAvatar) {
            this.updateTokyoDisplay(this.game.getGameState());
            return;
        }
        
        const clone = monsterAvatar.cloneNode(true);
        clone.classList.add('tokyo-animation');
        
        // Get positions
        const playerRect = monsterAvatar.getBoundingClientRect();
        const tokyoRect = tokyoSlot.getBoundingClientRect();
        
        // Position clone at player position
        clone.style.position = 'fixed';
        clone.style.left = playerRect.left + 'px';
        clone.style.top = playerRect.top + 'px';
        clone.style.width = playerRect.width + 'px';
        clone.style.height = playerRect.height + 'px';
        clone.style.zIndex = '9999';
        clone.style.transition = 'all 1s ease-in-out';
        clone.style.transform = 'scale(1.2)';
        
        document.body.appendChild(clone);
        
        // Animate to Tokyo position
        setTimeout(() => {
            clone.style.left = tokyoRect.left + (tokyoRect.width - playerRect.width) / 2 + 'px';
            clone.style.top = tokyoRect.top + (tokyoRect.height - playerRect.height) / 2 + 'px';
            clone.style.transform = 'scale(1.5) rotate(360deg)';
        }, 50);
        
        // Clean up and update display
        setTimeout(() => {
            clone.remove();
            this.updateTokyoDisplay(this.game.getGameState());
            this.showMessage(`${data.monster.name} enters Tokyo ${data.location === 'city' ? 'City' : 'Bay'}!`);
        }, 1050);
    }

    // Animate player leaving Tokyo
    animatePlayerFromTokyo(data) {
        console.log('Animating player from Tokyo:', data);
        
        // Find the Tokyo slot and player card
        const tokyoSlot = data.location === 'city' 
            ? document.getElementById('tokyo-city-monster')
            : document.getElementById('tokyo-bay-monster');
        const playerCard = document.querySelector(`[data-player-id="${data.playerId}"]`);
        
        if (!tokyoSlot || !playerCard) {
            this.updateTokyoDisplay(this.game.getGameState());
            return;
        }
        
        // Create animation effect
        const currentMonster = tokyoSlot.querySelector('.tokyo-monster');
        if (currentMonster) {
            currentMonster.style.transition = 'all 0.8s ease-out';
            currentMonster.style.transform = 'scale(0.8) translateY(-20px)';
            currentMonster.style.opacity = '0';
        }
        
        // Clean up and update display
        setTimeout(() => {
            this.updateTokyoDisplay(this.game.getGameState());
            this.showMessage(`${data.monster.name} leaves Tokyo ${data.location === 'city' ? 'City' : 'Bay'}!`);
        }, 800);
    }

    // Update Tokyo display
    updateTokyoDisplay(gameState) {
        // Tokyo City
        if (gameState.tokyoCity) {
            const player = gameState.players.find(p => p.id === gameState.tokyoCity);
            
            this.elements.tokyoCitySlot.innerHTML = `
                <div class="tokyo-monster">
                    <div class="monster-avatar" data-monster="${player.monster.id}">
                        <img src="${player.monster.image}" alt="${player.monster.name}" class="monster-avatar-image" />
                    </div>
                    <div class="monster-name">${player.monster.name}</div>
                </div>
            `;
            this.elements.tokyoCitySlot.classList.add('occupied');
            this.elements.tokyoCitySlot.setAttribute('data-monster', player.monster.id);
            this.elements.tokyoCitySlot.setAttribute('data-player-id', player.id); // Add player ID for hover logic
            
            // Set CSS custom properties for monster-specific colors
            if (player.monster.color) {
                const monsterColor = player.monster.color;
                const lighterColor = this.lightenColor(monsterColor, 20);
                const glowColor = this.hexToRgba(monsterColor, 0.4);
                const strongGlowColor = this.hexToRgba(monsterColor, 0.7);
                
                const tokyoMonster = this.elements.tokyoCitySlot.querySelector('.tokyo-monster');
                if (tokyoMonster) {
                    tokyoMonster.style.setProperty('--monster-color', monsterColor);
                    tokyoMonster.style.setProperty('--monster-color-light', lighterColor);
                    tokyoMonster.style.setProperty('--monster-glow-color', glowColor);
                    tokyoMonster.style.setProperty('--monster-glow-strong', strongGlowColor);
                }
            }
        } else {
            this.elements.tokyoCitySlot.innerHTML = '<div class="empty-slot">Empty</div>';
            this.elements.tokyoCitySlot.classList.remove('occupied');
            this.elements.tokyoCitySlot.removeAttribute('data-monster'); // Remove monster data when empty
        }

        // Tokyo Bay (for 5-6 players)
        if (gameState.players.length >= 5) {
            if (gameState.tokyoBay) {
                const player = gameState.players.find(p => p.id === gameState.tokyoBay);
                
                this.elements.tokyoBaySlot.innerHTML = `
                    <div class="tokyo-monster">
                        <div class="monster-avatar" data-monster="${player.monster.id}">
                            <img src="${player.monster.image}" alt="${player.monster.name}" class="monster-avatar-image" />
                        </div>
                        <div class="monster-name">${player.monster.name}</div>
                    </div>
                `;
                this.elements.tokyoBaySlot.classList.add('occupied');
                this.elements.tokyoBaySlot.setAttribute('data-monster', player.monster.id);
                this.elements.tokyoBaySlot.setAttribute('data-player-id', player.id); // Add player ID for hover logic
                
                // Set CSS custom properties for monster-specific colors
                if (player.monster.color) {
                    const monsterColor = player.monster.color;
                    const lighterColor = this.lightenColor(monsterColor, 20);
                    const glowColor = this.hexToRgba(monsterColor, 0.4);
                    const strongGlowColor = this.hexToRgba(monsterColor, 0.7);
                    
                    const tokyoMonster = this.elements.tokyoBaySlot.querySelector('.tokyo-monster');
                    if (tokyoMonster) {
                        tokyoMonster.style.setProperty('--monster-color', monsterColor);
                        tokyoMonster.style.setProperty('--monster-color-light', lighterColor);
                        tokyoMonster.style.setProperty('--monster-glow-color', glowColor);
                        tokyoMonster.style.setProperty('--monster-glow-strong', strongGlowColor);
                    }
                }
            } else {
                this.elements.tokyoBaySlot.innerHTML = '<div class="empty-slot">Empty</div>';
                this.elements.tokyoBaySlot.classList.remove('occupied');
                this.elements.tokyoBaySlot.removeAttribute('data-monster'); // Remove monster data when empty
                this.elements.tokyoBaySlot.removeAttribute('data-player-id'); // Remove player ID when empty
            }
        }
        
        // Remove any existing hover event listeners to prevent duplicates
        this.removeTokyoHoverListeners();
        
        // Add hover event listeners for Tokyo hover effects
        this.setupTokyoHoverEffects(gameState);
    }
    
    // Remove existing Tokyo hover listeners
    removeTokyoHoverListeners() {
        // Clone and replace elements to remove all event listeners
        const tokyoCitySlot = this.elements.tokyoCitySlot;
        const tokyoBaySlot = this.elements.tokyoBaySlot;
        
        if (tokyoCitySlot) {
            const newTokyoCitySlot = tokyoCitySlot.cloneNode(true);
            tokyoCitySlot.parentNode.replaceChild(newTokyoCitySlot, tokyoCitySlot);
            this.elements.tokyoCitySlot = newTokyoCitySlot;
        }
        
        if (tokyoBaySlot) {
            const newTokyoBaySlot = tokyoBaySlot.cloneNode(true);
            tokyoBaySlot.parentNode.replaceChild(newTokyoBaySlot, tokyoBaySlot);
            this.elements.tokyoBaySlot = newTokyoBaySlot;
        }
    }
    
    // Setup hover effects for Tokyo areas
    setupTokyoHoverEffects(gameState) {
        const currentPlayerId = gameState.currentPlayer;
        
        // Setup Tokyo City hover
        const tokyoCitySlot = this.elements.tokyoCitySlot;
        if (tokyoCitySlot.classList.contains('occupied')) {
            const tokyoPlayerId = tokyoCitySlot.getAttribute('data-player-id');
            
            tokyoCitySlot.addEventListener('mouseenter', () => {
                this.handleTokyoHover(tokyoPlayerId, currentPlayerId);
            });
            
            tokyoCitySlot.addEventListener('mouseleave', () => {
                this.handleTokyoHoverEnd(tokyoPlayerId, currentPlayerId);
            });
        }
        
        // Setup Tokyo Bay hover
        const tokyoBaySlot = this.elements.tokyoBaySlot;
        if (tokyoBaySlot.classList.contains('occupied')) {
            const tokyoPlayerId = tokyoBaySlot.getAttribute('data-player-id');
            
            tokyoBaySlot.addEventListener('mouseenter', () => {
                this.handleTokyoHover(tokyoPlayerId, currentPlayerId);
            });
            
            tokyoBaySlot.addEventListener('mouseleave', () => {
                this.handleTokyoHoverEnd(tokyoPlayerId, currentPlayerId);
            });
        }
    }
    
    // Handle Tokyo hover effect
    handleTokyoHover(tokyoPlayerId, currentPlayerId) {
        if (tokyoPlayerId === currentPlayerId) {
            // If the active player is in Tokyo, wiggle their active card
            const activePlayerCard = document.querySelector('.player-dashboard.active');
            if (activePlayerCard) {
                activePlayerCard.classList.add('tokyo-active-wiggle');
            }
        } else {
            // If a different player is in Tokyo, highlight their card and vertically collapse surrounding cards
            const playerCard = document.querySelector(`.player-dashboard[data-player-id="${tokyoPlayerId}"]`);
            if (playerCard) {
                this.verticallyCollapseSurroundingCards(playerCard);
                playerCard.classList.add('tokyo-highlight');
            }
        }
    }
    
    // Handle Tokyo hover end effect with proper z-index management
    handleTokyoHoverEnd(tokyoPlayerId, currentPlayerId) {
        if (tokyoPlayerId === currentPlayerId) {
            // Remove wiggle from active player card
            const activePlayerCard = document.querySelector('.player-dashboard.active');
            if (activePlayerCard) {
                activePlayerCard.classList.remove('tokyo-active-wiggle');
            }
        } else {
            // Smooth return with proper z-index and vertical collapse for the player card in stack
            const playerCard = document.querySelector(`.player-dashboard[data-player-id="${tokyoPlayerId}"]`);
            if (playerCard) {
                this.smoothReturnWithVerticalCollapse(playerCard);
            }
        }
    }
    
    // Vertically collapse surrounding cards to create empty space
    verticallyCollapseSurroundingCards(targetCard) {
        const allNonActiveCards = document.querySelectorAll('.player-dashboard:not(.active)');
        const cards = Array.from(allNonActiveCards);
        const targetIndex = cards.indexOf(targetCard);
        
        if (targetIndex === -1) return;
        
        // Collapse cards before the target upward (they get pushed up and out of the way)
        for (let i = 0; i < targetIndex; i++) {
            cards[i].classList.add('collapse-up');
            cards[i].classList.remove('expand-back-normal');
        }
        
        // Collapse cards after the target downward (they get pushed down and out of the way)
        for (let i = targetIndex + 1; i < cards.length; i++) {
            cards[i].classList.add('collapse-down');
            cards[i].classList.remove('expand-back-normal');
        }
    }
    
    // Smooth return with vertical collapse and z-index management
    smoothReturnWithVerticalCollapse(targetCard) {
        const allNonActiveCards = document.querySelectorAll('.player-dashboard:not(.active)');
        const cards = Array.from(allNonActiveCards);
        const targetIndex = cards.indexOf(targetCard);
        
        if (targetIndex === -1) return;
        
        // Find the card that will be in front of this one after it returns
        let cardInFront = null;
        if (targetIndex > 0) {
            cardInFront = cards[targetIndex - 1];
        }
        
        // Set the z-index to be 1 less than the card in front, or a low value if it's the first card
        let newZIndex = 1;
        if (cardInFront) {
            const frontCardZIndex = parseInt(window.getComputedStyle(cardInFront).zIndex) || 10;
            newZIndex = frontCardZIndex - 1;
        }
        
        // Apply the new z-index immediately before starting the return animation
        targetCard.style.zIndex = newZIndex;
        
        // Remove the highlight class and add return transition
        targetCard.classList.remove('tokyo-highlight');
        targetCard.classList.add('tokyo-return-behind');
        
        // After the target card has returned to the empty space, expand surrounding cards back to normal
        setTimeout(() => {
            // Expand back cards that were collapsed upward
            for (let i = 0; i < targetIndex; i++) {
                cards[i].classList.remove('collapse-up');
                cards[i].classList.add('expand-back-normal');
            }
            
            // Expand back cards that were collapsed downward
            for (let i = targetIndex + 1; i < cards.length; i++) {
                cards[i].classList.remove('collapse-down');
                cards[i].classList.add('expand-back-normal');
            }
        }, 250); // Wait for the target card to settle into the empty space
        
        // Clean up all classes after animations complete
        setTimeout(() => {
            targetCard.classList.remove('tokyo-return-behind');
            targetCard.style.zIndex = ''; // Reset to default
            
            // Clean up collapse classes
            allNonActiveCards.forEach(card => {
                card.classList.remove('collapse-up', 'collapse-down', 'expand-back-normal');
            });
        }, 900);
    }

    // Update dice display
    updateDiceDisplay(diceData) {
        console.log('updateDiceDisplay called with data:', diceData);
        const html = createDiceHTML(diceData);
        console.log('Generated HTML:', html);
        this.elements.diceContainer.innerHTML = html;
        
        // Attach dice event listeners and update container reference
        const newContainer = attachDiceEventListeners(this.game.diceCollection, this.elements.diceContainer, () => {
            this.updateDiceControls();
        });
        
        // Update our reference to the container if it was replaced
        if (newContainer && newContainer !== this.elements.diceContainer) {
            this.elements.diceContainer = newContainer;
        }
    }

    // Update initial dice display (empty dice)
    updateInitialDiceDisplay() {
        if (!this.game) {
            console.log('No game instance for dice display');
            return;
        }
        
        console.log('🎲 updateInitialDiceDisplay called');
        const diceData = this.game.diceCollection.getAllDiceData();
        console.log('🎲 Dice data retrieved:', diceData.map(d => ({ id: d.id, face: d.face, symbol: d.symbol })));
        
        // Check if any dice have null faces
        const hasNullFaces = diceData.some(d => d.face === null);
        if (hasNullFaces) {
            console.warn('🎲 WARNING: Some dice have null faces, this will show question marks!');
            console.log('🎲 Turn phase:', this.game.currentTurnPhase);
            console.log('🎲 Dice roller state:', this.game.diceRoller.getState());
        }
        
        this.updateDiceDisplay(diceData);
    }

    // Update dice controls
    updateDiceControls() {
        console.log('updateDiceControls called, game exists:', !!this.game);
        if (!this.game) {
            console.log('No game instance in updateDiceControls, returning');
            return;
        }

        const diceState = this.game.diceRoller.getState();
        const gameState = this.game.getGameState();
        
        console.log('updateDiceControls - rollsRemaining:', diceState.rollsRemaining);
        
        // Update rolls left
        this.elements.rollsLeft.textContent = `Rolls left: ${diceState.rollsRemaining}`;
        
        // Update button states
        const isCurrentPlayerEliminated = gameState.currentPlayer && gameState.currentPlayer.isEliminated;
        const canRoll = diceState.canRoll && gameState.turnPhase === 'rolling' && !isCurrentPlayerEliminated;
        const canKeep = gameState.turnPhase === 'rolling' && diceState.rollsRemaining < 3 && diceState.rollsRemaining > 0 && !isCurrentPlayerEliminated;
        const canEndTurn = (gameState.turnPhase === 'resolving' || 
                          (gameState.turnPhase === 'rolling' && diceState.rollsRemaining === 0)) && !isCurrentPlayerEliminated;
        
        // Debug logging for 6-player game issues
        if (gameState.players && gameState.players.length === 6) {
            console.log('🐛 6-PLAYER DEBUG:', {
                currentPlayerIndex: gameState.currentPlayerIndex,
                currentPlayerName: gameState.currentPlayer ? gameState.currentPlayer.monster.name : 'none',
                turnPhase: gameState.turnPhase,
                rollsRemaining: diceState.rollsRemaining,
                canEndTurn: canEndTurn,
                isCurrentPlayerEliminated: isCurrentPlayerEliminated,
                pendingDecisions: gameState.pendingDecisions ? gameState.pendingDecisions.length : 'undefined',
                diceEffectsResolved: gameState.diceEffectsResolved
            });
        }
        
        // Players can buy cards when dice are resolved and they have energy (local game)
        const diceResolved = gameState.turnPhase === 'resolving';
        const hasEnergy = gameState.currentPlayer && gameState.currentPlayer.energy > 0;
        const canBuyCards = diceResolved && hasEnergy && !isCurrentPlayerEliminated;
        
        console.log('Button states:', {
            turnPhase: gameState.turnPhase,
            rollsRemaining: diceState.rollsRemaining,
            currentPlayerEliminated: isCurrentPlayerEliminated,
            canRoll,
            canKeep,
            canEndTurn,
            canBuyCards,
            currentPlayerEnergy: gameState.currentPlayer ? gameState.currentPlayer.energy : 0,
            endTurnBtnExists: !!this.elements.endTurnBtn
        });
        
        this.elements.rollDiceBtn.disabled = !canRoll;
        this.elements.keepDiceBtn.disabled = !canKeep;
        // this.elements.buyCardsBtn.disabled = !canBuyCards;
        
        // Update End Turn button
        if (this.elements.endTurnBtn) {
            console.log('Setting endTurnBtn disabled to:', !canEndTurn);
            // Extra debugging for 6-player games
            if (gameState.players && gameState.players.length === 6) {
                console.log('🐛 END TURN BUTTON DEBUG:', {
                    buttonExists: true,
                    buttonDisabled: this.elements.endTurnBtn.disabled,
                    newDisabledState: !canEndTurn,
                    canEndTurnCalculation: canEndTurn,
                    turnPhaseCheck: gameState.turnPhase === 'resolving',
                    rollsCheck: gameState.turnPhase === 'rolling' && diceState.rollsRemaining === 0,
                    eliminatedCheck: !isCurrentPlayerEliminated
                });
            }
            this.elements.endTurnBtn.disabled = !canEndTurn;
            this.elements.endTurnBtn.textContent = 'End Turn';
        } else {
            console.error('endTurnBtn element not found!');
        }
        
        // Update button text
        if (diceState.rollsRemaining === 3) {
            this.elements.rollDiceBtn.textContent = 'Roll Dice';
        } else {
            this.elements.rollDiceBtn.textContent = 'Re-roll Unselected';
        }
    }

    // Handle dice roll complete
    handleDiceRollComplete(data) {
        // Log individual dice faces immediately after roll using visual dice
        if (this.game && this.game.diceCollection) {
            const diceStates = this.game.diceCollection.dice.map(die => ({
                face: die.face,
                symbol: die.getSymbol()
            }));
            
            // Create visual dice representation using HTML spans for better styling
            const createDiceBox = (face) => {
                // For numbers, create styled box elements
                if (['1', '2', '3'].includes(face)) {
                    return `<span class="dice-box dice-number">${face}</span>`;
                }
                
                // For special symbols, use styled spans
                if (face === 'energy') return '<span class="dice-box dice-energy">⚡</span>';
                if (face === 'attack') return '<span class="dice-box dice-attack">⚔️</span>';
                if (face === 'heal') return '<span class="dice-box dice-heal">❤️</span>';
                
                // Fallback
                return `<span class="dice-box">${face}</span>`;
            };
            
            const visualDice = diceStates.map(die => createDiceBox(die.face)).join(' ');
            const playerName = this.game.getCurrentPlayer() ? this.game.getCurrentPlayer().monster.name : 'Player';
            
            this.game.logDetailedAction(`${playerName} rolled: ${visualDice}`, 'dice-roll-result');
        }
        
        this.updateDiceControls();
        
        if (data.rollsLeft === 0) {
            this.showMessage('No more rolls! Resolving dice effects...', 1400);
            // Show next message after first one is almost done
            setTimeout(() => {
                this.showMessage('Dice effects resolved! You can buy cards or end turn.');
            }, 1500);
        }
    }

    // Update turn phase
    updateTurnPhase(data) {
        console.log('updateTurnPhase called with data:', data);
        const phase = data.phase || data; // Handle both object and string formats
        console.log('Updating to phase:', phase);
        
        switch (phase) {
            case 'resolving':
                this.showMessage('Dice effects resolved! You can buy cards or end turn.');
                break;
            case 'buying':
                this.showMessage('Buy power cards or end turn');
                this.updateCardsDisplay();
                break;
        }
        this.updateDiceControls();
    }

    // Update cards display
    updateCardsDisplay() {
        if (!this.game) return;

        const gameState = this.game.getGameState();
        const currentPlayer = gameState.currentPlayer;
        
        this.elements.availableCards.innerHTML = gameState.availableCards.map(card => {
            // Calculate the actual cost including discounts
            let actualCost = this.game.calculateCardCost(currentPlayer.id, card.id);
            
            return `
                <div class="power-card ${currentPlayer.energy >= actualCost ? 'affordable' : ''}" 
                     data-card-id="${card.id}" data-effect="${card.effect}">
                    <div class="card-cost">⚡${actualCost}${actualCost < card.cost ? ` (was ${card.cost})` : ''}</div>
                    <div class="card-name">${card.name}</div>
                    <div class="card-description">${card.description}</div>
                </div>
            `;
        }).join('');

        // Attach card detail listeners (allow all players to view card details)
        this.elements.availableCards.querySelectorAll('.power-card').forEach(cardElement => {
            cardElement.addEventListener('click', () => {
                this.showCardDetails(cardElement.dataset.cardId);
            });
        });
    }

    // Show card details modal (for both viewing and purchasing)
    showCardDetails(cardId, cardsList = null, allowPurchase = true) {
        if (!this.game) return;

        const gameState = this.game.getGameState();
        const currentPlayer = gameState.currentPlayer; // currentPlayer is already the player object
        
        // Find card in the specified list or available cards
        const cardsToSearch = cardsList || gameState.availableCards;
        const card = cardsToSearch.find(c => c.id === cardId);
        
        if (!card) return;

        // Check if purchase is allowed based on game state (local game)
        const diceResolved = gameState.turnPhase === 'resolving';
        const hasEnergy = currentPlayer && currentPlayer.energy >= card.cost;
        const canPurchase = allowPurchase && diceResolved && hasEnergy;
        
        const showPurchaseButton = allowPurchase && !cardsList; // Only show for available cards, not player cards
        
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'card-purchase-modal-overlay';
        modalOverlay.innerHTML = `
            <div class="card-purchase-modal">
                <div class="purchase-card-display power-card" data-effect="${card.effect}">
                    <div class="card-cost">⚡${card.cost}</div>
                    <div class="card-name">${card.name}</div>
                    <div class="card-description">${card.description || card.effect}</div>
                </div>
                <div class="purchase-buttons">
                    ${showPurchaseButton ? `
                        <button class="purchase-btn" ${!canPurchase ? 'disabled' : ''} data-card-id="${card.id}">
                            ${!diceResolved ? 'Resolve Dice First' :
                              !hasEnergy ? 'Not Enough Energy' : 'Buy Card'}
                        </button>
                    ` : ''}
                    <button class="decline-btn">Close</button>
                </div>
            </div>
        `;

        // Add to DOM
        document.body.appendChild(modalOverlay);

        // Add event listeners
        const purchaseBtn = modalOverlay.querySelector('.purchase-btn');
        const declineBtn = modalOverlay.querySelector('.decline-btn');

        if (purchaseBtn) {
            purchaseBtn.addEventListener('click', () => {
                if (canPurchase && !purchaseBtn.disabled) {
                    // Disable button to prevent double-clicking
                    purchaseBtn.disabled = true;
                    purchaseBtn.textContent = 'Purchasing...';
                    
                    console.log(`🛍️ Purchase button clicked for card ${cardId}`);
                    this.buyCard(cardId);
                }
                document.body.removeChild(modalOverlay);
            });
        }

        declineBtn.addEventListener('click', () => {
            document.body.removeChild(modalOverlay);
        });

        // Close on backdrop click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                document.body.removeChild(modalOverlay);
            }
        });

        // Close on Escape key
        const closeOnEscape = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(modalOverlay);
                document.removeEventListener('keydown', closeOnEscape);
            }
        };
        document.addEventListener('keydown', closeOnEscape);
    }

    // Backward compatibility - redirect old function name
    showCardPurchasePreview(cardId) {
        this.showCardDetails(cardId);
    }

    // Roll dice
    async rollDice() {
        console.log('rollDice called, game exists:', !!this.game);
        if (!this.game) {
            console.log('No game instance, returning');
            return;
        }
        
        // Check if current player is eliminated
        const currentPlayer = this.game.getCurrentPlayer();
        if (currentPlayer && currentPlayer.isEliminated) {
            console.log('⚠️ Current player is eliminated, cannot roll dice');
            this.showMessage('Eliminated players cannot roll dice!');
            return;
        }
        
        console.log('Disabling roll dice button and calling game.startRoll()');
        this.elements.rollDiceBtn.disabled = true;
        await this.game.startRoll();
        // Button state will be updated by event callback
    }

    // Keep dice and end rolling
    keepDiceAndEndRolling() {
        if (!this.game) return;
        
        this.game.keepDiceAndResolve();
    }

    // End turn
    endTurn() {
        if (!this.game) return;
        
        // Check if current player is eliminated
        const currentPlayer = this.game.getCurrentPlayer();
        if (currentPlayer && currentPlayer.isEliminated) {
            console.log('⚠️ Current player is eliminated, cannot end turn manually');
            this.showMessage('Eliminated players cannot end turns!');
            return;
        }
        
        console.log('Main.endTurn() called');
        
        // Prevent double execution by temporarily disabling the button
        if (this.elements.endTurnBtn) {
            this.elements.endTurnBtn.disabled = true;
        }
        
        try {
            this.game.endTurn();
        } finally {
            // Re-enable button after a short delay to prevent rapid clicking
            setTimeout(() => {
                if (this.elements.endTurnBtn) {
                    this.updateDiceControls(); // This will set the correct disabled state
                }
            }, 100);
        }
    }

    // Show card buying interface
    showCardBuyingInterface() {
        // TODO: Implement card buying interface
        console.log('Card buying interface not yet implemented');
    }

    // Buy a card
    buyCard(cardId, targetId = null) {
        console.log(`🛍️ main.js buyCard called: cardId=${cardId}, targetId=${targetId}`);
        if (!this.game) return;
        
        const currentPlayer = this.game.getCurrentPlayer();
        console.log(`🛍️ Current player: ${currentPlayer ? currentPlayer.monster.name : 'null'}`);
        
        const result = this.game.buyCard(currentPlayer.id, cardId, targetId);
        console.log(`🛍️ Purchase result:`, result);
        
        if (result.needsTarget) {
            console.log(`🛍️ Showing target selection modal`);
            // Show target selection modal
            this.showTargetSelectionModal(result.card, result.availableTargets);
        } else if (result.success) {
            console.log(`🛍️ Purchase successful, updating displays`);
            this.updateCardsDisplay();
            this.updateGameDisplay();
        } else {
            console.log(`🛍️ Purchase failed: ${result.reason || 'Not enough energy!'}`);
            this.showMessage(result.reason || 'Not enough energy!');
        }
    }

    // Show target selection modal
    showTargetSelectionModal(card, availableTargets) {
        const modalHtml = `
            <div class="target-selection-modal" id="target-selection-modal">
                <div class="target-selection-content">
                    <div class="target-selection-header">
                        <h2>Select Target for ${card.name}</h2>
                        <button class="target-selection-close-btn">&times;</button>
                    </div>
                    <div class="target-selection-description">
                        ${card.description}
                    </div>
                    <div class="target-selection-targets">
                        ${availableTargets.map(target => `
                            <div class="target-option" data-target-id="${target.id}">
                                <div class="target-name">${target.name}</div>
                                <div class="target-health">Health: ${target.health}/${target.maxHealth}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="target-selection-actions">
                        <button class="cancel-target-btn">Cancel</button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Add event listeners
        const modal = document.getElementById('target-selection-modal');
        const closeBtn = modal.querySelector('.target-selection-close-btn');
        const cancelBtn = modal.querySelector('.cancel-target-btn');
        const targetOptions = modal.querySelectorAll('.target-option');

        closeBtn.addEventListener('click', () => this.closeTargetSelectionModal());
        cancelBtn.addEventListener('click', () => this.closeTargetSelectionModal());
        
        targetOptions.forEach(option => {
            option.addEventListener('click', () => {
                const targetId = option.dataset.targetId;
                this.buyCard(card.id, targetId);
                this.closeTargetSelectionModal();
            });
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeTargetSelectionModal();
            }
        });
    }

    // Close target selection modal
    closeTargetSelectionModal() {
        const modal = document.getElementById('target-selection-modal');
        if (modal) {
            modal.remove();
        }
    }

    // Show decision modal
    showDecisionModal(decision) {
        if (decision.type === 'tokyoExit') {
            // Get the player data
            const player = this.game.players.find(p => p.id === decision.playerId);
            const attacker = this.game.players.find(p => p.id === decision.attackerId);
            
            // Set modal content
            this.elements.decisionTitle.textContent = 'Tokyo Under Attack!';
            this.elements.decisionContext.textContent = `Attacked by ${attacker.monster.name}`;
            this.elements.decisionMessage.textContent = decision.message;
            
            // Set monster display
            this.elements.decisionMonster.innerHTML = `
                <div class="monster-avatar" style="background-color: ${player.monster.color}">
                    <img src="${player.monster.image}" alt="${player.monster.name}" class="monster-avatar-image" />
                </div>
                <div class="monster-name">${player.monster.name}</div>
            `;
            
            // Set button text
            this.elements.decisionOption1.textContent = 'Stay in Tokyo';
            this.elements.decisionOption2.textContent = 'Leave Tokyo';
            
            // Remove any existing event listeners
            this.elements.decisionOption1.onclick = null;
            this.elements.decisionOption2.onclick = null;
            
            // Add event listeners
            this.elements.decisionOption1.onclick = () => {
                this.hideDecisionModal();
                this.game.handlePlayerDecision(decision.playerId, 'stay');
            };
            
            this.elements.decisionOption2.onclick = () => {
                this.hideDecisionModal();
                this.game.handlePlayerDecision(decision.playerId, 'leave');
            };
            
            // Show modal
            this.elements.decisionModal.classList.remove('hidden');
        }
    }

    // Hide decision modal
    hideDecisionModal() {
        this.elements.decisionModal.classList.add('hidden');
    }

    // Show game over modal
    showGameOverModal(data) {
        const winCondition = data.winCondition === 'victory_points' ? 'Victory Points' : 'Survival';
        
        this.elements.winnerAnnouncement.innerHTML = `
            <div class="victory-celebration">
                <div class="victory-crown">👑</div>
                <div class="winner-monster-display">
                    <div class="winner-monster" data-monster="${data.winner.monster.id}">
                        ${data.winner.monster.emoji}
                    </div>
                    <div class="monster-nameplate">
                        <h2>${data.winner.monster.name}</h2>
                        <div class="victory-badge">KING OF TOKYO!</div>
                    </div>
                </div>
                <div class="victory-stats">
                    <div class="win-condition">Victory by ${winCondition}</div>
                    <div class="final-stats">
                        <div class="stat-item">
                            <span class="stat-icon">🏆</span>
                            <span class="stat-value">${data.winner.victoryPoints}</span>
                            <span class="stat-label">Victory Points</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-icon">❤️</span>
                            <span class="stat-value">${data.winner.health}</span>
                            <span class="stat-label">Health Remaining</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-icon">⚡</span>
                            <span class="stat-value">${data.winner.energy}</span>
                            <span class="stat-label">Energy</span>
                        </div>
                    </div>
                </div>
                <div class="victory-message">${data.message}</div>
            </div>
        `;
        this.elements.gameOverModal.classList.remove('hidden');
    }

    // Reset game
    resetGame() {
        this.elements.gameOverModal.classList.add('hidden');
        this.game = null;
        this.selectedMonsters = [];
        this.showSetupModal();
    }

    // Show temporary message
    showMessage(message, duration = 3000) {
        console.log(`Game Message: ${message}`);
        
        // Clear any existing message timeout
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }
        
        // Get the header area to show message there (use round counter as reference)
        const headerElement = this.elements.roundCounter;
        
        // Add a subtle notification to the header instead of blocking overlay
        let notification = document.getElementById('header-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'header-notification';
            notification.className = 'header-notification';
            
            // Insert after the header element
            headerElement.parentNode.insertBefore(notification, headerElement.nextSibling);
        }
        
        // Set notification content
        notification.textContent = message;
        notification.classList.add('visible');
        
        // Auto-dismiss after duration
        this.messageTimeout = setTimeout(() => {
            notification.classList.remove('visible');
            this.messageTimeout = null;
        }, duration);
        
        // Allow clicking to dismiss
        notification.onclick = () => {
            notification.classList.remove('visible');
            if (this.messageTimeout) {
                clearTimeout(this.messageTimeout);
                this.messageTimeout = null;
            }
        };
    }

    // Add end turn button functionality - REMOVED
    // Button functionality moved to dice controls area
    addEndTurnButton() {
        // No longer creating duplicate end-turn button
        // End turn functionality is handled by the button in action-menu
    }

    // Animation helper functions
    animatePlayerAttacked(playerId) {
        const playerElement = document.querySelector(`[data-player-id="${playerId}"]`);
        if (playerElement) {
            playerElement.classList.add('player-attacked');
            setTimeout(() => {
                playerElement.classList.remove('player-attacked');
            }, 1000);
        }
    }

    animatePlayerHealing(playerId, healAmount) {
        const playerElement = document.querySelector(`[data-player-id="${playerId}"]`);
        if (!playerElement) return;

        // Create heart icon
        const heart = document.createElement('div');
        heart.className = 'healing-heart';
        heart.innerHTML = '💖';
        
        // Position relative to the health stat
        const healthStat = playerElement.querySelector('.stat.health');
        if (healthStat) {
            const rect = healthStat.getBoundingClientRect();
            heart.style.position = 'fixed';
            heart.style.left = (rect.left + rect.width / 2 - 20) + 'px';
            heart.style.top = (rect.top + 10) + 'px';
            heart.style.zIndex = '1000';
            
            document.body.appendChild(heart);
            
            // Remove after animation
            setTimeout(() => {
                if (heart.parentNode) {
                    heart.parentNode.removeChild(heart);
                }
            }, 1500);
            
            // Animate the health stat
            const healthValue = healthStat.querySelector('.stat-value');
            if (healthValue) {
                healthValue.classList.add('health-stat-increase');
                setTimeout(() => {
                    healthValue.classList.remove('health-stat-increase');
                }, 800);
            }
        }
    }

    animateVictoryPoints(playerId, pointsGained) {
        const playerElement = document.querySelector(`[data-player-id="${playerId}"]`);
        if (!playerElement) return;

        // Create coin icon
        const coin = document.createElement('div');
        coin.className = 'victory-coin bouncing';
        coin.innerHTML = '🪙';
        
        // Position relative to the points stat
        const pointsStat = playerElement.querySelector('.stat.points');
        if (pointsStat) {
            const rect = pointsStat.getBoundingClientRect();
            coin.style.position = 'fixed';
            coin.style.left = (rect.left + rect.width / 2 - 25) + 'px';
            coin.style.top = (rect.top + 10) + 'px';
            coin.style.zIndex = '1000';
            
            document.body.appendChild(coin);
            
            // Remove after animation
            setTimeout(() => {
                if (coin.parentNode) {
                    coin.parentNode.removeChild(coin);
                }
            }, 2200);
            
            // Animate the points stat
            const pointsValue = pointsStat.querySelector('.stat-value');
            if (pointsValue) {
                pointsValue.classList.add('points-stat-increase');
                setTimeout(() => {
                    pointsValue.classList.remove('points-stat-increase');
                }, 800);
            }
        }
    }

    // Toolbar methods
    async showGameLog() {
        this.updateGameLogDisplay();
        this.elements.gameLogModal.classList.remove('hidden');
    }

    async showStorageManagement() {
        await this.updateStorageStats();
        this.elements.storageMgmtModal.classList.remove('hidden');
    }

    toggleStorageAboutPanel() {
        if (!this.elements.storageAboutPanel) return;
        
        if (this.elements.storageAboutPanel.classList.contains('visible')) {
            this.hideStorageAboutPanel();
        } else {
            this.showStorageAboutPanel();
        }
    }

    showStorageAboutPanel() {
        UIUtilities.safeToggleClass(this.elements.storageAboutPanel, 'hidden', false);
        UIUtilities.safeToggleClass(this.elements.storageAboutPanel, 'visible', true);
    }

    hideStorageAboutPanel() {
        if (!this.elements.storageAboutPanel) return;
        
        UIUtilities.safeToggleClass(this.elements.storageAboutPanel, 'visible', false);
        // Add a small delay before hiding to allow animation
        setTimeout(() => {
            UIUtilities.safeToggleClass(this.elements.storageAboutPanel, 'hidden', true);
        }, 300);
    }

    showSettings() {
        UIUtilities.showModal(this.elements.settingsModal);
    }

    updateGameLogDisplay() {
        const content = this.elements.gameLogContent;
        if (!content) return;

        // Get the hierarchical log tree from the game
        const logTree = this.game?.gameLogTree?.getTree() || [];

        if (logTree.length === 0) {
            content.innerHTML = '<div class="game-log-empty">🎮 No game events recorded yet</div>';
            return;
        }

        // Render the hierarchical tree
        const treeHTML = this.renderLogTree(logTree);
        content.innerHTML = treeHTML;
        
        // Auto-scroll to bottom to show latest content
        setTimeout(() => {
            content.scrollTop = content.scrollHeight;
        }, 100);
    }

    renderLogTree(rounds) {
        return rounds.map(round => this.renderRound(round)).join('');
    }

    renderRound(round) {
        const roundTimestamp = round.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const expandedClass = round.expanded ? 'expanded' : 'collapsed';
        const expandIcon = round.expanded ? '📖' : '📕';
        
        // Handle setup round vs numbered rounds
        const isSetup = round.roundNumber === 'Setup';
        const roundTitle = isSetup ? 
            '⚙️ Game Setup' : 
            `🆕 Round ${round.roundNumber}`;
        
        const dataAttribute = isSetup ? 'data-round-type="setup"' : '';
        
        const turnsHTML = round.expanded ? 
            round.playerTurns.map(turn => this.renderPlayerTurn(turn, round.id)).join('') : '';

        return `
            <div class="log-round ${expandedClass}" ${dataAttribute}>
                <div class="log-round-header" onclick="window.gameUI.toggleLogRound('${round.id}')">
                    <span class="log-expand-icon">${expandIcon}</span>
                    <span class="log-round-title">${roundTitle}</span>
                    <span class="log-round-time">${roundTimestamp}</span>
                    <span class="log-round-summary">${round.playerTurns.length} ${isSetup ? 'actions' : 'turns'}</span>
                </div>
                <div class="log-round-content">
                    ${turnsHTML}
                </div>
            </div>
        `;
    }

    renderPlayerTurn(turn, roundId) {
        const turnTimestamp = turn.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const expandedClass = turn.expanded ? 'expanded' : 'collapsed';
        const expandIcon = turn.expanded ? '🔽' : '▶️';
        
        // Get turn summary for collapsed view
        const summary = this.game.gameLogTree.getTurnSummary(turn);
        
        // Get player avatar
        const playerAvatar = this.getPlayerAvatarForTurn(turn);
        
        const actionsHTML = turn.expanded ? 
            turn.actions.map(action => this.renderAction(action)).join('') : '';

        return `
            <div class="log-turn ${expandedClass}">
                <div class="log-turn-header" onclick="window.gameUI.toggleLogTurn('${roundId}', '${turn.id}')">
                    <span class="log-expand-icon">${expandIcon}</span>
                    ${playerAvatar}
                    <span class="log-turn-player">${turn.playerName}</span>
                    <span class="log-turn-time">${turnTimestamp}</span>
                    <span class="log-turn-summary">${summary}</span>
                </div>
                <div class="log-turn-content">
                    ${actionsHTML}
                </div>
            </div>
        `;
    }

    renderAction(action) {
        const actionTimestamp = action.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const emoji = action.emoji || '📝';
        const categoryClass = `log-action-${action.category}`;
        
        // Add area information if available
        const areaTag = action.area && action.area !== 'game' ? 
            `<span class="log-action-area">[${action.area}]</span>` : '';
        
        return `
            <div class="log-action ${categoryClass}">
                <span class="log-action-emoji">${emoji}</span>
                <span class="log-action-message">${action.message}</span>
                ${areaTag}
                <span class="log-action-time">${actionTimestamp}</span>
            </div>
        `;
    }

    getPlayerAvatarForTurn(turn) {
        if (!turn.playerMonster || !this.game || !this.game.players) {
            return '<span class="log-player-avatar-missing">👤</span>';
        }
        
        // Find the player
        const player = this.game.players.find(p => 
            p.monster?.name === turn.playerName
        );
        
        if (!player || !player.monster) {
            return '<span class="log-player-avatar-missing">👤</span>';
        }
        
        return `<img src="${player.monster.image}" alt="${player.monster.name}" class="log-player-avatar" />`;
    }

    // Toggle round expansion
    toggleLogRound(roundId) {
        if (this.game && this.game.gameLogTree) {
            this.game.gameLogTree.toggleRound(roundId);
            this.updateGameLogDisplay();
        }
    }

    // Toggle turn expansion
    toggleLogTurn(roundId, turnId) {
        if (this.game && this.game.gameLogTree) {
            this.game.gameLogTree.togglePlayerTurn(roundId, turnId);
            this.updateGameLogDisplay();
        }
    }

    formatLogEntry(log) {
        const timestamp = new Date(log.timestamp);
        const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Get message text
        let message = '';
        if (typeof log.message === 'string') {
            message = log.message;
        } else if (typeof log.message === 'object' && log.message !== null) {
            message = JSON.stringify(log.message);
        } else {
            message = String(log.message || 'Unknown action');
        }

        // Add emojis and formatting based on content
        const formattedMessage = this.addEmojiToLogMessage(message, log);
        
        // Get player info with mini monster image
        const playerInfo = this.getPlayerInfoForLog(log.player);
        
        const categoryClass = log.category ? `log-category-${log.category}` : 'log-category-general';
        const roundInfo = log.round ? `R${log.round}` : '';
        
        return `
            <div class="log-entry ${categoryClass}">
                <div class="log-header">
                    <span class="log-time">🕐 ${timeStr}</span>
                    ${roundInfo ? `<span class="log-round">${roundInfo}</span>` : ''}
                    ${playerInfo}
                </div>
                <div class="log-message">${formattedMessage}</div>
            </div>
        `;
    }

    addEmojiToLogMessage(message, log) {
        // Add emojis based on message content
        let formatted = message;
        
        // Dice related
        formatted = formatted.replace(/roll|rolled|dice/gi, '🎲 $&');
        formatted = formatted.replace(/reroll/gi, '🔄 $&');
        
        // Energy related
        formatted = formatted.replace(/energy|⚡/gi, '⚡ $&');
        
        // Health/Hearts related
        formatted = formatted.replace(/health|heart|heal|damage/gi, '❤️ $&');
        formatted = formatted.replace(/lost|loses/gi, '💔 $&');
        
        // Victory points
        formatted = formatted.replace(/victory point|points/gi, '🏆 $&');
        
        // Tokyo related
        formatted = formatted.replace(/tokyo|enters tokyo|leaves tokyo/gi, '🏙️ $&');
        
        // Combat related
        formatted = formatted.replace(/attack|attacks|claws/gi, '⚔️ $&');
        formatted = formatted.replace(/eliminated|defeated/gi, '💀 $&');
        
        // Power cards
        formatted = formatted.replace(/power card|bought|purchased/gi, '🃏 $&');
        
        // Game start/end
        formatted = formatted.replace(/game start|started/gi, '🎯 $&');
        formatted = formatted.replace(/wins|victory|won/gi, '🎉 $&');
        
        // Turn related
        formatted = formatted.replace(/turn/gi, '🔄 $&');
        
        return formatted;
    }

    getPlayerInfoForLog(playerName) {
        if (!playerName || !this.game || !this.game.players) return '';
        
        // Find the player
        const player = this.game.players.find(p => 
            p.monster?.name === playerName || 
            p.playerNumber === playerName ||
            `Player ${p.playerNumber}` === playerName
        );
        
        if (!player || !player.monster) return `<span class="log-player">👤 ${playerName}</span>`;
        
        return `
            <span class="log-player">
                <img src="${player.monster.image}" alt="${player.monster.name}" class="log-player-avatar" />
                <span class="log-player-name">${player.monster.name}</span>
            </span>
        `;
    }

    clearGameLog() {
        // Add confirmation dialog for destructive action
        const confirmed = confirm(
            '⚠️ WARNING: Clear Game Log\n\n' +
            'This will permanently delete all game log entries and cannot be undone.\n\n' +
            'Are you sure you want to clear the entire game log?'
        );
        
        if (!confirmed) {
            return; // User cancelled, don't clear the log
        }
        
        if (this.game) {
            this.game.gameLog = [];
            this.game.detailedLog = [];
            // Clear the tree structure as well
            if (this.game.gameLogTree) {
                this.game.gameLogTree = new GameLogTree();
            }
            this.updateGameLogDisplay();
            
            // Save the cleared state to storage
            if (this.storageManager) {
                this.storageManager.saveGameState(this.game).catch(error => {
                    console.error('Failed to save cleared log state:', error);
                });
            }
        }
    }

    // Storage management methods
    async saveGameManually() {
        if (!this.game) {
            alert('No active game to save!');
            return;
        }

        try {
            await this.game.saveGameState();
            this.showMessage('Game saved successfully!');
            await this.updateStorageStats();
        } catch (error) {
            console.error('Failed to save game:', error);
            alert('Failed to save game: ' + error.message);
        }
    }

    async clearAllStorage() {
        // Enhanced confirmation dialog for destructive action
        const confirmed = confirm(
            '🚨 DANGER: Clear All Storage\n\n' +
            'This will permanently delete ALL stored data including:\n' +
            '• All saved game states\n' +
            '• Complete game log history\n' +
            '• All player progress and settings\n\n' +
            '⚠️ THIS CANNOT BE UNDONE! ⚠️\n\n' +
            'Are you absolutely sure you want to clear all storage?'
        );
        
        if (!confirmed) {
            return; // User cancelled
        }

        try {
            if (this.game) {
                await this.game.clearGameStorage();
            } else {
                // If no active game, create temporary storage manager
                const storageManager = new GameStorageManager();
                await storageManager.initialize();
                await storageManager.clearAllData();
            }
            
            this.showMessage('All storage cleared successfully!');
            await this.updateStorageStats();
        } catch (error) {
            console.error('Failed to clear storage:', error);
            alert('Failed to clear storage: ' + error.message);
        }
    }

    async exportGameData() {
        if (!this.game) {
            alert('No active game to export!');
            return;
        }

        try {
            if (this.game.storageManager && this.game.storageManager.exportGameData) {
                const gameData = await this.game.storageManager.exportGameData(this.game.gameId);
                
                // Create and download file
                const dataStr = JSON.stringify(gameData, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = `king-of-tokyo-${this.game.gameId}-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                this.showMessage('Game data exported successfully!');
            } else {
                alert('Export functionality not available');
            }
        } catch (error) {
            console.error('Failed to export game data:', error);
            alert('Failed to export game data: ' + error.message);
        }
    }

    async updateStorageStats() {
        if (!this.elements.storageStats) return;

        try {
            const stats = this.game ? await this.game.getStorageStats() : null;
            
            if (stats) {
                const statsText = `📊 Storage Statistics:
📦 Total Games: ${stats.totalGames}
📝 Total Log Entries: ${stats.totalLogEntries}
💾 Storage Used: ${stats.storageUsed}
🔧 Storage Type: ${stats.storageType}
🎮 Current Game: ${this.game.gameId || 'None'}
📈 Memory Entries: ${this.game.logChunkSize || 0}/${this.game.maxMemoryEntries || 0}`;

                this.elements.storageStats.textContent = statsText;
            } else {
                this.elements.storageStats.textContent = '❌ No storage system active';
            }
        } catch (error) {
            console.error('Failed to get storage stats:', error);
            this.elements.storageStats.textContent = '⚠️ Error getting storage statistics';
        }
    }

    getHealthBarClass(health, maxHealth) {
        return UIUtilities.getHealthBarClass(health, maxHealth);
    }

    toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        
        // Save preference to localStorage
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
    }

    // Initialize dark mode from saved preference
    initializeDarkMode() {
        const savedDarkMode = localStorage.getItem('darkMode');
        if (savedDarkMode === 'true') {
            document.body.classList.add('dark-mode');
            if (this.elements.darkModeToggle) {
                this.elements.darkModeToggle.checked = true;
            }
        }
    }
}

// Note: Game initialization is now handled by the splash screen
// Note: Game initialization is now handled by the splash screen
