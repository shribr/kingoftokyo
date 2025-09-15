// Setup Manager - Handles game setup, player configuration, and monster selection
class SetupManager {
    constructor(uiUtilities) {
        this.uiUtilities = uiUtilities;
        this.currentPlayerCount = 2; // Default player count
        this.elements = {};
        this.draggedElement = null;
        this.touchStartElement = null;
        
        // Initialize once constructed
        this.initializeElements();
        // Initialize monster profiles
        this.monsterProfiles = {};
        this.initializeMonsterProfiles();
        
        this.attachEventListeners();
    }

    // Initialize DOM element references specific to setup
    initializeElements() {
        this.elements = {
            // Setup modal and components
            setupModal: document.getElementById('setup-modal'),
            
            // Player count dropdown
            playerCount: document.getElementById('player-count-dropdown'),
            dropdownSelected: document.getElementById('dropdown-selected'),
            dropdownOptions: document.getElementById('dropdown-options'),
            
            // Monster selection grids
            monsterGrid: document.getElementById('monster-grid'),
            playerTilesGrid: document.getElementById('player-tiles-grid'),
            
            // Action buttons
            resetMonstersBtn: document.getElementById('reset-monsters'),
            randomSelectionBtn: document.getElementById('random-selection-btn'),
            monsterProfilesBtn: document.getElementById('monster-profiles-btn'),
            startGameBtn: document.getElementById('start-game'),
            
            // Monster Profiles Modal
            monsterProfilesModal: document.getElementById('monster-profiles-modal'),
            monsterProfilesGrid: document.getElementById('monster-profiles-grid'),
            closeMonsterProfiles: document.getElementById('close-monster-profiles'),
            resetProfilesBtn: document.getElementById('reset-profiles-btn'),
            saveProfilesBtn: document.getElementById('save-profiles-btn')
        };

        // Validate critical setup elements
        const criticalElements = ['setupModal', 'playerCount', 'dropdownSelected', 'dropdownOptions', 'monsterGrid', 'playerTilesGrid', 'startGameBtn'];
        const missing = criticalElements.filter(key => !this.elements[key]);
        
        if (missing.length > 0) {
            console.error('❌ Critical setup elements missing:', missing);
        } else {
            console.log('✅ All critical setup elements found');
        }
    }

