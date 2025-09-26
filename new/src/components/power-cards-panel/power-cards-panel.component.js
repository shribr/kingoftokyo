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
  return `<div class="pc-placeholder" data-pc-placeholder><p style="font:14px system-ui,sans-serif; margin:0; opacity:.8;">Power Cards content coming...</p></div>`;
}

function shopStubTemplate(){
  return `<div class="pc-shop-grid" data-shop-grid>
    <div class="pc-shop-row" data-row>
      ${['A','B','C'].map(l=>`<div class=\"shop-card is-stub\" data-stub-card><header class=\"sc-header\"><span class=\"sc-name\">Card ${l}</span><span class=\"sc-cost\">3⚡</span></header><div class=\"sc-effect\">Temporary stub effect text for card ${l}.</div><div class=\"sc-actions\"><button class=\"k-btn k-btn--xs k-btn--secondary\" disabled>BUY</button></div></div>`).join('')}
    </div>
    <footer class="shop-footer" data-shop-footer><button class="k-btn k-btn--sm k-btn--tertiary" data-refresh disabled>REFRESH (stub)</button></footer>
  </div>`;
}

export function update(root){
  const refresh = root.querySelector('[data-refresh]');
  if (refresh) refresh.disabled = true;
}
