(function(root){
'use strict';
const normalize=text=>String(text||'').normalize('NFKC').toLowerCase().trim().replace(/[’‘]/g,"'").replace(/\s+/g,' ');
function create(packs){
 const books=[],units=[],words=[],byId=new Map(),unitById=new Map(),bookById=new Map(),wordKey=new Map();
 for(const [packIndex,pack] of packs.entries()){
  if(!pack||!/[a-z0-9]/.test(pack.id||'')||!/^[a-z0-9][a-z0-9-]{0,63}$/.test(pack.id)||bookById.has(pack.id)||!pack.title?.trim()||!Array.isArray(pack.data?.units)||!Array.isArray(pack.data?.words))throw Error('词书资料不完整或编号重复');
  if(pack.preserveIds&&packIndex!==0)throw Error('仅原有词书可以保留旧编号');
  const previousWords=new Set(byId.keys()),book={...pack,units:[],wordIds:[],entries:new Map()},localUnits=new Map();delete book.data;
  for(const [index,source] of pack.data.units.entries()){
   if(source.id==null||String(source.id)===''||localUnits.has(String(source.id)))throw Error('词书中的单元编号重复');
   const id=pack.preserveIds?source.id:pack.id+'--u-'+encodeURIComponent(String(source.id)),u={...source,id,bookId:pack.id,wordIds:[]};
   if(unitById.has(String(id)))throw Error('单元编号重复');localUnits.set(String(source.id),u);unitById.set(String(id),u);units.push(u);book.units.push(u);
  }
  for(const [index,entry] of pack.data.words.entries()){
   const u=localUnits.get(String(entry.unit));
   if(entry.id==null||String(entry.id)===''||!u||!entry.word?.trim()||!Array.isArray(entry.senses)||!entry.senses.length||entry.senses.some(s=>!s.text?.trim()))throw Error('词书中存在缺少单元或释义的词条');
   const type=entry.type||u.type||'word',key=type+'|'+normalize(entry.word);
   let id=wordKey.get(key);
   if(!id){id=pack.preserveIds?entry.id:pack.id+'--w-'+encodeURIComponent(String(entry.id));if(typeof id!=='string'||!id||byId.has(id))throw Error('词条编号重复');wordKey.set(key,id)}
   const resolved={...entry,id,type,unit:u.id,bookId:pack.id,sourceBase:pack.sourcesBase||('books/'+pack.id+'/sources')};
   if(!byId.has(id)){words.push(resolved);byId.set(id,resolved)}
   if(!u.wordIds.includes(id))u.wordIds.push(id);
   if(!book.entries.has(id)){book.wordIds.push(id);book.entries.set(id,resolved)}
  }
  if(!book.wordIds.length)throw Error('词书没有可学习的词条');
  book.wordCount=book.wordIds.filter(id=>byId.get(id).type!=='phrase').length;book.phraseCount=book.wordIds.length-book.wordCount;
  book.newCount=book.wordIds.filter(id=>!previousWords.has(id)).length;book.sharedCount=book.wordIds.length-book.newCount;
  bookById.set(book.id,book);books.push(book);
 }
 return {books,units,words,byId,unitById,bookById};
}
function stats(book,records){
 let learned=0,completed=0;
 for(const id of book.wordIds){const r=records[id];if(r?.mastery?.level||r?.lastStudied||Object.values(r?.practice||{}).some(Boolean)||Object.values(r?.errors||{}).some(Boolean))learned++;if(r?.practice?.en&&r?.practice?.zh)completed++}
 return {total:book.wordIds.length,learned,completed,percentage:Math.round(completed/Math.max(1,book.wordIds.length)*100)};
}
const api={create,stats,normalize};if(typeof module!=='undefined')module.exports=api;root.CijianBooks=api;
})(typeof window!=='undefined'?window:globalThis);
