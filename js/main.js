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
        this.previousRound = 1; // Track previous round for animation
        this.playerTiles = []; // Track player tile assignments
        this.draggedMonster = null; // Track currently dragged monster
        
        // Sportscast commentary arrays
        this.sportscastCommentary = {
            intro: [
                "Ladies and gentlemen, welcome to the King of Tokyo Roll-Off!",
                "It's time to see who will claim the first turn in this epic battle!",
                "The monsters are ready... let's see who has the dice on their side!",
                "Who will emerge as the first to terrorize Tokyo? Let's find out!"
            ],
            beforeRoll: [
                "Here comes {name}, looking confident and ready to roll!",
                "{name} steps up to the dice table with determination!",
                "All eyes are on {name} as they prepare for their moment of truth!",
                "{name} takes a deep breath... this could be the roll that matters!"
            ],
            humanRoll: [
                "{name}, it's your turn! Click that roll button and show us what you've got!",
                "The spotlight is on you, {name}! Time to roll those dice!",
                "{name}, the crowd is waiting! Give those dice a shake!",
                "It's all up to you now, {name}! Click to roll and claim your destiny!"
            ],
            aiRolling: [
                "{name} is calculating the perfect roll...",
                "Watch as {name} demonstrates their rolling technique!",
                "{name} focuses their energy... here comes the roll!",
                "The mechanical precision of {name} is about to be revealed!"
            ],
            results: {
                high: [
                    "INCREDIBLE! {name} just rolled {count} attacks! What a phenomenal performance!",
                    "Outstanding! {name} comes out swinging with {count} attack dice!",
                    "Magnificent! {name} shows everyone how it's done with {count} attacks!",
                    "Spectacular! {name} dominates the roll with {count} attack dice!"
                ],
                medium: [
                    "Solid performance! {name} rolls {count} attacks - a respectable showing!",
                    "Not bad! {name} puts up {count} attacks on the board!",
                    "Decent roll! {name} manages {count} attacks - still in the game!",
                    "A fair effort! {name} scores {count} attacks in this round!"
                ],
                low: [
                    "Oh no! {name} only managed {count} attacks - that's going to be tough to beat the competition with!",
                    "Unlucky! {name} rolls just {count} attacks - the dice weren't kind today!",
                    "Rough luck! {name} ends up with only {count} attacks - better luck next time!",
                    "The dice have spoken! {name} gets {count} attacks - not quite the roll they were hoping for!"
                ]
            },
            tie: [
                "We have a TIE! This is what we live for, folks!",
                "Incredible! A deadlock! These monsters are evenly matched!",
                "Unbelievable! Lady Luck has given us a tie - time for a tiebreaker!",
                "What drama! A perfect tie! Tokyo will have to wait a little longer!"
            ],
            winner: [
                "AND WE HAVE A WINNER! {name} takes the crown with {count} attacks!",
                "VICTORY! {name} emerges triumphant and will lead the charge into Tokyo!",
                "CHAMPION! {name} has proven their worth and earned the right to go first!",
                "PHENOMENAL! {name} rises above the competition and claims first turn!"
            ]
        };
        
        // Initialize SetupManager for handling setup screen
        this.setupManager = new SetupManager(UIUtilities);
        
        // Expose this instance globally for SetupManager callbacks
        window.kingOfTokyoUI = this;
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeGamePause(); // Initialize pause system
        this.initializeDragAndDrop();
        this.initializeDarkMode();
        this.setupManager.initializeMonsterProfiles();
        this.initializeSettings();
        this.initializeResponsivePanels();
        this.initializeDiceArea(); // Initialize dice area with 6 dice
        this.setupManager.showSetupModal(); // Delegate to SetupManager
        
        // End turn button functionality now handled in dice controls
        // No need to add duplicate button
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
            // Note: active player uses .player-dashboard.active class
            
            // Game over elements
            winnerAnnouncement: document.getElementById('winner-announcement'),
            newGameBtn: document.getElementById('new-game'),
            
            // Toolbar elements
            exitGameBtn: document.getElementById('exit-game-btn'),
            
            // Roll-off elements
            rolloffScoreboardContainer: document.getElementById('rolloff-scoreboard-container'),
            rolloffTable: document.getElementById('rolloff-table'),
            rolloffTableBody: document.getElementById('rolloff-table-body'),
            rolloffCommentary: document.getElementById('rolloff-commentary'),
            rolloffRollBtn: document.getElementById('rolloff-roll-btn'),
            pauseGameBtn: document.getElementById('pause-game-btn'),
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
            exportLogsBtn: document.getElementById('export-logs-btn'),
            closeStorageMgmtBtn: document.getElementById('close-storage-mgmt'),
            closeSettingsBtn: document.getElementById('close-settings'),
            saveSettingsBtn: document.getElementById('save-settings'),
            resetSettingsBtn: document.getElementById('reset-settings'),
            cpuSpeedRadios: document.querySelectorAll('input[name="cpu-speed"]'),
            thoughtBubblesToggle: document.getElementById('thought-bubbles-toggle'),
            closeInstructionsBtn: document.getElementById('close-instructions'),
            closeGameOverBtn: document.getElementById('close-game-over'),
            darkModeToggle: document.getElementById('dark-mode-toggle'),
            gamePauseOverlay: document.getElementById('game-pause-overlay')
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
        
        // Monster profiles modal events
        this.elements.closeMonsterProfiles.addEventListener('click', () => {
            this.setupManager.hideMonsterProfilesModal();
        });

        this.elements.resetProfilesBtn.addEventListener('click', () => {
            this.setupManager.resetMonsterProfiles();
        });

        this.elements.saveProfilesBtn.addEventListener('click', () => {
            this.setupManager.saveMonsterProfiles();
            UIUtilities.showMessage('Monster profiles saved!', 3000, this.elements);
            this.setupManager.hideMonsterProfilesModal();
        });

        // Close modal when clicking outside
        this.elements.monsterProfilesModal.addEventListener('click', (e) => {
            if (e.target === this.elements.monsterProfilesModal) {
                this.setupManager.hideMonsterProfilesModal();
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
            
            this.endTurn();
        });

        // Rolloff roll button event
        if (this.elements.rolloffRollBtn) {
            this.elements.rolloffRollBtn.addEventListener('click', () => {
                this.handleRolloffRoll();
            });
        }

        // this.elements.buyCardsBtn.addEventListener('click', () => {
        //     this.showCardBuyingInterface();
        // });

                // Game over modal events
        this.elements.newGameBtn.addEventListener('click', () => {
            UIUtilities.hideModal(this.elements.gameOverModal);
            this.setupManager.showSetupModal();
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

        this.elements.pauseGameBtn.addEventListener('click', () => {
            this.toggleGamePause();
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

        // Check if export button exists before adding event listener
        if (this.elements.exportLogsBtn) {
            console.log('✅ Export logs button found, adding event listener');
            this.elements.exportLogsBtn.addEventListener('click', () => {
                console.log('Export logs button clicked!');
                this.exportGameLogs();
            });
        } else {
            console.error('❌ Export logs button not found!');
        }

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

        // Export logs button
        if (this.elements.exportLogsBtn) {
            console.log('✅ Export logs button found in main setup, adding event listener');
            this.elements.exportLogsBtn.addEventListener('click', (e) => {
                console.log('🎯 Export logs button clicked!');
                e.preventDefault();
                e.stopPropagation();
                this.exportGameLogs();
            });
        } else {
            console.error('❌ Export logs button not found in main setup!');
        }

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
                this.setupManager.hideSetupModal();
                UIUtilities.showSplashScreen(this.elements, this.setupManager);
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
            this.makeDraggable(element);
        });
    }

    // Helper method to make a single element draggable
    makeDraggable(element) {
        let isDragging = false;
        let currentX = 0;
        let currentY = 0;
        let initialX = 0;
        let initialY = 0;
        let xOffset = 0;
        let yOffset = 0;

            // Use the whole element as draggable (not just the drag handle)
            const dragHandle = element;

            dragHandle.addEventListener('mousedown', dragStart);
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);

            // Touch events for mobile
            dragHandle.addEventListener('touchstart', dragStart);
            document.addEventListener('touchmove', drag);
            document.addEventListener('touchend', dragEnd);

            function dragStart(e) {
                // Prevent dragging when clicking on interactive elements
                if (e.target.tagName === 'BUTTON' || 
                    e.target.tagName === 'INPUT' || 
                    e.target.tagName === 'SELECT' ||
                    e.target.closest('button') ||
                    e.target.closest('input') ||
                    e.target.closest('select')) {
                    return;
                }

                e.preventDefault();
                element.classList.add('dragging');

                // Get the element's current position to calculate proper offset
                const rect = element.getBoundingClientRect();
                
                // If this is the first drag and no position has been set, use current position
                if (xOffset === 0 && yOffset === 0) {
                    xOffset = rect.left;
                    yOffset = rect.top;
                }

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

                // Override CSS positioning with !important
                element.style.setProperty('position', 'fixed', 'important');
                element.style.setProperty('left', `${currentX}px`, 'important');
                element.style.setProperty('top', `${currentY}px`, 'important');
                element.style.setProperty('bottom', 'auto', 'important');
                element.style.setProperty('transform', 'none', 'important');
                
                // Debug logging
                console.log(`Dragging ${element.id}: left=${currentX}px, top=${currentY}px`);
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
                        
                        // Only apply saved position if it's valid (not at 0,0 or negative)
                        if (currentX > 10 && currentY > 10) {
                            xOffset = currentX;
                            yOffset = currentY;
                            
                            // Override CSS positioning with !important
                            element.style.setProperty('position', 'fixed', 'important');
                            element.style.setProperty('left', `${currentX}px`, 'important');
                            element.style.setProperty('top', `${currentY}px`, 'important');
                            element.style.setProperty('bottom', 'auto', 'important');
                            element.style.setProperty('transform', 'none', 'important');
                            
                            console.log(`Restored position for ${elementId}: left=${currentX}px, top=${currentY}px`);
                        } else {
                            // Clear invalid saved position
                            localStorage.removeItem(`${elementId}-position`);
                            console.log(`Cleared invalid position for ${elementId}: ${currentX}, ${currentY}`);
                        }
                    } catch (e) {
                        console.warn('Failed to restore position for', elementId);
                    }
                } else {
                    console.log(`No saved position found for ${elementId}`);
                }
            }
        }

    // Reset all draggable elements to their default positions
    resetDraggablePositions() {
        const draggableElements = document.querySelectorAll('.draggable');
        
        draggableElements.forEach(element => {
            // Remove all custom positioning properties to return to CSS default
            element.style.removeProperty('position');
            element.style.removeProperty('left');
            element.style.removeProperty('top');
            element.style.removeProperty('bottom');
            element.style.removeProperty('transform');
            
            // Remove saved position from localStorage
            const elementId = element.id;
            if (elementId) {
                localStorage.removeItem(`${elementId}-position`);
            }
        });
        
        // Show confirmation message
        UIUtilities.showMessage('Layout positions reset to default!', 2000, this.elements);
    }



    
    async startGame() {
        console.log('startGame called');
        console.log('Selected monsters count:', this.selectedMonsters.length);
        console.log('Current player count:', this.currentPlayerCount);
        console.log('Selected monsters:', this.selectedMonsters);
        
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
            console.log('Player types:', playerTypes);
            
            // Perform roll-off to determine first player
            console.log('🎲 Starting roll-off for first player...');
            console.log('Passing selectedMonsters to rollForFirstPlayer:', this.selectedMonsters);
            
            // Hide the setup modal so users can see the roll-off scoreboard
            this.setupManager.hideSetupModal();
            
            const rollOffWinner = await this.game.rollForFirstPlayer(this.selectedMonsters, playerTypes);
            console.log(`🏆 Roll-off winner:`, rollOffWinner);
            
            // Reorder players so winner becomes Player 1
            const reorderedData = this.game.reorderPlayersForFirstPlayer(this.selectedMonsters, playerTypes, rollOffWinner.index);
            const finalMonsters = reorderedData.selectedMonsters;
            const finalPlayerTypes = reorderedData.playerTypes;
            
            // Initialize game with reordered players (winner is now index 0)
            console.log('About to initialize game with reordered monsters and player types:', finalMonsters, finalPlayerTypes);
            const result = await this.game.initializeGame(finalMonsters, this.currentPlayerCount, finalPlayerTypes, rollOffWinner.index);
            console.log('Game initialization result:', result);
            
            // 3. Log who goes first (after game initialization so we know the randomized starting player)
            if (result.success) {
                await this.game.logSetupActionWithStorage(`🎲 ${result.currentPlayer.monster.name} goes first!`, 'ready-to-start');
            }
            
            if (result.success) {
                // Setup modal already hidden before roll-off
                
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
                
                // REMOVED: Automatic Tokyo entry at game start
                // Players should only enter Tokyo when they END their turn, not at game start
                // The original automatic Tokyo entry logic has been removed to fix the turn flow
                
                this.updateGameDisplay();
                
                UIUtilities.showMessage(`Game started! ${result.currentPlayer.monster.name} goes first!`, 3000, this.elements);
                
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

    // Method called by SetupManager to start the game
    async startGameFromSetup(selectedMonsters, currentPlayerCount, playerTiles) {
        console.log('startGameFromSetup called from SetupManager');
        console.log('Selected monsters:', selectedMonsters);
        console.log('Player count:', currentPlayerCount);
        console.log('Player tiles:', playerTiles);
        
        // Store the setup data from SetupManager
        this.selectedMonsters = selectedMonsters;
        this.currentPlayerCount = currentPlayerCount;
        this.playerTiles = playerTiles;
        
        // Call the existing startGame method
        await this.startGame();
    }

    // Method called by SetupManager to regenerate player tiles
    regeneratePlayerTilesFromSetup(playerCount) {
        console.log('regeneratePlayerTilesFromSetup called from SetupManager with playerCount:', playerCount);
        // This would regenerate player tiles based on the new player count
        // For now, just delegate to the SetupManager's internal generation
        if (this.setupManager && typeof this.setupManager.generatePlayerTilesInternal === 'function') {
            this.setupManager.generatePlayerTilesInternal();
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
                console.log('🏁 TURN ENDED EVENT - Critical debugging point!');
                console.log('🏁 Current player before cleanup:', this.game?.getCurrentPlayer()?.monster?.name);
                console.log('🏁 Game state before cleanup:', {
                    phase: this.game?.gamePhase,
                    turnPhase: this.game?.currentTurnPhase,
                    currentPlayerIndex: this.game?.currentPlayerIndex
                });
                
                // DISABLED: Handle Tokyo entry at END of turn 
                // This logic was causing premature Tokyo entry before players finished their actions
                // Tokyo entry is now handled properly in game.js when players explicitly end their turn
                // this.handleEndOfTurnTokyoEntry(data);
                
                this.cleanupAllThoughtBubbles();
                console.log('🏁 About to call updateGameDisplay...');
                this.updateGameDisplay();
                console.log('🏁 updateGameDisplay completed');
                console.log('🏁 Current player after updateGameDisplay:', this.game?.getCurrentPlayer()?.monster?.name);
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
                console.log('🚨 TURN DEBUG: Player should be able to take actions now!');
                
                this.clearAllAttackAnimations(); // Clear any stuck attack animations
                this.updateGameDisplay(); // Update UI to show new current player
                
                // Check if new current player is CPU and auto-start their turn
                const currentPlayer = this.game.getCurrentPlayer();
                console.log('🎯 Current player from game:', currentPlayer);
                console.log('� CRITICAL TURN FLOW DEBUG:', {
                    playerName: currentPlayer?.monster?.name,
                    playerType: currentPlayer?.playerType,
                    isEliminated: currentPlayer?.isEliminated,
                    gamePhase: this.game?.gamePhase,
                    turnPhase: this.game?.currentTurnPhase,
                    canPlayerAct: !currentPlayer?.isEliminated,
                    shouldStartCPU: currentPlayer?.playerType === 'cpu' && !currentPlayer?.isEliminated,
                    shouldAllowHuman: currentPlayer?.playerType === 'human' && !currentPlayer?.isEliminated
                });
                
                // CRITICAL FIX: Only start CPU turn if player is actually CPU and not eliminated
                if (currentPlayer && 
                    currentPlayer.playerType === 'cpu' && 
                    !currentPlayer.isEliminated && 
                    !this.cpuTurnState) { // Don't start if CPU turn already in progress
                    
                    console.log('🤖 Current player is CPU, starting automatic turn in 2 seconds...');
                    setTimeout(() => {
                        // Triple-check that it's still the same CPU player's turn and no other CPU turn is active
                        const stillCurrentPlayer = this.game.getCurrentPlayer();
                        if (stillCurrentPlayer && 
                            stillCurrentPlayer.id === currentPlayer.id && 
                            stillCurrentPlayer.playerType === 'cpu' &&
                            !stillCurrentPlayer.isEliminated &&
                            !this.cpuTurnState &&
                            !this.game.switchingPlayers) { // Ensure no player switching in progress
                            console.log('🤖 Executing startAutomaticCPUTurn for:', currentPlayer.monster.name);
                            this.startAutomaticCPUTurn(currentPlayer);
                        } else {
                            console.log('🤖 CPU turn cancelled - conditions changed:', {
                                stillExists: !!stillCurrentPlayer,
                                samePlayer: stillCurrentPlayer?.id === currentPlayer.id,
                                stillCPU: stillCurrentPlayer?.playerType === 'cpu',
                                notEliminated: !stillCurrentPlayer?.isEliminated,
                                noCPUState: !this.cpuTurnState,
                                notSwitching: !this.game.switchingPlayers
                            });
                        }
                    }, 2000);
                } else if (currentPlayer && currentPlayer.playerType === 'human') {
                    console.log('👤 HUMAN TURN STARTING: Player should be able to roll dice!');
                    // Immediately enable controls for human players - no delay needed
                    this.updateDiceControls();
                    console.log('👤 Human player details:', {
                        name: currentPlayer.monster.name,
                        id: currentPlayer.id,
                        eliminated: currentPlayer.isEliminated,
                        canPlay: !currentPlayer.isEliminated
                    });
                    // Ensure no CPU state interferes with human turns
                    if (this.cpuTurnState) {
                        console.log('🧹 Clearing stale CPU turn state for human player');
                        this.cpuTurnState = null;
                    }
                } else if (this.cpuTurnState) {
                    console.log('🤖 CPU turn already in progress, not starting new one');
                } else if (currentPlayer) {
                    console.log('👤 Current player is human:', currentPlayer.monster.name);
                    console.log('👤 Human player should be able to take their turn now');
                    // Extra safety: clear any stale CPU state
                    this.cpuTurnState = null;
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
            case 'rollOffRound':
                this.showRollOffNotification(data);
                break;
            case 'playerAboutToRoll':
                this.showPlayerAboutToRoll(data);
                break;
            case 'playerRollOff':
                this.showPlayerRollOffResult(data);
                break;
            case 'rollOffTie':
                this.showRollOffTie(data);
                break;
            case 'rollOffWinner':
                this.showRollOffWinner(data);
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
        console.log('🔄 updateGameDisplay called, game exists:', !!this.game);
        
        if (this.game) {
            const gameState = this.game.getGameState();
            const currentPlayer = gameState.currentPlayer;
            console.log('🔄 Current player in updateGameDisplay:', currentPlayer?.monster?.name, 'isInTokyo:', currentPlayer?.isInTokyo);
        }
        
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
        
        console.log('👥 UPDATE PLAYERS DISPLAY called');
        console.log('👥 Current player from game:', currentPlayer?.monster?.name, 'ID:', currentPlayer?.id);
        console.log('👥 Last current player ID stored:', this.lastCurrentPlayerId);
        
        // SAFETY CHECK: Ensure current player exists
        if (!currentPlayer) {
            console.error('🚨 ERROR: No current player available in updatePlayersDisplay!');
            return;
        }
        
        // Check if player cards exist in the DOM - if not, we need initial creation
        const existingPlayerCards = document.querySelectorAll('.player-dashboard');
        console.log('👥 Existing player cards found:', existingPlayerCards.length);
        
        if (existingPlayerCards.length === 0) {
            console.log('👥 No player cards exist - performing initial creation');
            this._createInitialPlayerCards(players, currentPlayer);
            return;
        }
        
        // Check if current player has changed to determine if we need to reposition
        const currentPlayerChanged = this.lastCurrentPlayerId !== currentPlayer.id;
        console.log('👥 Current player changed?', currentPlayerChanged, 'from', this.lastCurrentPlayerId, 'to', currentPlayer.id);
        this.lastCurrentPlayerId = currentPlayer.id;
        
        if (currentPlayerChanged) {
            console.log('👥 CALLING _repositionActivePlayer due to player change');
            // Use DOM manipulation approach instead of rebuilding
            this._repositionActivePlayer(players, currentPlayer);
        } else {
            console.log('👥 CALLING _updatePlayerStats (no repositioning needed)');
            // Otherwise, just update the stats of existing cards
            this._updatePlayerStats(players);
        }
    }
    
    // Initial creation of player cards (only called once at game start)
    _createInitialPlayerCards(players, currentPlayer) {
        console.log('🏗️ Creating initial player cards');
        
        // Use the old method for initial creation
        this.elements.playersContainer.innerHTML = players.map(player => 
            this._generatePlayerHTML(player, player.id === currentPlayer.id)
        ).join('');
        
        console.log('📄 Generated initial HTML for players container');
        
        // Store the current player ID so subsequent calls use DOM manipulation
        this.lastCurrentPlayerId = currentPlayer.id;
        
        // Set up initial positioning with the newly created cards
        this._setupInitialPlayerPositioning(players, currentPlayer);
        
        // Make only the active player draggable
        this._setupActivePlayerDragging(currentPlayer.id);
        
        // Attach event listeners
        this.attachPowerCardTabListeners();
    }
    
    // Initial positioning setup (similar to _setupPlayerPositioning but for fresh cards)
    _setupInitialPlayerPositioning(players, currentPlayer) {
        console.log('🎯 Setting up initial player positioning');
        
        players.forEach((player, index) => {
            const dashboard = document.querySelector(`[data-player-id="${player.id}"]`);
            if (!dashboard) return;
            
            // Set monster color properties for all players
            if (player.monster.color) {
                const monsterColor = player.monster.color;
                const lighterColor = this._lightenColor(monsterColor, 20);
                const glowColor = `${monsterColor}66`;
                const strongGlowColor = `${monsterColor}aa`;

                dashboard.style.setProperty('--monster-color', monsterColor);
                dashboard.style.setProperty('--monster-color-light', lighterColor);
                dashboard.style.setProperty('--monster-glow-color', glowColor);
                dashboard.style.setProperty('--monster-glow-strong', strongGlowColor);
            }
            
            if (player.id === currentPlayer.id) {
                // Active player - move out of container and use fixed positioning
                console.log('📍 Setting up initial active player:', player.id);
                this._moveToActivePosition(dashboard, index);
            }
            // Non-active players stay in the container with CSS positioning
        });
    }
    
    // DOM manipulation approach - move existing cards without rebuilding
    _repositionActivePlayer(players, currentPlayer) {
        console.log('🎯 Repositioning active player using DOM manipulation');
        
        // STEP 1: First restore the previously active player (if any) to proper position
        const previouslyActiveCard = document.querySelector('.player-dashboard.active');
        if (previouslyActiveCard) {
            const previousPlayerId = previouslyActiveCard.dataset.playerId;
            console.log('↩️ Restoring previously active player first:', previousPlayerId);
            this._restoreToCorrectPosition(previouslyActiveCard, players);
        }
        
        // STEP 2: Then activate the new current player
        const newActiveCard = document.querySelector(`[data-player-id="${currentPlayer.id}"]`);
        console.log('🔍 TOKYO DEBUG: Looking for player card:', currentPlayer.id, 'Player:', currentPlayer.monster.name, 'In Tokyo:', currentPlayer.isInTokyo);
        console.log('🔍 TOKYO DEBUG: Found card:', !!newActiveCard);
        
        if (newActiveCard) {
            console.log('🚀 Activating new current player:', currentPlayer.monster.name);
            const playerIndex = players.findIndex(p => p.id === currentPlayer.id);
            this._moveToActivePosition(newActiveCard, playerIndex);
        } else {
            console.error('🚨 TOKYO BUG: Could not find player card for', currentPlayer.monster.name, 'ID:', currentPlayer.id);
            console.error('🚨 Available player cards:', Array.from(document.querySelectorAll('[data-player-id]')).map(el => el.dataset.playerId));
        }
        
        // STEP 3: Update monster colors and stats for all players
        players.forEach((player, index) => {
            const dashboard = document.querySelector(`[data-player-id="${player.id}"]`);
            if (!dashboard) return;
            
            // Set monster color properties for all players
            if (player.monster.color) {
                const monsterColor = player.monster.color;
                const lighterColor = this._lightenColor(monsterColor, 20);
                const glowColor = `${monsterColor}66`;
                const strongGlowColor = `${monsterColor}aa`;

                dashboard.style.setProperty('--monster-color', monsterColor);
                dashboard.style.setProperty('--monster-color-light', lighterColor);
                dashboard.style.setProperty('--monster-glow-color', glowColor);
                dashboard.style.setProperty('--monster-glow-strong', strongGlowColor);
            }
        });
        
        // Make only the active player draggable
        this._setupActivePlayerDragging(currentPlayer.id);
        
        // Update player stats
        this._updatePlayerStats(players);
        
        // Attach event listeners (in case any were lost)
        this.attachPowerCardTabListeners();
    }
    
    // Store original position and move card to active position
    _moveToActivePosition(dashboard, originalIndex) {
        console.log('📍 Moving player to active position:', dashboard.dataset.playerId);
        
        // Remove hover events for active player
        this._removeHoverEvents(dashboard);
        
        // Add active class and move to body
        dashboard.classList.add('active');
        
        if (dashboard.parentNode && dashboard.parentNode.id === 'players-container') {
            document.body.appendChild(dashboard);
        }
        
        // Make draggable
        dashboard.draggable = true;
        dashboard.classList.add('draggable');
        
        console.log('✅ Player moved to active position');
    }
    
    // Restore card to its correct position in the container based on player order
    _restoreToCorrectPosition(dashboard, players) {
        console.log('↩️ Restoring player to correct position:', dashboard.dataset.playerId);
        
        // Remove active classes first
        dashboard.classList.remove('active');
        dashboard.classList.remove('draggable');
        dashboard.draggable = false;
        
        // Only restore if it's currently in body (was moved out)
        if (dashboard.parentNode === document.body) {
            const playersContainer = document.getElementById('players-container');
            const playerId = dashboard.dataset.playerId;
            
            // Find this player's index in the players array
            const playerIndex = players.findIndex(p => p.id === playerId);
            
            if (playerIndex !== -1) {
                // Get all player cards currently in the container (sorted by their current order)
                const cardsInContainer = Array.from(playersContainer.children);
                
                if (playerIndex === 0) {
                    // Insert at the beginning
                    playersContainer.insertBefore(dashboard, playersContainer.firstChild);
                } else {
                    // Find the card that should come before this one
                    let insertAfter = null;
                    for (let i = playerIndex - 1; i >= 0; i--) {
                        const previousPlayerId = players[i].id;
                        insertAfter = playersContainer.querySelector(`[data-player-id="${previousPlayerId}"]`);
                        if (insertAfter) break;
                    }
                    
                    if (insertAfter) {
                        // Insert after the found card
                        playersContainer.insertBefore(dashboard, insertAfter.nextSibling);
                    } else {
                        // Fallback: insert at beginning
                        playersContainer.insertBefore(dashboard, playersContainer.firstChild);
                    }
                }
            } else {
                // Fallback: just append to container
                playersContainer.appendChild(dashboard);
            }
        }
        
        // Remove ALL inline styles that were applied when becoming active
        dashboard.style.position = '';
        dashboard.style.top = '';
        dashboard.style.left = '';
        dashboard.style.right = '';
        dashboard.style.bottom = '';
        dashboard.style.transform = '';
        dashboard.style.zIndex = '';
        dashboard.style.margin = '';
        dashboard.style.marginTop = '';
        dashboard.style.marginLeft = '';
        dashboard.style.marginRight = '';
        dashboard.style.marginBottom = '';
        dashboard.style.width = '';
        dashboard.style.height = '';
        dashboard.style.minHeight = '';
        dashboard.style.padding = '';
        dashboard.style.background = '';
        dashboard.style.border = '';
        dashboard.style.borderRadius = '';
        dashboard.style.boxShadow = '';
        dashboard.style.opacity = '';
        dashboard.style.visibility = '';
        dashboard.style.pointerEvents = '';
        
        // Restore hover events
        this._restoreHoverEvents(dashboard);
        
        console.log('✅ Player restored to correct position at index', players.findIndex(p => p.id === dashboard.dataset.playerId));
    }

    // Restore card to its original position in the container (legacy method - kept for compatibility)
    _restoreToOriginalPosition(dashboard, currentIndex) {
        // Only restore if this card was previously active
        if (!dashboard.classList.contains('active')) {
            return; // Card was never active, nothing to restore
        }
        
        console.log('↩️ Restoring player to original position:', dashboard.dataset.playerId);
        
        // Remove active classes
        dashboard.classList.remove('active');
        dashboard.classList.remove('draggable');
        dashboard.draggable = false;
        
        // Move back to players-container if it's currently in body
        if (dashboard.parentNode === document.body) {
            const playersContainer = document.getElementById('players-container');
            playersContainer.appendChild(dashboard);
        }
        
        // Remove ALL inline styles that were applied when becoming active
        dashboard.style.position = '';
        dashboard.style.top = '';
        dashboard.style.left = '';
        dashboard.style.right = '';
        dashboard.style.bottom = '';
        dashboard.style.transform = '';
        dashboard.style.zIndex = '';
        dashboard.style.margin = '';
        dashboard.style.marginTop = '';
        dashboard.style.marginLeft = '';
        dashboard.style.marginRight = '';
        dashboard.style.marginBottom = '';
        dashboard.style.width = '';
        dashboard.style.height = '';
        dashboard.style.minHeight = '';
        dashboard.style.padding = '';
        dashboard.style.background = '';
        dashboard.style.border = '';
        dashboard.style.borderRadius = '';
        dashboard.style.boxShadow = '';
        dashboard.style.opacity = '';
        dashboard.style.visibility = '';
        dashboard.style.pointerEvents = '';
        
        // Restore hover events
        this._restoreHoverEvents(dashboard);
        
        console.log('✅ Player restored to original position');
    }
    
    // Remove hover events from active player
    _removeHoverEvents(dashboard) {
        // Add CSS class to disable hover effects while keeping dragging enabled
        dashboard.classList.add('no-hover');
        console.log('🚫 Removed hover events for active player');
    }
    
    // Restore hover events for non-active player
    _restoreHoverEvents(dashboard) {
        // Remove the no-hover class to re-enable hover effects
        dashboard.classList.remove('no-hover');
        console.log('✅ Restored hover events for player');
    }
    
    // Rebuild the entire player layout (called only when current player changes)
    _rebuildPlayerLayout(players, currentPlayer) {
        console.log('🏗️ REBUILDING PLAYER LAYOUT - CRITICAL DEBUGGING');
        console.log('🏗️ Current player passed in:', currentPlayer?.monster?.name, 'ID:', currentPlayer?.id);
        console.log('🏗️ Total players:', players.length);
        console.log('🏗️ All players:', players.map(p => `${p.monster.name} (${p.playerType})`));
        
        // SAFETY CHECK: Ensure current player is valid
        if (!currentPlayer) {
            console.error('🚨 ERROR: No current player passed to _rebuildPlayerLayout!');
            return;
        }
        
        // CRITICAL FIX: Restore any active player cards back to container before rebuilding
        const activePlayerCards = document.querySelectorAll('.player-dashboard.active');
        const playersContainer = document.getElementById('players-container');
        
        activePlayerCards.forEach(card => {
            if (card.parentNode === document.body) {
                console.log('🔄 RESTORING active player card back to container before rebuild:', card.dataset.playerId);
                card.classList.remove('active');
                // Reset inline styles
                card.style.position = '';
                card.style.top = '';
                card.style.left = '';
                card.style.right = '';
                card.style.bottom = '';
                card.style.transform = '';
                card.style.zIndex = '';
                card.style.margin = '';
                playersContainer.appendChild(card);
            }
        });
        
        // Store original positioning data before any changes
        const existingCards = document.querySelectorAll('.player-dashboard');
        const originalPositions = new Map();
        
        existingCards.forEach(card => {
            const playerId = card.dataset.playerId;
            if (playerId) {
                const styles = getComputedStyle(card);
                originalPositions.set(playerId, {
                    position: styles.position,
                    top: styles.top,
                    left: styles.left,
                    right: styles.right,
                    transform: styles.transform,
                    zIndex: styles.zIndex,
                    margin: styles.margin,
                    background: styles.background,
                    borderColor: styles.borderColor
                });
            }
        });
        
        // Render all players in the main container
        this.elements.playersContainer.innerHTML = players.map(player => 
            this._generatePlayerHTML(player, player.id === currentPlayer.id)
        ).join('');
        
        console.log('📄 Generated HTML for players container');
        
        // Restore original positioning for non-active players and set up active player
        this._setupPlayerPositioning(players, currentPlayer, originalPositions);
        
        // Make only the active player draggable
        this._setupActivePlayerDragging(currentPlayer.id);
        
        // Attach event listeners
        this.attachPowerCardTabListeners();
        
        // Verify the active player is visible
        setTimeout(() => {
            const activePlayerDashboard = document.querySelector('.player-dashboard.active');
            if (activePlayerDashboard) {
                const rect = activePlayerDashboard.getBoundingClientRect();
                console.log('📍 Active player position:', 
                    `top: ${rect.top}px, left: ${rect.left}px, right: ${window.innerWidth - rect.right}px, width: ${rect.width}px, height: ${rect.height}px`);
                
                const styles = getComputedStyle(activePlayerDashboard);
                console.log('🎨 Active player computed styles:', 
                    `position: ${styles.position}, top: ${styles.top}, right: ${styles.right}, display: ${styles.display}, visibility: ${styles.visibility}, opacity: ${styles.opacity}`);
                
                // Check if it's visible in viewport
                const isVisible = rect.top >= 0 && rect.left >= 0 && 
                                 rect.bottom <= window.innerHeight && 
                                 rect.right <= window.innerWidth;
                console.log('👀 Is visible in viewport:', isVisible);
                
                if (!isVisible) {
                    console.warn('⚠️ Active player card is outside viewport bounds!');
                    console.log('🖥️ Viewport size:', `${window.innerWidth}x${window.innerHeight}`);
                }
            } else {
                console.error('❌ No active player dashboard found after layout rebuild');
            }
        }, 100);
    }
    
    // Setup player positioning - restore non-active players to stack, position active player
    _setupPlayerPositioning(players, currentPlayer, originalPositions) {
        console.log('🎯 Setting up player positioning');
        
        players.forEach((player, index) => {
            const dashboard = document.querySelector(`[data-player-id="${player.id}"]`);
            if (!dashboard) return;
            
            // Set monster color properties for all players
            if (player.monster.color) {
                const monsterColor = player.monster.color;
                const lighterColor = this._lightenColor(monsterColor, 20);
                const glowColor = `${monsterColor}66`; // Add alpha transparency
                const strongGlowColor = `${monsterColor}aa`; // Stronger alpha transparency

                dashboard.style.setProperty('--monster-color', monsterColor);
                dashboard.style.setProperty('--monster-color-light', lighterColor);
                dashboard.style.setProperty('--monster-glow-color', glowColor);
                dashboard.style.setProperty('--monster-glow-strong', strongGlowColor);
                
                console.log(`🎨 Set monster colors for ${player.monster.name}: ${monsterColor} -> ${lighterColor}`);
            }
            
            if (player.id === currentPlayer.id) {
                // Active player - move out of container and use fixed positioning
                console.log('📍 Setting up active player:', player.id);
                dashboard.classList.add('active');
                
                // Move the active player card out of the players container and append to body
                if (dashboard.parentNode && dashboard.parentNode.id === 'players-container') {
                    console.log('🚀 Moving active player out of container to body');
                    document.body.appendChild(dashboard);
                }
                
                // Store reference to original parent for restoration later
                dashboard.dataset.originalParent = 'players-container';
                dashboard.dataset.originalIndex = index.toString();
                
            } else {
                // Non-active player - restore to stack position
                console.log('📋 Restoring non-active player to stack:', player.id);
                console.log('📋 Dashboard parent:', dashboard.parentNode);
                console.log('📋 Dashboard originalParent:', dashboard.dataset.originalParent);
                console.log('📋 Dashboard classes:', dashboard.classList.toString());
                
                dashboard.classList.remove('active');
                
                // If this card was previously active and moved to body, move it back to players container
                if (dashboard.parentNode === document.body && dashboard.dataset.originalParent === 'players-container') {
                    console.log('↩️ Moving inactive player back to container');
                    const playersContainer = document.getElementById('players-container');
                    const originalIndex = parseInt(dashboard.dataset.originalIndex || '0');
                    
                    // Insert at the correct position based on original index
                    const existingCards = Array.from(playersContainer.querySelectorAll('.player-dashboard'));
                    if (originalIndex < existingCards.length) {
                        playersContainer.insertBefore(dashboard, existingCards[originalIndex]);
                    } else {
                        playersContainer.appendChild(dashboard);
                    }
                    
                    // Clean up data attributes
                    delete dashboard.dataset.originalParent;
                    delete dashboard.dataset.originalIndex;
                    console.log('✅ Player moved back to container');
                } else {
                    console.log('❌ Player not moved - parent:', dashboard.parentNode, 'originalParent:', dashboard.dataset.originalParent);
                }
                
                // Remove any inline styles that might override CSS positioning
                dashboard.style.position = '';
                dashboard.style.top = '';
                dashboard.style.left = '';
                dashboard.style.right = '';
                dashboard.style.bottom = '';
                dashboard.style.transform = '';
                dashboard.style.zIndex = '';
                dashboard.style.margin = '';
                
                // Let CSS handle the stack positioning based on nth-child rules
            }
        });
    }
    
    // Helper method to lighten a hex color
    _lightenColor(color, percent) {
        const f = parseInt(color.slice(1), 16);
        const t = percent < 0 ? 0 : 255;
        const p = percent < 0 ? percent * -1 : percent;
        const R = f >> 16;
        const G = f >> 8 & 0x00FF;
        const B = f & 0x0000FF;
        return "#" + (0x1000000 + (Math.round((t - R) * p / 100) + R) * 0x10000 + 
                      (Math.round((t - G) * p / 100) + G) * 0x100 + 
                      (Math.round((t - B) * p / 100) + B)).toString(16).slice(1);
    }

    // Setup dragging for the active player only
    _setupActivePlayerDragging(activePlayerId) {
        // Remove draggable from all players first
        const allPlayerDashboards = document.querySelectorAll('.player-dashboard');
        allPlayerDashboards.forEach(dashboard => {
            dashboard.classList.remove('draggable');
            dashboard.removeAttribute('draggable');
        });
        
        // Add draggable to active player
        const activePlayerDashboard = document.querySelector(`.player-dashboard[data-player-id="${activePlayerId}"]`);
        console.log('🎯 Setting up active player dragging for:', activePlayerId);
        console.log('🔍 Found active player dashboard:', activePlayerDashboard);
        
        if (activePlayerDashboard) {
            console.log('📋 Classes before:', activePlayerDashboard.className);
            activePlayerDashboard.classList.add('draggable');
            activePlayerDashboard.setAttribute('draggable', 'true');
            console.log('📋 Classes after:', activePlayerDashboard.className);
            
            // Check if it has the active class
            console.log('✅ Has active class:', activePlayerDashboard.classList.contains('active'));
            
            this.makeDraggable(activePlayerDashboard);
        } else {
            console.error('❌ Could not find active player dashboard for ID:', activePlayerId);
        }
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
                if (nameContainer) {
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
            }
        });
    }
    
    // Generate HTML for a single player card
    _generatePlayerHTML(player, isActive) {
        console.log(`🃏 Generating HTML for ${player.monster.name}: isActive=${isActive}, isInTokyo=${player.isInTokyo}, tokyoLocation=${player.tokyoLocation}`);
        
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
    
    // Handle Tokyo entry at END of turn (proper game rules)
    handleEndOfTurnTokyoEntry(gameState) {
        // DISABLED: This method was duplicating and conflicting with the proper Tokyo entry logic in game.js
        // The game.js version properly checks that dice have been resolved before allowing Tokyo entry
        // This main.js version was causing premature Tokyo entry before players could even roll dice
        console.log('🏰 main.js Tokyo entry handler DISABLED - proper logic is in game.js');
        return;
        
        /*
        const endingPlayer = this.game.getCurrentPlayer();
        const endingPlayerIndex = this.game.currentPlayerIndex;
        const roundNumber = this.game.round;
        
        console.log('🏰 END-OF-TURN TOKYO ENTRY CHECK:', {
            endingPlayer: endingPlayer.monster.name,
            endingPlayerIndex,
            roundNumber,
            tokyoCityOccupied: this.game.tokyoCity !== null,
            tokyoBayOccupied: this.game.tokyoBay !== null,
            playerCount: this.game.players.length
        });
        
        // First turn (any player count): First player enters Tokyo City at end of their turn
        if (roundNumber === 1 && endingPlayerIndex === 0 && this.game.tokyoCity === null) {
            console.log(`🏰 FIRST TURN: ${endingPlayer.monster.name} enters Tokyo City at turn end!`);
            this.game.enterTokyo(endingPlayer, true); // true = automatic entry, no points
            UIUtilities.showMessage(`${endingPlayer.monster.name} enters Tokyo City!`, 3000, this.elements);
            return;
        }
        
        // Second turn (5+ players only): Second player enters Tokyo Bay at end of their turn
        if (roundNumber === 1 && endingPlayerIndex === 1 && this.game.players.length >= 5 && this.game.tokyoBay === null && this.game.tokyoCity !== null) {
            console.log(`🏰 SECOND TURN (5+ players): ${endingPlayer.monster.name} enters Tokyo Bay at turn end!`);
            this.game.enterTokyo(endingPlayer, true); // true = automatic entry, no points
            UIUtilities.showMessage(`${endingPlayer.monster.name} enters Tokyo Bay!`, 3000, this.elements);
            return;
        }
        
        console.log('🏰 No automatic Tokyo entry needed this turn');
        */
    }

    // Handle automatic Tokyo Bay entry for 5+ player games
    handleTokyoBayAutoEntry(gameState) {
        // DISABLED: This method was also duplicating Tokyo entry logic and causing premature entry
        // The proper Tokyo entry logic is handled in game.js after dice are resolved
        console.log('🏖️ main.js Tokyo Bay auto-entry handler DISABLED - proper logic is in game.js');
        return;
        
        /*
        // Only for games with 5+ players
        if (this.game.players.length < 5) {
            return;
        }
        
        // Only if Tokyo Bay is empty and someone is in Tokyo City
        if (this.game.tokyoBay !== null || this.game.tokyoCity === null) {
            return;
        }
        
        // Get the player who just ended their turn
        const endingPlayer = this.game.getCurrentPlayer();
        const endingPlayerIndex = this.game.currentPlayerIndex;
        
        console.log('🏖️ TOKYO BAY AUTO-ENTRY CHECK (at turn END):', {
            endingPlayer: endingPlayer.monster.name,
            endingPlayerIndex,
            isSecondPlayer: endingPlayerIndex === 1,
            tokyoCityOccupied: this.game.tokyoCity !== null,
            tokyoBayEmpty: this.game.tokyoBay === null,
            currentPlayerType: endingPlayer.playerType,
            gamePhase: this.game.gamePhase,
            turnPhase: this.game.currentTurnPhase
        });
        
        // If the second player (index 1) is ending their turn, put them in Tokyo Bay
        if (endingPlayerIndex === 1 && this.game.tokyoBay === null) {
            console.log(`🏖️ EXECUTING AUTO-ENTRY: ${endingPlayer.monster.name} automatically enters Tokyo Bay at turn end!`);
            console.log('🏖️ BEFORE AUTO-ENTRY:', {
                tokyoCity: this.game.tokyoCity,
                tokyoBay: this.game.tokyoBay,
                endingPlayerVP: endingPlayer.victoryPoints,
                gamePhase: this.game.gamePhase,
                turnPhase: this.game.currentTurnPhase
            });
            
            this.game.enterTokyo(endingPlayer, true); // true = automatic entry, no points
            
            console.log('🏖️ AFTER AUTO-ENTRY:', {
                tokyoCity: this.game.tokyoCity,
                tokyoBay: this.game.tokyoBay,
                endingPlayerVP: endingPlayer.victoryPoints,
                gamePhase: this.game.gamePhase,
                turnPhase: this.game.currentTurnPhase
            });
            
            UIUtilities.showMessage(`${endingPlayer.monster.name} enters Tokyo Bay!`, 3000, this.elements);
        }
        */
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

    // Utility function to find player element accounting for active player positioning
    findPlayerElement(playerId) {
        // First check in players container
        let playerElement = document.querySelector(`#players-container [data-player-id="${playerId}"]`);
        if (!playerElement) {
            // If not found, check if it's moved to body (active player)
            playerElement = document.querySelector(`body > .player-dashboard[data-player-id="${playerId}"]`);
        }
        return playerElement;
    }

    // Animate player entering Tokyo
    animatePlayerToTokyo(data) {
        console.log('Animating player to Tokyo:', data);
        
        // Find the player card using utility function
        const playerCard = this.findPlayerElement(data.playerId);
        const tokyoSlot = data.location === 'city' 
            ? document.getElementById('tokyo-city-monster')
            : document.getElementById('tokyo-bay-monster');
        
        if (!playerCard || !tokyoSlot) {
            console.error('Could not find player card or Tokyo slot for animation', {
                playerId: data.playerId,
                location: data.location,
                playerCardFound: !!playerCard,
                tokyoSlotFound: !!tokyoSlot,
                playerCardParent: playerCard?.parentNode?.id || playerCard?.parentNode?.tagName
            });
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
            UIUtilities.showMessage(`${data.monster.name} enters Tokyo ${data.location === 'city' ? 'City' : 'Bay'}!`, 3000, this.elements);
        }, 1050);
    }

    // Animate player leaving Tokyo
    animatePlayerFromTokyo(data) {
        console.log('Animating player from Tokyo:', data);
        
        // Find the Tokyo slot and player card using utility function
        const tokyoSlot = data.location === 'city' 
            ? document.getElementById('tokyo-city-monster')
            : document.getElementById('tokyo-bay-monster');
        const playerCard = this.findPlayerElement(data.playerId);
        
        if (!tokyoSlot || !playerCard) {
            console.error('Could not find Tokyo slot or player card for leave animation', {
                playerId: data.playerId,
                location: data.location,
                tokyoSlotFound: !!tokyoSlot,
                playerCardFound: !!playerCard
            });
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
            UIUtilities.showMessage(`${data.monster.name} leaves Tokyo ${data.location === 'city' ? 'City' : 'Bay'}!`, 3000, this.elements);
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
                const lighterColor = UIUtilities.lightenColor(monsterColor, 20);
                const glowColor = UIUtilities.hexToRgba(monsterColor, 0.4);
                const strongGlowColor = UIUtilities.hexToRgba(monsterColor, 0.7);
                
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
                    const lighterColor = UIUtilities.lightenColor(monsterColor, 20);
                    const glowColor = UIUtilities.hexToRgba(monsterColor, 0.4);
                    const strongGlowColor = UIUtilities.hexToRgba(monsterColor, 0.7);
                    
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

    // Initialize dice container with the maximum number of dice elements
    initializeDiceContainer(maxDice = 8) {
        const diceContainer = this.elements.diceContainer;
        if (!diceContainer) return;

        // Clear and create dice elements once
        diceContainer.innerHTML = '';
        
        for (let i = 0; i < maxDice; i++) {
            const die = document.createElement('div');
            die.className = 'die'; // Apply the proper CSS class
            die.id = `die-${i}`;
            die.dataset.dieId = `die-${i}`;
            die.textContent = '?';
            die.style.display = 'none'; // Hidden by default
            
            // Apply any additional styling that might be needed
            die.setAttribute('data-value', '?');
            
            diceContainer.appendChild(die);
        }

        // Add event listener once to the container (event delegation)
        diceContainer.addEventListener('click', (event) => {
            const dieElement = event.target.closest('.die');
            if (dieElement && !dieElement.classList.contains('disabled') && !dieElement.classList.contains('roll-off-mode')) {
                const dieId = dieElement.dataset.dieId;
                console.log('Dice clicked:', dieId);
                
                if (this.game && this.game.diceCollection) {
                    const isSelected = this.game.diceCollection.toggleDiceSelection(dieId);
                    
                    if (isSelected) {
                        dieElement.classList.add('selected');
                    } else {
                        dieElement.classList.remove('selected');
                    }
                    
                    this.updateDiceControls();
                }
            }
        });

        console.log(`🎲 Initialized dice container with ${maxDice} dice elements`);
    }

    // Update dice display by modifying existing elements
    updateDiceDisplay(diceData, maxDiceToShow = null, isRollOffMode = false) {
        console.log('updateDiceDisplay called with data:', diceData.map(d => ({ id: d.id, face: d.face, symbol: d.symbol })));
        
        const diceContainer = this.elements.diceContainer;
        if (!diceContainer) return;

        // Determine which dice to show
        let dicesToDisplay = diceData;
        if (maxDiceToShow !== null) {
            const enabledDice = diceData.filter(die => !die.isDisabled);
            dicesToDisplay = enabledDice.slice(0, maxDiceToShow);
        }

        // Get all dice elements
        const diceElements = diceContainer.querySelectorAll('.die');
        
    // Update each dice element
    dicesToDisplay.forEach((dieData, index) => {
        const dieElement = diceElements[index];
        if (dieElement) {
            // Show the element
            dieElement.style.display = 'inline-flex'; // Use inline-flex to match CSS
            
            // Update content
            dieElement.textContent = dieData.symbol || '?';
            
            // Update classes - build the class string exactly like the old createDiceHTML
            dieElement.className = `die${dieData.isSelected ? ' selected' : ''}${dieData.isRolling ? ' rolling' : ''}${dieData.isDisabled ? ' disabled' : ''}`;
            if (isRollOffMode) dieElement.classList.add('roll-off-mode');
            
            // Update data attributes
            dieElement.dataset.dieId = dieData.id;
            dieElement.setAttribute('data-value', dieData.symbol || '?');
        }
    });        // Hide unused dice elements
        for (let i = dicesToDisplay.length; i < diceElements.length; i++) {
            diceElements[i].style.display = 'none';
        }

        console.log(`🎲 Updated ${dicesToDisplay.length} dice elements`);
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
        
        // Debug logging for 5+ player game issues
        if (gameState.players && gameState.players.length >= 5) {
            console.log('🎮 MULTI-PLAYER BUTTON DEBUG:', {
                currentPlayerIndex: gameState.currentPlayerIndex,
                currentPlayerName: gameState.currentPlayer ? gameState.currentPlayer.monster.name : 'none',
                currentPlayerType: gameState.currentPlayer ? gameState.currentPlayer.playerType : 'none',
                turnPhase: gameState.turnPhase,
                rollsRemaining: diceState.rollsRemaining,
                diceCanRoll: diceState.canRoll,
                isEliminated: isCurrentPlayerEliminated,
                canRoll: canRoll,
                canKeep: canKeep,
                canEndTurn: canEndTurn,
                rollButtonDisabled: this.elements.rollDiceBtn.disabled,
                aboutToSetRollButtonTo: !canRoll
            });
        }
        
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
            UIUtilities.showMessage('No more rolls! Resolving dice effects...', 1400, this.elements);
            // Show next message after first one is almost done
            setTimeout(() => {
                UIUtilities.showMessage('Dice effects resolved! You can buy cards or end turn.', 3000, this.elements);
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
                UIUtilities.showMessage('Dice effects resolved! You can buy cards or end turn.', 3000, this.elements);
                break;
            case 'buying':
                UIUtilities.showMessage('Buy power cards or end turn', 3000, this.elements);
                this.updateCardsDisplay();
                break;
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
        console.log('🎲 ROLL DICE BUTTON CLICKED - rollDice called, game exists:', !!this.game);
        if (!this.game) {
            console.log('🎲 No game instance, returning');
            return;
        }
        
        // Check if current player is eliminated
        const currentPlayer = this.game.getCurrentPlayer();
        console.log('🎲 Current player for dice roll:', {
            name: currentPlayer?.monster?.name,
            playerType: currentPlayer?.playerType,
            isEliminated: currentPlayer?.isEliminated,
            gamePhase: this.game.gamePhase,
            turnPhase: this.game.currentTurnPhase
        });
        
        if (currentPlayer && currentPlayer.isEliminated) {
            console.log('⚠️ Current player is eliminated, cannot roll dice');
            UIUtilities.showMessage('Eliminated players cannot roll dice!', 3000, this.elements);
            return;
        }
        
        console.log('🎲 Disabling roll dice button and calling game.startRoll()');
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
            UIUtilities.showMessage('Eliminated players cannot end turns!', 3000, this.elements);
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
            UIUtilities.showMessage(result.reason || 'Not enough energy!', 3000, this.elements);
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
            
            // Force active player dashboard to have lower z-index to prevent interference
            const activePlayerDashboard = document.querySelector('.player-dashboard.active');
            if (activePlayerDashboard) {
                activePlayerDashboard.style.zIndex = '1';
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
        const activePlayerDashboard = document.querySelector('.player-dashboard.active');
        if (activePlayerDashboard) {
            activePlayerDashboard.style.zIndex = ''; // Reset to CSS default
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
        UIUtilities.showSplashScreen(this.elements, this.setupManager);
    }

    // Reset game
    resetGame() {
        this.elements.gameOverModal.classList.add('hidden');
        
        // Reset game state
        this.game = null;
        this.selectedMonsters = [];
        
        // Show setup modal for new game
        this.setupManager.showSetupModal();
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
        UIUtilities.showSplashScreen(this.elements, this.setupManager);
    }

    // Show CPU action notification (more subtle than regular messages)
    showCPUActionNotification(data) {
        console.log(`CPU Action: ${data.message}`);
        
        // Clear any existing CPU notification timeout
        if (this.cpuNotificationTimeout) {
            clearTimeout(this.cpuNotificationTimeout);
        }
        
        // Get the notification row container instead of dice container
        const notificationRow = document.querySelector('.notification-row');
        
        // Create or update CPU notification
        let notification = document.getElementById('cpu-action-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'cpu-action-notification';
            notification.className = 'cpu-action-notification';
            
            // Append to the notification row instead of dice area
            if (notificationRow) {
                notificationRow.appendChild(notification);
            } else {
                // Fallback to dice container if notification row not found
                const diceContainer = this.elements.diceContainer;
                diceContainer.parentNode.insertBefore(notification, diceContainer);
            }
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
        
        // Find player element using utility function
        const playerElement = this.findPlayerElement(playerId);
        
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
        // Find player element using utility function
        const playerElement = this.findPlayerElement(playerId);
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
        // Find player element using utility function
        const playerElement = this.findPlayerElement(playerId);
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

    exportGameLogs() {
        console.log('🔍 exportGameLogs method called');
        console.log('🔍 Game exists:', !!this.game);
        console.log('🔍 Game log exists:', !!this.game?.gameLog);
        console.log('🔍 Game log length:', this.game?.gameLog?.length);
        
        if (!this.game || !this.game.gameLog || this.game.gameLog.length === 0) {
            console.log('❌ No game logs to export');
            UIUtilities.showMessage('No game logs to export!', 3000, this.elements);
            return;
        }

        try {
            console.log('✅ Starting export process...');
            // Get current date and time for filename
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `king-of-tokyo-game-log-${timestamp}.txt`;

            console.log('📁 Filename will be:', filename);

            // Prepare log content with game metadata
            let logContent = 'KING OF TOKYO - GAME LOG\n';
            logContent += '================================\n\n';
            logContent += `Exported: ${now.toLocaleString()}\n`;
            
            if (this.game.gameSettings) {
                logContent += `Players: ${this.game.gameSettings.playerCount}\n`;
                logContent += `Game Mode: ${this.game.gameSettings.gameMode || 'Standard'}\n`;
            }
            
            if (this.game.players && this.game.players.length > 0) {
                logContent += '\nPlayers:\n';
                this.game.players.forEach((player, index) => {
                    logContent += `  ${index + 1}. ${player.monster.name} (${player.playerType})\n`;
                });
            }
            
            logContent += '\n================================\n';
            logContent += 'GAME EVENTS:\n';
            logContent += '================================\n\n';

            // Convert game log entries to text format
            this.game.gameLog.forEach((entry, index) => {
                const entryNumber = (index + 1).toString().padStart(3, '0');
                logContent += `[${entryNumber}] ${entry.message}\n`;
                
                if (entry.timestamp) {
                    const entryTime = new Date(entry.timestamp).toLocaleTimeString();
                    logContent += `      Time: ${entryTime}\n`;
                }
                
                if (entry.type && entry.type !== 'general') {
                    logContent += `      Type: ${entry.type}\n`;
                }
                
                logContent += '\n';
            });

            logContent += '\n================================\n';
            logContent += 'END OF LOG\n';
            logContent += '================================\n';

            console.log('📄 Log content prepared, length:', logContent.length);

            // Create and download the file
            console.log('🔧 Creating blob...');
            const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
            console.log('🔧 Blob created, size:', blob.size);
            
            const url = URL.createObjectURL(blob);
            console.log('🔧 Object URL created:', url);
            
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = filename;
            downloadLink.style.display = 'none';
            
            console.log('🔧 Adding download link to document...');
            document.body.appendChild(downloadLink);
            console.log('🔧 Triggering download click...');
            downloadLink.click();
            console.log('🔧 Removing download link...');
            document.body.removeChild(downloadLink);
            
            // Clean up the object URL
            URL.revokeObjectURL(url);
            console.log('✅ Export process completed');

            UIUtilities.showMessage(`✅ Game logs exported as ${filename}`, 4000, this.elements);

        } catch (error) {
            console.error('Failed to export game logs:', error);
            UIUtilities.showMessage('❌ Failed to export game logs. Please try again.', 4000, this.elements);
        }
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

    // Initialize dice area with reusable dice elements
    initializeDiceArea() {
        const diceContainer = this.elements.diceContainer;
        if (!diceContainer) {
            console.warn('⚠️ Dice container not found, skipping dice initialization');
            return;
        }

        // Initialize the dice container with reusable elements
        this.initializeDiceContainer(8); // Support up to 8 dice (6 regular + 2 power card dice)
        
        // Immediately show 6 empty dice to prepare for the game
        this.showInitialEmptyDice();
        
        console.log('🎲 Dice area initialized with reusable elements and initial display');
    }

    // Show initial empty dice (called during UI initialization)
    showInitialEmptyDice() {
        const initialDiceData = [];
        for (let i = 0; i < 6; i++) {
            initialDiceData.push({
                id: `die-${i}`,
                face: null,
                symbol: '?',
                isSelected: false,
                isRolling: false,
                isDisabled: false,
                faceData: null
            });
        }
        
        // Display the initial empty dice
        this.updateDiceDisplay(initialDiceData, null, false);
        console.log('🎲 Initial empty dice displayed');
    }

    // Initialize settings system
    initializeSettings() {
        // Load initial settings when the UI starts
        this.loadSettings();
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
        UIUtilities.showMessage('Settings saved successfully!', 3000, this.elements);
    }

    resetSettings() {
        // Reset to default values
        localStorage.removeItem('cpuSpeed');
        localStorage.removeItem('thoughtBubblesEnabled');
        
        // Reload the settings to show defaults
        this.loadSettings();
        
        // Show confirmation
        UIUtilities.showMessage('Settings reset to defaults', 3000, this.elements);
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
            UIUtilities.showMessage('Game saved successfully!', 3000, this.elements);
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
            
            UIUtilities.showMessage('All storage cleared successfully!', 3000, this.elements);
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
                
                UIUtilities.showMessage('Game data exported successfully!', 3000, this.elements);
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
        console.log('🚨 OLD CPU: startAutomaticCPUTurn called - redirecting to new simple system');
        console.log('🚨 OLD CPU: Player:', player?.monster?.name);
        
        // Redirect to new simple CPU system
        this.handleCPUTurn(player);
    }

    // Main CPU turn processing loop
    processCPUTurn() {
        console.log('🚨 OLD CPU: processCPUTurn called - redirecting to new simple system');
        
        // Redirect to new simple CPU system
        const currentPlayer = this.game.getCurrentPlayer();
        if (currentPlayer && currentPlayer.playerType === 'cpu') {
            this.handleCPUTurn(currentPlayer);
        }
    }

    // Handle the rolling phase for CPU
    handleCPURollingPhase() {
        console.log('🚨 OLD CPU: handleCPURollingPhase called - should not happen with new system');
    }

    // Handle the resolving phase for CPU
    handleCPUResolvingPhase() {
        console.log('🚨 OLD CPU: handleCPUResolvingPhase called - should not happen with new system');
    }

    // Handle the buying phase for CPU
    handleCPUBuyingPhase() {
        console.log('🚨 OLD CPU: handleCPUBuyingPhase called - should not happen with new system');
    }

    // CPU decision logic
    shouldCPURoll(diceState, player) {
        console.log('🚨 OLD CPU: shouldCPURoll called - should not happen with new system');
        return false;
    }

    // CPU execution functions
    executeCPURoll() {
        console.log('🚨 OLD CPU: executeCPURoll called - should not happen with new system');
    }

    executeCPUKeepDice() {
        console.log('🚨 OLD CPU: executeCPUKeepDice called - should not happen with new system');
    }

    executeCPUCardPurchase(card) {
        console.log('🚨 OLD CPU: executeCPUCardPurchase called - should not happen with new system');
    }

    executeCPUEndTurn() {
        console.log('🚨 OLD CPU: executeCPUEndTurn called - should not happen with new system');
    }

    // Handle the rolling phase for CPU
    handleCPURollingPhase() {
        console.log('🚨 OLD CPU: handleCPURollingPhase called - redirecting to new simple system');
        return;
    }

    // Handle the resolving phase for CPU (dice effects are automatically applied)
    handleCPUResolvingPhase() {
        console.log('� OLD CPU: handleCPUResolvingPhase called - redirecting to new simple system');
        return;
    }

    // Handle the buying phase for CPU
    handleCPUBuyingPhase() {
        console.log('� OLD CPU: handleCPUBuyingPhase called - redirecting to new simple system');
        return;
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
                console.log('🧹 CLEANING UP CPU TURN STATE - CRITICAL POINT');
                console.log('🧹 Before cleanup - CPU state exists:', !!this.cpuTurnState);
                console.log('🧹 Before cleanup - current player:', this.game?.getCurrentPlayer()?.monster?.name);
                this.cpuTurnState = null;
                console.log('🧹 After cleanup - CPU state cleared');
                
                // Add extra logging to track turn flow
                setTimeout(() => {
                    const nextPlayer = this.game.getCurrentPlayer();
                    console.log('🔄 AFTER CPU TURN ENDED AND CLEANUP, current player is:', {
                        name: nextPlayer?.monster?.name,
                        type: nextPlayer?.playerType,
                        eliminated: nextPlayer?.isEliminated,
                        gamePhase: this.game?.gamePhase,
                        turnPhase: this.game?.currentTurnPhase
                    });
                    
                    // Check if this is where the problem starts
                    if (nextPlayer?.playerType === 'human') {
                        console.log('🚨 NEXT PLAYER IS HUMAN - They should be able to take actions now!');
                        console.log('🚨 Game state check:', {
                            rollsRemaining: this.game?.diceRoller?.getState()?.rollsRemaining,
                            rollButtonEnabled: !document.getElementById('roll-dice')?.disabled,
                            endButtonEnabled: !document.getElementById('end-turn')?.disabled
                        });
                    }
                }, 100);
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
        // Check if game is paused - return 0 to prevent delays
        if (this.gamePaused || (this.cpuTurnState && this.cpuTurnState.isPaused)) {
            return 0;
        }

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

    // Game Pause Functionality
    initializeGamePause() {
        this.gamePaused = false;
        this.pausedTimeouts = new Set(); // Track active timeouts
        this.originalSetTimeout = window.setTimeout.bind(window); // Store original setTimeout with proper binding
        this.originalClearTimeout = window.clearTimeout.bind(window); // Store original clearTimeout with proper binding
        
        // Override setTimeout to track CPU timers
        window.setTimeout = (callback, delay, ...args) => {
            if (this.gamePaused) {
                // If game is paused, don't start new timeouts
                return null;
            }
            
            const timeoutId = this.originalSetTimeout(() => {
                // Remove from tracked timeouts when executed
                this.pausedTimeouts.delete(timeoutId);
                callback(...args);
            }, delay);
            
            // Track this timeout
            this.pausedTimeouts.add(timeoutId);
            return timeoutId;
        };
        
        // Override clearTimeout to handle tracked timeouts
        window.clearTimeout = (timeoutId) => {
            this.pausedTimeouts.delete(timeoutId);
            return this.originalClearTimeout(timeoutId);
        };
    }

    toggleGamePause() {
        if (!this.game) {
            console.log('No active game to pause');
            return;
        }

        this.gamePaused = !this.gamePaused;
        
        if (this.gamePaused) {
            this.pauseGame();
        } else {
            this.unpauseGame();
        }
    }

    pauseGame() {
        console.log('🛑 Game paused');
        
        // Clear all active CPU timeouts
        this.pausedTimeouts.forEach(timeoutId => {
            this.originalClearTimeout(timeoutId);
        });
        this.pausedTimeouts.clear();
        
        // Stop CPU processing
        if (this.cpuTurnState) {
            this.cpuTurnState.isPaused = true;
            console.log('🛑 CPU turn paused');
        }
        
        // Update button appearance
        this.updatePauseButton(true);
        
        // Show pause notification
        UIUtilities.showMessage('⏸️ Game Paused', 2000, this.elements);
        
        // Show the pause overlay
        if (this.elements.gamePauseOverlay) {
            this.elements.gamePauseOverlay.classList.remove('hidden');
        }
        
        // Add visual indication to game container only
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.classList.add('game-paused');
        }
    }

    unpauseGame() {
        console.log('▶️ Game unpaused');
        
        // Resume CPU processing if needed
        if (this.cpuTurnState) {
            this.cpuTurnState.isPaused = false;
            console.log('▶️ CPU turn resumed');
            
            // Resume CPU turn processing after a short delay
            this.originalSetTimeout(() => {
                if (this.cpuTurnState && !this.cpuTurnState.isPaused) {
                    this.cpuTurnState.isProcessing = false;
                    this.processCPUTurn();
                }
            }, 500);
        }
        
        // Update button appearance
        this.updatePauseButton(false);
        
        // Show resume notification
        UIUtilities.showMessage('▶️ Game Resumed', 2000, this.elements);
        
        // Hide the pause overlay
        if (this.elements.gamePauseOverlay) {
            this.elements.gamePauseOverlay.classList.add('hidden');
        }
        
        // Remove visual indication from game container
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.classList.remove('game-paused');
        }
    }

    updatePauseButton(isPaused) {
        const pauseBtn = this.elements.pauseGameBtn;
        if (!pauseBtn) return;
        
        const icon = pauseBtn.querySelector('.toolbar-icon svg path');
        const button = pauseBtn;
        
        if (isPaused) {
            // Change to play icon
            icon.setAttribute('d', 'M8,5.14V19.14L19,12.14L8,5.14Z');
            button.title = 'Resume Game';
            button.classList.add('paused');
        } else {
            // Change to pause icon
            icon.setAttribute('d', 'M14,19H18V5H14M6,19H10V5H6V19Z');
            button.title = 'Pause Game';
            button.classList.remove('paused');
        }
    }

    // ============================================================================
    // NEW SIMPLE CPU SYSTEM
    // ============================================================================

    // Simple CPU notification system  
    showSimpleCPUNotification(player, message) {
        // Find the dice container to position relative to it
        const diceContainer = document.querySelector('.dice-container') || document.querySelector('#dice-area');
        if (!diceContainer) return;

        // Remove any existing CPU notification
        const existingNotification = document.querySelector('.cpu-action-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification with proper styling
        const notification = document.createElement('div');
        notification.className = 'cpu-action-notification';
        notification.innerHTML = `
            <div class="notification-avatar">
                <img src="${player.monster.image}" alt="${player.monster.name}">
            </div>
            <div class="notification-text">${message}</div>
        `;

        // Position relative to dice container
        diceContainer.style.position = 'relative';
        diceContainer.appendChild(notification);

        // Show with animation
        setTimeout(() => {
            notification.classList.add('visible');
        }, 100);

        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.classList.remove('visible');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 3000);
    }

    // Main CPU turn handler - new simple system
    handleCPUTurn(player) {
        if (!player || player.playerType !== 'cpu' || player.isEliminated) return;

        console.log(`🤖 NEW CPU: ${player.monster.name} starting turn`);
        // Start with proper notification that turn begins
        this.showSimpleCPUNotification(player, `� ${player.monster.name}'s turn begins...`);
        
        setTimeout(() => {
            this.cpuRollDice(player, 1);
        }, 1500);
    }

    // CPU rolls dice (simple - always use all 3 rolls)
    cpuRollDice(player, rollNumber) {
        console.log(`🎲 NEW CPU: Starting roll ${rollNumber}/3`);
        
        // Always roll, regardless of dice state
        if (rollNumber <= 3) {
            console.log(`🎲 NEW CPU: Executing roll ${rollNumber}/3`);
            this.showSimpleCPUNotification(player, `🎲 ${player.monster.name} rolling... (${rollNumber}/3)`);
            
            // Execute the roll
            this.rollDice();
            
            setTimeout(() => {
                const diceState = this.game.diceRoller.getState();
                console.log(`🎲 NEW CPU: After roll ${rollNumber}, rolls remaining: ${diceState.rollsRemaining}`);
                
                if (rollNumber < 3 && diceState.rollsRemaining > 0) {
                    // Continue to next roll
                    this.cpuRollDice(player, rollNumber + 1);
                } else {
                    // After 3rd roll, CPU is done - end turn
                    console.log(`🤖 CPU: ${player.monster.name} finished rolling, ending turn`);
                    this.showSimpleCPUNotification(player, `✅ ${player.monster.name} ending turn...`);
                    
                    setTimeout(() => {
                        this.endTurn();
                    }, 1500);
                }
            }, 2000);
        }
    }

    // Roll-off UI methods with sportscast commentary
    showRollOffNotification(data) {
        const message = data.message;
        
        // Defensive programming: check if players have monster property
        const players = data.players.map(p => {
            if (p && p.monster && p.monster.name) {
                return p.monster.name;
            } else {
                console.warn('Player missing monster property in notification:', p);
                return `Player ${p.playerNumber || 'Unknown'}`;
            }
        }).join(', ');
        
        console.log(`🎲 Roll-off Round ${data.round}: ${message}`);
        console.log(`🎲 Players rolling: ${players}`);
        
        // Show/initialize the scoreboard
        this.initializeRollOffScoreboard(data.players, data.round);
        
        // Add sportscast commentary
        const commentary = data.round === 1 
            ? this.getRandomComment(this.sportscastCommentary.intro)
            : this.getRandomComment(this.sportscastCommentary.tie);
        
        this.updateCommentary(commentary);
        
        // Show notification to user
        UIUtilities.showMessage(message, 4000, this.elements);
        
        // Also log in the game log if available
        if (this.game && this.game.logAction) {
            this.game.logAction(`🎲 Roll-off Round ${data.round}: ${players}`, 'roll-off');
        }
    }

    // New method to handle when a player is about to roll
    showPlayerAboutToRoll(data) {
        const player = data.player;
        const isHuman = data.isHuman;
        
        const playerName = player && player.monster && player.monster.name 
            ? player.monster.name 
            : `Player ${player.playerNumber || 'Unknown'}`;
        
        if (isHuman) {
            // Human player - show commentary and enable roll button in action menu
            const commentary = this.getRandomComment(this.sportscastCommentary.humanRoll)
                .replace('{name}', playerName);
            this.updateCommentary(commentary);
            
            // Show 6 dice in the dice area using the new unified system
            this.showRollOffDiceRolling();
            
            // Enable only the roll dice button in action menu
            this.enableRollOffActions(player);
        } else {
            // AI player - show rolling commentary
            const commentary = this.getRandomComment(this.sportscastCommentary.aiRolling)
                .replace('{name}', playerName);
            this.updateCommentary(commentary);
            
            // Show 6 dice in the dice area with rolling animation
            this.showRollOffDiceRolling();
            
            // Disable all action menu buttons during AI roll
            this.disableAllActions();
        }
        
        console.log(`🎯 ${playerName} is about to roll (${isHuman ? 'HUMAN' : 'AI'})`);
    }

    // Helper methods for sportscast commentary
    getRandomComment(commentArray) {
        return commentArray[Math.floor(Math.random() * commentArray.length)];
    }

    updateCommentary(text) {
        const commentaryElement = this.elements.rolloffCommentary;
        if (commentaryElement) {
            commentaryElement.textContent = text;
            commentaryElement.style.opacity = '0';
            setTimeout(() => {
                commentaryElement.style.opacity = '1';
            }, 100);
        }
    }

    showRollOffDiceRolling() {
        // Create rolling dice data for display (6 dice only)
        const rollingDiceData = [];
        for (let i = 0; i < 6; i++) {
            rollingDiceData.push({
                id: `die-${i}`,
                face: null,
                symbol: '?',
                isSelected: false,
                isRolling: true,
                isDisabled: false,
                faceData: null
            });
        }
        
        // Use regular updateDiceDisplay but limit to 6 dice and mark as roll-off mode
        this.updateDiceDisplay(rollingDiceData, 6, true);
    }

    enableRollOffActions(player) {
        if (!player) return;
        
        this.elements.actionMenu.classList.add('hidden-for-rolloff');
        this.elements.rolloffRollBtn.style.display = 'block';
        this.elements.rolloffRollBtn.disabled = false;
        this.elements.rolloffRollBtn.textContent = '🎲 Roll Dice';
        this.currentRolloffPlayer = player;
    }

    disableAllActions() {
        // Disable all action buttons during AI turn or between rolls
        const actionButtons = this.elements.actionMenu.querySelectorAll('button');
        actionButtons.forEach(button => {
            button.disabled = true;
        });
        
        // Also disable rolloff button if it exists
        if (this.elements.rolloffRollBtn) {
            this.elements.rolloffRollBtn.disabled = true;
        }
    }

    restoreNormalActionStates() {
        // Restore normal game button states after roll-off
        console.log('🔧 Restoring normal action button states after roll-off');
        
        // Show the action menu and mark game as active
        this.elements.actionMenu.classList.remove('hidden-for-rolloff');
        this.elements.actionMenu.classList.add('game-active');
        
        // Hide the rolloff button
        this.elements.rolloffRollBtn.style.display = 'none';
        this.elements.rolloffRollBtn.disabled = true;
        
        // Reset action buttons to normal game states
        const actionButtons = this.elements.actionMenu.querySelectorAll('button');
        actionButtons.forEach(button => {
            button.onclick = null; // Clear roll-off specific handlers
            
            // Reset to normal game states
            if (button.id === 'roll-dice') {
                button.disabled = false; // Will be managed by normal game logic
                button.textContent = 'Roll Dice';
            } else if (button.id === 'keep-dice') {
                button.disabled = true; // Normally disabled until dice are rolled
            } else if (button.id === 'end-turn') {
                button.disabled = false; // Usually available
            }
        });
        
        // Restore the initial dice display for regular gameplay
        this.showInitialEmptyDice();
        
        console.log('✅ Normal action button states restored');
    }

    handleRolloffRoll() {
        if (this.currentRolloffPlayer) {
            this.elements.rolloffRollBtn.disabled = true;
            this.elements.rolloffRollBtn.textContent = 'Rolling...';
            this.handleRollOffDiceRoll(this.currentRolloffPlayer);
        }
    }

    handleRollOffDiceRoll(player) {
        console.log(`🎲 Human player ${player.index} clicked roll dice button`);
        
        // Disable the roll button
        const rollButton = document.getElementById('roll-dice');
        if (rollButton) {
            rollButton.disabled = true;
            rollButton.textContent = 'Rolling...';
        }
        
        // Show rolling animation in dice area
        this.showRollOffDiceRolling();
        
        // Execute the roll after a brief delay for animation
        setTimeout(() => {
            this.game.executeHumanRoll(player);
        }, 500); // Reduced delay since executeHumanRoll now handles timing
    }

    initializeRollOffScoreboard(players, round) {
        const container = document.getElementById('rolloff-scoreboard-container');
        const tableBody = document.getElementById('rolloff-table-body');
        const title = container.querySelector('.rolloff-title');
        
        // Update title for round
        title.textContent = round === 1 ? '🎲 Roll for First Player' : `🎲 Roll-off Round ${round}`;
        
        // Clear existing rows
        tableBody.innerHTML = '';
        
        // Add a row for each player
        players.forEach(player => {
            const row = document.createElement('tr');
            row.id = `rolloff-row-${player.index}`;
            
            // Defensive programming: handle missing monster property
            const monsterName = player && player.monster && player.monster.name 
                ? player.monster.name 
                : `Player ${player.playerNumber || player.index + 1}`;
            
            const monsterImage = player && player.monster && player.monster.image 
                ? player.monster.image 
                : 'images/characters/king_of_tokyo_the_king.png'; // fallback image
            
            row.innerHTML = `
                <td>
                    <div class="rolloff-player-info">
                        <img src="${monsterImage}" alt="${monsterName}" class="rolloff-monster-pic">
                        <span class="rolloff-player-name">${monsterName}</span>
                    </div>
                </td>
                <td>
                    <div class="rolloff-dice-display" id="rolloff-dice-${player.index}">
                        <!-- Empty until roll is complete -->
                    </div>
                </td>
                <td>
                    <div class="rolloff-attack-count" id="rolloff-attacks-${player.index}">-</div>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Show the scoreboard
        container.style.display = 'block';
        
        // Show the rolloff button (but keep it disabled until a human player's turn)
        this.elements.rolloffRollBtn.style.display = 'block';
        this.elements.rolloffRollBtn.disabled = true;
        this.elements.rolloffRollBtn.textContent = '🎲 Roll Dice';
    }

    showPlayerRollOffResult(data) {
        const player = data.player;
        const attackDice = data.attackDice;
        const rolls = data.rolls;
        const diceData = data.diceData; // New unified dice data
        
        // Defensive programming
        const playerName = player && player.monster && player.monster.name 
            ? player.monster.name 
            : `Player ${player.playerNumber || 'Unknown'}`;
        
        console.log(`🎲 ${playerName} rolled ${attackDice} attacks: [${rolls.join(', ')}]`);
        
        // Update the scoreboard with this player's results
        this.updateRollOffScoreboard(player, rolls, attackDice);
        
        // Show dice results in main dice area using regular display system
        if (diceData) {
            // Use regular updateDiceDisplay but limit to 6 dice for roll-off
            this.updateDiceDisplay(diceData, 6, true);
        } else {
            // Fallback to old method if diceData not available (for AI players)
            this.showRollOffDiceResults(rolls);
        }
        
        // Add sportscast commentary based on result quality
        let commentary;
        if (attackDice >= 4) {
            commentary = this.getRandomComment(this.sportscastCommentary.results.high);
        } else if (attackDice >= 2) {
            commentary = this.getRandomComment(this.sportscastCommentary.results.medium);
        } else {
            commentary = this.getRandomComment(this.sportscastCommentary.results.low);
        }
        
        commentary = commentary.replace('{name}', playerName).replace('{count}', attackDice);
        this.updateCommentary(commentary);
        
        // Highlight the attack count briefly
        const attackContainer = document.getElementById(`rolloff-attacks-${player.index}`);
        if (attackContainer) {
            attackContainer.classList.add('highlight');
            setTimeout(() => attackContainer.classList.remove('highlight'), 2000);
        }
        
        // Show individual roll result
        const message = `${playerName} rolled ${attackDice} attack${attackDice !== 1 ? 's' : ''}`;
        UIUtilities.showMessage(message, 2000, this.elements);
        
        // Log in game log
        if (this.game && this.game.logAction) {
            this.game.logAction(`   ${playerName}: ${attackDice} attacks [${rolls.join(', ')}]`, 'roll-off');
        }
    }

    showRollOffDiceResults(rolls) {
        // Show the actual roll results in the main dice area
        const diceContainer = this.elements.diceContainer;
        if (diceContainer) {
            const dice = diceContainer.querySelectorAll('.die');
            rolls.forEach((roll, index) => {
                if (dice[index]) {
                    dice[index].className = roll === 1 ? 'die attack' : 'die';
                    dice[index].textContent = this.getDieFaceSymbol(roll);
                }
            });
        }
    }

    updateRollOffScoreboard(player, rolls, attackCount) {
        const diceContainer = document.getElementById(`rolloff-dice-${player.index}`);
        const attackContainer = document.getElementById(`rolloff-attacks-${player.index}`);
        
        if (diceContainer && attackContainer) {
            // Add mini dice displays like in game log
            diceContainer.innerHTML = '';
            
            rolls.forEach(roll => {
                const die = document.createElement('div');
                die.className = roll === 1 ? 'mini-die attack' : 'mini-die';
                die.textContent = this.getDieFaceSymbol(roll);
                diceContainer.appendChild(die);
            });
            
            // Update attack count with highlighting
            attackContainer.textContent = attackCount;
            attackContainer.classList.add('highlight');
            setTimeout(() => attackContainer.classList.remove('highlight'), 2000);
        }
    }

    // Helper method to get dice face symbols (same as used in game log)
    getDieFaceSymbol(value) {
        const symbols = {
            1: '⚔️', // Attack
            2: '💥', // Smash
            3: '⚡', // Energy
            4: '❤️', // Heal  
            5: '1', // 1 point
            6: '2'  // 2 points
        };
        return symbols[value] || value.toString();
    }

    showRollOffTie(data) {
        // Defensive programming: check if players have monster property
        const tiedPlayers = data.tiedPlayers.map(p => {
            if (p && p.monster && p.monster.name) {
                return p.monster.name;
            } else {
                console.warn('Player missing monster property:', p);
                return `Player ${p.playerNumber || 'Unknown'}`;
            }
        }).join(' and ');
        const attackCount = data.attackCount;
        const nextRound = data.round;
        
        console.log(`🎲 Tie! ${tiedPlayers} both rolled ${attackCount} attacks`);
        
        // Add dramatic tie commentary
        const tieCommentary = this.getRandomComment(this.sportscastCommentary.tie);
        this.updateCommentary(tieCommentary);
        
        // Show tie notification
        const message = `Tie! ${tiedPlayers} both rolled ${attackCount} attack${attackCount !== 1 ? 's' : ''}. Rolling again...`;
        UIUtilities.showMessage(message, 3000, this.elements);
        
        // Log in game log
        if (this.game && this.game.logAction) {
            this.game.logAction(`🤝 Tie at ${attackCount} attacks! Rolling again...`, 'roll-off');
        }
    }

    showRollOffWinner(data) {
        const winner = data.winner;
        const attackCount = data.finalAttackCount;
        
        // Defensive programming: check if winner has monster property
        const winnerName = winner && winner.monster && winner.monster.name 
            ? winner.monster.name 
            : `Player ${winner.playerNumber || 'Unknown'}`;
        
        console.log(`🏆 ${winnerName} wins with ${attackCount} attacks and goes first!`);
        
        // Add victory commentary
        const victoryCommentary = this.getRandomComment(this.sportscastCommentary.winner)
            .replace('{name}', winnerName)
            .replace('{count}', attackCount);
        this.updateCommentary(victoryCommentary);
        
        // Show winner notification
        const message = `🏆 ${winnerName} wins with ${attackCount} attack${attackCount !== 1 ? 's' : ''} and goes first!`;
        UIUtilities.showMessage(message, 4000, this.elements);
        
        // Reset dice to initial state instead of clearing
        const diceContainer = this.elements.diceContainer;
        if (diceContainer) {
            this.showInitialEmptyDice();
        }
        
        // Restore normal action button states
        this.restoreNormalActionStates();
        
        // Hide the scoreboard right after winner announcement
        setTimeout(() => {
            const container = document.getElementById('rolloff-scoreboard-container');
            if (container) {
                container.style.display = 'none';
            }
        }, 1000); // Changed from 6000 to 1000ms for quicker hiding
    }
}
// Note: Game initialization is now handled by the splash screen
