/* Lucas Hoops sound department. Every note, drum, crowd vowel and effect is synthesized.
   Original 8-bar pep arrangement + original organ/fanfare phrases; no recordings. */
window.HoopsAudio=(()=>{
'use strict';
const BPM=126,BEAT=60/BPM,STEP=BEAT/2,midi=n=>440*Math.pow(2,(n-69)/12);
const MELODY=[
 72,0,76,79,0,74,72,0, 77,0,81,0,79,77,76,0,
 79,0,83,86,0,81,79,0, 81,0,84,0,83,79,76,0,
 76,79,0,84,0,81,79,76, 77,0,74,77,81,0,79,0,
 81,79,0,77,0,84,81,79, 79,83,0,86,84,0,83,74
];
const ROOTS=[48,53,55,45,48,50,53,55];
function create(settings){
 let ctx=null,sfxBus=null,musicBus=null,pepBus=null,output=null,noiseBuffer=null,scene='intro',hidden=document.hidden,unlocked=false;
 let nextStep=0,step=0,musicStart=0,duckUntil=0,duckDepth=1,lastMusicGain=-1,lastOrgan=-10,clock=0;
 const nodes={sfx:new Set(),music:new Set()},counts={},events=[];
 function count(name){counts[name]=(counts[name]||0)+1;events.push(name);if(events.length>40)events.shift();}
 function build(){
  if(ctx)return true;
  try{
   const C=window.AudioContext||window.webkitAudioContext;if(!C)return false;ctx=new C();
   output=ctx.createGain();output.gain.value=hidden?0:.78;
   const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-13;compressor.knee.value=12;compressor.ratio.value=4;compressor.attack.value=.003;compressor.release.value=.18;
   sfxBus=ctx.createGain();musicBus=ctx.createGain();pepBus=ctx.createGain();pepBus.gain.value=0;pepBus.connect(musicBus);sfxBus.connect(compressor);musicBus.connect(compressor);compressor.connect(output);output.connect(ctx.destination);
   noiseBuffer=ctx.createBuffer(1,22050,22050);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
   sync();return true;
  }catch(_){ctx=null;return false;}
 }
 function ready(bus='sfx'){return !!ctx&&ctx.state==='running'&&!hidden&&(bus==='sfx'?settings.sound:settings.music);}
 function unlock(){
  if(hidden||(!settings.sound&&!settings.music)||!build())return;
  unlocked=true;if(ctx.state==='suspended')ctx.resume().catch(()=>{});sync();
 }
 function track(node,bus,cleanup=[]){
  const set=nodes[bus==='sfx'?'sfx':'music'];if(set.size>=48){try{node.disconnect();cleanup.forEach(n=>n.disconnect());}catch(_){}return false;}
  set.add(node);node.onended=()=>{set.delete(node);try{node.disconnect();cleanup.forEach(n=>n.disconnect());}catch(_){}};return true;
 }
 function stop(bus){for(const n of nodes[bus]){try{n.stop();n.disconnect();}catch(_){}}nodes[bus].clear();if(bus==='music'){nextStep=0;step=0;lastMusicGain=-1;}}
 function destination(bus){return bus==='sfx'?sfxBus:bus==='cue'?musicBus:pepBus;}
 function tone(freq,duration,vol=.08,type='triangle',end=freq,bus='sfx',at=0){
  if(!ready(bus))return;const t=at||ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(Math.max(20,freq),t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(destination(bus));
  if(track(o,bus,[g])){o.start(t);o.stop(t+duration+.01);}
 }
 function hiss(duration,vol=.08,freq=1800,bus='sfx',at=0,q=.7){
  if(!ready(bus))return;const t=at||ctx.currentTime,s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noiseBuffer;s.loop=true;f.type='bandpass';f.frequency.value=freq;f.Q.value=q;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+duration);s.connect(f);f.connect(g);g.connect(destination(bus));if(track(s,bus,[f,g])){s.start(t);s.stop(t+duration+.01);}
 }
 function brass(note,at,duration=.19,vol=.055,bus='music'){
  if(!ready('music')||nodes.music.size>40)return;const f=midi(note),filter=ctx.createBiquadFilter(),g=ctx.createGain();filter.type='lowpass';filter.Q.value=1.2;filter.frequency.setValueAtTime(900,at);filter.frequency.linearRampToValueAtTime(2500,at+.025);filter.frequency.exponentialRampToValueAtTime(650,at+duration);
  g.gain.setValueAtTime(.0001,at);g.gain.linearRampToValueAtTime(vol,at+.012);g.gain.exponentialRampToValueAtTime(.0001,at+duration);filter.connect(g);g.connect(destination(bus));
  const a=ctx.createOscillator(),b=ctx.createOscillator();a.type='sawtooth';b.type='triangle';a.frequency.value=f;b.frequency.value=f;b.detune.value=5;a.connect(filter);b.connect(filter);
  // Two oscillators share a single, disposable envelope/filter.
  if(track(a,'music')){a.start(at);a.stop(at+duration+.01);}if(track(b,'music',[filter,g])){b.start(at);b.stop(at+duration+.015);}
 }
 function kick(at,vol=.19){tone(122,.20,vol,'sine',40,'music',at);tone(53,.13,vol*.28,'triangle',30,'music',at);}
 function snare(at,vol=.12){hiss(.105,vol,2100,'music',at,.6);tone(185,.07,vol*.28,'triangle',130,'music',at);}
 function clap(at,vol=.065,bus='music'){for(const off of [0,.011,.026])hiss(.065,vol,1550,bus,at+off,.6);}
 function scheduleMusic(at,index){
  const i=index%64,bar=(i/8)|0,slot=i%8,root=ROOTS[bar];
  if(slot===0||slot===4||slot===7&&bar%2)kick(at,slot===7?.10:.18);
  if(slot===2||slot===6){snare(at);clap(at,.043);}
  if(slot===7){snare(at+STEP*.45,.028);snare(at+STEP*.72,.025);}
  if(slot===1||slot===5)snare(at,.022);
  if(slot%2===0)tone(midi(root),.21,.08,'triangle',midi(root),'music',at);
  const note=MELODY[i];if(note){brass(note,at,slot===0?.24:.15,.047);if(slot===0){brass(root+12,at,.20,.022);brass(root+(bar===3||bar===5?15:16),at,.20,.018);}}
  count('pep_step');
 }
 function musicLevel(){if(!settings.music||scene==='intro'||hidden)return 0;return scene==='play'?.20:scene==='end'?.24:scene==='paused'?.37:.50;}
 function immediate(param,value){param.cancelScheduledValues(0);param.value=value;}
 function sync(){
  if(!ctx)return;immediate(sfxBus.gain,settings.sound&&!hidden?1:0);immediate(musicBus.gain,settings.music&&!hidden?.75:0);
  if(!settings.sound)stop('sfx');if(!settings.music){stop('music');pepBus.gain.setValueAtTime(0,ctx.currentTime);}
  immediate(output.gain,hidden?0:.78);lastMusicGain=-1;
 }
 function update(dt,newScene){
  clock+=dt;if(newScene!==scene){scene=newScene;if(scene==='intro')stop('music');lastMusicGain=-1;}
  if(!ctx||ctx.state!=='running'||hidden)return;
  const now=ctx.currentTime,ducked=now<duckUntil,level=musicLevel()*(ducked?duckDepth:1);
  if(Math.abs(level-lastMusicGain)>.0001){pepBus.gain.setTargetAtTime(level,now,ducked?.035:.18);lastMusicGain=level;}
  if(!level||!settings.music||scene==='intro')return;
  if(!nextStep||nextStep<now-.3){nextStep=now+.04;musicStart=nextStep;step=0;}
  while(nextStep<now+.17){scheduleMusic(nextStep,step++);nextStep+=STEP;}
 }
 function duck(seconds=1.3,depth=.12){if(!ctx)return;const active=ctx.currentTime<duckUntil;duckDepth=active?Math.min(duckDepth,depth):depth;duckUntil=Math.max(duckUntil,ctx.currentTime+seconds);lastMusicGain=-1;count('music_duck');}
 function vowel(at,duration,fundamental,formants,vol=.035){
  if(!ready())return;
  for(const formant of formants){
   const o=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(fundamental,at);o.frequency.linearRampToValueAtTime(fundamental*.93,at+duration);f.type='bandpass';f.Q.value=6;f.frequency.value=formant;
   g.gain.setValueAtTime(.0001,at);g.gain.linearRampToValueAtTime(vol,at+.07);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(f);f.connect(g);g.connect(sfxBus);if(track(o,'sfx',[f,g])){o.start(at);o.stop(at+duration+.01);}
  }
 }
 function sound(name,options={}){
  if(!ready())return;count(name);const now=ctx.currentTime;
  if(name==='dribble')tone(145,.075,.10,'sine',47);
  if(name==='swish'){hiss(.25,.15,3300);tone(740,.12,.03,'sine',1100);}
  if(name==='rim'){tone(650,.15,.10,'triangle',390);tone(1050,.10,.025,'sine',700);}
  if(name==='backboard'){tone(155,.19,.16,'triangle',70);hiss(.09,.14,520);tone(750,.12,.045,'sine',400);}
  if(name==='buzzer'){duck(1.2,.08);tone(160,.50,.09,'sawtooth',155);tone(240,.45,.03,'square',235);}
  if(name==='horn'){duck(2.2,.05);tone(110,.92,.11,'sawtooth',108);tone(165,.92,.08,'square',162);tone(220,.82,.035,'triangle',217);}
  if(name==='cheer'){
   const streak=Math.min(7,options.streak||0),vol=.10+streak*.018,duration=.8+streak*.1;hiss(duration,vol,950);hiss(duration*.8,vol*.5,1700);
   vowel(now,duration,118,[520,1420],.035+streak*.003);vowel(now+.04,duration,151,[620,1700],.022+streak*.003);
  }
  if(name==='ooh'){vowel(now,.65,128,[400,850],.06);vowel(now+.02,.60,153,[430,940],.035);}
  if(name==='squeak'){
   tone(1500,.11,.045,'sine',2350);tone(2050,.075,.025,'triangle',1200);hiss(.085,.028,2400,'sfx',now,10);
  }
  if(name==='whistle'){tone(2700,.14,.08,'sine',2950);tone(2900,.22,.07,'sine',2500,'sfx',now+.17);hiss(.25,.025,3000,'sfx',now,6);}
  if(name==='defense'){
   // Synthetic D burst, EE vowel, F hiss, EH vowel, S ending: no voice samples.
   hiss(.035,.045,2600);vowel(now+.025,.24,150,[310,2250],.065);hiss(.07,.055,3300,'sfx',now+.36);vowel(now+.41,.28,140,[560,1700],.075);hiss(.13,.04,3600,'sfx',now+.64);
   clap(now+.83,.06,'sfx');clap(now+1.04,.06,'sfx');clap(now+1.25,.075,'sfx');
  }
  if(name==='steal')tone(440,.09,.07,'square',880);
  if(name==='click')tone(570,.065,.04,'square',780);
 }
 function organ(kind='possession'){
  if(!ready('music')||ctx.currentTime-lastOrgan<1.65)return;lastOrgan=ctx.currentTime;count('organ_'+kind);
  const notes=kind==='timeout'?[65,72,69,76,74,81]:kind==='made'?[72,79,76,84,81]:[67,74,71,79];
  const times=kind==='timeout'?[0,.14,.31,.47,.66,.88]:[0,.13,.33,.50,.72];
  notes.forEach((n,i)=>{const at=ctx.currentTime+times[i];tone(midi(n),.20,.075,'sine',midi(n),'cue',at);tone(midi(n+12),.17,.025,'triangle',midi(n+12),'cue',at);});
 }
 function finish(win){
  if(!ready('music'))return;duck(3.0,.10);count(win?'victory_fanfare':'sad_trombone');
  if(win){const notes=[72,76,79,84,81,88],times=[0,.15,.31,.53,.78,1.08];notes.forEach((n,i)=>{brass(n,ctx.currentTime+times[i],i===5?.72:.23,.11,'cue');brass(n-12,ctx.currentTime+times[i],i===5?.72:.23,.045,'cue');});kick(ctx.currentTime,.20);clap(ctx.currentTime+.54,.07);}
  else{for(const [i,n] of [53,52,50,45].entries()){const at=ctx.currentTime+i*.38;tone(midi(n),i===3?.8:.38,.11,'sawtooth',midi(n-2),'cue',at);tone(midi(n-12),.36,.045,'triangle',midi(n-1),'cue',at);}}
 }
 function visibility(isHidden){hidden=isHidden;if(!ctx)return;if(hidden){stop('sfx');stop('music');immediate(output.gain,0);ctx.suspend().catch(()=>{});}else{sync();if(unlocked&&(settings.music||settings.sound))ctx.resume().catch(()=>{});}}
 return{unlock,tone,hiss,sound,organ,finish,duck,update,sync,visibility,stopEffects:()=>stop('sfx'),get ready(){return !!ctx&&ctx.state==='running'&&!hidden;},get beat(){return ctx&&musicStart?Math.max(0,(ctx.currentTime-musicStart)/BEAT):clock/BEAT;},get snapshot(){return{state:ctx?.state||'locked',hidden,sound:settings.sound,music:settings.music,scene,sfxGain:sfxBus?.gain.value||0,musicGain:pepBus?.gain.value||0,musicMaster:musicBus?.gain.value||0,outputGain:output?.gain.value||0,sfxActive:nodes.sfx.size,musicActive:nodes.music.size,ducking:!!ctx&&ctx.currentTime<duckUntil,counts:{...counts},events:[...events],beat:this.beat};}};
}
return{create,BPM};
})();
