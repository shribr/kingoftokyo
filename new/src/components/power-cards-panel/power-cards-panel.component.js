/** power-cards-panel.component.js
 * Clone of monsters panel for baseline collapse/expand behavior.
 * Will later be specialized for Power Cards (shop display etc.).
 */
import { initSidePanel } from '../side-panel/side-panel.js';

export function build({ selector, initialState }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' cmp-power-cards-panel cmp-side-panel k-panel';
  root.setAttribute('data-side','left');
  root.setAttribute('data-panel','power-cards');
  root.innerHTML = panelTemplate(initialState?.featureFlagShopStub);
  initSidePanel(root, {
    side:'left',
    // Updated mapping per request:
    // Expanded: ◄ (arrow points toward off-screen collapse direction)
    // Collapsed: ► (arrow points into viewport inviting expand)
    expandedArrow:'◄',
    collapsedArrow:'►',
    bodyClassExpanded:'panels-expanded-left'
  });
  return { root, update: () => update(root) };
}

function panelTemplate(shopFlag) {
  return `
  <div class="mp-header k-panel__header" data-toggle role="button" aria-expanded="true" tabindex="0">
    <h2 class="mp-title" data-toggle><span class="mp-arrow" data-arrow-dir data-toggle>◄</span><span class="mp-label" data-title-text>Power Cards</span></h2>
  </div>
  <div class="mp-body k-panel__body" data-panel-body>
    ${shopFlag ? shopStubTemplate() : placeholderTemplate()}
  </div>`;
}

function placeholderTemplate(){
  return `<div class="pc-placeholder" data-pc-placeholder>
    <div class="pc-empty-frame">
      <h3>Power Cards</h3>
      <p>No shop loaded yet.</p>
      <p class="hint">Future: show available cards to buy, energy cost, and refresh button.</p>
    </div>
  </div>`;
}

function shopStubTemplate(){
  return `<div class="pc-shop" data-shop-grid>
    <div class="pc-shop-cards">
      ${['A','B','C'].map(l=>`<div class=\"pc-card pc-card--stub\" data-stub-card>
        <div class=\"pc-card__header\"><span class=\"pc-card__name\">Card ${l}</span><span class=\"pc-card__cost\">3⚡</span></div>
        <div class=\"pc-card__body\">Stub effect text for card ${l}. Lorem ipsum short effect.</div>
        <div class=\"pc-card__footer\"><button class=\"k-btn k-btn--xs k-btn--secondary\" disabled>BUY</button></div>
      </div>`).join('')}
    </div>
    <div class="pc-shop-actions"><button class="k-btn k-btn--sm k-btn--tertiary" data-refresh disabled>REFRESH (stub)</button></div>
  </div>`;
}

export function update(root){
  const refresh = root.querySelector('[data-refresh]');
  if (refresh) refresh.disabled = true;
}
