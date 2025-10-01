import { uiSettingsClose } from '../../core/actions.js';

export function build() {
  const root = document.createElement('div');
  root.className = 'cmp-instructions-modal modal-shell';
  root.innerHTML = `
    <div class="modal instructions" data-instructions-modal>
      <div class="modal-header"><h2>Instructions</h2><button data-close aria-label="Close">×</button></div>
      <div class="modal-body" data-scroll>
        ${contentHTML()}
      </div>
    </div>`;
  root.querySelector('[data-close]').addEventListener('click', () => root.style.display = 'none');
  return { root, update: ({ state }) => {
    const open = state.ui?.instructions?.open;
    root.style.display = open ? 'block':'none';
  }};
}

function contentHTML() {
  return `<p><strong>Goal:</strong> Reach 20 Victory Points or be the last monster standing.</p>
  <h3>Turn Structure</h3>
  <ol>
    <li><strong>Roll Dice</strong> (up to 3 rolls, keep dice between rolls)</li>
    <li><strong>Resolve Dice</strong> (gain Energy, Hearts heal if outside Tokyo, Claws attack)</li>
    <li><strong>Enter / Yield Tokyo</strong> (if you attacked occupant)</li>
    <li><strong>Buy Power Cards</strong> (spend Energy)</li>
    <li><strong>End Turn</strong></li>
  </ol>
  <h3>Dice Symbols</h3>
  <ul>
    <li>1/2/3: Three of a kind gives that many VP (each extra matching die +1 VP)</li>
    <li>Claw: Deal 1 damage to all monsters in (or outside) Tokyo depending on your position</li>
    <li>Heart: Heal 1 damage (not while in Tokyo)</li>
    <li>Lightning: Gain 1 Energy</li>
  </ul>
  <h3>Tokyo Rules</h3>
  <ul>
    <li>Entering Tokyo: Gain 1 VP</li>
    <li>Starting turn in Tokyo: Gain 2 VP</li>
    <li>You can’t heal while in Tokyo</li>
    <li>If hit while in Tokyo you may yield after damage is applied</li>
  </ul>
  <h3>Power Cards</h3>
  <p>Spend Energy to purchase permanent or one-shot effects influencing combat, economy, and survivability.</p>
  <p style="font-size:12px;opacity:.6;margin-top:12px;">(Prototype instructions modal – expand for full rulebook parity.)</p>`;
}
