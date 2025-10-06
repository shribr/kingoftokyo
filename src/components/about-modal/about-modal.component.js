// about-modal.component.js
import { uiAboutClose } from '../../core/actions.js';

export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' cmp-about-modal modal-shell';
  root.innerHTML = `<div class="modal modal-about-large" data-modal aria-modal="true" role="dialog" aria-labelledby="about-title" hidden>
    <div class="modal-header"><h2 id="about-title">About King of Tokyo</h2><button data-close aria-label="Close">×</button></div>
    <div class="modal-body" style="font-size:14px;line-height:1.6;">
      <p><strong>King of Tokyo – Enhanced UI Prototype</strong></p>
      <p>This experimental interface brings advanced UI features, modular components, and flexible customization to the classic monster battle game.</p>
      
      <h3 style="margin-top:20px;margin-bottom:10px;font-size:1.1rem;color:#ffd700;text-shadow:1px 1px 0 #000;">🎮 Core Gameplay Features</h3>
      <ul style="margin-left:20px;line-height:1.8;">
        <li><strong>Full Game Implementation</strong> – Complete rules including Tokyo Bay, Power Cards, Victory Stars, and Energy</li>
        <li><strong>AI Opponents</strong> – Intelligent computer players with strategic decision-making</li>
        <li><strong>Multiple Monster Choices</strong> – Play as Gigazaur, Meka Dragon, The King, Cyber Bunny, Alienoid, and Kraken</li>
        <li><strong>Power Card System</strong> – Complete deck with Keep and Discard cards, effects, and synergies</li>
        <li><strong>Tokyo Yield Mechanics</strong> – Strategic decisions for staying in Tokyo or yielding control</li>
      </ul>

      <h3 style="margin-top:20px;margin-bottom:10px;font-size:1.1rem;color:#ffd700;text-shadow:1px 1px 0 #000;">📱 Mobile UI Modes</h3>
      <ul style="margin-left:20px;line-height:1.8;">
        <li><strong>Classic Mobile View</strong> – Traditional touch-optimized layout with action menu button</li>
        <li><strong>Radial Menu Mode</strong> – Catan-inspired circular action menu with:
          <ul style="margin-left:20px;margin-top:6px;">
            <li>Mini player cards in all 4 corners showing stats and health</li>
            <li>Mini power cards bar at bottom with horizontal scrolling</li>
            <li>Mini deck indicator at bottom-left like collapsed panel</li>
            <li>Rotated Tokyo tiles for optimized screen space</li>
            <li>Always-visible dice tray (no toggle button)</li>
            <li>Right-edge radial toggle button positioned between corner cards</li>
          </ul>
        </li>
      </ul>

      <h3 style="margin-top:20px;margin-bottom:10px;font-size:1.1rem;color:#ffd700;text-shadow:1px 1px 0 #000;">⚙️ Settings & Customization</h3>
      <ul style="margin-left:20px;line-height:1.8;">
        <li><strong>Layout Density Options</strong> – Switch between Stacked, Condensed, and List views</li>
        <li><strong>Mobile UI Mode Toggle</strong> – Choose Classic or Radial Menu layouts for mobile</li>
        <li><strong>Accessible Settings Panel</strong> – Scrollable modal with clear controls, accessible from both mobile and desktop</li>
        <li><strong>Settings Button Access</strong> – Available in mobile horizontal menu and desktop modals</li>
        <li><strong>Developer Panel</strong> – Advanced debugging and state inspection tools</li>
      </ul>

      <h3 style="margin-top:20px;margin-bottom:10px;font-size:1.1rem;color:#ffd700;text-shadow:1px 1px 0 #000;">🤖 AI & Analytics</h3>
      <ul style="margin-left:20px;line-height:1.8;">
        <li><strong>AI Decision Tree Viewer</strong> – Inspect AI reasoning and decision-making process</li>
        <li><strong>AI Thought Bubbles</strong> – Visual indicators showing what AI players are considering</li>
        <li><strong>Win Odds Calculator</strong> – Real-time probability analysis for victory chances</li>
        <li><strong>Analytics Dashboard</strong> – Track game statistics and player performance</li>
      </ul>

      <h3 style="margin-top:20px;margin-bottom:10px;font-size:1.1rem;color:#ffd700;text-shadow:1px 1px 0 #000;">♿ Accessibility</h3>
      <ul style="margin-left:20px;line-height:1.8;">
        <li><strong>ARIA Labels</strong> – Screen reader support throughout interface</li>
        <li><strong>Keyboard Navigation</strong> – Full game control without mouse/touch</li>
        <li><strong>Focus Management</strong> – Clear visual focus indicators</li>
        <li><strong>Modal Accessibility</strong> – Proper dialog roles and hidden attribute management</li>
      </ul>

      <h3 style="margin-top:20px;margin-bottom:10px;font-size:1.1rem;color:#ffd700;text-shadow:1px 1px 0 #000;">🎨 Visual Design</h3>
      <ul style="margin-left:20px;line-height:1.8;">
        <li><strong>Dark Theme</strong> – Eye-friendly dark color scheme with design tokens</li>
        <li><strong>Modular Component System</strong> – Reusable, maintainable UI components</li>
        <li><strong>Responsive Layout</strong> – Adapts to desktop, tablet, and mobile screens</li>
        <li><strong>Custom Animations</strong> – Smooth transitions and visual feedback</li>
        <li><strong>Z-Index Management</strong> – Proper layering of overlays and modals</li>
      </ul>

      <p style="margin-top:24px;">Session build: <span data-build-ts></span></p>
      <p style="opacity:.6;font-size:12px;margin-top:12px;">All trademarks belong to their respective owners. Prototype for personal/educational use.</p>
    </div>
  </div>`;
  root.addEventListener('click', (e) => { if (e.target.matches('[data-close]')) dispatchClose(); });
  return { root, update: ({ state }) => sync(root, state) };
}

function dispatchClose() { import('../../bootstrap/index.js').then(m => m.store.dispatch(uiAboutClose())); }

function sync(root, state) {
  const open = state.ui?.about?.open;
  const modal = root.querySelector('[data-modal]');
  if (!open) { modal.setAttribute('hidden',''); return; }
  modal.removeAttribute('hidden');
  const tsEl = root.querySelector('[data-build-ts]');
  if (tsEl && !tsEl.textContent) tsEl.textContent = new Date().toLocaleString();
}

export function update(ctx) { ctx.inst.update(ctx); }
