/** splash-screen.component.js */
import { selectSplashVisible, selectMonsters } from '../../core/selectors.js';
import { uiSplashHide, uiSetupOpen } from '../../core/actions.js';

export function build({ selector, dispatch, getState }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' cmp-splash';
  root.innerHTML = splashMarkup();

  root.addEventListener('click', (e) => {
    if (e.target.id === 'enter-battle-btn' || e.target.closest('#enter-battle-btn')) {
      e.preventDefault();
      dispatch(uiSetupOpen());
      dispatch(uiSplashHide());
      // Immediate visual feedback; do not wait for store update
      root.classList.add('is-hidden');
      return;
    }
    const polaroid = e.target.closest('.polaroid');
    if (polaroid) {
      dispatch(uiSetupOpen());
      dispatch(uiSplashHide());
      root.classList.add('is-hidden');
      return;
    }
  });

  return { root, destroy: () => root.remove() };
}

export function update(ctx) {
  const root = ctx.inst?.root || ctx;
  const state = ctx.fullState || ctx.state;
  const visible = selectSplashVisible(state);
  if (!visible) {
    root.classList.add('is-hidden');
  } else {
    root.classList.remove('is-hidden');
    // Populate polaroids from monsters data (first 6)
    // Match legacy order for splash polaroids: 1..6 = [Gigazaur, Cyber Bunny, Kraken, The King, Meka Dragon, Alienoid]
    const desiredOrderIds = ['giga','bunny','kraken','king','dragon','alien'];
    const byId = state.monsters?.byId || {};
    let monsters = desiredOrderIds.map(id => byId[id]).filter(Boolean);
    if (monsters.length < 6) {
      // Fallback to existing order if not all present yet
      monsters = selectMonsters(state).slice(0,6);
    }
    const left = root.querySelector('[data-polaroids-left]');
    const right = root.querySelector('[data-polaroids-right]');
    if (left && right) {
      const leftMons = monsters.slice(0,3);
      const rightMons = monsters.slice(3,6);
      left.innerHTML = leftMons.map((m,i) => polaroidHTML(m, i+1)).join('');
      right.innerHTML = rightMons.map((m,i) => polaroidHTML(m, i+4)).join('');
      const leftEls = left.querySelectorAll('.polaroid');
      const rightEls = right.querySelectorAll('.polaroid');
      leftEls.forEach((el, i) => {
        const m = leftMons[i];
        if (m) el.style.setProperty('--monster-tint', hexToRgba(m.color || '#444444', 0.6));
      });
      rightEls.forEach((el, i) => {
        const m = rightMons[i];
        if (m) el.style.setProperty('--monster-tint', hexToRgba(m.color || '#444444', 0.6));
      });
    }
  }
}

function splashMarkup() {
  return `
  <div class="splash-content">
    <div class="polaroids-left" data-polaroids-left></div>
    <div class="splash-center-content">
      <img src="images/king-of-tokyo-logo.png" alt="King of Tokyo" class="splash-logo-image" />
      <div id="enter-battle-btn" class="splash-subtitle clickable">Enter the battle for Tokyo!</div>
    </div>
    <div class="polaroids-right" data-polaroids-right></div>
  </div>
  <div class="city-skyline-container">${citySVG()}</div>`;
}

function polaroidHTML(monster, index) {
  const tint = monster.color || '#444444';
  return `<div class="polaroid polaroid-${index}" style="--monster-tint: ${tint};">
      ${monster.image ? `<img src="${monster.image}" alt="${monster.name}"/>` : `<div class="polaroid-fallback">${monster.name}</div>`}
      <div class="polaroid-caption">${monster.name}</div>
    </div>`;
}

function citySVG() {
  return `<svg class="skyline" viewBox="0 0 1400 300" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,180 L100,180 L100,80 L180,80 L180,140 L280,140 L280,200 L350,200 L350,40 L420,40 L420,120 L520,120 L520,170 L600,170 L600,90 L680,90 L680,220 L780,220 L780,160 L860,160 L860,70 L940,70 L940,190 L1040,190 L1040,130 L1120,130 L1120,100 L1200,100 L1200,210 L1300,210 L1300,160 L1400,160" fill="none" stroke="rgba(255, 255, 255, 0.35)" stroke-width="2" />
    <rect x="70" y="120" width="8" height="10" fill="rgba(255, 255, 255, 0.25)" opacity="0.7"/>
    <rect x="140" y="160" width="8" height="10" fill="rgba(255, 255, 255, 0.25)" opacity="0.7"/>
    <rect x="380" y="70" width="6" height="8" fill="rgba(255, 255, 255, 0.25)" opacity="0.7"/>
    <rect x="580" y="130" width="8" height="10" fill="rgba(255, 255, 255, 0.25)" opacity="0.7"/>
    <rect x="820" y="100" width="6" height="8" fill="rgba(255, 255, 255, 0.25)" opacity="0.7"/>
    <rect x="980" y="170" width="8" height="10" fill="rgba(255, 255, 255, 0.25)" opacity="0.7"/>
    <rect x="1080" y="150" width="6" height="8" fill="rgba(255, 255, 255, 0.25)" opacity="0.7"/>
    <rect x="1250" y="180" width="8" height="10" fill="rgba(255, 255, 255, 0.25)" opacity="0.7"/>
  </svg>`;
}

function hexToRgba(hex, alpha = 1) {
  const h = hex.replace('#','');
  const bigint = parseInt(h.length === 3 ? h.split('').map(c=>c+c).join('') : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
