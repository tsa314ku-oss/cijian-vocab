(function(root){
'use strict';
const normalize=value=>String(value??'').normalize('NFKC').toLowerCase().trim().replace(/[’‘]/g,"'").replace(/\s+/g,' ');
const chinese=value=>/[\u3400-\u9fff\uf900-\ufaff]/.test(value);
function senses(text){return String(text||'').split(/\r?\n/).map(line=>{const match=line.trim().match(/^((?:[a-z]+\.?\s*){1,3})\s+(.+)$/i);return {pos:match?match[1].trim():'',text:match?match[2].trim():line.trim()}}).filter(s=>s.text)}
const zhKey=value=>{let key=normalize(value).replace(/[（(][^()（）]*[)）]/g,'').trim();return key.length>2&&key.endsWith('的')?key.slice(0,-1):key};
const clauses=text=>normalize(text).split(/[\n,，;；、]/).map(s=>s.replace(/^\[[^\]]*\]\s*/,'').trim()).filter(Boolean);
function zhScore(entry,q){
 q=zhKey(q);if(!q)return Infinity;let best=Infinity;
 for(const [i,part] of entry.parts.entries()){const key=zhKey(part),extra=Math.min(i,9)*0.1+(part===key?0:0.5);if(key===q)best=Math.min(best,extra);else if(key.startsWith(q))best=Math.min(best,10+extra);else if(key.includes(q))best=Math.min(best,24+extra)}
 return best;
}
function distance(a,b,max){
 if(Math.abs(a.length-b.length)>max)return max+1;
 let prev=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){const row=[i];let min=i;for(let j=1;j<=b.length;j++){row[j]=Math.min(row[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));min=Math.min(min,row[j])}if(min>max)return max+1;prev=row}
 return prev[b.length];
}
function make(row){const [word,phonetic,translation,exchange,rank]=row,ss=senses(translation);return {word,phonetic,senses:ss,key:normalize(word),rank:rank||1000000,parts:ss.flatMap(s=>clauses(s.text)),forms:String(exchange||'').split('/').flatMap(part=>{const i=part.indexOf(':');return i>=0?part.slice(i+1).split(',').map(normalize).filter(Boolean):[]})}}
function create(rows){
 const entries=rows.map(make),byKey=new Map(entries.map(e=>[e.key,e]));
 function search(query,{direction='auto',scope='all',books=[],limit=20}={}){
  const q=normalize(query);direction=direction==='auto'?(chinese(q)?'zh':'en'):direction;
  if(!q||q.length>80)return {direction,items:[],total:0,suggestions:[]};
  const sources=new Map();
  if(scope!=='books')for(const e of entries)sources.set(e.key,e);
  for(const book of books){
   const key=normalize(book.word),dictionary=byKey.get(key),previous=sources.get(key),ss=book.senses||[];
   const merged={...(previous||dictionary||{}),word:book.word,key,senses:ss,book,books:book.books||[],dictionarySenses:dictionary?.senses||[],phonetic:dictionary?.phonetic||'',rank:dictionary?.rank||1000000};
   merged.parts=[...ss.flatMap(s=>clauses(s.text)),...ss.flatMap(s=>(s.aliases||[]).flatMap(clauses)),...(book.acceptedZh||[]).flatMap(clauses),...(dictionary?.parts||[])];
   merged.forms=dictionary?.forms||[];sources.set(key,merged);
  }
  const results=[];let exact=false;
  for(const e of sources.values()){
   let score=Infinity,match='';
   if(direction==='zh'){score=zhScore(e,q);match=score<10?'词义匹配':'相关词义'}
   else if(e.key===q){score=0;match='精确匹配';exact=true}
   else if(e.forms.includes(q)){score=4;match='词形匹配'}
   else if(e.key.startsWith(q)){score=12;match='前缀匹配'}
   else if(e.key.includes(q)){score=28;match='包含此词'}
   if(Number.isFinite(score))results.push({...e,score,match,matchedSenses:direction==='zh'&&e.book&&!Number.isFinite(zhScore({parts:e.senses.flatMap(s=>clauses(s.text))},q))?(e.dictionarySenses||[]).filter(s=>Number.isFinite(zhScore({parts:clauses(s.text)},q))):[]});
  }
  results.sort((a,b)=>(a.score+(direction==='zh'?Math.log10(a.rank+10)*0.5:0))-(b.score+(direction==='zh'?Math.log10(b.rank+10)*0.5:0))||Number(!!b.book)-Number(!!a.book)||a.rank-b.rank||a.word.localeCompare(b.word,'en'));
  let suggestions=[];
  if(direction==='en'&&!exact&&results.length===0&&/^[a-z'-]{3,24}$/.test(q)){
   const max=q.length<=5?1:2;
   suggestions=[...sources.values()].filter(e=>Math.abs(e.key.length-q.length)<=max&&/^[a-z'-]+$/.test(e.key)).map(e=>({word:e.word,rank:e.rank,d:distance(q,e.key,max)})).filter(e=>e.d<=max).sort((a,b)=>a.d-b.d||a.rank-b.rank).slice(0,5).map(e=>e.word);
  }
  return {direction,items:results.slice(0,Math.max(1,Math.min(200,limit))),total:results.length,suggestions};
 }
 return {search,count:entries.length};
}
const api={create,normalize,senses};if(typeof module!=='undefined')module.exports=api;root.CijianDictionary=api;
})(typeof window!=='undefined'?window:globalThis);
