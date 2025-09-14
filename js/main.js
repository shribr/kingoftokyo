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
        this.playerTiles = []; // Track player tile assignments
        this.draggedMonster = null; // Track currently dragged monster
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeDragAndDrop();
        this.initializeDarkMode();
        this.initializeMonsterProfiles();
        this.initializeSettings();
        this.initializeResponsivePanels();
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
            // Screen elements
            splashScreen: document.getElementById('splash-screen'),
            gameContainer: document.getElementById('game-container'),
            
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
            playerTilesGrid: document.getElementById('player-tiles-grid'),
            resetMonstersBtn: document.getElementById('reset-monsters'),
            randomSelectionBtn: document.getElementById('random-selection-btn'),
            monsterProfilesBtn: document.getElementById('monster-profiles-btn'),
            startGameBtn: document.getElementById('start-game'),
            
            // Monster Profiles Modal
            monsterProfilesModal: document.getElementById('monster-profiles-modal'),
            monsterProfilesGrid: document.getElementById('monster-profiles-grid'),
            closeMonsterProfiles: document.getElementById('close-monster-profiles'),
            resetProfilesBtn: document.getElementById('reset-profiles-btn'),
            saveProfilesBtn: document.getElementById('save-profiles-btn'),
            
            // Game elements
            roundCounter: document.getElementById('round-counter'),
            playersContainer: document.getElementById('players-container'),
            tokyoCitySlot: document.getElementById('tokyo-city-monster'),
            tokyoBaySlot: document.getElementById('tokyo-bay-monster'),
            
            // Dice elements
            diceArea: document.getElementById('dice-area'),
            diceContainer: document.getElementById('dice-container'),
            actionMenu: document.getElementById('action-menu'),
            rollDiceBtn: document.getElementById('roll-dice'),
            keepDiceBtn: document.getElementById('keep-dice'),
            endTurnBtn: document.getElementById('end-turn'),
            // buyCardsBtn: document.getElementById('buy-cards'),
            rollsLeft: document.getElementById('rolls-left'),
            
            // Cards elements
            // currentEnergy: document.getElementById('current-energy'),
            availableCards: document.getElementById('available-cards'),
            activePlayerArea: document.getElementById('active-player-area'),
            
            // Game over elements
            winnerAnnouncement: document.getElementById('winner-announcement'),
            newGameBtn: document.getElementById('new-game'),
            
            // Toolbar elements
            exitGameBtn: document.getElementById('exit-game-btn'),
            resetPositionsBtn: document.getElementById('reset-positions-btn'),
            gameLogBtn: document.getElementById('game-log-btn'),
            storageMgmtBtn: document.getElementById('storage-mgmt-btn'),
            saveGameToolbarBtn: document.getElementById('save-game-toolbar-btn'),
            settingsBtn: document.getElementById('settings-btn'),
            instructionsBtn: document.getElementById('instructions-btn'),
            gameLogModal: document.getElementById('game-log-modal'),
            storageMgmtModal: document.getElementById('storage-mgmt-modal'),
            settingsModal: document.getElementById('settings-modal'),
            instructionsModal: document.getElementById('instructions-modal'),
            exitConfirmationModal: document.getElementById('exit-confirmation-modal'),
            exitCancelBtn: document.getElementById('exit-cancel-btn'),
            exitConfirmBtn: document.getElementById('exit-confirm-btn'),
            closeExitConfirmation: document.getElementById('close-exit-confirmation'),
            gameLogContent: document.getElementById('game-log-content'),
            clearLogBtn: document.getElementById('clear-log-btn'),
            scrollToTopBtn: document.getElementById('scroll-to-top-btn'),
            scrollToBottomBtn: document.getElementById('scroll-to-bottom-btn'),
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
            saveSettingsBtn: document.getElementById('save-settings'),
            resetSettingsBtn: document.getElementById('reset-settings'),
            cpuSpeedRadios: document.querySelectorAll('input[name="cpu-speed"]'),
            thoughtBubblesToggle: document.getElementById('thought-bubbles-toggle'),
            closeInstructionsBtn: document.getElementById('close-instructions'),
            closeGameOverBtn: document.getElementById('close-game-over'),
            darkModeToggle: document.getElementById('dark-mode-toggle')
        };
        
        // Debug: Check which elements are null - categorize as critical vs optional
        const nullElements = [];
        const criticalElements = [
            'splashScreen', 'gameContainer', 'setupModal', 'playerCount', 
            'dropdownSelected', 'dropdownOptions', 'startGameBtn', 'diceContainer',
            'rollDiceBtn', 'keepDiceBtn', 'endTurnBtn', 'playersContainer'
        ];
        
        for (const [key, element] of Object.entries(this.elements)) {
            if (!element) {
                nullElements.push(key);
            }
        }
        
        if (nullElements.length > 0) {
            const criticalMissing = nullElements.filter(el => criticalElements.includes(el));
            const optionalMissing = nullElements.filter(el => !criticalElements.includes(el));
            
            if (criticalMissing.length > 0) {
                console.error('CRITICAL: Missing required elements:', criticalMissing);
            }
            if (optionalMissing.length > 0) {
                console.warn('Optional elements not found:', optionalMissing);
            }
        } else {
            console.log('✅ All DOM elements found successfully');
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
        this.elements.dropdownSelected.addEventListener('click', (e) => {
            console.log('dropdownSelected clicked');
            e.stopPropagation(); // Prevent event bubbling to modal
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

        // Random selection button event
        this.elements.randomSelectionBtn.addEventListener('click', () => {
            this.randomizeMonsterSelection();
        });

        // Reset monsters button event
        this.elements.resetMonstersBtn.addEventListener('click', () => {
            this.resetMonsterSelection();
        });

        // Monster profiles button event
        this.elements.monsterProfilesBtn.addEventListener('click', () => {
            this.showMonsterProfilesModal();
        });

        // Monster profiles modal events
        this.elements.closeMonsterProfiles.addEventListener('click', () => {
            this.hideMonsterProfilesModal();
        });

        this.elements.resetProfilesBtn.addEventListener('click', () => {
            this.resetMonsterProfiles();
        });

        this.elements.saveProfilesBtn.addEventListener('click', () => {
            this.saveMonsterProfiles();
            this.showMessage('Monster profiles saved!');
            this.hideMonsterProfilesModal();
        });

        // Close modal when clicking outside
        this.elements.monsterProfilesModal.addEventListener('click', (e) => {
            if (e.target === this.elements.monsterProfilesModal) {
                this.hideMonsterProfilesModal();
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
                        this.game.resolveDiceEffects(results, true); // Skip dice log for forced resolution
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
        this.elements.exitGameBtn.addEventListener('click', () => {
            this.exitToSplashScreen();
        });

        this.elements.resetPositionsBtn.addEventListener('click', () => {
            this.resetDraggablePositions();
        });

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

        this.elements.instructionsBtn.addEventListener('click', () => {
            this.showInstructions();
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

        this.elements.closeInstructionsBtn.addEventListener('click', () => {
            UIUtilities.hideModal(this.elements.instructionsModal);
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

        // Settings save button using UIUtilities
        UIUtilities.safeAddEventListener(this.elements.saveSettingsBtn, 'click', 
            () => this.saveSettings(), 
            'Save settings button not found');

        // Settings reset button using UIUtilities
        UIUtilities.safeAddEventListener(this.elements.resetSettingsBtn, 'click', 
            () => this.resetSettings(), 
            'Reset settings button not found');

        // Exit confirmation modal listeners
        UIUtilities.safeAddEventListener(this.elements.exitCancelBtn, 'click',
            () => this.hideExitConfirmationModal(),
            'Exit cancel button not found');
            
        UIUtilities.safeAddEventListener(this.elements.exitConfirmBtn, 'click',
            () => this.confirmExitToSplashScreen(),
            'Exit confirm button not found');
            
        UIUtilities.safeAddEventListener(this.elements.closeExitConfirmation, 'click',
            () => this.hideExitConfirmationModal(),
            'Close exit confirmation button not found');

        // Game over modal close button using UIUtilities
        UIUtilities.safeAddEventListener(this.elements.closeGameOverBtn, 'click', 
            () => this.closeGameOverModal(), 
            'Close game over button not found');

        this.elements.clearLogBtn.addEventListener('click', () => {
            this.clearGameLog();
        });

        // Game log scroll buttons
        this.elements.scrollToTopBtn.addEventListener('click', () => {
            this.scrollGameLogToTop();
        });

        this.elements.scrollToBottomBtn.addEventListener('click', () => {
            this.scrollGameLogToBottom();
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

        UIUtilities.safeAddEventListener(this.elements.instructionsModal, 'click', 
            UIUtilities.createModalClickOutsideHandler(this.elements.instructionsModal));

        // Close setup modal when clicking outside and return to splash screen
        UIUtilities.safeAddEventListener(this.elements.setupModal, 'click', (e) => {
            if (e.target === this.elements.setupModal) {
                this.hideSetupModal();
                this.showSplashScreen();
            }
        });

        // Panel toggle event listeners
        const monstersHeader = document.getElementById('monsters-header');
        const powerCardsHeader = document.getElementById('power-cards-header');

        if (monstersHeader) {
            monstersHeader.addEventListener('click', () => {
                this.togglePanel('monsters');
            });
        }

        if (powerCardsHeader) {
            powerCardsHeader.addEventListener('click', () => {
                this.togglePanel('power-cards');
            });
        }
    }

    // Initialize drag and drop functionality for moveable components
    initializeDragAndDrop() {
        const draggableElements = document.querySelectorAll('.draggable');
        
        draggableElements.forEach(element => {
            let isDragging = false;
            let currentX = 0;
            let currentY = 0;
            let initialX = 0;
            let initialY = 0;
            let xOffset = 0;
            let yOffset = 0;

            // Get drag handle or use the whole element
            const dragHandle = element.querySelector('.drag-handle') || element;

            dragHandle.addEventListener('mousedown', dragStart);
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);

            // Touch events for mobile
            dragHandle.addEventListener('touchstart', dragStart);
            document.addEventListener('touchmove', drag);
            document.addEventListener('touchend', dragEnd);

            function dragStart(e) {
                // Prevent dragging when clicking on buttons
                if (e.target.tagName === 'BUTTON') {
                    return;
                }

                e.preventDefault();
                element.classList.add('dragging');

                if (e.type === 'touchstart') {
                    initialX = e.touches[0].clientX - xOffset;
                    initialY = e.touches[0].clientY - yOffset;
                } else {
                    initialX = e.clientX - xOffset;
                    initialY = e.clientY - yOffset;
                }

                isDragging = true;
            }

            function drag(e) {
                if (!isDragging) return;

                e.preventDefault();

                if (e.type === 'touchmove') {
                    currentX = e.touches[0].clientX - initialX;
                    currentY = e.touches[0].clientY - initialY;
                } else {
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                }

                xOffset = currentX;
                yOffset = currentY;

                // Keep element within viewport bounds
                const rect = element.getBoundingClientRect();
                const maxX = window.innerWidth - rect.width;
                const maxY = window.innerHeight - rect.height;

                currentX = Math.max(0, Math.min(currentX, maxX));
                currentY = Math.max(0, Math.min(currentY, maxY));

                element.style.transform = `translate(${currentX}px, ${currentY}px)`;
                
                // Ensure element uses absolute positioning when dragged
                if (!element.style.position || element.style.position === 'static') {
                    element.style.position = 'fixed';
                }
                
                // Debug logging
                console.log(`Dragging ${element.id}: transform = "${element.style.transform}"`);
            }

            function dragEnd(e) {
                if (!isDragging) return;

                isDragging = false;
                element.classList.remove('dragging');

                // Save position to localStorage
                const elementId = element.id;
                if (elementId) {
                    localStorage.setItem(`${elementId}-position`, JSON.stringify({
                        x: currentX,
                        y: currentY
                    }));
                }
            }

            // Restore saved position on load
            const elementId = element.id;
            if (elementId) {
                const savedPosition = localStorage.getItem(`${elementId}-position`);
                if (savedPosition) {
                    try {
                        const position = JSON.parse(savedPosition);
                        currentX = position.x;
                        currentY = position.y;
                        xOffset = currentX;
                        yOffset = currentY;
                        element.style.transform = `translate(${currentX}px, ${currentY}px)`;
                        element.style.position = 'fixed';
                        console.log(`Restored position for ${elementId}: ${currentX}, ${currentY}, transform = "${element.style.transform}"`);
                    } catch (e) {
                        console.warn('Failed to restore position for', elementId);
                    }
                } else {
                    console.log(`No saved position found for ${elementId}`);
                }
            }
        });
    }

    // Reset all draggable elements to their default positions
    resetDraggablePositions() {
        const draggableElements = document.querySelectorAll('.draggable');
        
        draggableElements.forEach(element => {
            // Clear the transform style to return to CSS default position
            element.style.transform = '';
            element.style.position = '';
            
            // Remove saved position from localStorage
            const elementId = element.id;
            if (elementId) {
                localStorage.removeItem(`${elementId}-position`);
            }
        });
        
        // Show confirmation message
        this.showMessage('Layout positions reset to default!', 2000);
    }

    // Show setup modal
    showSetupModal() {
        // Hide the game toolbar during setup
        const gameToolbar = document.getElementById('game-toolbar');
        if (gameToolbar) {
            gameToolbar.classList.remove('show');
        }
        
        // Clean up any existing active player container to prevent z-index conflicts
        const existingActivePlayerContainer = document.getElementById('active-player-container');
        if (existingActivePlayerContainer) {
            existingActivePlayerContainer.remove();
        }
        
        UIUtilities.showModal(this.elements.setupModal);
        
        // Reset dropdown to ensure it's functional
        this.resetDropdown();
        
        // Update monster selection
        this.updateMonsterSelection();
        
        // Ensure monsters are properly initialized after a short delay
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

    // Show splash screen
    showSplashScreen() {
        // Hide the game container
        if (this.elements.gameContainer) {
            this.elements.gameContainer.classList.remove('show');
        }
        
        // Clean up any existing active player container from previous game
        const existingActivePlayerContainer = document.getElementById('active-player-container');
        if (existingActivePlayerContainer) {
            existingActivePlayerContainer.remove();
        }
        
        // Show the splash screen
        if (this.elements.splashScreen) {
            this.elements.splashScreen.classList.remove('fade-out');
            this.elements.splashScreen.style.display = 'flex';
        }
        
        // Hide the game toolbar during splash
        const gameToolbar = document.getElementById('game-toolbar');
        if (gameToolbar) {
            gameToolbar.classList.remove('show');
        }
        
        // Ensure any open dropdowns are closed
        this.closeDropdown();
    }

    // Custom dropdown methods
    toggleDropdown() {
        console.log('toggleDropdown called, current classes:', this.elements.playerCount?.className);
        this.elements.playerCount.classList.toggle('open');
        console.log('toggleDropdown after toggle, classes:', this.elements.playerCount?.className);
    }

    closeDropdown() {
        this.elements.playerCount.classList.remove('open');
    }

    // Reset dropdown to ensure it's functional
    resetDropdown() {
        console.log('resetDropdown called');
        
        // Ensure dropdown is closed
        this.closeDropdown();
        
        // Reset the dropdown text to default
        if (this.elements.dropdownSelected) {
            const arrow = this.elements.dropdownSelected.querySelector('.dropdown-arrow');
            this.elements.dropdownSelected.textContent = '4 Players';
            if (arrow) {
                this.elements.dropdownSelected.appendChild(arrow);
            }
        }
        
        // Ensure currentPlayerCount is set
        this.currentPlayerCount = 4;
        
        // Clear any inline styles that might interfere with dropdown
        if (this.elements.dropdownOptions) {
            this.elements.dropdownOptions.style.cssText = '';
        }
        if (this.elements.playerCount) {
            this.elements.playerCount.style.cssText = '';
        }
        
        // Add a small delay to ensure the modal is fully shown and ready
        setTimeout(() => {
            console.log('dropdown reset completed with delay');
            console.log('playerCount classes:', this.elements.playerCount?.className);
            console.log('dropdownOptions display style:', window.getComputedStyle(this.elements.dropdownOptions).display);
        }, 50);
    }

    selectPlayerCount(value, text) {
        this.currentPlayerCount = value;
        // Update the dropdown text - the text is directly in dropdown-selected, not in a child element
        const dropdownSelected = this.elements.dropdownSelected;
        if (dropdownSelected) {
            // Keep the arrow but update the text
            const arrow = dropdownSelected.querySelector('.dropdown-arrow');
            dropdownSelected.textContent = text;
            if (arrow) {
                dropdownSelected.appendChild(arrow);
            }
        }
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
        console.log('👺 Player tiles grid element:', !!this.elements.playerTilesGrid);
        
        // Debug: Check if MONSTERS is available
        if (typeof MONSTERS === 'undefined') {
            console.error('❌ MONSTERS object is not defined! Check if monsters.js is loaded.');
            console.error('❌ Available global objects:', Object.keys(window));
            return;
        }
        
        const monsters = Object.values(MONSTERS);
        console.log('👺 Available monsters:', monsters.length, monsters);
        
        // Debug: Check if elements exist
        if (!this.elements.monsterGrid || !this.elements.playerTilesGrid) {
            console.error('❌ Required grid elements missing!');
            console.error('❌ Monster grid:', !!this.elements.monsterGrid);
            console.error('❌ Player tiles grid:', !!this.elements.playerTilesGrid);
            return;
        }
        
        // Reset state
        this.selectedMonsters = [];
        this.playerTiles = [];
        
        // Initialize player tiles
        for (let i = 0; i < this.currentPlayerCount; i++) {
            this.playerTiles.push({
                index: i,
                type: i === 0 ? 'human' : 'cpu', // First tile is human, rest are CPU
                monster: null,
                occupied: false
            });
        }
        
        // Generate monster cards HTML
        const monstersHTML = monsters.map(monster => `
            <div class="monster-option" 
                 data-monster-id="${monster.id}" 
                 draggable="true">
                <div class="monster-image-container">
                    <img src="${monster.image}" alt="${monster.name}" class="monster-image" />
                </div>
                <div class="monster-name">${monster.name}</div>
            </div>
        `).join('');
        
        this.elements.monsterGrid.innerHTML = monstersHTML;
        
        // Generate player tiles HTML
        const playerTilesHTML = this.playerTiles.map((tile, index) => {
            const isHuman = tile.type === 'human';
            const icon = isHuman ? this.getHumanIcon() : this.getCPUIcon();
            const label = isHuman ? 'Human Player' : 'CPU Player';
            
            return `
                <div class="player-tile ${tile.type}" 
                     data-tile-index="${index}"
                     data-player-type="${tile.type}">
                    <div class="player-tile-icon">${icon}</div>
                    <div class="player-tile-label">${label}</div>
                </div>
            `;
        }).join('');
        
        this.elements.playerTilesGrid.innerHTML = playerTilesHTML;
        
        // Update layout classes based on player count
        const playerTilesSection = this.elements.playerTilesGrid.closest('.player-tiles-section');
        if (this.currentPlayerCount >= 5) {
            this.elements.playerTilesGrid.classList.add('five-six-players');
            if (playerTilesSection) {
                playerTilesSection.classList.add('five-six-players');
            }
        } else {
            this.elements.playerTilesGrid.classList.remove('five-six-players');
            if (playerTilesSection) {
                playerTilesSection.classList.remove('five-six-players');
            }
        }
        
        // Set up drag and drop event listeners
        this.setupDragAndDrop();
        
        // Set up rotation classes for monster options
        const monsterOptions = this.elements.monsterGrid.querySelectorAll('.monster-option');
        monsterOptions.forEach((option, index) => {
            const rotationClass = `rotate-${(index % 6) + 1}`;
            option.classList.add(rotationClass);
        });
        
        this.updateStartButton();
    }
    
    // Get CPU icon (simple SVG or Unicode character)
    getCPUIcon() {
        return 'CPU'; // Simple text glyph that matches the comic book theme
    }
    
    // Get human icon  
    getHumanIcon() {
        return '?'; // Question mark in Bangers font will look comic book style
    }
    
    // Setup drag and drop functionality
    setupDragAndDrop() {
        const monsterOptions = this.elements.monsterGrid.querySelectorAll('.monster-option');
        const playerTiles = this.elements.playerTilesGrid.querySelectorAll('.player-tile');
        
        // Add drag events to monster cards
        monsterOptions.forEach(option => {
            option.addEventListener('dragstart', (e) => this.handleDragStart(e));
            option.addEventListener('dragend', (e) => this.handleDragEnd(e));
            
            // Add touch events for mobile support
            option.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
            option.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
            option.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        });
        
        // Add drop events to player tiles
        playerTiles.forEach(tile => {
            tile.addEventListener('dragover', (e) => this.handleDragOver(e));
            tile.addEventListener('dragenter', (e) => this.handleDragEnter(e));
            tile.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            tile.addEventListener('drop', (e) => this.handleDrop(e));
            
            // Add click event to toggle player type (human/CPU) if not occupied
            tile.addEventListener('click', (e) => this.handleTileClick(e));
            
            // Add double-click event to remove monster if occupied
            tile.addEventListener('dblclick', (e) => this.handleTileDoubleClick(e));
        });
    }
    
    // Handle tile click to toggle player type
    handleTileClick(e) {
        const tile = e.target.closest('.player-tile');
        if (!tile || tile.classList.contains('occupied')) {
            return; // Don't allow changes to occupied tiles
        }
        
        const tileIndex = parseInt(tile.dataset.tileIndex);
        const currentType = this.playerTiles[tileIndex].type;
        
        // Toggle between human and cpu
        const newType = currentType === 'human' ? 'cpu' : 'human';
        this.playerTiles[tileIndex].type = newType;
        
        // Update tile visual and classes
        tile.classList.remove('human', 'cpu');
        tile.classList.add(newType);
        tile.dataset.playerType = newType;
        
        const icon = newType === 'human' ? this.getHumanIcon() : this.getCPUIcon();
        const label = newType === 'human' ? 'Human Player' : 'CPU Player';
        
        tile.innerHTML = `
            <div class="player-tile-icon">${icon}</div>
            <div class="player-tile-label">${label}</div>
        `;
        
        console.log(`Tile ${tileIndex} changed to ${newType}`);
        
        this.updateStartButton();
    }
    
    // Handle tile double-click to remove monster
    handleTileDoubleClick(e) {
        const tile = e.target.closest('.player-tile');
        if (!tile || !tile.classList.contains('occupied')) {
            return; // Nothing to remove
        }
        
        const tileIndex = parseInt(tile.dataset.tileIndex);
        const monster = this.playerTiles[tileIndex].monster;
        
        if (!monster) return;
        
        console.log(`Removing monster ${monster.name} from tile ${tileIndex}`);
        
        // Reset tile state
        this.playerTiles[tileIndex].monster = null;
        this.playerTiles[tileIndex].occupied = false;
        
        // Reset tile visual and colors
        const tileType = this.playerTiles[tileIndex].type;
        const icon = tileType === 'human' ? this.getHumanIcon() : this.getCPUIcon();
        const label = tileType === 'human' ? 'Human Player' : 'CPU Player';
        
        tile.innerHTML = `
            <div class="player-tile-icon">${icon}</div>
            <div class="player-tile-label">${label}</div>
        `;
        tile.classList.remove('occupied');
        
        // Reset tile colors to original theme
        tile.style.background = '';
        tile.style.borderColor = '';
        tile.style.backgroundImage = '';
        tile.style.backgroundSize = '';
        
        // Restore the monster card to normal appearance
        const monsterCard = this.elements.monsterGrid.querySelector(`[data-monster-id="${monster.id}"]`);
        if (monsterCard) {
            monsterCard.classList.remove('grayed-out');
            monsterCard.style.opacity = '';
            monsterCard.style.filter = '';
            monsterCard.style.pointerEvents = ''; // Re-enable dragging
        }
        
        // Update selected monsters array
        this.selectedMonsters = this.playerTiles
            .filter(tile => tile.occupied)
            .map(tile => tile.monster);
        
        this.updateStartButton();
    }
    
    // Drag event handlers
    handleDragStart(e) {
        const monsterId = e.target.closest('.monster-option').dataset.monsterId;
        this.draggedMonster = MONSTERS[monsterId];
        e.target.closest('.monster-option').classList.add('dragging');
        e.dataTransfer.setData('text/plain', monsterId);
        console.log('Drag started for monster:', this.draggedMonster.name);
    }
    
    handleDragEnd(e) {
        e.target.closest('.monster-option').classList.remove('dragging');
        this.draggedMonster = null;
        
        // Remove drop-target class from all tiles
        this.elements.playerTilesGrid.querySelectorAll('.player-tile').forEach(tile => {
            tile.classList.remove('drop-target');
        });
    }

    // Touch event handlers for mobile drag-and-drop
    handleTouchStart(e) {
        e.preventDefault();
        const monsterId = e.target.closest('.monster-option').dataset.monsterId;
        this.draggedMonster = MONSTERS[monsterId];
        this.touchStartElement = e.target.closest('.monster-option');
        this.touchStartElement.classList.add('dragging');
        
        // Store initial touch position
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        
        console.log('Touch drag started for monster:', this.draggedMonster.name);
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        if (!this.draggedMonster) return;
        
        const touch = e.touches[0];
        const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
        const tile = elementUnderTouch?.closest('.player-tile');
        
        // Remove drop-target from all tiles first
        this.elements.playerTilesGrid.querySelectorAll('.player-tile').forEach(t => {
            t.classList.remove('drop-target');
        });
        
        // Add drop-target to valid tiles
        if (tile && !tile.classList.contains('occupied')) {
            tile.classList.add('drop-target');
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        if (!this.draggedMonster) return;
        
        const touch = e.changedTouches[0];
        const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
        const tile = elementUnderTouch?.closest('.player-tile');
        
        if (tile && !tile.classList.contains('occupied')) {
            // Simulate a drop event
            const tileIndex = parseInt(tile.dataset.tileIndex);
            console.log('Touch dropped monster', this.draggedMonster.name, 'on tile', tileIndex);
            
            // Update tile state
            this.playerTiles[tileIndex].monster = this.draggedMonster;
            this.playerTiles[tileIndex].occupied = true;
            
            // Generate monster-themed colors
            const monsterColor = this.draggedMonster.color;
            const lighterColor = this.lightenColor(monsterColor, 30);
            const evenLighterColor = this.lightenColor(monsterColor, 60);
            
            // Update tile visual with monster theme
            tile.innerHTML = `
                <img src="${this.draggedMonster.image}" alt="${this.draggedMonster.name}" class="monster-image-small" />
                <div class="monster-name-small">${this.draggedMonster.name}</div>
            `;
            tile.classList.add('occupied');
            tile.classList.remove('drop-target');
            
            // Apply monster color theme to the tile
            tile.style.setProperty('background', `linear-gradient(135deg, ${evenLighterColor} 0%, ${lighterColor} 50%, ${monsterColor} 100%)`, 'important');
            tile.style.borderColor = monsterColor;
            
            // Gray out the monster from the available options instead of hiding
            const monsterOption = this.elements.monsterGrid.querySelector(`[data-monster-id="${this.draggedMonster.id}"]`);
            if (monsterOption) {
                monsterOption.classList.add('grayed-out');
            }
            
            // Update button state and regenerate layout
            this.updateStartButton();
            this.regeneratePlayerTiles();
        }
        
        // Clean up
        if (this.touchStartElement) {
            this.touchStartElement.classList.remove('dragging');
        }
        this.draggedMonster = null;
        this.touchStartElement = null;
        
        // Remove drop-target class from all tiles
        this.elements.playerTilesGrid.querySelectorAll('.player-tile').forEach(tile => {
            tile.classList.remove('drop-target');
        });
    }
    
    handleDragOver(e) {
        e.preventDefault(); // Allow drop
    }
    
    handleDragEnter(e) {
        e.preventDefault();
        const tile = e.target.closest('.player-tile');
        if (tile && !tile.classList.contains('occupied')) {
            tile.classList.add('drop-target');
        }
    }
    
    handleDragLeave(e) {
        const tile = e.target.closest('.player-tile');
        if (tile && !tile.contains(e.relatedTarget)) {
            tile.classList.remove('drop-target');
        }
    }
    
    handleDrop(e) {
        e.preventDefault();
        const tile = e.target.closest('.player-tile');
        const monsterId = e.dataTransfer.getData('text/plain');
        const monster = MONSTERS[monsterId];
        
        if (!tile || tile.classList.contains('occupied')) {
            console.log('Invalid drop target');
            return;
        }
        
        const tileIndex = parseInt(tile.dataset.tileIndex);
        console.log('Dropped monster', monster.name, 'on tile', tileIndex);
        
        // Update tile state
        this.playerTiles[tileIndex].monster = monster;
        this.playerTiles[tileIndex].occupied = true;
        
        // Generate monster-themed colors
        const monsterColor = monster.color;
        const lighterColor = this.lightenColor(monsterColor, 30);
        const evenLighterColor = this.lightenColor(monsterColor, 60);
        
        // Update tile visual with monster theme
        tile.innerHTML = `
            <img src="${monster.image}" alt="${monster.name}" class="monster-image-small" />
            <div class="monster-name-small">${monster.name}</div>
        `;
        tile.classList.add('occupied');
        tile.classList.remove('drop-target');
        
        // Apply monster color theme to the tile
        tile.style.setProperty('background', `linear-gradient(135deg, ${evenLighterColor} 0%, ${lighterColor} 50%, ${monsterColor} 100%)`, 'important');
        tile.style.borderColor = monsterColor;
        tile.style.setProperty('background-image', `
            radial-gradient(circle at 3px 3px, rgba(0,0,0,0.08) 1px, transparent 0),
            linear-gradient(135deg, ${evenLighterColor} 0%, ${lighterColor} 50%, ${monsterColor} 100%)
        `, 'important');
        tile.style.backgroundSize = '15px 15px, 100% 100%';
        
        // Gray out the selected monster card
        const monsterCard = this.elements.monsterGrid.querySelector(`[data-monster-id="${monsterId}"]`);
        if (monsterCard) {
            monsterCard.classList.add('grayed-out');
            monsterCard.style.opacity = '0.4';
            monsterCard.style.filter = 'grayscale(100%)';
            monsterCard.style.pointerEvents = 'none'; // Disable dragging
        }
        
        // Update selected monsters array
        this.selectedMonsters = this.playerTiles
            .filter(tile => tile.occupied)
            .map(tile => tile.monster);
        
        this.updateStartButton();
    }

    // Randomize monster selection
    randomizeMonsterSelection() {
        if (!this.currentPlayerCount || this.currentPlayerCount === 0) {
            alert('Please select the number of players first!');
            return;
        }

        // Clear any existing selections and reset monster cards
        this.selectedMonsters = [];
        this.playerTiles.forEach(tile => {
            tile.monster = null;
            tile.occupied = false;
        });
        
        // Reset all monster cards to normal appearance
        this.resetMonsterCards();

        // Get all available monsters from the displayed monster cards
        const availableMonsters = Object.values(MONSTERS);
        
        // Shuffle the monsters array
        const shuffledMonsters = [...availableMonsters].sort(() => Math.random() - 0.5);
        
        // Get only CPU tiles for random assignment
        const cpuTiles = this.playerTiles.filter(tile => tile.type === 'cpu');
        
        // Check if we have enough monsters for the CPU tiles
        if (cpuTiles.length > shuffledMonsters.length) {
            alert('Not enough monsters available for all CPU players!');
            return;
        }
        
        // Assign random monsters only to CPU tiles
        cpuTiles.forEach((tile, index) => {
            if (index < shuffledMonsters.length) {
                tile.monster = shuffledMonsters[index];
                tile.occupied = true;
            }
        });

        // Update selected monsters array to match drag-and-drop format
        this.selectedMonsters = this.playerTiles
            .filter(tile => tile.occupied)
            .map(tile => tile.monster);

        // Update the visual representation
        this.updatePlayerTileVisuals();
        this.grayOutSelectedMonsters();
        this.updateStartButton();
        
        console.log('Random selection completed:', this.selectedMonsters);
    }

    // Reset monster selection - clears all selected monsters and allows user to start again
    resetMonsterSelection() {
        console.log('🔄 Resetting monster selection...');
        
        // Clear selected monsters array
        this.selectedMonsters = [];
        
        // Reset all player tiles data
        this.playerTiles.forEach((tile, index) => {
            tile.monster = null;
            tile.occupied = false;
            
            // Find the corresponding DOM element and reset it
            const tileElement = document.querySelector(`[data-tile-index="${index}"]`);
            if (tileElement) {
                // Remove visual styling
                tileElement.classList.remove('occupied');
                tileElement.style.removeProperty('background');
                tileElement.style.removeProperty('border-color');
                tileElement.style.removeProperty('background-image');
                tileElement.style.removeProperty('background-size');
                
                // Reset tile content to default
                tileElement.innerHTML = `<span class="tile-label">${tile.type.toUpperCase()} ${tile.number}</span>`;
            }
        });
        
        // Reset all monster cards to normal appearance and make them visible/enabled
        this.resetMonsterCards();
        
        // Show all monster cards and re-enable them (in case they were hidden during drag-and-drop)
        const monsterCards = document.querySelectorAll('.monster-option');
        monsterCards.forEach(card => {
            card.style.display = '';
            card.style.pointerEvents = ''; // Re-enable dragging
            card.classList.remove('grayed-out', 'selected'); // Remove any disabled states
        });
        
        // Update UI
        this.updateStartButton();
        this.regeneratePlayerTiles();
        
        console.log('✅ Monster selection reset completed');
    }

    // Reset monster cards to normal appearance
    resetMonsterCards() {
        const monsterCards = document.querySelectorAll('.monster-option');
        monsterCards.forEach(card => {
            // Remove all visual states
            card.classList.remove('selected', 'grayed-out', 'dragging');
            
            // Reset all inline styles that might have been applied
            card.style.opacity = '';
            card.style.filter = '';
            card.style.display = '';
            card.style.pointerEvents = '';
            
            // Ensure the card is visible and interactive
            card.style.visibility = '';
            card.style.transform = '';
        });
    }

    // Gray out selected monster cards
    grayOutSelectedMonsters() {
        // Handle both formats: direct monster objects and {monster: object} wrapper format
        const selectedMonsterIds = this.selectedMonsters.map(item => {
            if (item && item.monster && item.monster.id) {
                return item.monster.id; // Drag-and-drop format
            } else if (item && item.id) {
                return item.id; // Direct monster object format (from random selection)
            }
            return null;
        }).filter(id => id !== null);
        
        selectedMonsterIds.forEach(monsterId => {
            const monsterCard = document.querySelector(`[data-monster-id="${monsterId}"]`);
            if (monsterCard) {
                monsterCard.classList.add('grayed-out');
                monsterCard.style.opacity = '0.4';
                monsterCard.style.filter = 'grayscale(100%)';
                monsterCard.style.pointerEvents = 'none'; // Disable dragging
            }
        });
    }

    // Update player tile visuals after assignment
    updatePlayerTileVisuals() {
        this.playerTiles.forEach((tile, index) => {
            const tileElement = document.querySelector(`[data-tile-index="${index}"]`);
            if (tileElement) {
                if (tile.occupied && tile.monster) {
                    const monster = tile.monster;
                    
                    // Generate monster-themed colors
                    const monsterColor = monster.color;
                    const lighterColor = this.lightenColor(monsterColor, 30);
                    const evenLighterColor = this.lightenColor(monsterColor, 60);
                    
                    // Update tile visual with monster theme (same as drag-and-drop)
                    tileElement.innerHTML = `
                        <img src="${monster.image}" alt="${monster.name}" class="monster-image-small" />
                        <div class="monster-name-small">${monster.name}</div>
                    `;
                    tileElement.classList.add('occupied');
                    tileElement.classList.remove('drop-target');
                    
                    // Apply monster color theme to the tile
                    tileElement.style.setProperty('background', `linear-gradient(135deg, ${evenLighterColor} 0%, ${lighterColor} 50%, ${monsterColor} 100%)`, 'important');
                    tileElement.style.borderColor = monsterColor;
                    tileElement.style.setProperty('background-image', `
                        radial-gradient(circle at 3px 3px, rgba(0,0,0,0.08) 1px, transparent 0),
                        linear-gradient(135deg, ${evenLighterColor} 0%, ${lighterColor} 50%, ${monsterColor} 100%)
                    `, 'important');
                    tileElement.style.backgroundSize = '15px 15px, 100% 100%';
                } else {
                    tileElement.classList.remove('occupied');
                    tileElement.style.background = '';
                    tileElement.style.borderColor = '';
                    tileElement.style.backgroundImage = '';
                    tileElement.style.backgroundSize = '';
                    
                    // Reset to original content
                    const isHuman = tile.type === 'human';
                    const iconContent = isHuman ? this.getHumanIcon() : this.getCPUIcon();
                    const labelContent = isHuman ? 'Human Player' : 'CPU Player';
                    
                    tileElement.innerHTML = `
                        <div class="player-tile-icon">${iconContent}</div>
                        <div class="player-tile-label">${labelContent}</div>
                    `;
                    tileElement.classList.add('drop-target');
                }
            }
        });
    }

    // Update start button state
    updateStartButton() {
        // Ensure selectedMonsters is in sync with occupied tiles
        this.selectedMonsters = this.playerTiles
            .filter(tile => tile.occupied)
            .map(tile => tile.monster);
        
        const hasPlayerCount = this.currentPlayerCount > 0;
        const monstersRequired = this.currentPlayerCount;
        
        // Check occupied tiles (this is the visual truth)
        const occupiedTiles = this.playerTiles.filter(tile => tile.occupied);
        const monstersSelected = occupiedTiles.length;
        const humanTiles = occupiedTiles.filter(tile => tile.type === 'human');
        const cpuTiles = occupiedTiles.filter(tile => tile.type === 'cpu');
        
        const hasRequiredPlayerTypes = this.currentPlayerCount === 1 || 
                                      humanTiles.length >= 1;
        
        const allTilesAssigned = monstersSelected === monstersRequired;
        const canStart = hasPlayerCount && allTilesAssigned && hasRequiredPlayerTypes;
        
        console.log('Update start button:', {
            hasPlayerCount,
            monstersSelected,
            monstersRequired,
            allTilesAssigned,
            hasRequiredPlayerTypes,
            humanTiles: humanTiles.length,
            cpuTiles: cpuTiles.length,
            canStart
        });
        
        this.elements.startGameBtn.disabled = !canStart;
        
        if (!hasPlayerCount) {
            this.elements.startGameBtn.textContent = 'Select Number of Players';
        } else if (!hasRequiredPlayerTypes && this.currentPlayerCount > 1) {
            this.elements.startGameBtn.textContent = 'Need at least 1 Human player';
        } else if (canStart) {
            this.elements.startGameBtn.textContent = 'Start Game';
        } else {
            const remaining = monstersRequired - monstersSelected;
            this.elements.startGameBtn.textContent = `Assign ${remaining} more monster${remaining !== 1 ? 's' : ''}`;
        }
    }

    // Start the game
    async startGame() {
        console.log('startGame called');
        console.log('Selected monsters count:', this.selectedMonsters.length);
        console.log('Current player count:', this.currentPlayerCount);
        
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
            
            // 1a. Log individual monster selections as follow-up entries with player types
            for (let i = 0; i < this.selectedMonsters.length; i++) {
                const monster = this.selectedMonsters[i];
                const playerTile = this.playerTiles[i];
                const playerTypeIcon = playerTile.type === 'human' ? '👤' : '🤖';
                await this.game.logSetupActionWithStorage(`    ├─ Player ${i + 1}: ${monster.name} (${playerTypeIcon} ${playerTile.type.toUpperCase()})`, 'monster-selection');
            }
            
            // 2. Log game start
            await this.game.logSetupActionWithStorage('🎯 Starting new King of Tokyo game!', 'game-start');
            
            // Prepare player types array
            const playerTypes = this.playerTiles.map(tile => tile.type);
            
            // Initialize game (this will also save initial game state)
            console.log('About to initialize game with monsters and player types:', this.selectedMonsters, playerTypes);
            const result = await this.game.initializeGame(this.selectedMonsters, this.currentPlayerCount, playerTypes);
            console.log('Game initialization result:', result);
            
            // 3. Log who goes first (after game initialization so we know the randomized starting player)
            if (result.success) {
                await this.game.logSetupActionWithStorage(`🎲 ${result.currentPlayer.monster.name} goes first!`, 'ready-to-start');
            }
            
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
                
                // Check if the first player is CPU and start their turn immediately
                setTimeout(() => {
                    const firstPlayer = this.game.getCurrentPlayer();
                    console.log('🔄 Post-initialization check - First player:', firstPlayer);
                    if (firstPlayer && firstPlayer.playerType === 'cpu') {
                        console.log('🤖 First player is CPU, starting turn immediately');
                        this.startAutomaticCPUTurn(firstPlayer);
                    } else if (firstPlayer) {
                        console.log('👤 First player is human:', firstPlayer.monster.name);
                    }
                }, 1000); // Check after 1 second to let the UI settle
                
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
            case 'showCPUThought':
                this.showCPUThoughtBubble(data.player, data.context);
                break;
            case 'cpuNotification':
                this.showCPUActionNotification(data);
                break;
            case 'turnEnded':
                this.cleanupAllThoughtBubbles();
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
                console.log('🎯 turnStarted event received:', data);
                this.clearAllAttackAnimations(); // Clear any stuck attack animations
                this.updateGameDisplay(); // Update UI to show new current player
                
                // Check if new current player is CPU and auto-start their turn
                const currentPlayer = this.game.getCurrentPlayer();
                console.log('🎯 Current player from game:', currentPlayer);
                console.log('🔍 DETAILED PLAYER DEBUG:', {
                    playerExists: !!currentPlayer,
                    playerType: currentPlayer?.playerType,
                    monsterName: currentPlayer?.monster?.name,
                    playerId: currentPlayer?.id,
                    playerNumber: currentPlayer?.playerNumber,
                    isEliminated: currentPlayer?.isEliminated,
                    fullPlayerObject: currentPlayer
                });
                
                // CRITICAL FIX: Only start CPU turn if player is actually CPU and not eliminated
                if (currentPlayer && 
                    currentPlayer.playerType === 'cpu' && 
                    !currentPlayer.isEliminated && 
                    !this.cpuTurnState) { // Don't start if CPU turn already in progress
                    
                    console.log('🤖 Current player is CPU, starting automatic turn in 2 seconds...');
                    setTimeout(() => {
                        // Double-check that it's still the same CPU player's turn
                        const stillCurrentPlayer = this.game.getCurrentPlayer();
                        if (stillCurrentPlayer && 
                            stillCurrentPlayer.id === currentPlayer.id && 
                            stillCurrentPlayer.playerType === 'cpu' &&
                            !this.cpuTurnState) {
                            console.log('🤖 Executing startAutomaticCPUTurn for:', currentPlayer.monster.name);
                            this.startAutomaticCPUTurn(currentPlayer);
                        } else {
                            console.log('🤖 CPU turn cancelled - player changed or CPU turn already active');
                        }
                    }, 2000);
                } else if (currentPlayer && currentPlayer.playerType !== 'cpu') {
                    console.log('👤 Current player is HUMAN, no automatic turn needed');
                } else if (this.cpuTurnState) {
                    console.log('🤖 CPU turn already in progress, not starting new one');
                } else if (currentPlayer) {
                    console.log('👤 Current player is human:', currentPlayer.monster.name);
                    console.log('👤 Human player should be able to take their turn now');
                } else {
                    console.log('❌ No current player found');
                }
                break;
            case 'logUpdated':
                this.updateGameLogDisplay(); // Update game log when new entries are added
                break;
            case 'playerEliminated':
                this.showPlayerEliminationDialog(data.eliminatedPlayer, data.attacker);
                // Force immediate UI update to reflect elimination and Tokyo changes
                this.updateGameDisplay();
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

    // Update complete game display with debouncing to prevent flickering
    updateGameDisplay() {
        console.log('updateGameDisplay called, game exists:', !!this.game);
        
        // Debouncing: Clear any pending update and schedule a new one
        if (this.updateGameDisplayTimeout) {
            clearTimeout(this.updateGameDisplayTimeout);
        }
        
        this.updateGameDisplayTimeout = setTimeout(() => {
            this._performGameDisplayUpdate();
            this.updateGameDisplayTimeout = null;
        }, 16); // ~60fps debouncing
    }
    
    // Internal method that performs the actual update
    _performGameDisplayUpdate() {
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
        
        // Update dice display appropriately based on game state
        // Don't overwrite rolled dice during gameplay
        const diceData = this.game.diceCollection.getAllDiceData();
        const allDiceEmpty = diceData.every(d => d.face === null || d.isDisabled);
        const anyDiceRolling = diceData.some(d => d.isRolling);
        const currentTurnPhase = this.game.currentTurnPhase;
        const diceState = this.game.diceRoller.getState();
        
        console.log(`🎲 Dice update check - Turn phase: ${currentTurnPhase}, All dice empty: ${allDiceEmpty}, Any rolling: ${anyDiceRolling}, Rolls remaining: ${diceState.rollsRemaining}`);
        
        // Always update the dice display to show current state, but only use "initial" display for truly initial states
        // Don't update during rolling animation to prevent flicker
        if (!anyDiceRolling) {
            if (allDiceEmpty && currentTurnPhase === 'rolling' && diceState.rollsRemaining === 3) {
                console.log(`🎲 Showing initial empty dice - start of turn`);
                this.updateInitialDiceDisplay();
            } else {
                console.log(`🎲 Showing current dice state - mid-game`);
                this.updateDiceDisplay(diceData);
            }
        } else {
            console.log(`🎲 Skipping dice update - dice are currently rolling`);
        }
        
        // Update cards
        this.updateCardsDisplay();
        
        // Update current player energy
        // this.elements.currentEnergy.textContent = gameState.currentPlayer.energy;
    }

    // Update players display - separate active player from stack with optimized updates
    updatePlayersDisplay(players) {
        const currentPlayer = this.game.getCurrentPlayer();
        
        // Check if current player has changed to determine if we need to rebuild layout
        const currentPlayerChanged = this.lastCurrentPlayerId !== currentPlayer.id;
        this.lastCurrentPlayerId = currentPlayer.id;
        
        if (currentPlayerChanged) {
            // Only rebuild the entire layout when the current player changes
            this._rebuildPlayerLayout(players, currentPlayer);
        } else {
            // Otherwise, just update the stats of existing cards
            this._updatePlayerStats(players);
        }
    }
    
    // Rebuild the entire player layout (called only when current player changes)
    _rebuildPlayerLayout(players, currentPlayer) {
        // Separate active and non-active players
        const nonActivePlayers = players.filter(player => player.id !== currentPlayer.id);
        const activePlayer = players.find(player => player.id === currentPlayer.id);
        
        // Render non-active players in the regular container
        this.elements.playersContainer.innerHTML = nonActivePlayers.map(player => this._generatePlayerHTML(player, false)).join('');
        
        // Create or update active player container
        let activePlayerContainer = document.getElementById('active-player-container');
        if (!activePlayerContainer) {
            activePlayerContainer = document.createElement('div');
            activePlayerContainer.id = 'active-player-container';
            activePlayerContainer.className = 'active-player-container';
            // Append to the dedicated active-player-area instead of body
            this.elements.activePlayerArea.appendChild(activePlayerContainer);
        }
        
        // Render active player in separate container
        if (activePlayer) {
            activePlayerContainer.innerHTML = this._generatePlayerHTML(activePlayer, true);
        }
        
        // Attach event listeners
        this.attachPowerCardTabListeners();
    }
    
    // Update only the stats of existing player cards (no flickering)
    _updatePlayerStats(players) {
        players.forEach(player => {
            const playerElement = document.querySelector(`[data-player-id="${player.id}"]`);
            if (playerElement) {
                // Update individual stat values without rebuilding the entire card
                const energyStat = playerElement.querySelector('.stat.energy .stat-value');
                const pointsStat = playerElement.querySelector('.stat.points .stat-value');
                const cardsStat = playerElement.querySelector('.stat.power-cards .stat-value');
                const healthLabel = playerElement.querySelector('.health-bar-label');
                const healthFill = playerElement.querySelector('.health-bar-fill');
                
                if (energyStat) energyStat.textContent = player.energy;
                if (pointsStat) pointsStat.textContent = player.victoryPoints;
                if (cardsStat) cardsStat.textContent = player.powerCards.length;
                if (healthLabel) healthLabel.textContent = `Health ${player.health}/${player.maxHealth}`;
                if (healthFill) {
                    healthFill.style.width = `${(player.health / player.maxHealth) * 100}%`;
                    healthFill.className = `health-bar-fill ${this.getHealthBarClass(player.health, player.maxHealth)}`;
                }
                
                // Update elimination status
                playerElement.classList.toggle('eliminated', player.isEliminated);
                
                // Update Tokyo status in name container
                const nameContainer = playerElement.querySelector('.player-name-container');
                const existingTokyoIndicator = nameContainer.querySelector('.tokyo-indicator-inline');
                if (player.isInTokyo) {
                    if (!existingTokyoIndicator) {
                        const tokyoIndicator = document.createElement('div');
                        tokyoIndicator.className = 'tokyo-indicator-inline';
                        tokyoIndicator.textContent = `In Tokyo ${player.tokyoLocation === 'city' ? 'City' : 'Bay'}`;
                        nameContainer.appendChild(tokyoIndicator);
                    } else {
                        existingTokyoIndicator.textContent = `In Tokyo ${player.tokyoLocation === 'city' ? 'City' : 'Bay'}`;
                    }
                } else if (existingTokyoIndicator) {
                    existingTokyoIndicator.remove();
                }
            }
        });
    }
    
    // Generate HTML for a single player card
    _generatePlayerHTML(player, isActive) {
        return `
            <div class="player-dashboard ${isActive ? 'active' : ''} ${player.isEliminated ? 'eliminated' : ''}" 
                 data-player-id="${player.id}" data-monster="${player.monster.id}">
                <div class="player-info">
                    <div class="player-name-container">
                        <div class="player-name">
                            ${player.monster.name}${player.playerType === 'cpu' ? ' <span class="player-subtitle">(CPU)</span>' : ''}
                        </div>
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
        `;
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

        // Close any existing modal first
        this.closePowerCardsModal();

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
            
            if (closeBtn && modal) {
                console.log('🔄 Setting up event listeners for empty power cards modal');
                console.log('🔄 Close button found:', closeBtn);
                console.log('🔄 Modal found:', modal);
                
                UIUtilities.safeAddEventListener(closeBtn, 'click', 
                    UIUtilities.createSafeEventHandler(() => {
                        console.log('🔄 Empty power cards modal close button clicked!');
                        this.closePowerCardsModal();
                    }));
                
                UIUtilities.safeAddEventListener(modal, 'click', 
                    UIUtilities.createSafeEventHandler((e) => {
                        if (e.target === modal) {
                            console.log('🔄 Empty power cards modal backdrop clicked!');
                            this.closePowerCardsModal();
                        }
                    }));
                
                // Close on Escape key
                const closeOnEscape = UIUtilities.createSafeEventHandler((e) => {
                    if (e.key === 'Escape') {
                        console.log('🔄 Empty power cards modal escape key pressed!');
                        this.closePowerCardsModal();
                        document.removeEventListener('keydown', closeOnEscape);
                    }
                });
                document.addEventListener('keydown', closeOnEscape);
            } else {
                console.error('🚨 Failed to find close button or modal for empty power cards!');
                console.log('🔄 closeBtn:', closeBtn);
                console.log('🔄 modal:', modal);
            }
            
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
        
        if (closeBtn && modal) {
            console.log('🔄 Setting up event listeners for power cards modal with cards');
            console.log('🔄 Close button found:', closeBtn);
            console.log('🔄 Modal found:', modal);
            
            UIUtilities.safeAddEventListener(closeBtn, 'click', 
                UIUtilities.createSafeEventHandler(() => {
                    console.log('🔄 Power cards modal close button clicked! (with cards)');
                    this.closePowerCardsModal();
                }));
            
            UIUtilities.safeAddEventListener(modal, 'click', 
                UIUtilities.createSafeEventHandler((e) => {
                    if (e.target === modal) {
                        console.log('🔄 Power cards modal backdrop clicked! (with cards)');
                        this.closePowerCardsModal();
                    }
                }));
        } else {
            console.error('🚨 Failed to find close button or modal for power cards with cards!');
            console.log('🔄 closeBtn:', closeBtn);
            console.log('🔄 modal:', modal);
        }

        // Add click listeners to individual cards for detailed view
        const cardItems = modal.querySelectorAll('.power-card-item');
        cardItems.forEach(cardItem => {
            UIUtilities.safeAddEventListener(cardItem, 'click', 
                UIUtilities.createSafeEventHandler((e) => {
                    e.stopPropagation();
                    const cardId = cardItem.dataset.cardId;
                    const playerIdFromCard = cardItem.dataset.playerId;
                    this.showPowerCardDetailModal(cardId, playerIdFromCard);
                }));
        });

        // Close on Escape key
        const closeOnEscape = UIUtilities.createSafeEventHandler((e) => {
            if (e.key === 'Escape') {
                this.closePowerCardsModal();
                document.removeEventListener('keydown', closeOnEscape);
            }
        });
        document.addEventListener('keydown', closeOnEscape);
    }

    // Close power cards collection modal
    closePowerCardsModal() {
        console.log('🔄 closePowerCardsModal called!');
        const modal = document.getElementById('power-cards-modal');
        if (modal) {
            console.log('🔄 Modal found, removing it');
            // Clean up any event listeners by removing the modal
            modal.remove();
        } else {
            console.log('🔄 Modal not found!');
        }
        
        // Also try to clean up any modals with the class selector in case of ID conflicts
        const modalsByClass = document.querySelectorAll('.power-cards-collection-modal');
        modalsByClass.forEach((modalEl, index) => {
            console.log(`🔄 Cleaning up modal found by class selector #${index}`);
            modalEl.remove();
        });
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

    // Show player elimination dialog
    showPlayerEliminationDialog(eliminatedPlayer, attacker) {
        // Close any existing elimination dialog first
        this.closePlayerEliminationDialog();
        
        const modalHtml = `
            <div class="player-elimination-modal" id="player-elimination-modal">
                <div class="player-elimination-content">
                    <div class="elimination-header">
                        <h1 class="elimination-title">ELIMINATED!</h1>
                        <button class="elimination-close-btn">&times;</button>
                    </div>
                    <div class="elimination-body">
                        <div class="elimination-message">
                            <div class="elimination-player-name">${eliminatedPlayer.monster.name}</div>
                            has been officially eliminated from the game!
                        </div>
                        <div class="elimination-message">
                            Eliminated by: <strong>${attacker ? attacker.monster.name : 'Unknown'}</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = document.getElementById('player-elimination-modal');
        const closeBtn = modal.querySelector('.elimination-close-btn');
        
        if (closeBtn && modal) {
            UIUtilities.safeAddEventListener(closeBtn, 'click', 
                UIUtilities.createSafeEventHandler(() => {
                    console.log('🔄 Elimination modal close button clicked!');
                    this.closePlayerEliminationDialog();
                }));
            
            UIUtilities.safeAddEventListener(modal, 'click', 
                UIUtilities.createSafeEventHandler((e) => {
                    if (e.target === modal) {
                        this.closePlayerEliminationDialog();
                    }
                }));
            
            // Auto-close after 5 seconds
            setTimeout(() => {
                this.closePlayerEliminationDialog();
            }, 5000);
            
            // Close on Escape key
            const closeOnEscape = UIUtilities.createSafeEventHandler((e) => {
                if (e.key === 'Escape') {
                    this.closePlayerEliminationDialog();
                    document.removeEventListener('keydown', closeOnEscape);
                }
            });
            document.addEventListener('keydown', closeOnEscape);
        }
        
        // Update the game display to reflect the elimination
        this.updateGameDisplay();
    }

    // Close player elimination dialog
    closePlayerEliminationDialog() {
        const modal = document.getElementById('player-elimination-modal');
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
        console.log('updateDiceDisplay called with data:', diceData.map(d => ({ id: d.id, face: d.face, symbol: d.symbol })));
        const html = createDiceHTML(diceData);
        console.log('Generated HTML length:', html.length);
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
        const hasNullFaces = diceData.some(d => d.face === null && !d.isDisabled);
        if (hasNullFaces) {
            console.log('🎲 INFO: Some dice have null faces (unrolled state) - showing question marks');
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
        this.updateDiceControls();
        
        if (data.rollsLeft === 0) {
            this.showMessage('No more rolls! Resolving dice effects...', 1400);
            // Show next message after first one is almost done
            setTimeout(() => {
                this.showMessage('Dice effects resolved! You can buy cards or end turn.');
            }, 1500);
        }

        // Continue CPU turn if current player is CPU AND we have an active CPU turn state
        const currentPlayer = this.game.getCurrentPlayer();
        if (currentPlayer && 
            currentPlayer.playerType === 'cpu' && 
            this.cpuTurnState && 
            this.cpuTurnState.player && 
            this.cpuTurnState.player.id === currentPlayer.id) {
            setTimeout(() => {
                if (this.cpuTurnState) { // Double check state still exists
                    this.cpuTurnState.isProcessing = false;
                    this.processCPUTurn();
                }
            }, 1000);
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

        // Continue CPU turn on phase changes ONLY if it's actually a CPU's turn
        const currentPlayer = this.game.getCurrentPlayer();
        if (currentPlayer && 
            currentPlayer.playerType === 'cpu' && 
            this.cpuTurnState && 
            this.cpuTurnState.player && 
            this.cpuTurnState.player.id === currentPlayer.id) {
            setTimeout(() => {
                if (this.cpuTurnState) { // Double check state still exists
                    this.cpuTurnState.isProcessing = false;
                    this.processCPUTurn();
                }
            }, 500);
        }
    }

    // Update cards display
    updateCardsDisplay() {
        if (!this.game) return;

        const gameState = this.game.getGameState();
        const currentPlayer = gameState.currentPlayer;
        
        this.elements.availableCards.innerHTML = gameState.availableCards.map(card => {
            // Calculate the actual cost including discounts
            let actualCost = this.game.calculateCardCost(currentPlayer.id, card.id);
            
            // Create cost display with styled "was" text
            let costDisplay = `⚡${actualCost}`;
            if (actualCost < card.cost) {
                costDisplay += `<span class="was-price">(was ${card.cost})</span>`;
            }
            
            return `
                <div class="power-card ${currentPlayer.energy >= actualCost ? 'affordable' : ''}" 
                     data-card-id="${card.id}" data-effect="${card.effect}">
                    <div class="card-cost">${costDisplay}</div>
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

        // Calculate actual cost for available cards, use original cost for owned cards
        let actualCost = card.cost;
        let costDisplay = `⚡${card.cost}`;
        
        if (!cardsList && currentPlayer) { // Only calculate discounts for available cards
            actualCost = this.game.calculateCardCost(currentPlayer.id, card.id);
            costDisplay = `⚡${actualCost}`;
            if (actualCost < card.cost) {
                costDisplay += `<span class="was-price">(was ${card.cost})</span>`;
            }
        }

        // Check if purchase is allowed based on game state (local game)
        const diceResolved = gameState.turnPhase === 'resolving';
        const hasEnergy = currentPlayer && currentPlayer.energy >= actualCost;
        const canPurchase = allowPurchase && diceResolved && hasEnergy;
        
        const showPurchaseButton = allowPurchase && !cardsList; // Only show for available cards, not player cards
        
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'card-purchase-modal-overlay';
        modalOverlay.innerHTML = `
            <div class="card-purchase-modal">
                <div class="purchase-card-display power-card" data-effect="${card.effect}">
                    <div class="card-cost">${costDisplay}</div>
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
            
            // Remove old event listeners if they exist
            const oldHandlers = this.elements.decisionOption1.getAttribute('data-handlers-attached');
            if (oldHandlers) {
                // Clone and replace to remove all event listeners
                const newBtn1 = this.elements.decisionOption1.cloneNode(true);
                const newBtn2 = this.elements.decisionOption2.cloneNode(true);
                this.elements.decisionOption1.parentNode.replaceChild(newBtn1, this.elements.decisionOption1);
                this.elements.decisionOption2.parentNode.replaceChild(newBtn2, this.elements.decisionOption2);
                this.elements.decisionOption1 = newBtn1;
                this.elements.decisionOption2 = newBtn2;
            }
            
            // Add event listeners with debug logging using addEventListener
            this.elements.decisionOption1.addEventListener('click', (e) => {
                console.log('🔄 Stay button clicked!', e);
                e.preventDefault();
                e.stopPropagation();
                this.hideDecisionModal();
                this.game.handlePlayerDecision(decision.playerId, 'stay');
            });
            
            this.elements.decisionOption2.addEventListener('click', (e) => {
                console.log('🔄 Leave button clicked!', e);
                e.preventDefault();
                e.stopPropagation();
                this.hideDecisionModal();
                this.game.handlePlayerDecision(decision.playerId, 'leave');
            });
            
            // Mark handlers as attached
            this.elements.decisionOption1.setAttribute('data-handlers-attached', 'true');
            this.elements.decisionOption2.setAttribute('data-handlers-attached', 'true');
            
            // Show modal
            this.elements.decisionModal.classList.remove('hidden');
            
            // Force active player container to have lower z-index to prevent interference
            const activePlayerContainer = document.querySelector('.active-player-container');
            if (activePlayerContainer) {
                activePlayerContainer.style.zIndex = '1';
            }
            
            // Force all player cards to have lower z-index
            const allPlayerCards = document.querySelectorAll('.player-dashboard');
            allPlayerCards.forEach(card => {
                card.style.zIndex = '1';
            });
        }
    }

    // Hide decision modal
    hideDecisionModal() {
        console.log('🔄 hideDecisionModal called!');
        this.elements.decisionModal.classList.add('hidden');
        
        // Restore original z-index values
        const activePlayerContainer = document.querySelector('.active-player-container');
        if (activePlayerContainer) {
            activePlayerContainer.style.zIndex = ''; // Reset to CSS default
        }
        
        // Reset all player cards z-index
        const allPlayerCards = document.querySelectorAll('.player-dashboard');
        allPlayerCards.forEach(card => {
            card.style.zIndex = ''; // Reset to CSS default
        });
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

    // Close game over modal and return to splash screen
    closeGameOverModal() {
        this.elements.gameOverModal.classList.add('hidden');
        this.game = null;
        this.selectedMonsters = [];
        this.showSplashScreen();
    }

    // Reset game
    resetGame() {
        this.elements.gameOverModal.classList.add('hidden');
        
        // Clean up any existing active player container from previous game
        const existingActivePlayerContainer = document.getElementById('active-player-container');
        if (existingActivePlayerContainer) {
            existingActivePlayerContainer.remove();
        }
        
        // Reset game state
        this.game = null;
        this.selectedMonsters = [];
        
        // Show setup modal for new game
        this.showSetupModal();
    }

    // Exit to splash screen with confirmation
    exitToSplashScreen() {
        // Show the custom exit confirmation modal instead of system dialog
        this.showExitConfirmationModal();
    }

    // Show exit confirmation modal
    showExitConfirmationModal() {
        UIUtilities.showModal(this.elements.exitConfirmationModal);
    }

    // Hide exit confirmation modal
    hideExitConfirmationModal() {
        UIUtilities.hideModal(this.elements.exitConfirmationModal);
    }

    // Confirm exit to splash screen (called when user clicks "Exit to Menu")
    confirmExitToSplashScreen() {
        // Hide the confirmation modal first
        this.hideExitConfirmationModal();

        // Clean up any existing active player container from current game
        const existingActivePlayerContainer = document.getElementById('active-player-container');
        if (existingActivePlayerContainer) {
            existingActivePlayerContainer.remove();
        }
        
        // Hide any open modals
        const modals = [
            this.elements.gameOverModal,
            this.elements.decisionModal,
            this.elements.gameLogModal,
            this.elements.storageMgmtModal,
            this.elements.settingsModal,
            this.elements.instructionsModal,
            this.elements.exitConfirmationModal
        ];
        
        modals.forEach(modal => {
            if (modal) {
                modal.classList.add('hidden');
            }
        });
        
        // Clean up game state
        this.game = null;
        this.selectedMonsters = [];
        
        // Return to splash screen
        this.showSplashScreen();
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

    // Show CPU action notification (more subtle than regular messages)
    showCPUActionNotification(data) {
        console.log(`CPU Action: ${data.message}`);
        
        // Clear any existing CPU notification timeout
        if (this.cpuNotificationTimeout) {
            clearTimeout(this.cpuNotificationTimeout);
        }
        
        // Get the dice area to show notification above it
        const diceContainer = this.elements.diceContainer;
        
        // Create or update CPU notification
        let notification = document.getElementById('cpu-action-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'cpu-action-notification';
            notification.className = 'cpu-action-notification';
            
            // Insert before the dice container
            diceContainer.parentNode.insertBefore(notification, diceContainer);
        }
        
        // Set notification content with monster avatar
        const playerAvatar = data.player.monster ? 
            `<img src="${data.player.monster.image}" alt="${data.player.monster.name}" class="notification-avatar" />` : 
            '🤖';
            
        notification.innerHTML = `
            ${playerAvatar}
            <span class="notification-text">${data.message}</span>
        `;
        notification.classList.add('visible');
        
        // Auto-dismiss after 3 seconds
        this.cpuNotificationTimeout = setTimeout(() => {
            notification.classList.remove('visible');
            this.cpuNotificationTimeout = null;
        }, 3000);
        
        // Allow clicking to dismiss
        notification.onclick = () => {
            notification.classList.remove('visible');
            if (this.cpuNotificationTimeout) {
                clearTimeout(this.cpuNotificationTimeout);
                this.cpuNotificationTimeout = null;
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
        console.log('🔥 animatePlayerAttacked called for player:', playerId);
        console.trace('🔥 Stack trace for animatePlayerAttacked:');
        
        const playerElement = document.querySelector(`[data-player-id="${playerId}"]`);
        if (playerElement) {
            console.log('🔥 Found player element:', playerElement);
            console.log('🔥 Element classes before animation:', Array.from(playerElement.classList));
            
            // Clear any existing attack animation first to prevent conflicts
            playerElement.classList.remove('player-attacked');
            
            // Clear any existing timeout for this player
            const timeoutKey = `attackTimeout_${playerId}`;
            if (this[timeoutKey]) {
                console.log('🔥 Clearing existing timeout for player:', playerId);
                clearTimeout(this[timeoutKey]);
                delete this[timeoutKey];
            }
            
            // Force a style recalculation to ensure class removal takes effect
            void playerElement.offsetHeight;
            
            console.log('🔥 Adding player-attacked class to element:', playerElement);
            playerElement.classList.add('player-attacked');
            console.log('🔥 Element classes after adding attack class:', Array.from(playerElement.classList));
            
            // Store the timeout reference so we can clear it if needed
            this[timeoutKey] = setTimeout(() => {
                console.log('🔥 Timeout fired - attempting to remove player-attacked class from element:', playerElement);
                console.log('🔥 Element classList before removal:', Array.from(playerElement.classList));
                console.log('🔥 Element computed style before removal - border:', getComputedStyle(playerElement).border);
                console.log('🔥 Element computed style before removal - box-shadow:', getComputedStyle(playerElement).boxShadow);
                
                if (playerElement && playerElement.classList.contains('player-attacked')) {
                    playerElement.classList.remove('player-attacked');
                    console.log('🔥 Successfully removed player-attacked class');
                    
                    // Force a style recalculation
                    void playerElement.offsetHeight;
                    
                    console.log('🔥 Element classList after removal:', Array.from(playerElement.classList));
                    console.log('🔥 Element computed style after removal - border:', getComputedStyle(playerElement).border);
                    console.log('🔥 Element computed style after removal - box-shadow:', getComputedStyle(playerElement).boxShadow);
                } else {
                    console.log('🔥 Class already removed, element changed, or element no longer exists');
                    if (playerElement) {
                        console.log('🔥 Current classes on element:', Array.from(playerElement.classList));
                    }
                }
                delete this[timeoutKey];
            }, 1000);
            
            console.log('🔥 Set timeout with key:', timeoutKey);
        } else {
            console.log('🔥 Player element not found for playerId:', playerId);
        }
    }

    // Force cleanup of any stuck attack animations
    clearAllAttackAnimations() {
        console.log('🔥 Clearing all attack animations...');
        const allPlayerElements = document.querySelectorAll('[data-player-id]');
        allPlayerElements.forEach(element => {
            if (element.classList.contains('player-attacked')) {
                console.log('🔥 Found stuck attack animation on element:', element);
                element.classList.remove('player-attacked');
            }
        });
        
        // Clear all attack timeouts
        Object.keys(this).forEach(key => {
            if (key.startsWith('attackTimeout_')) {
                console.log('🔥 Clearing timeout:', key);
                clearTimeout(this[key]);
                delete this[key];
            }
        });
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
        this.loadSettings();
    }

    loadSettings() {
        // Load CPU speed setting
        const cpuSpeed = localStorage.getItem('cpuSpeed') || 'medium';
        const speedRadio = document.querySelector(`input[name="cpu-speed"][value="${cpuSpeed}"]`);
        if (speedRadio) {
            speedRadio.checked = true;
        }

        // Load thought bubbles setting
        const thoughtBubblesEnabled = localStorage.getItem('thoughtBubblesEnabled') !== 'false';
        if (this.elements.thoughtBubblesToggle) {
            this.elements.thoughtBubblesToggle.checked = thoughtBubblesEnabled;
        }
    }

    saveSettings() {
        // Save CPU speed setting
        const selectedSpeed = document.querySelector('input[name="cpu-speed"]:checked');
        if (selectedSpeed) {
            localStorage.setItem('cpuSpeed', selectedSpeed.value);
        }

        // Save thought bubbles setting
        if (this.elements.thoughtBubblesToggle) {
            localStorage.setItem('thoughtBubblesEnabled', this.elements.thoughtBubblesToggle.checked.toString());
        }

        // Close the modal
        UIUtilities.hideModal(this.elements.settingsModal);
        
        // Show confirmation
        this.showMessage('Settings saved successfully!');
    }

    resetSettings() {
        // Reset to default values
        localStorage.removeItem('cpuSpeed');
        localStorage.removeItem('thoughtBubblesEnabled');
        
        // Reload the settings to show defaults
        this.loadSettings();
        
        // Show confirmation
        this.showMessage('Settings reset to defaults');
    }

    showInstructions() {
        UIUtilities.showModal(this.elements.instructionsModal);
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
            const gameLogContainer = document.querySelector('.game-log-container');
            if (gameLogContainer) {
                gameLogContainer.scrollTop = gameLogContainer.scrollHeight;
            }
        }, 100);
    }

    renderLogTree(rounds) {
        return rounds.map(round => this.renderRound(round)).join('');
    }

    renderRound(round) {
        const roundTimestamp = round.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const expandedClass = round.expanded ? 'expanded' : 'collapsed';
        const expandIcon = round.expanded ? '⬇️' : '➡️'; // Changed from book emojis to arrows
        
        // Handle setup round vs numbered rounds
        const isSetup = round.roundNumber === 'Setup';
        const roundTitle = isSetup ? 
            '⚙️ Game Setup' : // Reverted back to original 'Game Setup'
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
        
        // Don't show emoji during setup phase
        const isSetupPhase = action.area === 'setup' || action.category === 'setup' || 
                           action.category === 'player-count-change' || 
                           action.category === 'monster-selection' || 
                           action.category === 'monster-deselection' ||
                           action.category === 'game-start' ||
                           action.category === 'ready-to-start';
        
        const emoji = isSetupPhase ? '' : (action.emoji || '📝');
        const categoryClass = `log-action-${action.category}`;
        
        // Add area information if available
        const areaTag = action.area && action.area !== 'game' ? 
            `<span class="log-action-area">[${action.area}]</span>` : '';
        
        return `
            <div class="log-action ${categoryClass}">
                ${emoji ? `<span class="log-action-emoji">${emoji}</span>` : ''}
                <span class="log-action-message">${action.message}</span>
                ${areaTag}
                <span class="log-action-time">${actionTimestamp}</span>
            </div>
        `;
    }

    getPlayerAvatarForTurn(turn) {
        // Check if this is a system event (like "Game Setup" or "Monster Selection")
        const systemEventNames = ['Game Setup', 'Monster Selection', 'System'];
        if (systemEventNames.includes(turn.playerName)) {
            return ''; // No avatar for system events
        }
        
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

    // Game log scroll methods
    scrollGameLogToTop() {
        const gameLogContainer = document.querySelector('.game-log-container');
        if (gameLogContainer) {
            gameLogContainer.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    }

    scrollGameLogToBottom() {
        const gameLogContainer = document.querySelector('.game-log-container');
        if (gameLogContainer) {
            gameLogContainer.scrollTo({
                top: gameLogContainer.scrollHeight,
                behavior: 'smooth'
            });
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

    // Monster Profiles functionality
    initializeMonsterProfiles() {
        // Load saved profiles or use defaults
        this.monsterProfiles = this.loadMonsterProfiles();
        this.generateMonsterProfilesGrid();
    }

    loadMonsterProfiles() {
        const saved = localStorage.getItem('monsterProfiles');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to parse saved monster profiles, using defaults');
            }
        }
        
        // Return default profiles from MONSTERS data
        const profiles = {};
        Object.values(MONSTERS).forEach(monster => {
            profiles[monster.id] = { ...monster.personality };
        });
        return profiles;
    }

    saveMonsterProfiles() {
        localStorage.setItem('monsterProfiles', JSON.stringify(this.monsterProfiles));
    }

    // Settings functionality
    initializeSettings() {
        // Set default settings if they don't exist
        if (localStorage.getItem('cpuSpeed') === null) {
            localStorage.setItem('cpuSpeed', 'medium');
        }
        if (localStorage.getItem('thoughtBubblesEnabled') === null) {
            localStorage.setItem('thoughtBubblesEnabled', 'true');
        }
    }

    resetMonsterProfiles() {
        // Reset to default values from MONSTERS data
        Object.values(MONSTERS).forEach(monster => {
            this.monsterProfiles[monster.id] = { ...monster.personality };
        });
        this.updateProfilesDisplay();
        this.saveMonsterProfiles();
    }

    generateMonsterProfilesGrid() {
        if (!this.elements.monsterProfilesGrid) return;

        const grid = this.elements.monsterProfilesGrid;
        grid.innerHTML = '';

        Object.values(MONSTERS).forEach(monster => {
            const profileCard = document.createElement('div');
            profileCard.className = 'monster-profile-card';
            profileCard.style.borderColor = monster.color;
            
            const profile = this.monsterProfiles[monster.id];
            
            profileCard.innerHTML = `
                <div class="monster-profile-header">
                    <div class="monster-profile-avatar">
                        <img src="${monster.image}" alt="${monster.name}" />
                    </div>
                    <div class="monster-profile-info">
                        <h3>${monster.name}</h3>
                        <p>${monster.description}</p>
                    </div>
                </div>
                <div class="personality-traits">
                    <div class="trait-container">
                        <div class="trait-header">
                            <span class="trait-label">🔥 Aggression</span>
                            <span class="trait-value" data-trait="aggression">${profile.aggression}</span>
                        </div>
                        <div class="trait-slider-container">
                            <input type="range" min="1" max="5" value="${profile.aggression}" 
                                   class="trait-slider" data-monster="${monster.id}" data-trait="aggression">
                            <div class="trait-bar">
                                <span>Passive</span>
                                <span>Aggressive</span>
                            </div>
                        </div>
                    </div>
                    <div class="trait-container">
                        <div class="trait-header">
                            <span class="trait-label">🧠 Strategy</span>
                            <span class="trait-value" data-trait="strategy">${profile.strategy}</span>
                        </div>
                        <div class="trait-slider-container">
                            <input type="range" min="1" max="5" value="${profile.strategy}" 
                                   class="trait-slider" data-monster="${monster.id}" data-trait="strategy">
                            <div class="trait-bar">
                                <span>Simple</span>
                                <span>Complex</span>
                            </div>
                        </div>
                    </div>
                    <div class="trait-container">
                        <div class="trait-header">
                            <span class="trait-label">🎲 Risk Factor</span>
                            <span class="trait-value" data-trait="risk">${profile.risk}</span>
                        </div>
                        <div class="trait-slider-container">
                            <input type="range" min="1" max="5" value="${profile.risk}" 
                                   class="trait-slider" data-monster="${monster.id}" data-trait="risk">
                            <div class="trait-bar">
                                <span>Cautious</span>
                                <span>Reckless</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            grid.appendChild(profileCard);
        });

        // Attach slider event listeners
        this.attachProfileSliderListeners();
    }

    attachProfileSliderListeners() {
        const sliders = this.elements.monsterProfilesGrid.querySelectorAll('.trait-slider');
        sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const monsterId = e.target.dataset.monster;
                const trait = e.target.dataset.trait;
                const value = parseInt(e.target.value);
                
                // Update the stored profile
                this.monsterProfiles[monsterId][trait] = value;
                
                // Update the display value
                const valueSpan = e.target.closest('.trait-container').querySelector(`[data-trait="${trait}"]`);
                valueSpan.textContent = value;
            });
        });
    }

    updateProfilesDisplay() {
        const sliders = this.elements.monsterProfilesGrid.querySelectorAll('.trait-slider');
        sliders.forEach(slider => {
            const monsterId = slider.dataset.monster;
            const trait = slider.dataset.trait;
            const value = this.monsterProfiles[monsterId][trait];
            
            slider.value = value;
            const valueSpan = slider.closest('.trait-container').querySelector(`[data-trait="${trait}"]`);
            valueSpan.textContent = value;
        });
    }

    showMonsterProfilesModal() {
        this.elements.monsterProfilesModal.classList.remove('hidden');
    }

    hideMonsterProfilesModal() {
        this.elements.monsterProfilesModal.classList.add('hidden');
    }

    // Get monster personality for AI decision making
    getMonsterPersonality(monsterId) {
        return this.monsterProfiles[monsterId] || MONSTERS[monsterId]?.personality || { aggression: 3, strategy: 3, risk: 3 };
    }

    // CPU Thinking System
    showCPUThoughtBubble(player, context = 'general') {
        if (player.playerType !== 'cpu') return;
        
        // Check if thought bubbles are enabled
        const thoughtBubblesEnabled = localStorage.getItem('thoughtBubblesEnabled') !== 'false';
        if (!thoughtBubblesEnabled) return;
        
        // Find the player card container
        const playerCard = document.querySelector(`[data-player-id="${player.id}"]`);
        if (!playerCard) return;
        
        // Remove any existing thought bubble
        this.hideCPUThoughtBubble(player);
        
        // Get context-appropriate phrase
        const phrase = this.getCPUThoughtPhrase(player, context);
        if (!phrase) return;
        
        // Create thought bubble
        const thoughtBubble = document.createElement('div');
        thoughtBubble.className = 'cpu-thought-bubble floating';
        thoughtBubble.setAttribute('data-player-id', player.id);
        
        const bubbleContent = document.createElement('div');
        bubbleContent.className = 'thought-bubble-content';
        
        // Add context-specific styling
        if (context === 'uncertain' || context === 'confused') {
            bubbleContent.classList.add('thought-bubble-uncertain');
        } else if (context === 'confident' || context === 'planning') {
            bubbleContent.classList.add('thought-bubble-confident');
        } else if (context === 'aggressive' || context === 'attacking') {
            bubbleContent.classList.add('thought-bubble-aggressive');
        } else if (context === 'strategic' || context === 'analyzing') {
            bubbleContent.classList.add('thought-bubble-strategic');
        }
        
        bubbleContent.textContent = phrase;
        thoughtBubble.appendChild(bubbleContent);
        
        // Position relative to player card
        playerCard.style.position = 'relative';
        playerCard.appendChild(thoughtBubble);
        
        console.log(`💭 ${player.monster.name} thinks: "${phrase}"`);
        
        // Auto-hide after 3-5 seconds, adjusted by CPU speed
        const cpuSpeed = localStorage.getItem('cpuSpeed') || 'medium';
        let speedMultiplier = 1;
        switch (cpuSpeed) {
            case 'fast': speedMultiplier = 0.6; break;
            case 'medium': speedMultiplier = 1; break;
            case 'slow': speedMultiplier = 1.5; break;
        }
        
        const hideDelay = (3000 + Math.random() * 2000) * speedMultiplier;
        setTimeout(() => this.hideCPUThoughtBubble(player), hideDelay);
    }
    
    hideCPUThoughtBubble(player) {
        const existingBubble = document.querySelector(`.cpu-thought-bubble[data-player-id="${player.id}"]`);
        if (existingBubble) {
            existingBubble.classList.add('disappearing');
            setTimeout(() => {
                if (existingBubble.parentNode) {
                    existingBubble.parentNode.removeChild(existingBubble);
                }
            }, 500);
        }
    }

    // Clean up all thought bubbles (called when turn ends)
    cleanupAllThoughtBubbles() {
        const allBubbles = document.querySelectorAll('.cpu-thought-bubble');
        allBubbles.forEach(bubble => {
            bubble.classList.add('disappearing');
            setTimeout(() => {
                if (bubble.parentNode) {
                    bubble.parentNode.removeChild(bubble);
                }
            }, 500);
        });
    }
    
    cleanupAllThoughtBubbles() {
        const allBubbles = document.querySelectorAll('.cpu-thought-bubble');
        allBubbles.forEach(bubble => {
            bubble.classList.add('disappearing');
            setTimeout(() => {
                if (bubble.parentNode) {
                    bubble.parentNode.removeChild(bubble);
                }
            }, 500);
        });
        
        if (allBubbles.length > 0) {
            console.log(`💭 Cleaned up ${allBubbles.length} thought bubble(s) at turn end`);
        }
    }
    
    getCPUThoughtPhrase(player, context) {
        if (!player.monster || !player.monster.profile) return null;
        
        const profile = player.monster.profile;
        const gameState = this.game?.getCurrentGameState ? this.game.getCurrentGameState() : {};
        
        // Context-specific phrase collections
        const phrases = {
            general: [
                "Let me think about this...",
                "What's the best move here?",
                "Hmm, interesting situation...",
                "Time to strategize!",
                "What would a monster do?",
                "Let me calculate the odds..."
            ],
            
            uncertain: [
                "I'm not really sure what to do here",
                "This is a tough decision...",
                "Maybe I should play it safe?",
                "What would my mother monster do?",
                "Eenie, meenie, miney, moe...",
                "When in doubt, ROAR!"
            ],
            
            needHearts: [
                "I really need hearts!",
                "Health is getting low...",
                "Time to heal up!",
                "One heart would be nice...",
                "My monster needs a snack!",
                "Getting a bit worried here..."
            ],
            
            needEnergy: [
                "I could use some energy",
                "Power cards look tempting...",
                "More lightning please!",
                "Energy equals opportunity!",
                "Time to charge up!",
                "I need to power up!"
            ],
            
            needNumbers: [
                "I could really use a 3",
                "Come on, give me some points!",
                "Numbers, numbers everywhere...",
                "Victory points would be nice!",
                "I need to score big!",
                "Time for some counting!"
            ],
            
            aggressive: [
                "Time to SMASH!",
                "Who needs to be punched?",
                "RAWR! Attack mode!",
                "Let's cause some chaos!",
                "Violence is the answer!",
                "Somebody's going down!"
            ],
            
            strategic: [
                "Let me analyze this carefully...",
                "Calculating probability matrices...",
                "The optimal path is...",
                "According to my calculations...",
                "Strategy over brute force!",
                "Time for big brain moves!"
            ],
            
            confident: [
                "I've got this!",
                "Easy choice!",
                "This is my moment!",
                "Watch and learn!",
                "I know exactly what to do!",
                "Victory is inevitable!"
            ],
            
            lowHealth: [
                "Getting a bit scary here...",
                "Maybe I should hide?",
                "Health is not looking good...",
                "Time to play defensively!",
                "Survival mode activated!",
                "I don't feel so good..."
            ],
            
            highEnergy: [
                "So many options!",
                "Power card shopping time!",
                "Energy is power!",
                "Let's spend some lightning!",
                "Time to go crazy!",
                "Rich monster problems!"
            ],
            
            closeToWinning: [
                "Victory is within reach!",
                "Almost there!",
                "Just a few more points...",
                "I can taste victory!",
                "Don't mess this up now!",
                "Focus on the prize!"
            ],
            
            tokyoDecision: [
                "Should I stay or should I go?",
                "Tokyo is dangerous but rewarding...",
                "Risk vs. reward time!",
                "Maybe I should play it safe?",
                "Fortune favors the bold!",
                "What would a true monster do?"
            ]
        };
        
        // Determine appropriate context based on game state
        let selectedPhrases = phrases.general;
        
        if (context === 'tokyo-decision') {
            selectedPhrases = phrases.tokyoDecision;
        } else if (player.health <= 3) {
            selectedPhrases = phrases.lowHealth;
        } else if (player.health <= 5) {
            selectedPhrases = phrases.needHearts;
        } else if (player.energy >= 8) {
            selectedPhrases = phrases.highEnergy;
        } else if (player.energy <= 2) {
            selectedPhrases = phrases.needEnergy;
        } else if (player.victoryPoints >= 15) {
            selectedPhrases = phrases.closeToWinning;
        } else if (context === 'needNumbers') {
            selectedPhrases = phrases.needNumbers;
        } else if (profile.aggression >= 4) {
            selectedPhrases = phrases.aggressive;
        } else if (profile.strategy >= 4) {
            selectedPhrases = phrases.strategic;
        } else if (profile.risk >= 4) {
            selectedPhrases = phrases.confident;
        } else if (phrases[context]) {
            selectedPhrases = phrases[context];
        }
        
        // Add personality-based phrase modifications
        const basePhrase = selectedPhrases[Math.floor(Math.random() * selectedPhrases.length)];
        return this.personalizePhrase(basePhrase, profile);
    }
    
    personalizePhrase(phrase, profile) {
        // Add personality-based modifications
        if (profile.aggression >= 4 && Math.random() < 0.3) {
            const aggressiveModifiers = ['RAWR! ', '💪 ', 'SMASH! '];
            phrase = aggressiveModifiers[Math.floor(Math.random() * aggressiveModifiers.length)] + phrase;
        }
        
        if (profile.strategy >= 4 && Math.random() < 0.3) {
            const strategicModifiers = ['🤔 ', '📊 ', '🧠 '];
            phrase = strategicModifiers[Math.floor(Math.random() * strategicModifiers.length)] + phrase;
        }
        
        if (profile.risk >= 4 && Math.random() < 0.3) {
            const riskModifiers = ['🎲 ', '⚡ ', '🔥 '];
            phrase = riskModifiers[Math.floor(Math.random() * riskModifiers.length)] + phrase;
        }
        
        return phrase;
    }

    // Start automatic CPU turn
    startAutomaticCPUTurn(player) {
        console.log('🤖 startAutomaticCPUTurn called with player:', player);
        console.log('🔍 CPU TURN START DEBUG:', {
            playerType: player?.playerType,
            expectedType: 'cpu',
            isCorrectType: player?.playerType === 'cpu',
            monsterName: player?.monster?.name,
            playerId: player?.id
        });
        
        if (!player || player.playerType !== 'cpu') {
            console.log('❌ Player is not CPU or invalid, skipping automatic turn');
            console.log('❌ BLOCKING INVALID CPU CALL:', {
                playerExists: !!player,
                playerType: player?.playerType,
                shouldBeCpu: true
            });
            return;
        }
        
        // Double-check that this is indeed a CPU player
        const currentGamePlayer = this.game.getCurrentPlayer();
        if (!currentGamePlayer || currentGamePlayer.id !== player.id || currentGamePlayer.playerType !== 'cpu') {
            console.log('❌ SAFETY CHECK FAILED: Player mismatch or not CPU');
            console.log('❌ SAFETY DEBUG:', {
                passedPlayer: player?.monster?.name,
                currentPlayer: currentGamePlayer?.monster?.name,
                passedId: player?.id,
                currentId: currentGamePlayer?.id,
                passedType: player?.playerType,
                currentType: currentGamePlayer?.playerType
            });
            return;
        }
        
        // CRITICAL: Check if CPU turn is already in progress
        if (this.cpuTurnState) {
            console.log('⚠️ CPU turn already in progress, not starting new one');
            console.log('⚠️ Existing CPU turn for:', this.cpuTurnState.player?.monster?.name);
            console.log('⚠️ Requested CPU turn for:', player?.monster?.name);
            return;
        }
        
        console.log(`🤖 ✅ VERIFIED CPU TURN: Starting automatic turn for CPU player: ${player.monster.name}`);
        
        // Initialize CPU turn state
        this.cpuTurnState = {
            player: player,
            phase: 'starting',
            rollsCompleted: 0,
            maxRolls: 3, // Default, may be modified by power cards
            isProcessing: false
        };
        
        console.log('🤖 CPU turn state initialized:', this.cpuTurnState);
        
        // Start the CPU turn loop
        this.processCPUTurn();
    }

    // Main CPU turn processing loop
    processCPUTurn() {
        if (!this.cpuTurnState || this.cpuTurnState.isProcessing) {
            console.log('🤖 CPU turn processing skipped - already processing or no state');
            return; // Prevent concurrent processing
        }
        
        // SAFETY CHECK: Ensure we're still dealing with a CPU player
        const currentGamePlayer = this.game.getCurrentPlayer();
        if (!currentGamePlayer || currentGamePlayer.playerType !== 'cpu') {
            console.log('🚨 SAFETY ABORT: Current player is not CPU during processCPUTurn!');
            console.log('🚨 SAFETY DEBUG:', {
                hasCurrentPlayer: !!currentGamePlayer,
                currentPlayerType: currentGamePlayer?.playerType,
                currentPlayerName: currentGamePlayer?.monster?.name,
                cpuStatePlayer: this.cpuTurnState?.player?.monster?.name
            });
            this.cpuTurnState = null; // Clear invalid state
            return;
        }

        this.cpuTurnState.isProcessing = true;
        const player = this.cpuTurnState.player;
        const gameState = this.game.getGameState();
        const diceState = this.game.diceRoller.getState(); // Get dice state separately
        
        console.log(`🤖 CPU ${player.monster.name} - Phase: ${this.cpuTurnState.phase}, Game Phase: ${gameState.turnPhase}, Rolls: ${diceState.rollsRemaining}`);
        console.log('🔍 DEBUG: Full game state for CPU turn:', {
            currentPlayerId: gameState.currentPlayer?.id,
            cpuPlayerId: player.id,
            turnPhase: gameState.turnPhase,
            rollsRemaining: diceState.rollsRemaining,
            gamePhase: gameState.phase,
            isPlayerTurn: gameState.currentPlayer?.id === player.id
        });

        // Make sure it's still this CPU's turn
        if (gameState.currentPlayer.id !== player.id) {
            console.log('🤖 CPU turn ended - no longer current player');
            this.cpuTurnState = null;
            return;
        }

        // Determine what action to take based on current game state
        if (gameState.turnPhase === 'rolling') {
            this.handleCPURollingPhase();
        } else if (gameState.turnPhase === 'resolving') {
            this.handleCPUResolvingPhase();
        } else if (gameState.turnPhase === 'buying') {
            this.handleCPUBuyingPhase();
        } else {
            // Turn is over or something unexpected happened
            console.log('🤖 CPU turn ended - unexpected phase:', gameState.turnPhase);
            console.log('🔧 FALLBACK: Attempting to force CPU action if stuck...');
            
            // Fallback: If CPU is stuck in starting phase, try to force first roll
            if (this.cpuTurnState.phase === 'starting' && diceState.rollsRemaining > 0) {
                console.log('🔧 FALLBACK: Forcing CPU to start rolling...');
                this.executeCPURoll();
            } else {
                // Force end turn if we're in an unknown state
                console.log('🔧 FALLBACK: Forcing CPU to end turn...');
                this.executeCPUEndTurn();
            }
        }
    }

    // Handle the rolling phase for CPU
    handleCPURollingPhase() {
        // Safety check: ensure cpuTurnState still exists (game might have ended)
        if (!this.cpuTurnState || !this.cpuTurnState.player) {
            console.log('🎲 CPU rolling phase aborted - no active CPU turn state (game may have ended)');
            return;
        }
        
        const gameState = this.game.getGameState();
        const diceState = this.game.diceRoller.getState(); // Get dice state separately
        const player = this.cpuTurnState.player;
        
        console.log('🎲 CPU ROLLING PHASE - Entry point reached');
        console.log('🎲 Rolling phase state:', {
            rollsRemaining: diceState.rollsRemaining,
            turnPhase: gameState.turnPhase,
            currentPlayer: gameState.currentPlayer?.monster?.name
        });
        
        // Show thinking bubble
        this.showCPUThoughtBubble(player, 'analyzing');
        
        // Check if we can still roll
        if (diceState.rollsRemaining > 0) {
            // Decide whether to roll or keep current dice
            const shouldRoll = this.shouldCPURoll(diceState, player);
            
            if (shouldRoll) {
                this.executeCPURoll();
            } else {
                this.executeCPUKeepDice();
            }
        } else {
            // No more rolls, wait for game to transition to resolving phase
            this.waitForGamePhaseChange('resolving');
        }
    }

    // Handle the resolving phase for CPU (dice effects are automatically applied)
    handleCPUResolvingPhase() {
        console.log('🔄 CPU RESOLVING PHASE - Entry point reached');
        
        // Safety check: ensure cpuTurnState still exists (game might have ended)
        if (!this.cpuTurnState || !this.cpuTurnState.player) {
            console.log('🔄 CPU resolving phase aborted - no active CPU turn state (game may have ended)');
            return;
        }
        
        // The game automatically handles dice effects, but may need manual transition to buying phase
        const player = this.cpuTurnState.player;
        const thinkingTime = this.getCPUThinkingTime(player) * 0.5;
        
        setTimeout(() => {
            // Additional safety check within timeout (game might have ended during delay)
            if (!this.cpuTurnState || !this.cpuTurnState.player) {
                console.log('🔄 CPU resolving timeout aborted - no active CPU turn state (game may have ended)');
                return;
            }
            
            const gameState = this.game.getGameState();
            console.log('🔄 CPU resolving phase check:', {
                currentPhase: gameState.turnPhase,
                diceEffectsResolved: this.game.diceEffectsResolved
            });
            
            if (gameState.turnPhase === 'buying') {
                // Phase already changed, proceed
                this.cpuTurnState.isProcessing = false;
                this.processCPUTurn();
            } else if (gameState.turnPhase === 'resolving') {
                // Check if dice effects have been resolved, if so force transition to buying
                if (this.game.diceEffectsResolved) {
                    console.log('🔄 CPU forcing transition to buying phase');
                    // Force transition to buying phase
                    this.game.currentTurnPhase = 'buying';
                    this.game.triggerEvent('turnPhaseChanged', { phase: 'buying' });
                    this.cpuTurnState.isProcessing = false;
                    this.processCPUTurn();
                } else {
                    // Still resolving effects, wait a bit more
                    this.waitForGamePhaseChange('buying');
                }
            } else {
                // Unexpected phase, try to end turn
                console.log('🔄 CPU resolving unexpected phase, ending turn');
                this.executeCPUEndTurn();
            }
        }, thinkingTime);
    }

    // Handle the buying phase for CPU
    handleCPUBuyingPhase() {
        // Safety check: ensure cpuTurnState still exists (game might have ended)
        if (!this.cpuTurnState || !this.cpuTurnState.player) {
            console.log('🛒 CPU buying phase aborted - no active CPU turn state (game may have ended)');
            return;
        }
        
        const player = this.cpuTurnState.player;
        const gameState = this.game.getGameState();
        
        // Show thinking bubble about cards
        this.showCPUThoughtBubble(player, 'strategic');
        
        // Get CPU thinking time
        const thinkingTime = this.getCPUThinkingTime(player);
        
        setTimeout(() => {
            // Try to buy cards intelligently
            const cardToBuy = this.chooseCPUCard(gameState, player);
            
            if (cardToBuy) {
                this.executeCPUCardPurchase(cardToBuy);
            } else {
                // No good cards to buy, end turn
                this.executeCPUEndTurn();
            }
        }, thinkingTime);
    }

    // Decide whether CPU should roll dice
    shouldCPURoll(diceState, player) {
        const dice = diceState.dice; // Get dice from dice state
        const rollsRemaining = diceState.rollsRemaining;
        
        console.log('🎲 CPU shouldRoll check:', {
            rollsRemaining,
            diceCount: dice ? dice.length : 'undefined',
            diceValues: dice ? dice.map(d => d.face) : 'no dice'
        });
        
        // Always roll on first turn
        if (rollsRemaining === 3) {
            console.log('🎲 CPU: First roll, should roll = true');
            return true;
        }
        
        // If no dice available, can't analyze - default to roll
        if (!dice || !Array.isArray(dice)) {
            console.log('🎲 CPU: No dice data available, defaulting to roll');
            return true;
        }
        
        // Analyze current dice to see if we should keep rolling
        const analysis = this.analyzeDiceForCPU(dice, player);
        
        // Aggressive monsters are more likely to reroll
        const aggressionBonus = player.monster.profile?.aggression || 0;
        
        // Strategic monsters are more careful about rerolls
        const strategyPenalty = player.monster.profile?.strategy || 0;
        
        // Base chance to reroll
        let rerollChance = 0.6;
        
        // Adjust based on dice value
        if (analysis.score >= 8) {
            rerollChance = 0.2; // Good roll, likely keep
        } else if (analysis.score >= 5) {
            rerollChance = 0.5; // Decent roll
        } else {
            rerollChance = 0.8; // Poor roll, likely reroll
        }
        
        // Apply personality modifiers
        rerollChance += (aggressionBonus * 0.1);
        rerollChance -= (strategyPenalty * 0.05);
        
        // If low health, prioritize hearts
        if (player.health <= 3) {
            const hearts = dice.filter(die => die.face === 'heart').length;
            if (hearts === 0) {
                rerollChance = 0.9; // Really need hearts
            }
        }
        
        return Math.random() < rerollChance;
    }

    // Analyze dice value for CPU decision making
    analyzeDiceForCPU(dice, player) {
        // Safety check for undefined dice
        if (!dice || !Array.isArray(dice)) {
            console.warn('🎲 CPU analyzeDice: Invalid dice data:', dice);
            return { score: 0, hearts: 0, energy: 0, attacks: 0, victoryPoints: 0 };
        }
        
        let score = 0;
        const faces = dice.map(die => die.face);
        
        // Count faces
        const counts = {};
        faces.forEach(face => counts[face] = (counts[face] || 0) + 1);
        
        // Score different outcomes
        score += (counts.heart || 0) * 2; // Hearts are valuable
        score += (counts.energy || 0) * 1.5; // Energy for cards
        score += (counts.attack || 0) * 1; // Attacks
        score += (counts['1'] || 0) * 0.5; // Numbers less valuable unless getting sets
        score += (counts['2'] || 0) * 0.5;
        score += (counts['3'] || 0) * 0.5;
        
        // Bonus for number sets
        Object.keys(counts).forEach(face => {
            if (['1', '2', '3'].includes(face) && counts[face] >= 3) {
                score += counts[face] * 2; // Bonus for sets of 3+
            }
        });
        
        return { score, counts };
    }

    // Choose which dice to keep when rolling
    chooseDiceToKeep(dice, player) {
        // Safety check for undefined dice
        if (!dice || !Array.isArray(dice)) {
            console.warn('🎲 CPU chooseDiceToKeep: Invalid dice data:', dice);
            return [];
        }
        
        const analysis = this.analyzeDiceForCPU(dice, player);
        const toKeep = [];
        
        // Always keep hearts if health is low
        if (player.health <= 4) {
            dice.forEach((die, index) => {
                if (die.face === 'heart') {
                    toKeep.push(index);
                }
            });
        }
        
        // Keep energy if we don't have much
        if (player.energy <= 3) {
            dice.forEach((die, index) => {
                if (die.face === 'energy' && !toKeep.includes(index)) {
                    toKeep.push(index);
                }
            });
        }
        
        // Keep number sets
        const faces = dice.map(die => die.face);
        const counts = {};
        faces.forEach(face => counts[face] = (counts[face] || 0) + 1);
        
        ['1', '2', '3'].forEach(number => {
            if (counts[number] >= 2) {
                dice.forEach((die, index) => {
                    if (die.face === number && !toKeep.includes(index)) {
                        toKeep.push(index);
                    }
                });
            }
        });
        
        return toKeep;
    }

    // Execute CPU dice roll
    executeCPURoll() {
        // Safety check: ensure cpuTurnState still exists (game might have ended)
        if (!this.cpuTurnState || !this.cpuTurnState.player) {
            console.log('🎲 CPU roll aborted - no active CPU turn state (game may have ended)');
            return;
        }
        
        const thinkingTime = this.getCPUThinkingTime(this.cpuTurnState.player);
        const player = this.cpuTurnState.player;
        const diceState = this.game.diceRoller.getState();
        
        // Show notification about CPU action
        const rollNumber = 4 - diceState.rollsRemaining; // Roll 1, 2, or 3
        const actionMessage = rollNumber === 1 ? 
            `${player.monster.name} starts rolling dice` :
            `${player.monster.name} rerolls dice (roll ${rollNumber})`;
            
        this.showCPUActionNotification({
            message: actionMessage,
            player: player,
            action: 'dice-roll'
        });
        
        setTimeout(() => {
            // Additional safety check within timeout (game might have ended during delay)
            if (!this.cpuTurnState || !this.cpuTurnState.player) {
                console.log('🎲 CPU roll timeout aborted - no active CPU turn state (game may have ended)');
                return;
            }
            
            const rollDiceBtn = document.getElementById('roll-dice');
            console.log('🤖 CPU trying to roll dice - button found:', !!rollDiceBtn);
            console.log('🤖 Button disabled state:', rollDiceBtn?.disabled);
            console.log('🤖 Game state:', this.game?.getGameState?.()?.turnPhase);
            console.log('🤖 Current player:', this.game?.getCurrentPlayer?.()?.monster?.name);
            
            if (rollDiceBtn) {
                if (rollDiceBtn.disabled) {
                    console.log('🤖 Button is disabled, forcing enable for CPU');
                    rollDiceBtn.disabled = false;
                }
                
                console.log('🎲 CPU automatically rolling dice...');
                rollDiceBtn.click();
                if (this.cpuTurnState) { // Safety check before incrementing
                    this.cpuTurnState.rollsCompleted++;
                }
                
                // Continue processing after roll completes
                setTimeout(() => {
                    if (this.cpuTurnState) { // Safety check before setting processing state
                        this.cpuTurnState.isProcessing = false;
                    }
                    this.processCPUTurn();
                }, 1000);
            } else {
                console.log('❌ Roll dice button not available');
                this.cpuTurnState.isProcessing = false;
            }
        }, thinkingTime);
    }

    // Execute CPU keep dice action
    executeCPUKeepDice() {
        // Safety check: ensure cpuTurnState still exists (game might have ended)
        if (!this.cpuTurnState || !this.cpuTurnState.player) {
            console.log('🎲 CPU keep dice aborted - no active CPU turn state (game may have ended)');
            return;
        }
        
        const thinkingTime = this.getCPUThinkingTime(this.cpuTurnState.player);
        
        setTimeout(() => {
            // Safety check again within timeout
            if (!this.cpuTurnState || !this.cpuTurnState.player) {
                console.log('CPU turn aborted: game ended or state invalid');
                return;
            }
            
            const keepDiceBtn = document.getElementById('keep-dice');
            console.log('🤖 CPU trying to keep dice - button found:', !!keepDiceBtn);
            console.log('🤖 Keep button disabled state:', keepDiceBtn?.disabled);
            
            if (keepDiceBtn) {
                // FIRST: Select which dice to keep based on intelligent analysis
                const gameState = this.game.getGameState();
                const diceData = this.game.diceCollection.getAllDiceData();
                console.log('🎲 CPU analyzing dice for selection:', diceData.map(d => ({ id: d.id, face: d.face, selected: d.selected })));
                
                // Use the chooseDiceToKeep logic to determine which dice to select
                const dicesToKeep = this.chooseDiceToKeep(diceData, this.cpuTurnState.player);
                console.log('🎯 CPU wants to keep dice indices:', dicesToKeep);
                
                // First, clear all selections
                diceData.forEach((die, index) => {
                    if (die.selected) {
                        const dieElement = document.querySelector(`[data-dice-id="${die.id}"]`);
                        if (dieElement && dieElement.classList.contains('selected')) {
                            dieElement.click(); // Deselect
                        }
                    }
                });
                
                // Then select the dice we want to keep
                dicesToKeep.forEach(diceIndex => {
                    const die = diceData[diceIndex];
                    if (die) {
                        const dieElement = document.querySelector(`[data-dice-id="${die.id}"]`);
                        if (dieElement && !dieElement.classList.contains('selected')) {
                            console.log(`🎯 CPU selecting die ${die.id} (${die.face})`);
                            dieElement.click(); // Select this die
                        }
                    }
                });
                
                // Small delay to let the UI update, then click keep dice
                setTimeout(() => {
                    if (keepDiceBtn.disabled) {
                        console.log('🤖 Keep button is disabled, forcing enable for CPU');
                        keepDiceBtn.disabled = false;
                    }
                    
                    console.log('🎯 CPU clicking keep dice button after selections...');
                    keepDiceBtn.click();
                    
                    // Continue processing after keep action
                    setTimeout(() => {
                        if (this.cpuTurnState) {
                            this.cpuTurnState.isProcessing = false;
                        }
                        this.processCPUTurn();
                    }, 500);
                }, 300);
            } else {
                console.log('Keep dice button not available');
                this.cpuTurnState.isProcessing = false;
            }
        }, thinkingTime);
    }

    // Choose a card for CPU to buy
    chooseCPUCard(gameState, player) {
        const availableCards = gameState.powerCards || [];
        const playerEnergy = player.energy;
        
        // Filter cards CPU can afford
        const affordableCards = availableCards.filter(card => 
            card && card.cost <= playerEnergy
        );
        
        if (affordableCards.length === 0) {
            return null;
        }
        
        // Simple AI: prefer cheaper cards for now
        // TODO: Add more sophisticated card evaluation
        return affordableCards.reduce((best, card) => {
            if (!best || this.evaluateCardForCPU(card, player) > this.evaluateCardForCPU(best, player)) {
                return card;
            }
            return best;
        });
    }

    // Evaluate how good a card is for the CPU
    evaluateCardForCPU(card, player) {
        let value = 10 - card.cost; // Prefer cheaper cards as baseline
        
        // Add value based on card effects (simplified)
        if (card.description.includes('health') || card.description.includes('heal')) {
            value += player.health <= 5 ? 5 : 2;
        }
        if (card.description.includes('energy')) {
            value += 3;
        }
        if (card.description.includes('attack') || card.description.includes('damage')) {
            value += 4;
        }
        if (card.description.includes('victory') || card.description.includes('point')) {
            value += 6;
        }
        
        return value;
    }

    // Execute CPU card purchase
    executeCPUCardPurchase(card) {
        // Safety check: ensure cpuTurnState still exists (game might have ended)
        if (!this.cpuTurnState || !this.cpuTurnState.player) {
            console.log('🛒 CPU card purchase aborted - no active CPU turn state (game may have ended)');
            return;
        }
        
        const thinkingTime = this.getCPUThinkingTime(this.cpuTurnState.player);
        const player = this.cpuTurnState.player;
        
        // Show notification about CPU card purchase
        this.showCPUActionNotification({
            message: `${player.monster.name} buys ${card.name}`,
            player: player,
            action: 'card-purchase'
        });
        
        setTimeout(() => {
            // Safety check: Game may have ended while we were waiting
            if (!this.cpuTurnState || !this.cpuTurnState.player) {
                console.log('CPU turn aborted: game ended or state invalid');
                return;
            }
            
            // Find and click the card
            const cardElement = document.querySelector(`[data-card-id="${card.id}"]`);
            if (cardElement) {
                console.log(`🛒 CPU buying card: ${card.name}`);
                cardElement.click();
                
                // After purchase, decide whether to buy more or end turn
                setTimeout(() => {
                    // Safety check again for the nested timeout
                    if (!this.cpuTurnState || !this.cpuTurnState.player) {
                        console.log('CPU turn aborted: game ended or state invalid');
                        return;
                    }
                    this.cpuTurnState.isProcessing = false;
                    this.processCPUTurn();
                }, 1000);
            } else {
                // Card not found, end turn
                this.executeCPUEndTurn();
            }
        }, thinkingTime);
    }

    // Execute CPU end turn
    executeCPUEndTurn() {
        // Safety check: ensure cpuTurnState still exists (game might have ended)
        if (!this.cpuTurnState || !this.cpuTurnState.player) {
            console.log('🏁 CPU end turn aborted - no active CPU turn state (game may have ended)');
            return;
        }
        
        const player = this.cpuTurnState.player;
        const thinkingTime = this.getCPUThinkingTime(player) * 0.5; // Shorter for ending
        
        console.log(`🏁 CPU ${player.monster.name} attempting to end turn...`);
        
        // Show notification about CPU ending turn
        this.showCPUActionNotification({
            message: `${player.monster.name} ends turn`,
            player: player,
            action: 'end-turn'
        });
        
        setTimeout(() => {
            const endTurnBtn = document.getElementById('end-turn');
            console.log('🏁 End turn button state:', {
                exists: !!endTurnBtn,
                disabled: endTurnBtn ? endTurnBtn.disabled : 'N/A',
                visible: endTurnBtn ? endTurnBtn.style.display !== 'none' : 'N/A'
            });
            
            if (endTurnBtn) {
                if (!endTurnBtn.disabled) {
                    console.log('✅ CPU ending turn by clicking button...');
                    endTurnBtn.click();
                } else {
                    console.log('🔧 End turn button disabled, force enabling and clicking...');
                    endTurnBtn.disabled = false;
                    endTurnBtn.click();
                }
                
                // Clean up CPU state
                console.log('🧹 Cleaning up CPU turn state...');
                this.cpuTurnState = null;
            } else {
                console.log('❌ End turn button not found, trying game.endTurn() directly...');
                if (this.game && this.game.endTurn) {
                    this.game.endTurn();
                    this.cpuTurnState = null;
                } else {
                    console.log('❌ Cannot end turn, marking CPU as not processing');
                    this.cpuTurnState.isProcessing = false;
                }
            }
        }, thinkingTime);
    }

    // Wait for game phase to change
    waitForGamePhaseChange(expectedPhase) {
        let attempts = 0;
        const maxAttempts = 25; // 5 seconds maximum wait (25 * 200ms)
        
        const checkPhase = () => {
            attempts++;
            const gameState = this.game.getGameState();
            
            console.log(`🕐 CPU waiting for phase '${expectedPhase}', currently '${gameState.turnPhase}' (attempt ${attempts}/${maxAttempts})`);
            
            if (gameState.turnPhase === expectedPhase) {
                console.log(`✅ CPU phase change completed: ${expectedPhase}`);
                this.cpuTurnState.isProcessing = false;
                this.processCPUTurn();
            } else if (attempts >= maxAttempts) {
                console.log(`⏰ CPU timeout waiting for phase '${expectedPhase}', forcing action`);
                
                // Special handling for waiting for 'buying' phase while stuck in 'resolving'
                if (expectedPhase === 'buying' && gameState.turnPhase === 'resolving' && this.game.diceEffectsResolved) {
                    console.log('🔧 FORCING transition from resolving to buying phase');
                    this.game.currentTurnPhase = 'buying';
                    this.game.triggerEvent('turnPhaseChanged', { phase: 'buying' });
                    this.cpuTurnState.isProcessing = false;
                    this.processCPUTurn();
                } else {
                    // Otherwise, force end turn
                    this.executeCPUEndTurn();
                }
            } else {
                // Check again in a short time
                setTimeout(checkPhase, 200);
            }
        };
        
        setTimeout(checkPhase, 500); // Initial delay
    }

    // Get CPU thinking time based on settings and personality
    getCPUThinkingTime(player) {
        // Get CPU speed setting
        const cpuSpeed = localStorage.getItem('cpuSpeed') || 'medium';
        let speedMultiplier = 1;
        
        switch (cpuSpeed) {
            case 'fast':
                speedMultiplier = 0.5;
                break;
            case 'medium':
                speedMultiplier = 1;
                break;
            case 'slow':
                speedMultiplier = 1.8;
                break;
        }
        
        // Base thinking time
        let baseTime = 1500 * speedMultiplier;
        
        // Adjust for personality
        if (player.monster.profile) {
            const profile = player.monster.profile;
            if (profile.strategy >= 4) baseTime += 500 * speedMultiplier;
            if (profile.aggression >= 4) baseTime -= 300 * speedMultiplier;
            if (profile.risk >= 4) baseTime -= 200 * speedMultiplier;
        }
        
        // Add randomness
        const randomTime = Math.random() * 1000 * speedMultiplier;
        return Math.max(500, baseTime + randomTime);
    }

    // Initialize responsive panel behavior
    initializeResponsivePanels() {
        // Create toggle overlays for very narrow screens
        this.createPanelToggleOverlays();
        
        // Listen for window resize to handle responsive behavior
        window.addEventListener('resize', () => {
            this.handleResponsivePanels();
        });
        
        // Initial check
        this.handleResponsivePanels();
    }
    
    createPanelToggleOverlays() {
        // Create left toggle overlay for monsters
        const leftOverlay = document.createElement('div');
        leftOverlay.className = 'panel-toggle-overlay left';
        leftOverlay.id = 'monsters-toggle-overlay';
        leftOverlay.textContent = 'Monsters';
        leftOverlay.addEventListener('click', () => this.togglePanelOverlay('monsters'));
        document.body.appendChild(leftOverlay);
        
        // Create right toggle overlay for power cards
        const rightOverlay = document.createElement('div');
        rightOverlay.className = 'panel-toggle-overlay right';
        rightOverlay.id = 'power-cards-toggle-overlay';
        rightOverlay.textContent = 'Cards';
        rightOverlay.addEventListener('click', () => this.togglePanelOverlay('power-cards'));
        document.body.appendChild(rightOverlay);
    }
    
    handleResponsivePanels() {
        const isVeryNarrow = window.innerWidth <= 480;
        const leftOverlay = document.getElementById('monsters-toggle-overlay');
        const rightOverlay = document.getElementById('power-cards-toggle-overlay');
        
        if (isVeryNarrow) {
            // Show overlays on very narrow screens
            if (leftOverlay) leftOverlay.style.display = 'block';
            if (rightOverlay) rightOverlay.style.display = 'block';
        } else {
            // Hide overlays on wider screens
            if (leftOverlay) leftOverlay.style.display = 'none';
            if (rightOverlay) rightOverlay.style.display = 'none';
            
            // Remove force-show class if present
            const monstersPanel = document.getElementById('monsters-panel');
            const cardsPanel = document.getElementById('power-cards-panel');
            if (monstersPanel) monstersPanel.classList.remove('force-show');
            if (cardsPanel) cardsPanel.classList.remove('force-show');
        }
    }
    
    togglePanelOverlay(panelType) {
        const panelId = panelType === 'monsters' ? 'monsters-panel' : 'power-cards-panel';
        const panel = document.getElementById(panelId);
        
        if (!panel) return;
        
        const isForceShown = panel.classList.contains('force-show');
        
        if (isForceShown) {
            // Hide the panel
            panel.classList.remove('force-show');
        } else {
            // Show the panel
            panel.classList.add('force-show');
            
            // Hide the other panel if it's shown
            const otherPanelId = panelType === 'monsters' ? 'power-cards-panel' : 'monsters-panel';
            const otherPanel = document.getElementById(otherPanelId);
            if (otherPanel) otherPanel.classList.remove('force-show');
        }
    }

    // Panel toggle functionality
    togglePanel(panelType) {
        const panelId = panelType === 'monsters' ? 'monsters-panel' : 'power-cards-panel';
        const panel = document.getElementById(panelId);
        
        if (!panel) return;

        const isCollapsed = panel.classList.contains('collapsed');
        const collapsedClass = panelType === 'monsters' ? 'monsters-collapsed' : 'cards-collapsed';
        
        if (isCollapsed) {
            // Expand the panel
            panel.classList.remove('collapsed');
            panel.classList.remove(collapsedClass);
        } else {
            // Collapse the panel
            panel.classList.add('collapsed');
            panel.classList.add(collapsedClass);
        }

        // Update arrow direction based on panel type and state
        const arrow = panel.querySelector('.toggle-arrow');
        if (arrow) {
            if (panelType === 'monsters') {
                // Right panel: > when expanded (collapse right), < when collapsed (expand left)
                arrow.textContent = isCollapsed ? '<' : '>';
            } else {
                // Left panel: < when expanded (collapse left), > when collapsed (expand right)  
                arrow.textContent = isCollapsed ? '>' : '<';
            }
        }
    }
}

// Note: Game initialization is now handled by the splash screen
// Note: Game initialization is now handled by the splash screen
