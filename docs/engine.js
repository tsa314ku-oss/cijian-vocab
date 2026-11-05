(function(root){
'use strict';
const normEn=s=>String(s||'').normalize('NFKC').toLowerCase().trim().replace(/[’‘]/g,"'").replace(/\s+/g,' ');
const normZh=s=>String(s||'').normalize('NFKC').replace(/(?:vt|vi|adj|adv|prep|pron|conj|aux|num|art|n|v)\./gi,'').replace(/[\s，,。.;；、：:！!？?（）()【】\[\]…·]/g,'').trim();
// Keep the whole expression: fuzzy substrings can silently accept opposite meanings.
function splitMeanings(value){
 const parts=[];let part='',depth=0;
 for(const ch of String(value||'').normalize('NFKC')){
  if(ch==='('||ch==='[')depth++;
  if(ch===')'||ch===']')depth=Math.max(0,depth-1);
  if(depth===0&&/[;，,、/\n]/.test(ch)){if(part.trim())parts.push(part.trim());part=''}else part+=ch;
 }
 if(part.trim())parts.push(part.trim());return parts;
}
function optionalForms(value){
 let forms=[String(value||'').normalize('NFKC')];
 for(let i=0;i<8;i++){
  let changed=false;const next=[];
  for(const form of forms){const m=form.match(/\(([^()]*)\)|\[([^\[\]]*)\]/);if(!m){next.push(form);continue}changed=true;const before=form.slice(0,m.index),after=form.slice(m.index+m[0].length);next.push(before+after,before+(m[1]??m[2])+after)}
  forms=[...new Set(next)].slice(0,64);if(!changed)break;
 }
 return forms;
}
const lexicalEndings=new Set(['目的地','所在地','根据地','殖民地','发源地','栖息地','居住地','出发地','落脚地','出生地','原产地','分布地','生产地','工作地','常住地','旅游地','目的']);
function meaningKey(value){let text=normZh(value);if(text.length>2&&!lexicalEndings.has(text)&&/[的地得]$/.test(text))text=text.slice(0,-1);return text}
const synonymGroups=[
 ['增强','加强','强化'],['撒播','播撒','散播'],['最终','最后','终究'],
 ['毫无疑问','毋庸置疑','无疑'],['准确','精确'],['迅速','快速'],
 ['立刻','立即','马上'],['缓解','减轻','缓和'],['充足','充裕','充沛'],
 ['总共','合计'],['频繁','经常'],['偶尔','有时'],['永久','永远'],
 ['暂时','临时'],['损害','损伤'],['恢复健康','康复']
];
const synonymKeys=new Map();for(const group of synonymGroups){const keys=group.map(meaningKey);for(const key of keys)synonymKeys.set(key,keys[0])}
function canonicalZh(value){const key=meaningKey(value);return synonymKeys.get(key)||key}
const wordZhAliases={legitimacy:['合法性','正统性','合理性']};
function variants(w){return [...new Set([...(wordZhAliases[normEn(w.word)]||[]),...(w.senses||[]).flatMap(s=>[s.text,...(s.aliases||[])]),...(w.acceptedZh||[])].flatMap(splitMeanings).flatMap(optionalForms).map(normZh).filter(Boolean))]}
function judge(w,dir,answer){
 if(!String(answer||'').trim())return false;
 if(dir==='spell')return normEn(w.word)===normEn(answer);
 if(dir==='en')return [w.word,...(w.aliases||[])].some(x=>normEn(x)===normEn(answer));
 const expected=new Set(variants(w).map(canonicalZh));
 return splitMeanings(answer).map(canonicalZh).some(key=>key&&expected.has(key));
}
function withRememberedMeanings(w){
 const senses=[...(w.senses||[])];
 for(const text of w.acceptedZh||[]){if(!senses.some(s=>normZh(s.text)===normZh(text)))senses.push({pos:'',text,addedByUser:true})}
 return {...w,senses,acceptedZh:[]};
}
function rememberZh(state,w,answer,session){
 const text=String(answer||'').trim();if(!text||text.length>120)return false;
 const previous=state.edits[w.id]||{},expanded=withRememberedMeanings({...w,...previous}),senses=[...expanded.senses];
 if(!senses.some(s=>normZh(s.text)===normZh(text)))senses.push({pos:'',text,addedByUser:true});
 state.edits[w.id]={...previous,word:w.word,senses,acceptedZh:[]};if(session?.pending&&session.answerBefore)session.pending.editAfter=JSON.stringify(state.edits[w.id]);return true;
}
function shuffle(a,rng=Math.random){a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function record(state,id){return state.records[id]||=( {errors:{en:0,zh:0},active:false,practice:{en:0,zh:0},examPass:{en:false,zh:false}})}
const directions=['en','zh','spell'];
function errorTotal(r){return directions.reduce((sum,dir)=>sum+(r?.errors?.[dir]||0),0)}
// One level belongs to a word, shared by every learning context and direction.
// Old progress is projected without changing it; a committed answer saves the new field.
function masteryInfo(r){
 if(r?.mastery)return {...r.mastery,legacy:false};
 const passes=(r?.practice?.en||0)+(r?.practice?.zh||0)+(r?.practice?.spell||0)+Number(!!r?.examPass?.en)+Number(!!r?.examPass?.zh),errors=errorTotal(r);
 const learned=!!(passes||errors||r?.lastStudied||r?.memory?.en||r?.memory?.zh);
 return {level:learned?Math.max(1,Math.min(5,Math.floor(1+passes-Math.min(4,errors)))):0,updatedAt:r?.lastStudied||r?.lastError||0,legacy:learned};
}
function previewMastery(r,correct,confidence=''){
 const old=masteryInfo(r).level;
 return !old?1:correct?(confidence==='guess'?old:Math.min(5,old+1)):Math.max(1,old-1);
}
function updateMastery(r,correct,confidence,now){r.mastery={level:previewMastery(r,correct,confidence),updatedAt:now,lastResult:correct?(confidence==='guess'?'guess':'correct'):'wrong'}}
function rankMastery(words,records){return words.filter(w=>masteryInfo(records[w.id]).level>0).sort((a,b)=>masteryInfo(records[a.id]).level-masteryInfo(records[b.id]).level||errorTotal(records[b.id])-errorTotal(records[a.id])||(records[a.id]?.lastStudied||0)-(records[b.id]?.lastStudied||0)||a.id.localeCompare(b.id))}
function createMasterySession(words,records,direction='mixed',limit=10,rng=Math.random){
 const selected=rankMastery(words,records).slice(0,Math.max(1,Math.min(20,limit))),s=createSession(selected.map(w=>w.id),'practice',direction,'掌握度测试',records,rng);
 s.masteryReview=true;s.masteryTest=true;s.masteryPlan={};
 for(const task of s.queue){const level=masteryInfo(records[task.id]).level;s.masteryPlan[task.id]=level;task.remaining=level===1?3:level===2?2:1}
 s.totalTasks=s.queue.length;s.initialRounds=s.queue.reduce((n,t)=>n+t.remaining,0);return s;
}
function createSession(ids,kind,direction,unit,records={},rng=Math.random){const tasks=[];for(const id of ids){for(const dir of direction==='mixed'?['en','zh']:[direction]){if(kind==='exam'&&records[id]?.examPass?.[dir])continue;tasks.push({id,dir,remaining:1,streak:0})}}return {id:Date.now()+'-'+Math.random().toString(36).slice(2,8),kind,direction,unit,ids:[...ids],queue:shuffle(tasks,rng),pending:null,attempts:0,correct:0,report:[],started:Date.now(),done:!tasks.length,completed:[],lastId:null}}
function submit(s,w,answer,state){if(s.done||s.pending)return;if(state)s.answerBefore=answerSnapshot(s,state);const task=s.queue[0],grading=explain(w,task.dir,answer);s.pending={answer,correct:grading.correct,autoCorrect:grading.correct,manual:false,grading}}
function override(s){if(s.pending&&!s.pending.correct){s.pending.correct=true;s.pending.manual=true}}
function scheduleQueue(queue,attempts,lastId,rng=Math.random){
 const shuffled=shuffle(queue,rng);
 const eligible=shuffled.filter(t=>(t.notBefore||0)<=attempts);
 const next=eligible.find(t=>t.id!==lastId)||eligible[0]||shuffled.find(t=>t.id!==lastId)||shuffled[0];
 return next?[next,...shuffled.filter(t=>t!==next)]:[];
}
function choiceQuestion(w,task,allWords,rng=Math.random,flags={}){
 const prompts=w.senses.filter(s=>String(s.text||'').trim()).map(s=>({pos:s.pos||'',text:s.text}));
 const prompt=prompts.map(s=>s.text).join('；'),lookup=new Map(allWords.map(other=>[other.id,other]));
 const overlaps=other=>prompts.some(s=>judge(other,'zh',s.text));
 const saved=task.choice,validSaved=saved&&saved.options?.length>0&&saved.options.length<=4&&saved.options.some(o=>o.id===w.id&&o.word===w.word)&&new Set(saved.options.map(o=>normEn(o.word))).size===saved.options.length&&saved.options.every(o=>{const other=lookup.get(o.id);return other&&other.word===o.word&&(other.type||'word')===(w.type||'word')&&(o.id===w.id||flags.preserveOptions||!overlaps(other))});
 if(validSaved){
  if(saved.version===2&&saved.prompt===prompt&&JSON.stringify(saved.prompts)===JSON.stringify(prompts))return saved;
  delete task.senseIndex;task.format='choice';task.choice={version:2,prompt,prompts,options:saved.options};return task.choice;
 }
 const target=normEn(w.word),seen=new Set([target,...(w.aliases||[]).map(normEn)]),positions=new Set(prompts.map(s=>s.pos.replace(/[^a-z]/g,'')).filter(Boolean));
 const candidates=[];
 for(const other of shuffle(allWords,rng)){
  const spelling=normEn(other.word);
  if((other.type||'word')!==(w.type||'word')||other.id===w.id||seen.has(spelling)||!other.senses?.length||overlaps(other))continue;
  seen.add(spelling);
  const otherPos=other.senses.some(s=>positions.has(s.pos?.replace(/[^a-z]/g,'')||''));
  const prefix=target.slice(0,2)===spelling.slice(0,2)?2:target[0]===spelling[0]?1:0;
  const score=(String(other.unit)===String(w.unit)?5:0)+(otherPos?2:0)+prefix-Math.min(3,Math.abs(target.length-spelling.length)/4);
  candidates.push({word:other,score});
 }
 candidates.sort((a,b)=>b.score-a.score);
 const pool=candidates.slice(0,Math.max(12,Math.min(30,candidates.length)));
 const distractors=shuffle(pool,rng).slice(0,3).map(x=>({id:x.word.id,word:x.word.word}));
 delete task.senseIndex;task.format='choice';
 task.choice={version:2,prompt,prompts,options:shuffle([{id:w.id,word:w.word},...distractors],rng)};
 return task.choice;
}

function next(s,state,rng=Math.random,options={}){
 if(!s.pending)return false;
 if(s.pending.correct&&s.pending.requireConfidence&&!s.pending.manual&&!['certain','guess'].includes(s.pending.confidence))return false;
 const now=options.now??Date.now(),key=options.key??Object.entries(state.sessions||{}).find(([k,q])=>q===s)?.[0];
 const before=clone(s.answerBefore||answerSnapshot(s,state));before.session.pending=null;
 before.recordExists=Object.prototype.hasOwnProperty.call(state.records,before.id);before.record=clone(state.records[before.id]||null);
 if(s.pending.editAfter!==JSON.stringify(state.edits[before.id]||null)){before.editExists=Object.prototype.hasOwnProperty.call(state.edits,before.id);before.edit=clone(state.edits[before.id]||null)}
 delete s.answerBefore;
 const task=s.queue.shift(),p=s.pending,r=record(state,task.id),oldMemory=memoryInfo(r,task.dir,now);
 if(task.dir==='spell'){r.errors.spell??=0;r.practice.spell??=0}
 for(const dir of ['en','zh']){if(!r.memory?.[dir]){const old=memoryInfo(r,dir,now);if(old){r.memory||={};r.memory[dir]={...old,legacy:false}}}}
 updateMastery(r,p.correct,p.confidence,now);
 delete task.senseIndex;delete task.choice;delete task.revealed;delete task.meaningHintSeen;delete task.spellingDraft;delete task.spellingWord;delete task.spellingAssisted;
 s.attempts++;
 if(p.correct){
  s.correct++;
  if(['en','spell'].includes(task.dir)&&p.confidence==='guess'){task.guessed=true;s.guessed=(s.guessed||0)+1}
  if(s.kind==='exam'){
   r.examPass[task.dir]=true;
   if(r.examPass.en&&r.examPass.zh){r.active=false;s.completed.push(task.id)}
  }else{
   task.remaining--;task.streak++;
   if(task.remaining>0)s.queue.push(task);
   else{r.practice[task.dir]++;s.completed.push(task.id+':'+task.dir)}
  }
 }else{
  r.errors[task.dir]++;r.active=true;r.examPass={en:false,zh:false};r.lastError=now;
  s.report.push({id:task.id,dir:task.dir,answer:p.answer,format:p.format||'written',prompt:p.questionPrompt||'',at:now});
  if(s.kind==='exam')s.queue=s.queue.filter(t=>t.id!==task.id);
  else{task.remaining=3;task.streak=0;s.queue.push(task)}
 }
 if(s.queue.includes(task))task.notBefore=s.attempts+Math.min(3,new Set(s.queue.filter(t=>t.id!==task.id).map(t=>t.id)).size);
 if(!p.correct)updateMemory(r,task.dir,false,'',state,now,oldMemory);
 else if(!s.queue.includes(task))updateMemory(r,task.dir,true,task.guessed?'guess':p.confidence,state,now,oldMemory);
 r.lastStudied=now;s.pending=null;s.lastId=task.id;
 s.queue=scheduleQueue(s.queue,s.attempts,task.id,rng);
 s.done=!s.queue.length;if(s.done)s.ended=now;
 if(key)state.undo={...before,key,sessionId:s.id,afterRecord:JSON.stringify(state.records[before.id]||null),afterEdit:JSON.stringify(state.edits[before.id]||null)};
 return true;
}
const DAY=86400000;
const schedules={standard:[1,3,7,14,30],frequent:[1,2,4,7,14],relaxed:[1,4,10,20,40]};
function preferences(state){return {pace:'standard',reviewLimit:20,...(state.settings||{})}}
function dayKey(time){const d=new Date(time);return [d.getFullYear(),d.getMonth()+1,d.getDate()].join('-')}
function laterDay(time,days){const d=new Date(time);d.setDate(d.getDate()+days);return d.getTime()}
function memoryInfo(r,dir,now=Date.now()){
 const saved=r?.memory?.[dir];if(saved)return saved;
 if(!(r?.practice?.[dir]||r?.errors?.[dir]))return null;
 const studied=Number(r.lastStudied||r.lastError)||0;
 return {stage:r.practice[dir]?1:0,dueAt:studied?laterDay(studied,1):0,lastPassDay:r.practice[dir]&&studied?dayKey(studied):'',lapses:0,guesses:0,legacy:true};
}
function dueReviews(words,records,now=Date.now()){
 return words.flatMap(w=>directions.flatMap(dir=>{const memory=memoryInfo(records[w.id],dir,now);return memory&&memory.dueAt<=now?[{id:w.id,dir,...memory}]:[]})).sort((a,b)=>a.dueAt-b.dueAt||a.id.localeCompare(b.id)||a.dir.localeCompare(b.dir));
}
function updateMemory(r,dir,correct,confidence,state,now,prior){
 const previous=(prior===undefined?memoryInfo(r,dir,now):prior)||{stage:0,dueAt:0,lastPassDay:'',lapses:0,guesses:0};
 const m={...previous,legacy:false,lastAnsweredAt:now};
 if(!correct){m.stage=0;m.dueAt=laterDay(now,1);m.lapses=(m.lapses||0)+1;m.lastPassDay=''}
 else if(confidence==='guess'){
  m.stage=Math.min(m.stage,1);m.guesses=(m.guesses||0)+1;m.dueAt=m.dueAt>now?Math.min(m.dueAt,laterDay(now,1)):laterDay(now,1);
 }else if(!m.stage||(m.dueAt<=now&&m.lastPassDay!==dayKey(now))){
  m.stage=Math.min(5,(m.stage||0)+1);m.lastPassDay=dayKey(now);
  const intervals=schedules[preferences(state).pace]||schedules.standard;const planned=laterDay(now,intervals[m.stage-1]);m.dueAt=previous.dueAt>now?Math.min(previous.dueAt,planned):planned;
 }
 r.memory||={};r.memory[dir]=m;return m;
}
function createReviewSession(due,limit,records={},rng=Math.random,now=Date.now()){
 const ids=[...new Set(due.map(t=>t.id))].slice(0,limit);
 const s=createSession(ids,'practice','mixed','今日复习',records,rng);
 s.queue=shuffle(due.filter(t=>ids.includes(t.id)).map(t=>({id:t.id,dir:t.dir,remaining:1,streak:0})),rng);
 s.review=true;s.totalTasks=s.queue.length;s.reviewDay=dayKey(now);s.started=now;s.done=!s.queue.length;return s;
}
function clone(value){return JSON.parse(JSON.stringify(value))}
function answerSnapshot(s,state){
 const before=clone(s);delete before.answerBefore;
 const id=s.queue[0].id;
 return {session:before,id,recordExists:Object.prototype.hasOwnProperty.call(state.records,id),record:clone(state.records[id]||null),editExists:Object.prototype.hasOwnProperty.call(state.edits,id),edit:clone(state.edits[id]||null)};
}
function canUndo(state,key){
 const s=state.sessions[key];if(!s)return false;
 if(s.pending)return true;
 const u=state.undo;
 return !!(u&&u.key===key&&u.sessionId===s.id&&JSON.stringify(state.records[u.id]||null)===u.afterRecord&&JSON.stringify(state.edits[u.id]||null)===u.afterEdit);
}
function undo(state,key){
 if(!canUndo(state,key))return false;
 const s=state.sessions[key];
 if(s.pending){
  const before=s.answerBefore;
  if(!before){s.pending=null;return true}
  // Pending answers have not changed counts; keep any later work from another session.
  if(s.pending.editAfter===JSON.stringify(state.edits[before.id]||null)){
   if(before.editExists)state.edits[before.id]=clone(before.edit);else delete state.edits[before.id];
  }
  state.sessions[key]=clone(before.session);return true;
 }
 const before=state.undo;
 if(before.recordExists)state.records[before.id]=clone(before.record);else delete state.records[before.id];
 if(before.editExists)state.edits[before.id]=clone(before.edit);else delete state.edits[before.id];
 state.sessions[key]=clone(before.session);delete state.undo;return true;
}
function editDistance(a,b){const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let diagonal=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,diagonal+(a[i-1]===b[j-1]?0:1));diagonal=old}}return row[b.length]}
function explain(w,dir,answer){
 const correct=judge(w,dir,answer);
 if(dir==='spell')return {correct,reason:correct?'每个字母都拼对了。':'拼写尚未匹配，请对照下方正确单词。',needsReview:false};
 if(dir==='en')return {correct,reason:correct?'选中了对应的英文表达。':'所选英文与本题词条不同，请对照两个词的意思。',needsReview:false};
 const answers=splitMeanings(answer),expected=variants(w);
 if(correct){
  const matched=expected.find(v=>answers.some(a=>canonicalZh(a)===canonicalZh(v)));
  const remembered=(w.acceptedZh||[]).some(v=>answers.some(a=>canonicalZh(a)===canonicalZh(v)));
  return {correct:true,matched,needsReview:false,reason:remembered?'已接受你之前确认过的中文表达。':answers.some(a=>normZh(a)===matched)?'匹配到词义「'+matched+'」。':'已按同义表达、可选字或词尾差异匹配到「'+matched+'」。'};
 }
 if(!String(answer||'').trim())return {correct:false,needsReview:false,reason:'本次未填写答案。'};
 if(answers.some(a=>meaningKey(a)==='立法')&&expected.some(v=>['合法','合法性'].includes(meaningKey(v))))return {correct:false,needsReview:false,reason:'“立法”与“合法／合法性”含义不同，不能按近义表达接受。'};
 const needsReview=answers.some(a=>{const key=meaningKey(a);return key.length>=2&&!/^(不|无|非|未|没)/.test(key)&&expected.some(v=>Math.min(key.length,meaningKey(v).length)>=2&&editDistance(key,meaningKey(v))===1)});
 return {correct:false,needsReview,reason:needsReview?'你的表达与词库写法接近，暂待核对。请对照下方词义；相近的字不一定含义相同。':'未匹配到已收录的中文表达。若意思正确，可以手动确认并记住这个答案。'};
}

const api={directions,errorTotal,withRememberedMeanings,masteryInfo,previewMastery,rankMastery,createMasterySession,preferences,schedules,dayKey,laterDay,memoryInfo,dueReviews,createReviewSession,canUndo,undo,explain,normEn,normZh,variants,judge,rememberZh,shuffle,record,createSession,submit,override,choiceQuestion,scheduleQueue,next};if(typeof module!=='undefined')module.exports=api;root.VocabEngine=api;
})(typeof window!=='undefined'?window:globalThis);
