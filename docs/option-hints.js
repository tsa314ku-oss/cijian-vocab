(function(root){
'use strict';
let cleanup=()=>{};
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function destroy(){cleanup();cleanup=()=>{}}
function bind(container,options,onHint){
 destroy();
 const doc=container.ownerDocument,win=doc.defaultView,popover=doc.createElement('div');
 popover.className='option-meaning-popover';popover.id='optionMeaningPopover';popover.setAttribute('role','tooltip');popover.hidden=true;doc.body.append(popover);
 let timer,hideTimer,active=null,suppressClick=false,suppressTimer;
 const listeners=[];
 function listen(el,type,fn,opts){el.addEventListener(type,fn,opts);listeners.push(()=>el.removeEventListener(type,fn,opts))}
 function cancel(){clearTimeout(timer);timer=null}
 function hide(){cancel();clearTimeout(hideTimer);popover.hidden=true;if(active){active.querySelector('[data-meaning-toggle]').setAttribute('aria-expanded','false');active=null}}
 function show(card){
  cancel();clearTimeout(hideTimer);if(active&&active!==card)active.querySelector('[data-meaning-toggle]').setAttribute('aria-expanded','false');
  const index=Number(card.dataset.optionCard),word=options[index];if(!word)return;
  active=card;popover.innerHTML='<div class="option-meaning-title"><strong>'+escape(word.word)+'</strong><span>全部词义</span></div><ul>'+word.senses.map(s=>'<li>'+(s.pos?'<span>'+escape(s.pos)+'</span>':'')+escape(s.text)+'</li>').join('')+'</ul>';
  popover.hidden=false;card.querySelector('[data-meaning-toggle]').setAttribute('aria-expanded','true');
  const rect=card.getBoundingClientRect(),width=Math.min(360,win.innerWidth-32);popover.style.width=width+'px';
  const height=popover.getBoundingClientRect().height,left=Math.min(Math.max(16,rect.left),win.innerWidth-width-16);
  const top=rect.bottom+10+height<=win.innerHeight-16?rect.bottom+10:Math.max(16,rect.top-height-10);
  popover.style.left=left+'px';popover.style.top=top+'px';onHint(index);
 }
 for(const card of container.querySelectorAll('[data-option-card]')){
  const toggle=card.querySelector('[data-meaning-toggle]');
  const schedule=()=>{cancel();clearTimeout(hideTimer);timer=setTimeout(()=>show(card),650)};
  listen(card,'pointerenter',event=>{if(event.pointerType!=='touch')schedule()});
  listen(card,'pointerleave',()=>{cancel();hideTimer=setTimeout(hide,150)});
  listen(card,'focusin',schedule);
  listen(card,'focusout',()=>{cancel();hideTimer=setTimeout(hide,150)});
  listen(toggle,'click',event=>{event.preventDefault();event.stopPropagation();active===card&&!popover.hidden?hide():show(card)});
  listen(card,'pointerdown',event=>{if(event.pointerType!=='touch'||event.target.closest('[data-meaning-toggle]'))return;cancel();timer=setTimeout(()=>{show(card);suppressClick=true;clearTimeout(suppressTimer);suppressTimer=setTimeout(()=>{suppressClick=false},900)},650)});
  listen(card,'pointermove',event=>{if(event.pointerType==='touch'&&Math.abs(event.movementX)+Math.abs(event.movementY)>8)cancel()});
  listen(card,'pointerup',cancel);listen(card,'pointercancel',cancel);
  listen(card,'click',event=>{if(suppressClick){event.preventDefault();event.stopImmediatePropagation();suppressClick=false}},true);
 }
 listen(popover,'pointerenter',()=>clearTimeout(hideTimer));listen(popover,'pointerleave',hide);
 listen(doc,'pointerdown',event=>{if(!event.target.closest('[data-option-card],.option-meaning-popover'))hide()});
 listen(doc,'keydown',event=>{if(event.key==='Escape')hide()});listen(win,'resize',hide);listen(win,'scroll',event=>{if(!popover.contains(event.target))hide()},true);
 cleanup=()=>{cancel();clearTimeout(hideTimer);clearTimeout(suppressTimer);listeners.forEach(remove=>remove());popover.remove()};
 return hide;
}
const api={bind,destroy};if(typeof module!=='undefined')module.exports=api;root.CijianOptionHints=api;
})(typeof window!=='undefined'?window:globalThis);
