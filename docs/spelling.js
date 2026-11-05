(function(root){
'use strict';
const letter=ch=>/\p{L}/u.test(ch);
const letters=value=>Array.from(String(value||'').normalize('NFKC')).filter(letter);
const normalize=value=>String(value||'').normalize('NFKC').toLocaleLowerCase('en');
function answerDraft(word,answer){const chars=Array.from(String(answer||'').normalize('NFKC'));return Array.from(String(word).normalize('NFKC')).flatMap((ch,i)=>letter(ch)?[letter(chars[i]||'')?chars[i]:'']:[])}
function model(word,draft=[]){
 let index=0;
 const parts=Array.from(String(word).normalize('NFKC')).map(ch=>letter(ch)?{index:index++,expected:ch}: {literal:ch});
 const values=parts.filter(p=>p.index!==undefined).map((p,i)=>letters(draft[i])[0]||'');
 const slots=parts.map(p=>p.index===undefined?p:{...p,value:values[p.index],status:!values[p.index]?'empty':normalize(values[p.index])===normalize(p.expected)?'correct':'wrong'});
 return {slots,values,count:index,filled:values.filter(Boolean).length,correct:slots.filter(p=>p.status==='correct').length,wrong:slots.filter(p=>p.status==='wrong').length,answer:slots.map(p=>p.literal??(p.value||'_')).join('')};
}
function bind(form,{word,draft=[],onDraft,onSubmit}){
 let values=model(word,draft).values,assisted=false;
 const inputs=Array.from(form.querySelectorAll('[data-letter]')),status=form.querySelector('[data-spelling-status]');
 const focus=i=>{const input=inputs[Math.max(0,Math.min(inputs.length-1,i))];if(input){input.focus({preventScroll:true});input.select()}};
 function paint(save=false){
  const m=model(word,values);
  for(const slot of m.slots.filter(p=>p.index!==undefined)){
   const input=inputs[slot.index],wrap=input.closest('.letter-slot');
   input.value=slot.value;wrap.dataset.status=slot.status;
   input.setAttribute('aria-label','第 '+(slot.index+1)+' 个字母'+(slot.status==='correct'?'，正确':slot.status==='wrong'?'，请修改':''));
   input.setAttribute('aria-invalid',String(slot.status==='wrong'));
   wrap.querySelector('.letter-mark').textContent=slot.status==='correct'?'✓':slot.status==='wrong'?'×':'';
  }
  status.textContent=m.filled?'已填 '+m.filled+' / '+m.count+' 个字母 · '+m.correct+' 个正确'+(m.wrong?' · '+m.wrong+' 个待修改':''):'共 '+m.count+' 个字母，输入后逐个核对';
  if(m.wrong)assisted=true;
  if(save)onDraft([...values],assisted);
  return m;
 }
 function insert(index,text){
  const incoming=letters(text);if(!incoming.length){paint();return}
  for(let i=0;i<incoming.length&&index+i<inputs.length;i++)values[index+i]=incoming[i];
  paint(true);focus(Math.min(inputs.length-1,index+incoming.length));
 }
 inputs.forEach((input,index)=>{
  input.addEventListener('focus',()=>input.select());
  input.addEventListener('input',event=>{if(event.isComposing)return;if(!input.value){values[index]='';paint(true)}else insert(index,input.value)});
  input.addEventListener('compositionend',()=>insert(index,input.value));
  input.addEventListener('paste',event=>{const text=event.clipboardData?.getData('text');if(text!==undefined){event.preventDefault();insert(index,text)}});
  input.addEventListener('keydown',event=>{
   if(event.isComposing)return;
   if(event.key==='Backspace'){event.preventDefault();if(values[index]){values[index]='';paint(true)}else if(index>0){values[index-1]='';paint(true);focus(index-1)}}
   else if(event.key==='Delete'){event.preventDefault();values[index]='';paint(true)}
   else if(event.key==='ArrowLeft'){event.preventDefault();focus(index-1)}
   else if(event.key==='ArrowRight'){event.preventDefault();focus(index+1)}
   else if(event.key==='Home'){event.preventDefault();focus(0)}
   else if(event.key==='End'){event.preventDefault();focus(inputs.length-1)}
   else if(event.key===' '){event.preventDefault()}
  });
 });
 form.addEventListener('submit',event=>{event.preventDefault();onSubmit(paint().answer,assisted)});
 paint();focus(values.findIndex(v=>!v)<0?inputs.length-1:values.findIndex(v=>!v));
 return {focus,model:()=>model(word,values)};
}
const api={letters,answerDraft,model,bind};if(typeof module!=='undefined')module.exports=api;root.CijianSpelling=api;
})(typeof window!=='undefined'?window:globalThis);
