/** splash-screen.component.js */
import { store } from '../../bootstrap/index.js';
import { selectSplashVisible, selectMonsters } from '../../core/selectors.js';
import { uiSplashHide, uiMonsterProfilesOpen } from '../../core/actions.js';

export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' cmp-splash';
  root.innerHTML = splashMarkup();

  root.addEventListener('click', (e) => {
    const enterBtn = e.target.closest('[data-action="enter"]');
    if (enterBtn) {
      store.dispatch(uiSplashHide());
    }
    const profileTrigger = e.target.closest('[data-action="profiles"]');
    if (profileTrigger) {
      store.dispatch(uiMonsterProfilesOpen());
    }
  });

  return { root, update: () => update(root), destroy: () => root.remove() };
}

export function update(root) {
  const visible = selectSplashVisible(store.getState());
  if (!visible) {
    root.classList.add('is-hidden');
  } else {
    root.classList.remove('is-hidden');
    // Populate polaroids from monsters data (first 6)
    const monsters = selectMonsters(store.getState()).slice(0,6);
    const left = root.querySelector('[data-polaroids-left]');
    const right = root.querySelector('[data-polaroids-right]');
    if (left && right) {
      // Use first three for left, next three for right
      left.innerHTML = monsters.slice(0,3).map((m,i) => polaroidHTML(m, i+1)).join('');
      right.innerHTML = monsters.slice(3,6).map((m,i) => polaroidHTML(m, i+4)).join('');
    }
  }
}

function splashMarkup() {
  return `<div class="splash-bg" data-layer="bg"></div>
  <div class="splash-polaroids" data-polaroids-left></div>
  <div class="splash-polaroids" data-polaroids-right></div>
  <div class="splash-center">
    <div class="splash-logo-wrap">
      <img src="images/king-of-tokyo-logo.png" alt="King of Tokyo" class="splash-logo-img"/>
    </div>
    <div class="splash-enter" data-action="enter">ENTER THE BATTLE FOR TOKYO!</div>
  </div>
  <div class="splash-city">
    ${citySVG()}
  </div>`;
}

function polaroidHTML(monster, index) {
  return `<div class="splash-polaroid polaroid-${index}">
      <div class="sp-photo">${monster.image ? `<img src="${monster.image}" alt="${monster.name}">` : monster.name}</div>
      <div class="sp-caption">${monster.name}</div>
    </div>`;
}

function citySVG() {
  return `<svg class="splash-skyline" viewBox="0 0 1400 300" xmlns="http://www.w3.org/2000/svg"><path d="M0,180 L100,180 L100,80 L180,80 L180,140 L280,140 L280,200 L350,200 L350,40 L420,40 L420,120 L520,120 L520,170 L600,170 L600,90 L680,90 L680,220 L780,220 L780,160 L860,160 L860,70 L940,70 L940,190 L1040,190 L1040,130 L1120,130 L1120,100 L1200,100 L1200,210 L1300,210 L1300,160 L1400,160" fill="none" stroke="rgba(255, 180, 0, 0.35)" stroke-width="2" /></svg>`;
}
