/**
 * UI Utilities for King of Tokyo Game
 * Shared utility functions to reduce code duplication
 */

class UIUtilities {
    /**
     * Modal Management Utilities
     */
    static showModal(modalElement) {
        if (modalElement) {
            modalElement.classList.remove('hidden');
        }
    }

    static hideModal(modalElement) {
        if (modalElement) {
            modalElement.classList.add('hidden');
        }
    }

    static createModalCloseHandler(modalElement) {
        return () => this.hideModal(modalElement);
    }

    static createModalClickOutsideHandler(modalElement) {
        return (e) => {
            if (e.target === modalElement) {
                this.hideModal(modalElement);
            }
        };
    }

    /**
     * Event Listener Utilities
     */
    static safeAddEventListener(element, event, handler, errorMessage = 'Element not found') {
        if (element) {
            element.addEventListener(event, handler);
            return true;
        } else {
            console.warn(errorMessage, element);
            return false;
        }
    }

    static createSafeEventHandler(callback, errorMessage = 'Handler error') {
        return (...args) => {
            try {
                return callback(...args);
            } catch (error) {
                console.error(errorMessage, error);
            }
        };
    }

    /**
     * DOM Element Utilities
     */
    static safeGetElement(elementId) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`Element with ID '${elementId}' not found`);
        }
        return element;
    }

    static safeUpdateTextContent(element, text, fallback = '') {
        if (element) {
            element.textContent = text;
        } else {
            console.warn('Cannot update text content: element is null', text);
        }
    }

    static safeToggleClass(element, className, condition = null) {
        if (element) {
            if (condition === null) {
                element.classList.toggle(className);
            } else {
                element.classList.toggle(className, condition);
            }
        }
    }

    /**
     * Validation Utilities
     */
    static validateRequiredElements(elements, requiredKeys) {
        const missing = [];
        requiredKeys.forEach(key => {
            if (!elements[key]) {
                missing.push(key);
            }
        });
        
        if (missing.length > 0) {
            console.error('Missing required elements:', missing);
            return false;
        }
        return true;
    }

    /**
     * Animation Utilities
     */
    static animateElement(element, animationClass, duration = 1000) {
        if (!element) return;
        
        element.classList.add(animationClass);
        setTimeout(() => {
            element.classList.remove(animationClass);
        }, duration);
    }

    /**
     * Debouncing utility for frequent updates
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Format health bar class based on health percentage
     */
    static getHealthBarClass(health, maxHealth) {
        if (health <= 0) return 'health-critical';
        
        const percentage = (health / maxHealth) * 100;
        if (percentage <= 25) return 'health-critical';
        if (percentage <= 50) return 'health-low';
        if (percentage <= 75) return 'health-medium';
        return 'health-high';
    }

    /**
     * Format display text with icons/emojis
     */
    static formatStatDisplay(label, value, icon = '') {
        return `${icon} ${label}: ${value}`;
    }

    /**
     * Create reusable button with consistent styling
     */
    static createButton(text, className = '', clickHandler = null) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = className;
        
        if (clickHandler) {
            this.safeAddEventListener(button, 'click', clickHandler);
        }
        
        return button;
    }

    /**
     * Color Utilities
     */
    // Helper function to convert hex color to rgba
    static hexToRgba(hex, alpha = 1) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
        }
        return `rgba(255, 152, 0, ${alpha})`; // fallback to orange
    }

    // Helper function to lighten a hex color
    static lightenColor(hex, percent = 20) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            const r = Math.min(255, parseInt(result[1], 16) + Math.round(255 * percent / 100));
            const g = Math.min(255, parseInt(result[2], 16) + Math.round(255 * percent / 100));
            const b = Math.min(255, parseInt(result[3], 16) + Math.round(255 * percent / 100));
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }
        return hex; // fallback to original color
    }

    /**
     * Message Display Utilities
     */
    static showMessage(message, duration = 3000, elements) {
        window.UI && window.UI._debug && window.UI._debug(`Game Message: ${message}`);
        
        // Clear any existing message timeout
        if (UIUtilities.messageTimeout) {
            clearTimeout(UIUtilities.messageTimeout);
        }
        
        // Get the header area to show message there (use round counter as reference)
        const headerElement = elements?.roundCounter || document.getElementById('round-counter');
        
        // If no header element found, fallback to console log
        if (!headerElement) {
            console.log(`Game Message: ${message}`);
            return;
        }
        
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
        UIUtilities.messageTimeout = setTimeout(() => {
            notification.classList.remove('visible');
            UIUtilities.messageTimeout = null;
        }, duration);
        
        // Allow clicking to dismiss
        notification.onclick = () => {
            notification.classList.remove('visible');
            if (UIUtilities.messageTimeout) {
                clearTimeout(UIUtilities.messageTimeout);
                UIUtilities.messageTimeout = null;
            }
        };
    }

    /**
     * Screen Management Utilities
     */
    static showSplashScreen(elements, setupManager) {
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

    /**
     * Center notification for important messages (like roll-off winner)
     */
    static showCenterNotification(message, duration = 3000) {
        // Create or get existing center notification element
        let notification = document.getElementById('center-notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'center-notification';
            notification.className = 'center-notification';
            notification.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.9);
                color: #FFD700;
                padding: 20px 40px;
                border-radius: 12px;
                border: 2px solid #FFD700;
                font-size: 24px;
                font-weight: bold;
                text-align: center;
                z-index: 2000;
                opacity: 0;
                transition: opacity 0.3s ease-in-out;
                pointer-events: none;
                font-family: 'Bangers', cursive;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
                box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
            `;
            document.body.appendChild(notification);
        }
        
        // Set message and show
        notification.textContent = message;
        notification.style.opacity = '1';
        
        // Auto-hide after duration
        setTimeout(() => {
            notification.style.opacity = '0';
        }, duration);
    }

    /**
     * Icon Utilities
     */
    // Get CPU icon (simple SVG or Unicode character)
    static getCPUIcon() {
        return 'CPU'; // Simple text glyph that matches the comic book theme
    }
    
    // Get human icon  
    static getHumanIcon() {
        return '?'; // Question mark in Bangers font will look comic book style
    }
}

// Static property for message timeout
UIUtilities.messageTimeout = null;

// Make UIUtilities available globally
window.UIUtilities = UIUtilities;
