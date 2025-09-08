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
}

// Make UIUtilities available globally
window.UIUtilities = UIUtilities;