    // Attach event listeners for setup functionality
    attachEventListeners() {
        // Player count dropdown
        if (this.elements.dropdownSelected) {
            this.elements.dropdownSelected.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });
        }

        // Handle clicking outside dropdown to close it
        document.addEventListener('click', (e) => {
            if (this.elements.playerCount && !this.elements.playerCount.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Dropdown option selection
        if (this.elements.dropdownOptions) {
            this.elements.dropdownOptions.addEventListener('click', (e) => {
                if (e.target.dataset.value) {
                    this.selectPlayerCount(e.target.dataset.value, e.target.textContent);
                    this.closeDropdown();
                }
            });
        }

        // Monster selection buttons
        if (this.elements.resetMonstersBtn) {
            this.elements.resetMonstersBtn.addEventListener('click', () => {
                this.resetMonsterSelection();
            });
        }

        if (this.elements.randomSelectionBtn) {
            this.elements.randomSelectionBtn.addEventListener('click', () => {
                this.randomizeMonsterSelection();
            });
        }

        if (this.elements.monsterProfilesBtn) {
            this.elements.monsterProfilesBtn.addEventListener('click', () => {
                this.showMonsterProfilesModal();
            });
        }

        // Monster profiles modal
        if (this.elements.closeMonsterProfiles) {
            this.elements.closeMonsterProfiles.addEventListener('click', () => {
                this.hideMonsterProfilesModal();
            });
        }

        if (this.elements.resetProfilesBtn) {
            this.elements.resetProfilesBtn.addEventListener('click', () => {
                this.resetMonsterProfiles();
            });
        }

        if (this.elements.saveProfilesBtn) {
            this.elements.saveProfilesBtn.addEventListener('click', () => {
                this.saveMonsterProfiles();
                this.showMessage('Monster profiles saved!');
                this.hideMonsterProfilesModal();
            });
        }

        // Close monster profiles modal when clicking outside
        if (this.elements.monsterProfilesModal) {
            this.elements.monsterProfilesModal.addEventListener('click', (e) => {
                if (e.target === this.elements.monsterProfilesModal) {
                    this.hideMonsterProfilesModal();
                }
            });
        }

        // Start game button
        if (this.elements.startGameBtn) {
            this.elements.startGameBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('Button disabled:', this.elements.startGameBtn.disabled);
                
                // Double-check disabled state
                if (this.elements.startGameBtn.disabled) {
                    console.log('Button is disabled, ignoring click');
                    return;
                }
                
                this.elements.startGameBtn.disabled = true;
                this.elements.startGameBtn.textContent = 'Starting Game...';
                
                try {
                    await this.onStartGame();
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
        }

        // Set up drag and drop events after elements are available
        this.setupDragAndDropEvents();
    }

    setupDragAndDropEvents() {
        // Set up monster drag events
        if (this.elements.monsterGrid) {
            this.elements.monsterGrid.querySelectorAll('.monster-option').forEach(option => {
                option.addEventListener('dragstart', (e) => this.handleDragStart(e));
                option.addEventListener('dragend', (e) => this.handleDragEnd(e));
                
                // Touch events for mobile
                option.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
                option.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
                option.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
            });
        }

        // Set up tile drop events
        if (this.elements.playerTilesGrid) {
            this.elements.playerTilesGrid.querySelectorAll('.player-tile').forEach(tile => {
                tile.addEventListener('dragover', (e) => this.handleDragOver(e));
                tile.addEventListener('dragenter', (e) => this.handleDragEnter(e));
                tile.addEventListener('dragleave', (e) => this.handleDragLeave(e));
                tile.addEventListener('drop', (e) => this.handleDrop(e));
            });
        }
    }

    // Custom dropdown methods
    toggleDropdown() {
        console.log('🔄 SetupManager: toggleDropdown called');
        console.log('🔍 playerCount element:', this.elements.playerCount);
        console.log('🔍 dropdownOptions element:', this.elements.dropdownOptions);
        
        if (this.elements.playerCount && this.elements.dropdownOptions) {
            const wasOpen = this.elements.playerCount.classList.contains('open');
            console.log('📊 Dropdown was open:', wasOpen);
            
            this.elements.playerCount.classList.toggle('open');
            const isNowOpen = this.elements.playerCount.classList.contains('open');
            console.log('📊 Dropdown is now open:', isNowOpen);
            console.log('📊 Current classes:', this.elements.playerCount.className);
            
            // Force check the computed styles
            const dropdownOptions = this.elements.dropdownOptions;
            const computedStyle = window.getComputedStyle(dropdownOptions);
            console.log('🎨 Computed display:', computedStyle.display);
            console.log('🎨 Computed visibility:', computedStyle.visibility);
            
            // Force a style recalculation
            if (isNowOpen) {
                dropdownOptions.style.display = 'block';
                console.log('💪 Forced display to block');
            } else {
                dropdownOptions.style.display = 'none';
                console.log('💪 Forced display to none');
            }
        } else {
            console.error('❌ SetupManager: Missing dropdown elements');
            console.error('playerCount:', this.elements.playerCount);
            console.error('dropdownOptions:', this.elements.dropdownOptions);
        }
    }

    closeDropdown() {
        if (this.elements.playerCount && this.elements.dropdownOptions) {
            this.elements.playerCount.classList.remove('open');
            this.elements.dropdownOptions.style.display = 'none';
            console.log('✅ Dropdown closed');
        }
    }

    // Reset dropdown to ensure it's functional
    resetDropdown() {
        console.log('SetupManager: resetDropdown called');
        
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
            console.log('SetupManager: dropdown reset completed with delay');
            console.log('playerCount classes:', this.elements.playerCount?.className);
            console.log('dropdownOptions display style:', window.getComputedStyle(this.elements.dropdownOptions).display);
        }, 50);
    }

    selectPlayerCount(value, text) {
        console.log('📝 selectPlayerCount called with:', { value, text, parsedValue: parseInt(value, 10) });
        this.currentPlayerCount = parseInt(value, 10);
        console.log('📝 currentPlayerCount set to:', this.currentPlayerCount);
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
        
        console.log('🎯 SetupManager: Player count selected:', this.currentPlayerCount, 'Updating monster selection...');
        
        // Clear any previous game instance
        if (this.game) {
            this.game = null;
        }
        
        // Check that MONSTERS is available before updating selection
        if (typeof MONSTERS === 'undefined') {
            console.log('⚠️ MONSTERS not yet loaded, skipping monster selection update');
            return;
        }
        
        // If we're in a browser environment, make sure MONSTERS is available globally
        if (typeof window !== 'undefined' && window.MONSTERS) {
            this.updateMonsterSelection();
        } else {
            console.log('⚠️ MONSTERS not available globally, skipping monster selection update');
        }
    }

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

    showMonsterProfilesModal() {
        this.elements.monsterProfilesModal.classList.remove('hidden');
    }

    hideMonsterProfilesModal() {
        this.elements.monsterProfilesModal.classList.add('hidden');
    }

    resetMonsterProfiles() {
        // Reset to default values from MONSTERS data
        Object.values(MONSTERS).forEach(monster => {
            this.monsterProfiles[monster.id] = { ...monster.personality };
        });
        this.updateProfilesDisplay();
        this.saveMonsterProfiles();
    }

    saveMonsterProfiles() {
        localStorage.setItem('monsterProfiles', JSON.stringify(this.monsterProfiles));
    }

    // Initialize monster profiles
    initializeMonsterProfiles() {
        // Load saved profiles or initialize with default values
        const savedProfiles = localStorage.getItem('monsterProfiles');
        if (savedProfiles) {
            this.monsterProfiles = JSON.parse(savedProfiles);
        } else {
            // Initialize with default values from MONSTERS
            Object.values(MONSTERS).forEach(monster => {
                this.monsterProfiles[monster.id] = { ...monster.personality };
            });
        }
    }

    updateProfilesDisplay() {
        if (!this.elements.monsterProfilesGrid) return;
        
        const sliders = this.elements.monsterProfilesGrid.querySelectorAll('.trait-slider');
        sliders.forEach(slider => {
            const monsterId = slider.dataset.monster;
            const trait = slider.dataset.trait;
            const value = this.monsterProfiles[monsterId][trait];
            
            slider.value = value;
            const valueSpan = slider.closest('.trait-container').querySelector(`[data-trait="${trait}"]`);
            if (valueSpan) {
                valueSpan.textContent = value;
            }
        });
    }

    showMessage(message) {
        console.log('SetupManager: Message -', message);
    }

    // Public interface methods for main.js to call
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
        
        this.uiUtilities.showModal(this.elements.setupModal);
        
        // Reset dropdown to ensure it's functional
        this.resetDropdown();
        
        // Update monster selection
        this.updateMonsterSelection();
        
        // Ensure monsters are properly initialized after a short delay
        setTimeout(() => {
            if (this.elements.monsterGrid) {
                const monsterOptions = this.elements.monsterGrid.querySelectorAll('.monster-option');
                monsterOptions.forEach(option => {
                    // Force visibility with important styles
                    option.style.setProperty('display', 'flex', 'important');
                    option.style.setProperty('visibility', 'visible', 'important');
                    option.style.setProperty('opacity', '1', 'important');
                    option.style.setProperty('pointer-events', 'auto', 'important');
                });
            }
        }, 100);
    }

    hideSetupModal() {
        this.uiUtilities.hideModal(this.elements.setupModal);
    }

    showMessage(message) {
        console.log('SetupManager: Message -', message);
    }

    // Update monster selection grid
    updateMonsterSelection() {
        console.log('👺 === SetupManager: UPDATE MONSTER SELECTION CALLED ===');
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
        this.setupDragAndDropEvents();
        
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
        this.draggedMonster = null;
        this.touchStartElement = null;
        this.touchStartX = 0;
        this.touchStartY = 0;
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
            
            this.assignMonsterToTile(this.draggedMonster, tileIndex);
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
        
        this.assignMonsterToTile(monster, tileIndex);
    }

    // Helper method to assign monster to tile (used by both drag-drop and touch)
    assignMonsterToTile(monster, tileIndex) {
        // Update tile state
        this.playerTiles[tileIndex].monster = monster;
        this.playerTiles[tileIndex].occupied = true;
        
        // Generate monster-themed colors
        const monsterColor = monster.color;
        const lighterColor = UIUtilities.lightenColor(monsterColor, 30);
        const evenLighterColor = UIUtilities.lightenColor(monsterColor, 60);
        
        // Update tile visual with monster theme
        const tile = this.elements.playerTilesGrid.querySelector(`[data-tile-index="${tileIndex}"]`);
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
        const monsterCard = this.elements.monsterGrid.querySelector(`[data-monster-id="${monster.id}"]`);
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

    // Start game method that calls back to main.js
    async onStartGame() {
        console.log('SetupManager: onStartGame called');
        console.log('Selected monsters count:', this.selectedMonsters.length);
        console.log('Current player count:', this.currentPlayerCount);
        
        // Delegate to main.js instance - we need access to the main KingOfTokyoUI instance
        if (window.kingOfTokyoUI && typeof window.kingOfTokyoUI.startGameFromSetup === 'function') {
            await window.kingOfTokyoUI.startGameFromSetup(this.selectedMonsters, this.currentPlayerCount, this.playerTiles);
        } else {
            console.error('Cannot start game: main UI instance not available');
            throw new Error('Game initialization failed - main UI not ready');
        }
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
            currentPlayerCount: this.currentPlayerCount,
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

    // Regenerate player tiles
    regeneratePlayerTiles() {
        // This calls back to main.js to regenerate the player tiles based on current setup
        if (window.kingOfTokyoUI && typeof window.kingOfTokyoUI.regeneratePlayerTilesFromSetup === 'function') {
            window.kingOfTokyoUI.regeneratePlayerTilesFromSetup(this.currentPlayerCount);
        } else {
            console.log('SetupManager: regeneratePlayerTiles - main UI not available, skipping');
        }
    }

    // Reset monster cards to normal appearance
    resetMonsterCards() {
        const monsterCards = document.querySelectorAll('.monster-option');
        monsterCards.forEach(card => {
            // Remove all visual states
            card.classList.remove('selected', 'grayed-out', 'dragging');
            
            // Reset inline styles
            card.style.removeProperty('opacity');
            card.style.removeProperty('transform');
            card.style.removeProperty('z-index');
            card.style.removeProperty('filter');
            card.style.removeProperty('pointer-events');
            
            // Make sure it's visible and draggable
            card.style.display = '';
            card.setAttribute('draggable', 'true');
        });
    }

    getCurrentPlayerCount() {
        return this.currentPlayerCount;
    }

    getSelectedMonsters() {
        // Will return array of selected monsters for game creation
        return [];
    }

    // Helper methods for randomizeMonsterSelection
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
                    const lighterColor = UIUtilities.lightenColor(monsterColor, 30);
                    const evenLighterColor = UIUtilities.lightenColor(monsterColor, 60);
                    
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

    // Monster Profile Management Methods
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
                                <span>Strategic</span>
                            </div>
                        </div>
                    </div>
                    <div class="trait-container">
                        <div class="trait-header">
                            <span class="trait-label">🎲 Risk Taking</span>
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

    getMonsterPersonality(monsterId) {
        return this.monsterProfiles[monsterId] || MONSTERS[monsterId]?.personality || { aggression: 3, strategy: 3, risk: 3 };
    }
}
