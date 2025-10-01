/**
 * UI Utilities Module
 * Handles common UI utility functions including colors, messages, and screen management
 */
class UIUtilities {
    constructor() {
        this.messageTimeout = null;
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

    showMessage(message, duration = 3000, elements) {
        console.log(`Game Message: ${message}`);
        
        // Clear any existing message timeout
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }
        
        // Get the header area to show message there (use round counter as reference)
        const headerElement = elements.roundCounter;
        
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

    showSplashScreen(elements, setupManager) {
        // Hide the game container
        if (elements.gameContainer) {
            elements.gameContainer.classList.remove('show');
        }
        
        // Clean up any existing active player container from previous game
        const existingActivePlayerContainer = document.getElementById('active-player-container');
        if (existingActivePlayerContainer) {
            existingActivePlayerContainer.remove();
        }
        
        // Show the splash screen
        if (elements.splashScreen) {
            elements.splashScreen.classList.remove('fade-out');
            elements.splashScreen.style.display = 'flex';
        }
        
        // Hide the game toolbar during splash
        const gameToolbar = document.getElementById('game-toolbar');
        if (gameToolbar) {
            gameToolbar.classList.remove('show');
        }
        
        // Ensure any open dropdowns are closed
        setupManager.closeDropdown();
    }

    // Get CPU icon (simple SVG or Unicode character)
    getCPUIcon() {
        return 'CPU'; // Simple text glyph that matches the comic book theme
    }
    
    // Get human icon  
    getHumanIcon() {
        return '?'; // Question mark in Bangers font will look comic book style
    }
}

// Export for use in main.js
window.UIUtilities = UIUtilities;
