(function(root){
'use strict';
function create(options){
 const {document,window,main,escape:esc,pageTop,speechButton,masteryBadge,getBooks,bindEdits}=options;
 let query='',direction='auto',scope='all',limit=20,timer,engine,promise,request=0,field;
 const bookEngine=CijianDictionary.create([]),meta=window.CIJIAN_LEXICON_META||{};
 const $=selector=>document.querySelector(selector);
 const current=()=>$('#dictionaryQuery')===field;
 function mark(text){text=String(text??'');const q=query.trim(),i=q?text.toLowerCase().indexOf(q.toLowerCase()):-1;return i<0?esc(text):esc(text.slice(0,i))+'<mark>'+esc(text.slice(i,i+q.length))+'</mark>'+esc(text.slice(i+q.length))}
 function load(){
  if(engine)return Promise.resolve(engine);if(promise)return promise;
  promise=new Promise((resolve,reject)=>{
   if(window.CIJIAN_LEXICON){try{engine=CijianDictionary.create(window.CIJIAN_LEXICON.rows);resolve(engine)}catch(e){reject(e)}return}
   const script=document.createElement('script');script.src='lexicon-data.js?v=web1';script.async=true;
   const timeout=window.setTimeout(()=>finish(Error('timeout')),15000);let done=false;
   function finish(error){if(done)return;done=true;window.clearTimeout(timeout);script.onload=script.onerror=null;if(error){script.remove();reject(error);return}try{if(!Array.isArray(window.CIJIAN_LEXICON?.rows))throw Error('data');engine=CijianDictionary.create(window.CIJIAN_LEXICON.rows);resolve(engine)}catch(e){reject(e)}}
   script.onload=()=>finish();script.onerror=()=>finish(Error('load'));document.head.appendChild(script);
  }).catch(error=>{promise=null;throw error});return promise;
 }
 const online=()=>`<a class="soft-link" href="https://www.youdao.com/result?word=${encodeURIComponent(query.trim())}&lang=en" target="_blank" rel="noopener noreferrer">打开在线词典 ↗</a>`;
 function initial(){
  $('#dictionaryResults').innerHTML=`<div class="dictionary-welcome"><span class="dictionary-leaf" aria-hidden="true">Aa</span><h2>从一个词开始。</h2><p>英文查词义，中文找表达。也支持词组和常见词形。</p><div class="dictionary-examples">${['banana','加强','give up'].map(q=>`<button type="button" data-dictionary-example="${esc(q)}">${esc(q)} <span>↗</span></button>`).join('')}</div><p class="dictionary-quiet">查词不会改变学习进度，也不会增加掌握度。</p></div>`;
  $('#dictionaryStatus').textContent='输入英文或中文，按 Enter 或点“查询”。';bindExamples();
 }
 function bindExamples(){document.querySelectorAll('[data-dictionary-example]').forEach(b=>b.onclick=()=>{query=b.dataset.dictionaryExample;field.value=query;limit=20;search()})}
 function meanings(ss){return `<ol class="dictionary-meanings">${ss.map(s=>`<li>${s.pos?`<span class="dictionary-pos">${esc(s.pos)}</span>`:''}<span>${mark(s.text)}</span></li>`).join('')}</ol>`}
 function show(result){
  $('#dictionaryStatus').textContent=(result.direction==='zh'?'中译英':'英译中')+' · 找到 '+result.total.toLocaleString()+' 个词条'+(result.total>result.items.length?'，先显示 '+result.items.length+' 个':'');
  if(!result.total){
   $('#dictionaryResults').innerHTML=`<div class="dictionary-empty"><h2>暂未找到“${esc(query.trim())}”</h2><p>${scope==='books'?'这个词没有收录在你的词书里，可以切换到“全部查词”。':'试试其他拼写、原形或更短的中文关键词。'}</p>${result.suggestions.length?`<div class="dictionary-suggestions"><span>你可能想查</span>${result.suggestions.map(q=>`<button type="button" data-dictionary-example="${esc(q)}">${esc(q)}</button>`).join('')}</div>`:''}${scope==='books'?'<button type="button" class="primary" id="searchAllDictionary">在全部词典中查找 →</button>':online()}</div>`;
   bindExamples();if($('#searchAllDictionary'))$('#searchAllDictionary').onclick=()=>{scope='all';render()};return;
  }
  $('#dictionaryResults').innerHTML=`<div class="dictionary-list">${result.items.map(item=>`<article class="dictionary-result"><div class="dictionary-result-top"><div><div class="dictionary-entry-label"><span class="badge neutral">${item.book?'我的词书':'通用词典'}</span><span>${esc(item.match)}</span></div><h2>${mark(item.word)}</h2>${item.phonetic?`<p class="dictionary-phonetic">/${esc(item.phonetic.replace(/^\/+|\/+$/g,''))}/</p>`:''}</div><div class="dictionary-word-tools">${speechButton(item.word)}${item.book?masteryBadge(item.book.id):''}</div></div>${meanings(item.senses)}${item.matchedSenses.length?`<div class="dictionary-match-note"><span>匹配到的通用词典释义</span>${meanings(item.matchedSenses)}</div>`:''}${item.book&&item.dictionarySenses.length?`<details class="dictionary-extra"><summary>查看通用词典释义</summary>${meanings(item.dictionarySenses)}</details>`:''}${item.book?`<div class="dictionary-book-links"><div>${item.books.map(b=>`<a href="${esc(b.href)}">${esc(b.label)} ↗</a>`).join('')}</div><button type="button" class="small ghost" data-edit="${esc(item.book.id)}">校对词义</button></div>`:''}</article>`).join('')}</div><div class="dictionary-bottom">${result.total>result.items.length&&limit<200?'<button type="button" id="moreDictionary">显示更多结果</button>':''}<span>词义因语境而异，请结合上下文选择。</span>${online()}</div>`;
  if($('#moreDictionary'))$('#moreDictionary').onclick=()=>{limit+=20;search()};bindEdits();
 }
 async function search(){
  const token=++request;if(!current())return;query=field.value.trim();
  if(!query){initial();return}if(query.length>80){$('#dictionaryStatus').textContent='请使用 80 字以内的单词、词组或中文关键词。';return}
  const q=query,dir=direction,selectedScope=scope;
  $('#dictionaryStatus').textContent=selectedScope==='books'?'正在查找词书…':'正在查询离线词典…';
  try{const dictionary=selectedScope==='books'?(engine||bookEngine):await load();if(!current()||token!==request)return;show(dictionary.search(q,{direction:dir,scope:selectedScope,limit,books:getBooks()}))}
  catch(error){if(!current()||token!==request)return;$('#dictionaryStatus').textContent='通用词典暂未加载成功。';$('#dictionaryResults').innerHTML=`<div class="dictionary-empty"><h2>请重试加载离线词典</h2><p>你的学习数据不受影响，词书查词仍可使用。</p><div class="actions"><button type="button" id="retryDictionary" class="primary">重新加载</button><button type="button" id="booksOnlyDictionary">先查我的词书</button></div></div>`;$('#retryDictionary').onclick=search;$('#booksOnlyDictionary').onclick=()=>{scope='books';render()}}
 }
 function render(){
  request++;window.clearTimeout(timer);
  main().innerHTML=pageTop('学习空间 / 双向查词','词书 + 常用词')+`<div class="page-heading dictionary-heading"><div><span class="kicker">词义与表达，随手查一查</span><h1>查词</h1><p>输入英文查中文，输入中文找英文。单词和词组都可以。</p></div><span class="dictionary-offline"><span class="online-dot"></span>本机查询</span></div><section class="dictionary-search-panel" aria-label="双向查词"><form id="dictionaryForm"><label for="dictionaryQuery" class="sr-only">输入英文或中文查词</label><div class="dictionary-search-bar"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg><input id="dictionaryQuery" value="${esc(query)}" placeholder="输入单词、词组或中文意思…" maxlength="80" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"><button type="button" id="clearDictionary" aria-label="清空查词内容" ${query?'':'hidden'}>×</button><button type="submit" class="primary">查询 <span>→</span></button></div></form><div class="dictionary-controls"><div class="dictionary-directions" role="group" aria-label="查词方向">${[['auto','自动识别'],['en','英译中'],['zh','中译英']].map(([value,label])=>`<button type="button" data-dictionary-direction="${value}" aria-pressed="${direction===value}" class="${direction===value?'selected':''}">${label}</button>`).join('')}</div><label class="dictionary-scope">范围<select id="dictionaryScope" aria-label="查词范围"><option value="all" ${scope==='all'?'selected':''}>全部查词</option><option value="books" ${scope==='books'?'selected':''}>我的词书</option></select></label></div></section><p id="dictionaryStatus" class="dictionary-status" role="status" aria-live="polite"></p><div id="dictionaryResults"></div><footer class="dictionary-source">书内词义包含你的校对和补充；通用词典采用 <a href="https://github.com/skywind3000/ECDICT" target="_blank" rel="noopener noreferrer">ECDICT</a> 常用词数据${meta.count?'（'+meta.count.toLocaleString()+' 条）':''}。<a href="licenses/ECDICT-LICENSE.txt" target="_blank" rel="noopener">MIT 许可</a> · 查词不会把通用词典加入学习任务。</footer>`;
  field=$('#dictionaryQuery');let composing=false;
  $('#dictionaryForm').onsubmit=e=>{e.preventDefault();if(composing||e.isComposing)return;window.clearTimeout(timer);limit=20;search()};
  field.oncompositionstart=()=>{composing=true;window.clearTimeout(timer)};field.oncompositionend=()=>{composing=false;changed()};
  function changed(){query=field.value;$('#clearDictionary').hidden=!query;window.clearTimeout(timer);request++;if(!composing)timer=window.setTimeout(()=>{limit=20;search()},220)}
  field.oninput=changed;$('#clearDictionary').onclick=()=>{query='';field.value='';request++;window.clearTimeout(timer);$('#clearDictionary').hidden=true;initial();field.focus()};
  document.querySelectorAll('[data-dictionary-direction]').forEach(b=>b.onclick=()=>{direction=b.dataset.dictionaryDirection;limit=20;render()});
  $('#dictionaryScope').onchange=e=>{scope=e.target.value;limit=20;render()};
  if(query)search();else initial();
 }
 return {render};
}
const api={create};if(typeof module!=='undefined')module.exports=api;root.CijianDictionaryPage=api;
})(typeof window!=='undefined'?window:globalThis);
