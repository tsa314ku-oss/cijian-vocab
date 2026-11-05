/* Local, click-only pronunciation. No audio downloads or learning-record writes. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CijianSpeech=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function normalizeText(value){return String(value||'').replace(/[’‘]/g,"'").replace(/\bsb(?:'s)?\b\.?/gi,m=>/'s/i.test(m)?"somebody's":'somebody').replace(/\bsth\b\.?/gi,'something').replace(/\.{2,}|…/g,' ').replace(/\s*\/\s*/g,' or ').replace(/\s+/g,' ').trim()}
 function preferences(settings={}){return {lang:settings.speechAccent==='en-US'?'en-US':'en-GB',rate:settings.speechRate===0.8?0.8:1}}
 function chooseVoice(voices,lang){const local=voices.filter(v=>v.localService===true&&/^en[-_]/i.test(v.lang)),same=local.filter(v=>v.lang.replace('_','-').toLowerCase()===lang.toLowerCase());return same.find(v=>v.name===(lang==='en-GB'?'Daniel':'Samantha'))||same[0]||local.find(v=>/Daniel|Samantha/.test(v.name))||local[0]||null}
 function createController(env,options={}){
  let current=null,serial=Date.now()*100,timer=null,voiceWait=null;
  const synth=env.speechSynthesis,bridge=env.webkit?.messageHandlers?.cijianSpeech;
  const later=env.setTimeout.bind(env),clear=env.clearTimeout.bind(env);
  const emit=()=>options.onChange?.(current?{...current}:null);
  function clearWaiting(){if(timer!==null)clear(timer);timer=null;if(voiceWait){synth?.removeEventListener?.('voiceschanged',voiceWait);voiceWait=null}}
  function finish(id,error){if(current?.id!==id)return;clearWaiting();current=null;emit();if(error)options.onError?.(error)}
  function stop(){if(!current)return;const active=current;clearWaiting();current=null;emit();try{if(bridge)bridge.postMessage({action:'stop',id:active.id});else synth?.cancel()}catch(e){}}
  function nativeEvent(event){if(!event||event.id!==current?.id)return;if(event.type==='start'){clearWaiting();current.status='speaking';emit();timer=later(()=>finish(event.id,'朗读未能完成，请再点一次。'),60000)}else if(['end','cancel','error'].includes(event.type)){finish(event.id,event.type==='error'?'这台电脑暂时没有可用的英语语音。':undefined)}}
  function browserSpeak(id,text,prefs){
   if(current?.id!==id)return;
   const voice=chooseVoice(synth.getVoices(),prefs.lang);if(!voice)return false;
   clearWaiting();const utterance=new env.SpeechSynthesisUtterance(text);utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=prefs.rate;
   utterance.onstart=()=>{if(current?.id!==id)return;clearWaiting();current.status='speaking';emit();timer=later(()=>{synth.cancel();finish(id,'朗读未能完成，请再点一次。')},60000)};
   utterance.onend=()=>finish(id);utterance.onerror=e=>finish(id,['canceled','interrupted'].includes(e.error)?undefined:'没有播放成功，请检查声音输出后重试。');
   try{synth.cancel();synth.speak(utterance);timer=later(()=>{synth.cancel();finish(id,'浏览器没有开始播放，请检查浏览器语音权限，或换一个支持英语朗读的浏览器。')},10000)}catch(e){finish(id,'浏览器暂时无法朗读，请检查浏览器语音权限，或换一个支持英语朗读的浏览器。')}
   return true;
  }
  function speak(value){
   const text=normalizeText(value);if(!text)return;if(current?.original===value){stop();return}stop();
   const prefs=preferences(options.getSettings?.()),id=++serial;current={id,original:value,text,status:'loading',...prefs};emit();
   if(text.length>240){finish(id,'这段英文过长，请缩短后再朗读。');return}
   if(bridge){try{bridge.postMessage({action:'speak',id,text,...prefs});timer=later(()=>{if(current?.id===id){try{bridge.postMessage({action:'stop',id})}catch(e){}finish(id,'朗读没有开始，请再点一次。')}},12000)}catch(e){finish(id,'朗读暂时无法启动，请重新打开词间。')}return}
   if(!synth||!env.SpeechSynthesisUtterance){finish(id,'此浏览器不支持本地朗读，请在设备设置中启用英语语音，或换一个浏览器。');return}
   if(browserSpeak(id,text,prefs))return;
   voiceWait=()=>browserSpeak(id,text,prefs);synth.addEventListener?.('voiceschanged',voiceWait);
   timer=later(()=>finish(id,'此浏览器没有可用的本地英语语音，请在设备设置中启用英语语音，或换一个浏览器。'),2500);
  }
  return {speak,stop,nativeEvent,get current(){return current?{...current}:null}};
 }
 return {normalizeText,preferences,chooseVoice,createController};
});
