// BUY_WAIT phase visual indicator
// Renders a lightweight banner or inline status inside the shop area while post-purchase effects resolve.

(function(){
  const rootId = 'kot-buy-wait-status';

  function ensureEl(){
    let el = document.getElementById(rootId);
    if(!el){
      el = document.createElement('div');
      el.id = rootId;
      el.style.position = 'absolute';
      el.style.top = '0';
      el.style.left = '0';
      el.style.right = '0';
      el.style.padding = '4px 8px';
      el.style.background = 'linear-gradient(90deg,#222,#333)';
      el.style.color = '#f0f0f0';
      el.style.fontSize = '12px';
      el.style.letterSpacing = '0.5px';
      el.style.fontFamily = 'var(--ui-font, sans-serif)';
      el.style.display = 'none';
      el.style.alignItems = 'center';
      el.style.gap = '6px';
      el.style.zIndex = '40';
      el.innerHTML = '<span class="spinner" style="width:12px;height:12px;border:2px solid #777;border-top-color:#0af;border-radius:50%;display:inline-block;animation:kotSpin 0.8s linear infinite"></span><span class="text">Processing card effects…</span>';
      document.body.appendChild(el);
      injectKeyframes();
    }
    return el;
  }

  function injectKeyframes(){
    const id = 'kot-buy-wait-spin-style';
    if(document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = '@keyframes kotSpin {from{transform:rotate(0deg)}to{transform:rotate(360deg)}}';
    document.head.appendChild(style);
  }

  function update(state){
    const el = ensureEl();
    if(state.phase === window.Phases?.BUY_WAIT){
      el.style.display = 'flex';
      // Attempt to position over shop (if exists)
      const shop = document.getElementById('card-shop');
      if(shop){
        const r = shop.getBoundingClientRect();
        el.style.position = 'fixed';
        el.style.top = (r.top - 20) + 'px';
        el.style.left = r.left + 'px';
        el.style.width = r.width + 'px';
      } else {
        el.style.position = 'absolute';
        el.style.top = '0';
        el.style.left = '0';
        el.style.width = '100%';
      }
    } else {
      el.style.display = 'none';
    }
  }

  function disableShopDuringWait(state){
    const shop = document.getElementById('card-shop');
    if(!shop) return;
    const btns = shop.querySelectorAll('button');
    const disabled = state.phase === window.Phases?.BUY_WAIT;
    btns.forEach(b => {
      if(disabled){
        b.setAttribute('data-prev-disabled', b.disabled ? '1':'0');
        b.disabled = true;
        b.classList.add('is-waiting');
      } else if(b.classList.contains('is-waiting')) {
        const prev = b.getAttribute('data-prev-disabled');
        if(prev === '0') b.disabled = false;
        b.classList.remove('is-waiting');
      }
    });
  }

  function hookStore(){
    const store = window.__KOT_NEW__?.store;
    if(!store){
      setTimeout(hookStore, 250);
      return;
    }
    store.subscribe(()=>{
      const state = store.getState();
      update(state);
      disableShopDuringWait(state);
    });
    update(store.getState());
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', hookStore);
  } else {
    hookStore();
  }
})();
