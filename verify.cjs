const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname,dist=path.join(root,'docs');
const E=require('./docs/engine.js'),B=require('./docs/book-catalog.js');
const data={window:{}};vm.createContext(data);
for(const name of ['vocabulary.js','exam-books.js','xiaoyan-cet6.js','books.js'])vm.runInContext(fs.readFileSync(path.join(dist,name),'utf8'),data);
const C=B.create(data.window.CIJIAN_BOOKS);assert.equal(C.books.length,3);
assert.equal(C.bookById.get('ielts-3800').wordIds.length,3800);assert.equal(C.bookById.get('cet6').wordIds.length,1768);assert.equal(C.bookById.get('postgraduate').wordIds.length,4801);
assert.equal(C.bookById.get('cet6').units.length,10);assert.equal(C.bookById.get('postgraduate').units.length,49);
const bookData=data.window.CIJIAN_XIAOYAN_CET6;
assert.equal(bookData.words.length,1769);
const boundaries=[['aggressive','terrify'],['terrified','descent'],['descendant','enterprise'],['entrepreneur','contention'],['intend','occur'],['incur','statue'],['stuff','hoist'],['valid','initiative'],['initial','dispute'],['debate','Arctic']];
for(let n=1;n<=10;n++){const rows=bookData.words.filter(w=>w.unit===n);assert.deepEqual([rows[0].word,rows.at(-1).word],boundaries[n-1]);for(const w of rows){assert(w.senses.length);assert(w.senses.every(s=>/[\u4e00-\u9fff]/.test(s.text)));assert.equal(w.bookPage,w.page-2)}}
for(const [canonical,alias] of [['authorize','authorise'],['labour','labor'],['honour','honor'],['enroll','enrol']]){const w=bookData.words.find(w=>w.word===canonical);assert(w);assert(E.judge(w,'en',alias))}
assert(bookData.words.some(w=>w.word==='inadequate'));assert(bookData.words.some(w=>w.word==='lay-off'));assert(bookData.words.some(w=>w.word==='diet'));
const represent=bookData.words.find(w=>w.word==='represent');assert(represent.review);assert(represent.senses.every(s=>s.pos!=='adj.'));
assert.equal(new Set(C.words.map(w=>(w.type||'word')+'|'+B.normalize(w.word))).size,C.words.length);
for(const book of C.books){for(const unit of book.units){assert(unit.wordIds.length>0);assert.equal(unit.bookId,book.id);if(book.id==='postgraduate')assert(unit.wordIds.length<=100)}for(const id of book.wordIds)assert(C.byId.has(id))}
const overlap=C.bookById.get('cet6').wordIds.find(id=>C.bookById.get('postgraduate').entries.has(id)&&C.bookById.get('ielts-3800').entries.has(id));assert(overlap);
const storageA=new Map(),storageB=new Map();
const source=fs.readFileSync(path.join(dist,'app.js'),'utf8');
function create(storage){
 const els=new Map();const el=k=>{if(!els.has(k))els.set(k,{innerHTML:'',textContent:'',value:'',classList:{add(){},remove(){},toggle(){}},focus(){},append(){}});return els.get(k)};
 const listeners={};const context={window:{...data.window,setTimeout(){},clearTimeout(){},scrollTo(){},addEventListener(name,fn){listeners[name]=fn}},document:{querySelector:el,querySelectorAll:()=>[],addEventListener(){},createElement:()=>el('created')},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},location:{hash:'#library'},setTimeout(){},clearTimeout(){},VocabEngine:E,CijianBooks:B,CijianSpelling:require('./docs/spelling.js'),CijianOptionHints:{destroy(){},bind(){}},CijianSpeech:require('./docs/pronunciation.js'),fetch(){throw Error('Website must not call progress endpoint')},console};vm.createContext(context);vm.runInContext(source,context);return {context,els,el,run:code=>vm.runInContext(code,context),listeners};
}
const a=create(storageA),b=create(storageB);assert.equal(a.run('Object.keys(state.records).length'),0);assert.equal(a.run('Object.keys(state.sessions).length'),0);assert.equal(b.run('Object.keys(state.records).length'),0);
assert(a.el('#main').innerHTML.includes('晓艳带你学英语'));assert(a.el('#main').innerHTML.includes('考研词汇'));assert(a.el('#main').innerHTML.includes('雅思标准词汇'));
const ielts=a.el('#main').innerHTML.indexOf('<h2><a href="#book/ielts-3800">'),cet=a.el('#main').innerHTML.indexOf('<h2><a href="#book/cet6">'),ky=a.el('#main').innerHTML.indexOf('<h2><a href="#book/postgraduate">');assert(cet<ky&&ky<ielts);
a.context.location.hash='#book/cet6';a.run('render()');assert(a.el('#main').innerHTML.includes('按原书 Unit 分组'));assert(!a.el('#main').innerHTML.includes('按原书 Day 归档'));assert.equal(a.run('wordsIn(bookUnits()[0].id).length'),179);
a.context.location.hash='#book/postgraduate';a.run('render()');assert(a.el('#main').innerHTML.includes('考研词汇'));assert.equal(a.run('wordsIn(bookUnits()[0].id).length'),100);
a.context.location.hash='#unit/1';a.run('render()');assert.equal(a.run('currentBook().id'),'ielts-3800');assert(a.el('#main').innerHTML.includes('可选加练'));assert(a.el('#main').innerHTML.includes('不计入单元完成度'));
a.context.testID=overlap;a.run('E.record(state,testID).practice.en=1;E.record(state,testID).practice.zh=1;save()');assert.equal(storageA.size,1);assert(storageA.has('cijian-web-v1'));assert(!storageA.has('cijian-v1'));assert.equal(b.run('Object.keys(state.records).length'),0,'Another browser stays blank');
a.run('selectBook("cet6")');assert.equal(a.run('rec(testID).practice.zh'),1);assert.equal(a.run('Books.stats(currentBook(),state.records).completed'),1);a.run('selectBook("postgraduate")');assert.equal(a.run('Books.stats(currentBook(),state.records).completed'),1);
const reloaded=create(storageA);assert.equal(reloaded.run('Object.keys(state.records).length'),1);assert.equal(reloaded.run('Object.values(state.records)[0].practice.en'),1,'Refresh keeps own progress');
const backup=a.run('JSON.stringify(state)');b.context.backup=JSON.parse(backup);b.run('state=validate(backup);save()');assert.equal(b.run('Object.keys(state.records).length'),1,'Manual backup format compatible');
assert(source.includes('仅保存在当前浏览器'));assert(!source.includes('/api/state'));assert(!source.includes('fetch('));
for(const book of C.books){for(const word of [...book.entries.values()].slice(0,4)){const session=E.createSession([word.id],'practice','mixed',word.unit,{}),state={records:{},edits:{},sessions:{}};while(!session.done){const task=session.queue[0];E.submit(session,word,task.dir==='en'?word.word:word.senses[0].text);E.next(session,state)}assert(state.records[word.id].practice.en&&state.records[word.id].practice.zh)}}
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');for(const match of html.matchAll(/(?:src|href)="([^"#?]+)(?:\?[^"#]*)?"/g)){if(/^https?:/.test(match[1]))continue;assert(fs.existsSync(path.join(dist,match[1])),match[1])}
assert(!fs.existsSync(path.join(dist,'sources')));
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(p,entry.name)):[path.join(p,entry.name)]);
for(const file of walk(dist)){assert(!/progress(?:\.previous)?\.json|\.pdf$|\.sqlite$|backup/i.test(path.basename(file)),file);if(/\.(?:js|html|json|css|webmanifest)$/.test(file)){const text=fs.readFileSync(file,'utf8');assert(!text.includes('/Users/'));assert(!text.includes('shaoyidianxinshi'));}}
console.log(JSON.stringify({ok:true,books:C.books.map(b=>({id:b.id,words:b.wordIds.length,units:b.units.length})),uniqueEntries:C.words.length,privacy:'No desktop records or scan pages, browser-only isolated storage',tested:'Three books, real cross-book deduplication, study sessions, optional spelling, browser reload/isolation, backup validation, asset references'}));
