// Simple node DOM stub to exercise setAIThinking transitions logic without full game state.
import { setAIThinking } from '../src/ui/mountRoot.js';

// Minimal DOM stubs
global.document = {
  body: { appendChild(){} },
  querySelector(sel){
    if (sel === '[data-ai-thinking]') return this._banner;
    if (sel === '.gl-footer') return this._footer;
    if (sel === '.gl-head-right') return this._headRight;
    return null;
  },
  createElement(tag){ return { tag, style:{}, className:'', innerHTML:'', appendChild(){}, setAttribute(){}, removeAttribute(){}, classList:{add(){},remove(){},contains(){return false;}} }; }
};

function makeEl(className){
  return {
    className,
    attributes:{},
    setAttribute(k,v){ this.attributes[k]=v; },
    removeAttribute(k){ delete this.attributes[k]; },
    hasAttribute(k){ return this.attributes.hasOwnProperty(k); },
    parentElement:null,
    style:{},
    children:[],
    appendChild(c){ c.parentElement=this; this.children.push(c); },
    querySelector(sel){ if (sel === '.dots') return this._dots; if (sel === '.dots span') return this._dots?.children?.find(ch=>ch._isSpan); return null; },
    addEventListener(evt,fn,opts){ if(evt==='transitionend'){ setTimeout(fn,10); } },
    classList:{
      _owner:null,
      add(...cls){ cls.forEach(c=>{ if(!this._owner._classes.includes(c)) this._owner._classes.push(c); }); },
      remove(...cls){ this._owner._classes = this._owner._classes.filter(c=>!cls.includes(c)); },
      contains(c){ return this._owner._classes.includes(c); }
    },
    _classes:[],
  };
}

const banner = makeEl('ai-thinking-banner');
const dots = makeEl('dots');
const dotsSpan = { _isSpan:true };
dots.children=[dotsSpan];
banner._dots = dots;

const footer = makeEl('gl-footer');
const headRight = makeEl('gl-head-right');

document._banner = banner;
document._footer = footer;
document._headRight = headRight;

// Window / matchMedia stubs
global.window = {
  innerWidth: 1400,
  addEventListener(){},
};
global.matchMedia = (q)=>({ matches: /pointer: coarse/.test(q) ? false : false });

// Store / selectors stubs
import { store } from '../src/bootstrap/index.js';
// Patch selectors used inside setAIThinking via global functions if needed

console.log('Initial banner hidden?', banner.hasAttribute && banner.hasAttribute('hidden'));
setAIThinking(false);
setAIThinking(true);
window.innerWidth = 800; // trigger footer relocation condition
setAIThinking(true);
setAIThinking(false);
console.log('Test sequence executed. Classes:', banner._classes);
