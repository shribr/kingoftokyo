/**
 * new-modal-system.js
 * Brand new modal system to replace problematic legacy modals
 */

class NewModalSystem {
  constructor() {
    this.modals = new Map();
    this.overlay = null;
    this.currentModal = null;
    this.init();
  }

  init() {
    // Create modal overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'new-modal-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 30000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 2vh;
      box-sizing: border-box;
    `;
    
    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.closeCurrentModal();
      }
    });
    
    document.body.appendChild(this.overlay);
  }

  createModal(id, title, content, options = {}) {
    const modal = document.createElement('div');
    modal.className = 'new-modal';
    modal.style.cssText = `
      position: relative;
      background: #1c1c1c;
      border: 2px solid #111;
      border-radius: 0.8vh;
      box-shadow: 0.6vh 0.6vh 0 #000, 0 0 0 2px #000 inset, 0 1vh 2.6vh -0.8vh rgba(0,0,0,.7);
      color: #e4e4e4;
      font-family: 'Nunito', system-ui, sans-serif;
      width: 100%;
      max-width: ${options.width || '60vw'};
      ${options.height ? `height: ${options.height}; max-height: ${options.height};` : 'max-height: 90vh;'}
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `;

    const header = document.createElement('div');
    header.className = 'new-modal-header';
    header.style.cssText = `
      background: #111;
      padding: 1.2vh 1.6vw;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.2vw;
      box-shadow: inset 0 -2px 0 rgba(255,255,255,0.05);
      ${options.draggable ? 'cursor: move; user-select: none;' : ''}
    `;

    const titleElement = document.createElement('h2');
    titleElement.style.cssText = `
      font-family: 'Bangers', cursive;
      font-size: 1.5rem;
      letter-spacing: 1px;
      margin: 0;
      color: #e4e4e4;
    `;
    titleElement.textContent = title;

    const closeButton = document.createElement('button');
    closeButton.style.cssText = `
      background: #181818;
      color: #bbb;
      border: 1px solid #333;
      font-family: inherit;
      font-size: 1rem;
      line-height: 1;
      width: 3.2vh;
      height: 3.2vh;
      border-radius: 0.4vh;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0.2vh 0.2vh 0 #000;
      transition: background 0.18s ease, transform 80ms cubic-bezier(0.34,1.56,0.64,1);
    `;
    closeButton.innerHTML = '×';
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent closing parent modals
      this.closeModal(id);
    });
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.transform = 'translateY(-2px)';
    });
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.transform = 'translateY(0)';
    });

    const body = document.createElement('div');
    body.className = 'new-modal-body';
    body.style.cssText = `
      padding: 1.6vh;
      overflow: auto;
      flex: 1;
    `;
    
    if (typeof content === 'string') {
      body.innerHTML = content;
    } else {
      body.appendChild(content);
    }

    header.appendChild(titleElement);
    header.appendChild(closeButton);
    modal.appendChild(header);
    modal.appendChild(body);

    // Add draggable functionality
    if (options.draggable) {
      this.makeDraggable(modal, header);
    }

    // Add resizable functionality
    if (options.resizable) {
      this.makeResizable(modal);
    }

    this.modals.set(id, modal);
    return modal;
  }

  makeDraggable(modal, handle) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    // Check if mobile
    const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isMobile) return; // Skip dragging on mobile

    handle.addEventListener('mousedown', (e) => {
      // Only drag if clicking directly on the header, not on buttons
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
      
      isDragging = true;
      const rect = modal.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      
      // Change modal positioning to absolute for dragging
      modal.style.position = 'absolute';
      modal.style.left = startLeft + 'px';
      modal.style.top = startTop + 'px';
      
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      const newLeft = startLeft + dx;
      const newTop = startTop + dy;
      
      // Keep modal within viewport bounds
      const rect = modal.getBoundingClientRect();
      const maxLeft = window.innerWidth - rect.width;
      const maxTop = window.innerHeight - rect.height;
      
      modal.style.left = Math.max(0, Math.min(maxLeft, newLeft)) + 'px';
      modal.style.top = Math.max(0, Math.min(maxTop, newTop)) + 'px';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  makeResizable(modal) {
    const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isMobile) return; // Skip resizing on mobile

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'new-modal-resize-handle';
    resizeHandle.style.cssText = `
      position: absolute;
      bottom: 0;
      right: 0;
      width: 20px;
      height: 20px;
      cursor: nwse-resize;
      background: linear-gradient(135deg, transparent 0%, transparent 50%, #555 50%, #555 100%);
      border-bottom-right-radius: 0.8vh;
      z-index: 10;
    `;

    let isResizing = false;
    let startX, startY, startWidth, startHeight;

    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      
      const computedStyle = getComputedStyle(modal);
      startWidth = parseInt(computedStyle.width, 10);
      startHeight = parseInt(computedStyle.height, 10);
      
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      const newWidth = startWidth + dx;
      const newHeight = startHeight + dy;
      
      // Set minimum sizes
      modal.style.width = Math.max(400, newWidth) + 'px';
      modal.style.height = Math.max(300, newHeight) + 'px';
      modal.style.maxWidth = 'none';
      modal.style.maxHeight = 'none';
    });

    document.addEventListener('mouseup', () => {
      isResizing = false;
    });

    modal.appendChild(resizeHandle);
  }

  showModal(id) {
    const modal = this.modals.get(id);
    if (!modal) return;

    // DEBUG: Track modal shows with stack trace
    if (id === 'aiDecision' || id === 'aiReasoningDetail') {
      console.warn(`🚨 [MODAL-DEBUG] Showing ${id} modal`, {
        timestamp: new Date().toISOString(),
        currentModal: this.currentModal,
        stack: new Error().stack
      });
    }

    // Store previous modal if opening a nested modal
    const previousModal = this.currentModal;

    // Clear overlay and add new modal (don't close if it's a nested modal)
    if (!previousModal || previousModal === id) {
      this.overlay.innerHTML = '';
    }
    
    // Hide previous modal but keep it in memory
    if (previousModal && previousModal !== id) {
      const prevModalEl = this.modals.get(previousModal);
      if (prevModalEl) {
        prevModalEl.style.display = 'none';
      }
    }
    
    this.overlay.appendChild(modal);
    this.overlay.style.display = 'flex';
    modal.style.display = 'flex';
    this.currentModal = id;
    this.previousModal = previousModal;

    // Track open modal in localStorage for page reload restoration
    try {
      localStorage.setItem('KOT_OPEN_MODAL', id);
    } catch(_) {}

    // Focus management
    const firstFocusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) {
      firstFocusable.focus();
    }

    console.log(`[NEW-MODAL] Opened modal: ${id}`);
  }

  closeModal(id) {
    if (this.currentModal === id) {
      const currentModalEl = this.modals.get(this.currentModal);
      if (currentModalEl) {
        currentModalEl.style.display = 'none';
        currentModalEl.remove();
      }
      
      // Restore previous modal if it exists
      if (this.previousModal && this.previousModal !== id) {
        const prevModalEl = this.modals.get(this.previousModal);
        if (prevModalEl) {
          prevModalEl.style.display = 'flex';
          this.currentModal = this.previousModal;
          this.previousModal = null;
          console.log(`[NEW-MODAL] Closed modal: ${id}, restored: ${this.currentModal}`);
          return;
        }
      }
      
      // No previous modal, close overlay entirely
      this.overlay.style.display = 'none';
      this.overlay.innerHTML = '';
      this.currentModal = null;
      this.previousModal = null;
      
      // Clear tracked modal from localStorage
      try {
        localStorage.removeItem('KOT_OPEN_MODAL');
      } catch(_) {}
      
      console.log(`[NEW-MODAL] Closed modal: ${id}`);
    }
  }

  closeCurrentModal() {
    if (this.currentModal) {
      this.closeModal(this.currentModal);
    }
  }

  // Restore modal state from localStorage (call after page load)
  restoreModalState() {
    try {
      const savedModal = localStorage.getItem('KOT_OPEN_MODAL');
      if (savedModal) {
        console.log(`[NEW-MODAL] Restoring modal from page reload: ${savedModal}`);
        // Dispatch event so components can reopen their modals
        window.dispatchEvent(new CustomEvent('modal:restore', { 
          detail: { modalId: savedModal } 
        }));
      }
    } catch(err) {
      console.warn('[NEW-MODAL] Failed to restore modal state:', err);
    }
  }

  // Keyboard handling
  handleKeydown(e) {
    if (e.key === 'Escape' && this.currentModal) {
      this.closeCurrentModal();
    }
  }
}

// Create global instance
const newModalSystem = new NewModalSystem();

// Handle escape key
document.addEventListener('keydown', (e) => newModalSystem.handleKeydown(e));

export { newModalSystem };