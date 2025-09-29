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
      z-index: 9000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
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
      background: #1c1c1c;
      border: 2px solid #111;
      border-radius: 8px;
      box-shadow: 6px 6px 0 #000, 0 0 0 2px #000 inset, 0 10px 26px -8px rgba(0,0,0,.7);
      color: #e4e4e4;
      font-family: 'Nunito', system-ui, sans-serif;
      width: 100%;
      max-width: ${options.width || '600px'};
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `;

    const header = document.createElement('div');
    header.className = 'new-modal-header';
    header.style.cssText = `
      background: #111;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: inset 0 -2px 0 rgba(255,255,255,0.05);
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
      width: 32px;
      height: 32px;
      border-radius: 4px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 2px 2px 0 #000;
      transition: background 0.18s ease, transform 80ms cubic-bezier(0.34,1.56,0.64,1);
    `;
    closeButton.innerHTML = '×';
    closeButton.addEventListener('click', () => this.closeModal(id));
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.transform = 'translateY(-2px)';
    });
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.transform = 'translateY(0)';
    });

    const body = document.createElement('div');
    body.className = 'new-modal-body';
    body.style.cssText = `
      padding: 16px;
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

    this.modals.set(id, modal);
    return modal;
  }

  showModal(id) {
    const modal = this.modals.get(id);
    if (!modal) return;

    // Close current modal if any
    this.closeCurrentModal();

    // Clear overlay and add new modal
    this.overlay.innerHTML = '';
    this.overlay.appendChild(modal);
    this.overlay.style.display = 'flex';
    this.currentModal = id;

    // Focus management
    const firstFocusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) {
      firstFocusable.focus();
    }

    console.log(`[NEW-MODAL] Opened modal: ${id}`);
  }

  closeModal(id) {
    if (this.currentModal === id) {
      this.closeCurrentModal();
    }
  }

  closeCurrentModal() {
    if (this.currentModal) {
      console.log(`[NEW-MODAL] Closed modal: ${this.currentModal}`);
      this.overlay.style.display = 'none';
      this.overlay.innerHTML = '';
      this.currentModal = null;
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