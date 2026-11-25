/* Lucas Hoops v2.3: squads, tournament, 2 players on one phone, online room codes, free throws, subs, overtime,
   power-ups and court themes. Original art and sound, offline-first (online play is the only part that needs internet). */
(async()=>{
'use strict';
// Cache-first older HTML can briefly receive newer JS; load our own new modules safely.
async function moduleReady(name,file){if(window[name])return;await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=file;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});}
await Promise.all([moduleReady('HoopsAudio','audio.js'),moduleReady('HoopsLights','lights.js')]);
const $=id=>document.getElementById(id),A=window.HoopsArt;
const canvas=$('court'),ctx=canvas.getContext('2d',{alpha:false});
// Crisp pixels on phone screens: 2x backing store on high-DPI displays, dropped to 1x if frames get slow.
let RES=(window.devicePixelRatio||1)>=1.5?2:1,slowFrames=0,wipe=0;
canvas.width=960*RES;canvas.height=540*RES;
const front=document.createElement('canvas');front.width=960*RES;front.height=540*RES;front.className='celebration-front';front.setAttribute('aria-hidden','true');front.hidden=true;$('stage').appendChild(front);const frontCtx=front.getContext('2d');
const W=960,H=540,LEFT=90,RIGHT=870,CY=A.CY,RIMZ=A.RIMZ,GRAVITY=760;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f;}catch(_){return f;}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(_){}};
let settings=read('lucasHoops.settings.v1',{sound:true,difficulty:0});
settings.difficulty=clamp(Number(settings.difficulty)||0,0,2);settings.sound=settings.sound!==false;settings.music=settings.music!==false;
settings.powerups=settings.powerups!==false;settings.autoSubs=settings.autoSubs===true;if(!A.THEMES[settings.theme])settings.theme='sunburst';
A.setRes(RES);A.rebuild(settings.theme);
const S=window.HoopsAudio.create(settings),L=window.HoopsLights.create(A,()=>S.beat);
let records=read('lucasHoops.records.v1',{shootout:0,quick:0,wins:0});
for(const k of ['shootout','quick','wins','titles','otGames','ftMade','fires','subs'])records[k]=Number(records[k])||0;
const levels=['ROOKIE','BALLER','ALL-STAR'];
let intro,t=0,scene='intro',state=null,last=0,flash=0,shake=0,net=null,lobby=null;
// One stick + key set per on-screen controller (slot 0 = P1 / solo, slot 1 = P2 on the same phone).
const sticks=[{id:null,x:0,y:0,ox:0,oy:0},{id:null,x:0,y:0,ox:0,oy:0}];
const keySets=[{left:false,right:false,up:false,down:false,sprint:false},{left:false,right:false,up:false,down:false,sprint:false}];
const pointers=new Map();
let particles=[],messages=[];
function unlock(){S.unlock();}
function fx(...a){if(state?.online==='host')state.fx.push(a);}
function tone(...args){S.tone(...args);fx('t',...args);}
function hiss(...args){S.hiss(...args);}
function sound(name,options){S.sound(name,options);fx('s',name,options?.streak||0);}
const R=(name,pos,number,skin,shade,hair,extra={})=>({name,pos,number,skin,shade,hair,...extra});
const ROSTERS={
 sunburst:[R('Lucas','PG',1,'#edc09f','#c38d70','#63432e',{star:true}),R('Nova','SG',8,'#b98462','#87563d','#332631'),R('Rio','SF',23,'#d9a67f','#a27052','#4d352b'),R('Jett','PF',32,'#8d634e','#634232','#231f2d'),R('Enzo','C',14,'#e2af84','#af7754','#70482f'),R('Kai','G',5,'#c8926c','#94634a','#2b2230'),R('Dante','F',21,'#a8735a','#774c39','#1f1b28'),R('Leo','C',44,'#e8b48d','#b47e5e','#8a5a33')],
 owls:[R('Milo','PG',3,'#c59778','#91664c','#352938'),R('Zeke','SG',11,'#956b54','#684733','#24202f'),R('Arlo','SF',19,'#edba91','#bf8965','#58422f'),R('Finn','PF',27,'#d9a27c','#9e6b4f','#4e342d'),R('Atlas','C',42,'#91664f','#65432f','#252235'),R('Ollie','G',7,'#d8a27e','#a26e50','#3b2b26'),R('Remy','F',15,'#a07055','#704a36','#1e1a26'),R('Hugo','C',50,'#e9b896','#b5825f','#5c3f2c')],
 coyotes:[R('Ace','PG',2,'#d6a07c','#a06c50','#4a3022'),R('Blaze','SG',9,'#9b6e55','#6c4836','#21191e'),R('Cruz','SF',17,'#c48e6a','#8f5f45','#2f2420'),R('Duke','PF',33,'#e6b28c','#b27c5a','#6b4a2e'),R('Rex','C',55,'#8a604b','#5e3f30','#1c1820'),R('Sly','G',6,'#e0ad88','#ab7756','#5a3b28'),R('Tex','F',24,'#b07a5c','#7d5340','#2a201c'),R('Moe','C',41,'#cf9a77','#9a6849','#3c2b22')],
 monsoon:[R('Storm','PG',4,'#e3b08b','#ae7a58','#4b3527'),R('Gale','SG',10,'#a57458','#764f3b','#1f1a22'),R('Brook','SF',18,'#d9a27e','#a36d4f','#3e2c22'),R('River','PF',30,'#8f654f','#644432','#1c1822'),R('Tide','C',45,'#edbb95','#b8855f','#704d33'),R('Misty','G',12,'#c99470','#966448','#2d2226'),R('Flash','F',20,'#b48064','#83583f','#251d20'),R('Cloud','C',52,'#e7b690','#b3805c','#5e412d')]
};
const homeRoster=ROSTERS.sunburst;
const TEAMS={sunburst:{key:'sunburst',name:'SUNBURST',abbr:'SUN',color:'#eda35e'},owls:{key:'owls',name:'NIGHT OWLS',short:'OWLS',abbr:'OWL',color:'#8dc4df'},coyotes:{key:'coyotes',name:'COYOTES',abbr:'COY',color:'#f0a070'},monsoon:{key:'monsoon',name:'MONSOON',abbr:'MON',color:'#8fe8c0'}};
const teamName=team=>state?.teams?.[team]?.short||state?.teams?.[team]?.name||(team===0?'SUNBURST':'OWLS');
function setIdentity(p,key,ri){const r=ROSTERS[key][ri];Object.assign(p,{name:r.name,pos:r.pos,number:r.number,star:!!r.star,skin:r.skin,shade:r.shade,hair:r.hair,ri});}
function makePlayers(size,keys){
 const ids=size===1?[0]:size===3?[0,1,4]:[0,1,2,3,4];let id=0;
 const players=keys.flatMap((key,team)=>ids.map((n,i)=>({...ROSTERS[key][n],star:!!ROSTERS[key][n].star,ri:n,kit:key,id:++id,team,index:i,x:0,y:0,z:0,vx:0,vy:0,vz:0,walk:0,face:team===0?1:-1,cool:0,boost:0,spin:0,plant:0,plantTime:0,charging:false,hold:0,think:1+i*.4,blockCool:0,stamina:1,speedUp:0,cutT:0})));
 const bench=keys.map(key=>ROSTERS[key].map((r,ri)=>({ri,stamina:1})).filter(b=>!ids.includes(b.ri)).slice(0,3));
 return{players,bench};
}
function newHuman(team,slot,remote=false){return{team,slot,remote,control:null,stick:remote?{x:0,y:0}:sticks[slot],keys:remote?{left:false,right:false,up:false,down:false,sprint:false}:keySets[slot],chargeHeld:false,sprintHeld:false,holdTime:0,charge:0,manualSwitch:0,lastPhase:''};}
function pBy(id){return state?.players.find(p=>p.id===id)||null;}
function controlled(h){return h?pBy(h.control):null;}
function owner(){return pBy(state?.ball.owner);}
function humanOf(p){return p&&state?state.humans.find(h=>h.control===p.id)||null:null;}
function humanTeam(team){return state?.humans.find(h=>h.team===team)||null;}
function hoopX(team){return team===0?RIGHT:LEFT;}
function ownHoop(team){return team===0?LEFT:RIGHT;}
function input(h){
 if(!h)return{x:0,y:0,len:0};const k=h.keys;
 let x=h.stick.x+Number(k.right)-Number(k.left),y=h.stick.y+Number(k.down)-Number(k.up),len=Math.hypot(x,y);
 if(len>1){x/=len;y/=len;}return{x,y,len:Math.min(1,len)};
}
function stamFactor(p){return .84+.16*clamp(p.stamina??1,0,1);}
function emptyBall(){return{x:440,y:CY,z:30,vx:0,vy:0,vz:0,owner:null,shooter:null,target:null,shot:false,pass:false,age:0,scored:false,rim:false,points:2,angle:0,fire:false};}
function clearInput(){
 for(const k of keySets)for(const n of Object.keys(k))k[n]=false;
 sticks.forEach((s,i)=>{s.id=null;s.x=s.y=0;const j=$(i?'joystick-2':'joystick');if(j)j.hidden=true;});pointers.clear();
 document.querySelectorAll('.circle-button').forEach(el=>el.classList.remove('active'));
 if(state){for(const h of state.humans){if(!h.remote){h.chargeHeld=false;h.sprintHeld=false;}}state.players.forEach(p=>{if(!humanOf(p)?.remote)p.charging=false;});}
}
function pop(s,c='#fff',life=1.2){messages.push({s,c,life,total:life});if(messages.length>3)messages.shift();fx('p',s,c,life);}
function burst(x,y,c='#ffe18a',n=14){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*180,vy:-Math.random()*150,life:.6+Math.random()*.5,c,size:2+Math.random()*3});fx('b',Math.round(x),Math.round(y),c,n);}
function celebrate(kind,x,y){L.celebrate(kind,x,y);fx('c',kind,Math.round(x),Math.round(y));}
function start(mode,size=3,opts={}){
 unlock();sound('click');L.reset();$('stage').classList.remove('victory');scene='play';$('main-menu').hidden=true;$('dialog').hidden=true;$('play-ui').hidden=false;
 const so=mode==='shootout',sz=so?1:size,keys=['sunburst',opts.opponent||'owls'];
 if(opts.theme)A.rebuild(opts.theme);
 const made=makePlayers(sz,keys),players=so?made.players.filter(p=>p.team===0):made.players;
 const humans=[newHuman(0,0)];if(mode==='versus')humans.push(newHuman(1,1));if(mode==='online')humans.push(newHuman(1,1,true));
 if(opts.online==='guest'){humans[0]=newHuman(0,0,true);humans[1]=newHuman(1,0);}
 state={mode,size:sz,players,bench:so?[[],[]]:made.bench,teams:keys.map(k=>TEAMS[k]),humans,local:mode==='versus'?[humans[0],humans[1]]:opts.online==='guest'?[humans[1]]:[humans[0]],online:opts.online||null,
  possession:0,ball:emptyBall(),time:so?60:90,period:0,shotClock:14,score:[0,0],fouls:[0,0],dead:0,next:0,net:[0,0],attempts:0,makes:0,streak:0,bestStreak:0,teamStreak:[0,0],fire:[0,0],pickups:[],puTimer:8,
  spot:0,buzzer:false,overWait:0,ended:false,ft:null,pendingFT:null,subQueued:false,tired:{},difficulty:mode==='versus'||mode==='online'?1:settings.difficulty,aiBoost:opts.aiBoost||1,tourney:opts.tourney||null,fx:[],snapN:0,
  stats:{ftMade:[0,0],ftAtt:[0,0],subs:0,powerups:0,fires:0,ot:0},metrics:{passes:0,catches:0,switches:0,steals:0,charges:0,blocks:0,dunks:0,crossovers:0,aiPasses:0,fouls:0},started:performance.now()};
 // Older tests and tools read state.control / state.charge / state.manualSwitch for player 1.
 for(const k of ['control','charge','manualSwitch','holdTime'])Object.defineProperty(state,k,{enumerable:true,get(){return humans[0][k];},set(v){humans[0][k]=v;}});
 Object.defineProperty(state,'t',{get(){return t;}});
 $('stage').classList.toggle('two-player',mode==='versus');$('stage').classList.toggle('online-game',mode==='online');
 clearInput();particles=[];messages=[];wipe=.5;formation(0);take(players[0]);for(const h of humans)if(h.control==null)autoDefender(h,true);updateControls(true);refreshSound();
 const opp=teamName(1);
 pop(so?'LUCAS. 60 SECONDS. ALL THREES!':mode==='versus'?`P1 SUNBURST VS P2 ${opp}!`:mode==='online'?`ONLINE ${sz} ON ${sz}. TIP OFF!`:mode==='tournament'?`${opts.tourney?.round?'FINAL':'SEMIFINAL'}: SUNBURST VS ${opp}!`:`${sz} ON ${sz}. SUNBURST BALL!`,'#ffd0a0',1.8);
}
function formation(team){
 const g=state,ys=g.size===1?[CY]:g.size===3?[CY,85,370]:[CY,65,145,310,410];
 for(const p of g.players){const attack=p.team===team;const dir=p.team===0?1:-1;
  p.x=attack?(p.index===0?(p.team===0?380:580):480+dir*(50+p.index*38)):(team===0?545:415)+(p.index%2)*34;
  p.y=ys[p.index];p.z=p.vz=p.vx=p.vy=0;p.plant=p.plantTime=p.hold=0;p.charging=false;p.think=1+p.index*.3;p.cutT=0;
 }
 if(g.mode==='shootout'){g.players[0].x=440;g.players[0].y=CY;}
}
function setControl(h,p,manual=false){
 if(!h||!p||p.team!==h.team)return;
 if(h.control!==p.id){h.control=p.id;h.chargeHeld=false;state.players.forEach(q=>{if(q.team===h.team)q.charging=false;});}
 if(manual){h.manualSwitch=2.5;state.metrics.switches++;pop((state.humans.length>1?`P${h.team+1} `:'')+p.name.toUpperCase()+'  /  '+p.pos,h.team===0?'#d9b8ff':'#b9e4f2',.65);}
}
function autoDefender(h,force=false){
 const g=state;if(!h||g.mode==='shootout'||(g.possession===h.team&&h.control!=null)||(!force&&h.manualSwitch>0))return;
 const b=owner()||g.ball,mine=g.players.filter(p=>p.team===h.team).sort((a,c)=>dist(a,b)-dist(c,b)),nearest=mine[0],current=controlled(h);
 if(!nearest)return;if(force||!current||(!input(h).len&&dist(current,b)>dist(nearest,b)+85))setControl(h,nearest);
}
function take(p,resetClock=true){
 if(!p)return;const g=state,b=g.ball,changed=g.possession!==p.team;
 b.owner=p.id;b.shot=b.pass=b.scored=false;b.target=null;b.vx=b.vy=b.vz=0;b.age=0;if(resetClock||changed)g.shotClock=14;g.possession=p.team;p.think=1.0;p.hold=0;
 for(const h of g.humans){if(h.team===p.team)setControl(h,p);else if(changed||!h.manualSwitch)autoDefender(h,true);}
 updateControls();
}
function isOffense(h){return state?.mode==='shootout'||state?.possession===h?.team;}
function jump(p){if(p&&p.z<.1&&p.plant<=0){p.vz=310;p.z=.1;tone(240,.05,.025,'triangle',370);}}
function nearHoop(p){return Math.hypot(p.x-hoopX(p.team),p.y-CY)<72;}
function shotThreshold(team){return [.8,.85,.9][state.difficulty]-(state.fire[team]>0?.1:0);}
function beginPrimary(h){
 if(scene!=='play'||!state||!h)return;
 if(state.ft){ftRelease(h);return;}
 if(state.dead>0)return;
 const p=controlled(h),b=state.ball;if(!p)return;
 if(isOffense(h)&&b.owner===p.id&&!state.buzzer){
  if(h.chargeHeld)return;if(nearHoop(p)&&state.mode!=='shootout'){dunk(p);return;}
  h.chargeHeld=true;h.holdTime=0;h.charge=0;p.charging=true;p.plant=0;jump(p);
 }else{jump(p);p.blockCool=.7;}
}
function releasePrimary(h){
 if(!h||!h.chargeHeld||!state)return;h.chargeHeld=false;const p=controlled(h);if(!p)return;p.charging=false;
 if(scene==='play'&&state.ball.owner===p.id)launch(p,h.charge,h);
}
function launch(p,q,h=null){
 const g=state,b=g.ball,target=hoopX(p.team),hot=g.fire[p.team]>0,threshold=shotThreshold(p.team),perfect=q>=threshold;
 const spread=(hot?.45:1)*(p.stamina<.5?1+(.5-p.stamina)*1.2:1);
 const error=perfect?0:(Math.random()<.5?-1:1)*(23+(1-q)*80)*spread,errorY=perfect?0:(Math.random()-.5)*(1-q)*90*spread;
 b.owner=null;b.target=null;b.pass=false;b.x=p.x+p.face*12;b.y=p.y;b.z=p.z+55;b.shooter=p.id;b.shot=true;b.scored=false;b.rim=false;b.age=0;b.perfect=perfect;b.dunk=false;b.nearMiss=false;b.board=-1;b.fire=hot;
 b.points=g.mode==='shootout'||Math.hypot(p.x-target,p.y-CY)>265?3:2;
 const flight=clamp(.65+Math.hypot(target-b.x,CY-b.y)/800,.65,1.45);
 b.vx=(target+error-b.x)/flight;b.vy=(CY+errorY-b.y)/flight;b.vz=(RIMZ-b.z+.5*GRAVITY*flight*flight)/flight;
 p.charging=false;p.hold=0;
 if(p.team===0)g.attempts++;
 if(h){pop((g.humans.length>1?`P${h.team+1} `:'')+(perfect?'PERFECT RELEASE!':q<.45?'TOO EARLY!':'JUST MISSED THE TIMING'),perfect?'#c5ffd0':'#ffcd9f',.8);if(perfect)burst(p.x,A.project(p.y)-p.z-65,'#c5ffd0',8);}
 tone(420,.08,.025,'triangle',760);
 shootingFoul(p,b.points,false);
 // A visible shot contest, not a hidden accuracy penalty.
 for(const defender of g.players){if(defender.team!==p.team&&dist(defender,p)<78&&Math.random()<[.08,.3,.65][g.difficulty])jump(defender);}
}
function dunk(p){
 const g=state,b=g.ball,target=hoopX(p.team);
 p.x=clamp(p.x,target-27,target+27);p.y=CY;p.z=65;p.vz=80;
 Object.assign(b,{owner:null,target:null,x:target,y:CY,z:RIMZ+24,vx:0,vy:0,vz:-150,shot:true,pass:false,scored:false,rim:false,age:0,shooter:p.id,points:2,perfect:true,dunk:true,fire:g.fire[p.team]>0});
 if(p.team===0){g.attempts++;g.metrics.dunks++;}S.duck(1.5,.08);shake=5;fx('sh',5);pop('BOOM! DUNK!','#ffd19e',1);burst(target,A.project(CY)-RIMZ,'#ffbd6d',18);
 shootingFoul(p,2,true);
}
// Shooting fouls: late or flying contests right on the shooter. And-one if it still drops.
function shootingFoul(p,points,isDunk){
 const g=state;if(g.mode==='shootout'||g.pendingFT||g.ft)return;
 for(const d of g.players){
  if(d.team===p.team)continue;const dd=dist(d,p);if(dd>(isDunk?30:27))continue;
  const rel=Math.hypot(d.vx-p.vx,d.vy-p.vy),late=d.z>12,human=!!humanOf(d);
  const chance=((late?.32:0)+(rel>90?.28:0)+(dd<18?.14:0)+(isDunk?.18:0))*(human?.85:[.6,.45,.35][g.difficulty]);
  if(Math.random()<chance){g.pendingFT={team:p.team,shooter:p.id,n:points,fouler:d.id};g.fouls[d.team]++;g.metrics.fouls++;sound('whistle');pop('SHOOTING FOUL ON '+d.name.toUpperCase()+'!','#ffd27a',1.1);return true;}
 }
 return false;
}
function choosePass(p,direction){
 const choices=state.players.filter(q=>q.team===p.team&&q.id!==p.id);
 if(!choices.length)return null;
 const directional=direction.len>.15;
 const candidates=choices.map(q=>{const d=dist(p,q),dot=directional?((q.x-p.x)*direction.x+(q.y-p.y)*direction.y)/(d||1):0;return{p:q,d,dot};});
 const ahead=directional?candidates.filter(q=>q.dot>.25):candidates;
 return (ahead.length?ahead:candidates).sort((a,b)=>(a.d/(directional?1+Math.max(0,a.dot)*1.5:1))-(b.d/(directional?1+Math.max(0,b.dot)*1.5:1)))[0].p;
}
function passBall(p,target=null,h=humanOf(p)){
 const g=state,b=g.ball;if(b.owner!==p.id||p.cool>0||p.charging)return;
 target=target||choosePass(p,input(h));
 if(!target){if(h)cross(h);pop('SOLO. TRY A CROSSOVER!','#d4b5ee',.7);return;}
 Object.assign(b,{owner:null,target:target.id,pass:true,shot:false,scored:false,age:0,x:p.x,y:p.y,z:36,shooter:p.id,vz:0,passStartX:p.x,passStartY:p.y,fire:g.fire[p.team]>0});
 p.cool=.35;p.think=1.3;if(h){if(p.team===0)g.metrics.passes++;pop('TO '+target.name.toUpperCase()+'!',p.team===0?'#e2c9ff':'#c4ecf6',.65);}else g.metrics.aiPasses++;
 tone(320,.07,.045,'triangle',600);updateControls();
}
function secondary(h){
 if(scene!=='play'||!state||state.dead>0||state.ft)return;const p=controlled(h),o=owner();if(!p)return;
 if(isOffense(h)){if(o?.id===p.id)passBall(p,null,h);else if(o?.team===h.team)passBall(o,p,h);return;}
 if(p.cool>0)return;p.cool=.55;
 if(o&&o.team!==p.team&&dist(p,o)<52&&o.z<15){
  if(Math.random()<[.98,.78,.57][state.difficulty]&&o.spin<=0){take(p);if(p.team===0)state.metrics.steals++;sound('steal');pop(p.team===0?'STEAL! GO SUNBURST!':`STEAL! ${teamName(p.team)}!`,'#c2ffc9');burst(p.x,A.project(p.y)-30,'#e3c5ff',10);}
  else if(dist(p,o)<34&&Math.random()<.2)reachIn(p,o);
  else pop('KEEP PRESSURING!','#ead2ff',.65);
 }else if(!o){jump(p);}else pop('GET CLOSER TO STEAL','#e0c8f4',.6);
}
function cross(h){
 if(scene!=='play'||!state||state.dead>0||state.ft)return;const p=controlled(h);if(!p)return;if(!isOffense(h)){plant(h);return;}
 if(p.cool>0)return;p.cool=.65;p.boost=.55;p.spin=.55;sound('squeak');p.plant=0;state.metrics.crossovers++;
 const v=input(h);p.y=clamp(p.y+(v.len>.1?v.y:(p.y<CY?1:-1))*14,45,445);pop('CROSS / SPIN!','#ffd3ac',.7);tone(360,.09,.04,'triangle',690);
}
function plant(h){
 const p=controlled(h);if(!p||p.z>0)return;p.plant=1.8;p.plantTime=0;p.vx=p.vy=0;p.charging=false;pop('FEET SET. HOLD YOUR GROUND.','#ffd6a1',.8);
}
function switchPlayer(h){
 const g=state;if(!g||scene!=='play'||g.mode==='shootout'||!h)return;
 const b=owner()||g.ball,ours=g.players.filter(p=>p.team===h.team).sort((a,c)=>dist(a,b)-dist(c,b));
 if(ours.length===1){pop(h.team===0?'LUCAS IS YOUR GUY!':'ONE ON ONE!','#dec4f5',.6);return;}
 const i=ours.findIndex(p=>p.id===h.control);setControl(h,ours[(i+1)%ours.length],true);
}
function fourthDown(h){if(isOffense(h))h.sprintHeld=true;else switchPlayer(h);}
function doAct(h,a,down){
 if(!h)return;
 if(a==='primary')down?beginPrimary(h):releasePrimary(h);
 else if(a==='secondary'){if(down)secondary(h);}
 else if(a==='move'){if(down)cross(h);}
 else if(a==='fourth'){if(down)fourthDown(h);else h.sprintHeld=false;}
 else if(a==='switch'){if(down)switchPlayer(h);}
}
// Every on-screen/keyboard action goes through here: local humans act now, an online guest sends it to the host.
function act(slot,a,down){
 const g=state;if(!g||scene!=='play')return;
 if(g.online==='guest'){net?.send('ev',{a,d:down?1:0});if(a==='fourth'&&!down)keySets[0].sprint=false;return;}
 doAct(g.local[slot],a,down);
}
function offensiveFoul(handler,defender){
 const g=state;g.fouls[handler.team]++;g.next=defender.team;g.possession=defender.team;g.dead=1.1;g.ball.owner=null;g.ball.shot=g.ball.pass=false;g.ball.vx=g.ball.vy=0;handler.vx=handler.vy=0;handler.x+=handler.team===0?-15:15;
 for(const h of g.humans)h.chargeHeld=false;handler.charging=false;defender.plant=0;g.metrics.charges+=defender.team===0?1:0;pop('CHARGE! OFFENSIVE FOUL!','#ffcb84',1.3);sound('whistle');updateControls();
}
// Planting too late (still sliding into place) is a blocking foul; near the rim it means two free throws.
function blockingFoul(handler,defender){
 const g=state;g.fouls[defender.team]++;g.metrics.fouls++;defender.plant=0;handler.vx=handler.vy=0;g.ball.owner=null;g.ball.shot=g.ball.pass=false;g.ball.vx=g.ball.vy=0;for(const h of g.humans)h.chargeHeld=false;handler.charging=false;
 sound('whistle');g.dead=1.0;
 if(Math.hypot(handler.x-hoopX(handler.team),handler.y-CY)<170||g.fouls[defender.team]>=5){g.pendingFT={team:handler.team,shooter:handler.id,n:2};pop('BLOCKING FOUL! TOO LATE. 2 SHOTS','#ffcb84',1.3);}
 else{g.next=handler.team;pop('BLOCKING FOUL! SIDE OUT.','#ffcb84',1.2);}
 updateControls();
}
function reachIn(def,handler){
 const g=state;g.fouls[def.team]++;g.metrics.fouls++;sound('whistle');g.dead=.9;g.ball.owner=null;g.ball.shot=g.ball.pass=false;g.ball.vx=g.ball.vy=0;for(const h of g.humans)h.chargeHeld=false;handler.charging=false;
 if(g.fouls[def.team]>=5){g.pendingFT={team:handler.team,shooter:handler.id,n:2};pop('REACH-IN! BONUS: 2 FREE THROWS','#ffd27a',1.3);}
 else{g.next=handler.team;pop(`REACH-IN FOUL (${g.fouls[def.team]}). SIDE OUT.`,'#ffd27a',1.1);}
}
// ---- Free throws: a sliding timing meter; stop it in the green. ----
function startFT(){
 const g=state,pf=g.pendingFT;g.pendingFT=null;const shooter=pBy(pf.shooter)||g.players.find(p=>p.team===pf.team);
 g.ft={team:pf.team,shooter:shooter.id,left:pf.n,total:pf.n,made:0,phase:'set',timer:1.2,meterT:0,meter:0,result:null,andOne:!!pf.andOne,sx:0,sy:0,sz:0,tx:0};
 g.dead=0;g.ball=emptyBall();ftPositions();g.ball.owner=shooter.id;
 for(const h of g.humans){h.chargeHeld=false;if(h.team===pf.team)setControl(h,shooter);}
 pop(`${pf.andOne?'AND ONE! ':''}${shooter.name.toUpperCase()}: ${pf.n} FREE THROW${pf.n>1?'S':''}`,'#ffe2a0',1.4);S.organ('timeout');lastControlsKey='';updateControls();
}
function ftPositions(){
 const g=state,f=g.ft,dir=f.team===0?1:-1,hx=hoopX(f.team),sh=pBy(f.shooter);
 sh.x=hx-dir*104;sh.y=CY;sh.face=dir;
 const lane=[[28,-100],[28,100],[58,-100],[58,100],[88,-100],[88,100],[200,-120],[200,120],[240,0]];
 const others=g.players.filter(p=>p!==sh).sort((a,b)=>(a.team===f.team)-(b.team===f.team)||a.index-b.index);
 others.forEach((p,i)=>{const s=lane[i%lane.length];p.x=hx-dir*s[0];p.y=CY+s[1];p.face=dir;});
 for(const p of g.players){p.vx=p.vy=p.z=p.vz=0;p.plant=0;p.charging=false;p.hold=0;}
}
function ftZone(){return [.3,.22,.16][state.difficulty];}
function ftRelease(h){
 const g=state,f=g.ft;if(!f||f.phase!=='aim'||f.team!==h.team)return;
 const made=Math.abs(f.meter-.5)<ftZone()/2;pop(made?'GREEN! NICE TOUCH.':'OFF THE MARK...',made?'#c5ffd0':'#ffcd9f',.7);ftShoot(made);
}
function ftShoot(made){
 const g=state,f=g.ft,sh=pBy(f.shooter),b=g.ball,dir=f.team===0?1:-1;
 f.result=made;f.phase='flight';f.timer=0;b.owner=null;b.shot=true;b.fire=g.fire[f.team]>0;f.sx=sh.x+dir*10;f.sy=sh.y;f.sz=55;f.tx=hoopX(f.team)+(made?0:(Math.random()<.5?-1:1)*(16+Math.random()*8));
 g.stats.ftAtt[f.team]++;sh.charging=false;tone(420,.08,.025,'triangle',760);
}
function updateFT(dt){
 const g=state,f=g.ft,sh=pBy(f.shooter),b=g.ball,h=humanTeam(f.team),dir=f.team===0?1:-1;
 for(const p of g.players){p.vx=p.vy=0;if(p.z>0||p.vz>0){p.vz-=820*dt;p.z=Math.max(0,p.z+p.vz*dt);if(!p.z)p.vz=0;}}
 if(f.phase==='set'){sh.charging=true;f.timer-=dt;if(f.timer<=0){f.phase='aim';f.meterT=0;}}
 else if(f.phase==='aim'){
  sh.charging=true;f.meterT+=dt;f.meter=(Math.sin(f.meterT*[2.4,3.1,3.8][g.difficulty]-Math.PI/2)+1)/2;
  if(!h){if(f.meterT>.95)ftShoot(Math.random()<[.56,.7,.8][g.difficulty]);}
  else if(f.meterT>10)ftShoot(false);
 }else if(f.phase==='flight'){
  f.timer+=dt;const k=clamp(f.timer/.85,0,1);b.x=f.sx+(f.tx-f.sx)*k;b.y=f.sy+(CY-f.sy)*k;b.z=f.sz+(RIMZ+6-f.sz)*k+Math.sin(k*Math.PI)*95;b.angle+=dt*8;
  if(k>=1){f.phase='after';f.timer=.9;b.shot=false;
   if(f.result){g.score[f.team]+=1;f.made++;g.stats.ftMade[f.team]++;g.net[f.team===0?1:0]=1;sound('swish');sound('cheer',{streak:1});burst(b.x,A.project(CY)-RIMZ,'#ffd08a',14);pop('FREE THROW GOOD! +1',f.team===0?'#ffcf9b':'#bce4ef',.9);b.vx=0;b.vz=-60;}
   else{sound('rim');sound('ooh');b.vx=-dir*90;b.vz=150;pop('RIMS OUT!','#ffcd9f',.8);}
  }
 }else if(f.phase==='after'){
  f.timer-=dt;b.vz-=GRAVITY*dt;b.x+=b.vx*dt;b.z=Math.max(6,b.z+b.vz*dt);if(b.z<=6)b.vz=Math.abs(b.vz)*.5;
  if(f.timer<=0){f.left--;
   if(f.left>0){f.phase='set';f.timer=.55;g.ball=emptyBall();g.ball.owner=sh.id;}
   else{g.ft=null;g.next=1-f.team;g.dead=.45;g.ball=emptyBall();g.ball.z=6;lastControlsKey='';}
  }
 }
 if(g.ft&&(f.phase==='set'||f.phase==='aim')){b.owner=sh.id;b.x=sh.x+dir*14;b.y=sh.y+4;b.z=56;}
}
// ---- Substitutions + stamina ----
function staminaTick(dt){
 const g=state;if(g.mode==='shootout')return;
 for(const p of g.players){const sp=Math.hypot(p.vx,p.vy);let d=-sp/200*.0085;if(sp>220)d-=.006;if(sp<20)d+=.01;if(g.dead>0||g.ft)d=.02;p.stamina=clamp(p.stamina+d*dt,.15,1);}
 for(const team of g.bench)for(const b of team)b.stamina=clamp(b.stamina+.04*dt,0,1);
}
function swapIn(p,slot){
 const g=state,old={ri:p.ri,stamina:p.stamina},inName=ROSTERS[p.kit][slot.ri].name.toUpperCase(),outName=p.name.toUpperCase();
 setIdentity(p,p.kit,slot.ri);p.stamina=slot.stamina;slot.ri=old.ri;slot.stamina=old.stamina;g.stats.subs++;if(humanTeam(p.team))records.subs++;
 pop(`SUB: ${inName} IN, ${outName} OUT`,p.team===0?'#e2c9ff':'#c4ecf6',1);
}
function autoSubs(){
 const g=state;if(g.mode==='shootout')return;
 for(const team of [0,1]){
  const human=humanTeam(team),auto=!human||settings.autoSubs||g.online;if(!auto){
   for(const p of g.players)if(p.team===team&&p.stamina<.35&&!g.tired[p.id]){g.tired[p.id]=1;pop(`${p.name.toUpperCase()} IS GASSED. TAP SUB!`,'#ffd27a',1.2);}continue;}
  for(const p of g.players){if(p.team!==team||p.stamina>=.45)continue;const best=g.bench[team].filter(b=>b.stamina>.75).sort((a,b)=>b.stamina-a.stamina)[0];if(best)swapIn(p,best);}
 }
}
// ---- Power-ups: pickups spawn on court; three straight buckets = ON FIRE. ----
function setFire(team,sec,why){
 const g=state;if(!settings.powerups)return;const was=g.fire[team]>0;g.fire[team]=Math.max(g.fire[team],sec);if(was)return;
 g.stats.fires++;if(humanTeam(team))records.fires++;pop(`${why||''}${teamName(team)} ${why?'':'IS '}ON FIRE!`,'#ffb35a',1.4);celebrate('three',480,200);S.organ('made');
}
function powerTick(dt){
 const g=state;for(const i of [0,1])if(g.fire[i]>0){g.fire[i]=Math.max(0,g.fire[i]-dt);if(!g.fire[i]){g.teamStreak[i]=0;pop(`${teamName(i)} COOLED OFF`,'#c9b8e0',.8);}}
 for(const p of g.players){p.speedUp=Math.max(0,p.speedUp-dt);p._fire=g.fire[p.team]>0;}
 if(!settings.powerups||g.mode==='shootout'||g.dead>0||g.ft)return;
 g.puTimer-=dt;
 if(g.puTimer<=0&&!g.pickups.length){g.puTimer=11+Math.random()*6;let x,y,tries=0;do{x=300+Math.random()*360;y=80+Math.random()*290;tries++;}while(tries<8&&g.players.some(p=>Math.hypot(p.x-x,p.y-y)<60));g.pickups.push({type:Math.random()<.6?'bolt':'flame',x,y,life:9});tone(880,.08,.03,'square',1320);}
 for(const u of g.pickups){u.life-=dt;for(const p of g.players){if(p.z<25&&Math.hypot(p.x-u.x,p.y-u.y)<20){u.life=0;g.stats.powerups++;
  if(u.type==='bolt'){p.speedUp=6;pop(`${p.name.toUpperCase()} GRABS SPEED BOOST!`,'#9fd0ff',1);tone(520,.12,.04,'square',1040);}
  else{setFire(p.team,8,'FIRE TOKEN! ');}
  burst(u.x,A.project(u.y)-20,u.type==='bolt'?'#9fd0ff':'#ffb35a',16);break;}}}
 g.pickups=g.pickups.filter(u=>u.life>0);
}
function score(team){
 const g=state,b=g.ball;if(b.scored)return;b.scored=true;b.shot=false;b.pass=false;b.vx*=.15;b.vy*=.15;g.score[team]+=b.points;g.net[team===0?1:0]=1;g.dead=1.0;g.next=1-team;
 if(team===0){g.makes++;g.streak++;g.bestStreak=Math.max(g.bestStreak,g.streak);}else g.streak=0;
 g.teamStreak[team]++;g.teamStreak[1-team]=0;if(g.fire[1-team]>0){g.fire[1-team]=0;pop(`${teamName(team)} PUT OUT THE FIRE!`,'#bfe6ff',.9);}
 const who=g.humans.length>1||g.mode==='tournament'?teamName(team):team===0?'SUNBURST':'OWLS';pop((b.dunk?'SLAM DUNK! ':b.perfect?'SWISH! ':who+' BUCKET! ')+`+${b.points}`,team===0?'#ffcf9b':'#bce4ef',1.2);
 sound(b.dunk?'rim':'swish');sound('cheer',{streak:g.streak});S.organ('made');celebrate(g.buzzer?'buzzer':b.dunk?'dunk':b.points===3?'three':'two',b.x,A.project(CY)-RIMZ);burst(b.x,A.project(CY)-RIMZ,'#ffd08a',22);flash=.1;fx('fl');
 if(g.pendingFT){if(g.pendingFT.team===team){g.pendingFT.n=1;g.pendingFT.andOne=true;}else g.pendingFT=null;}
 if(g.teamStreak[team]>=3&&g.fire[team]<=0)setFire(team,12);
}
function nextPossession(){
 const g=state;S.organ('possession');if(g.buzzer){gameOver();return;}g.dead=0;g.ball=emptyBall();
 if(g.mode==='shootout'){
  const spots=[[440,CY],[400,100],[470,350],[360,320],[420,130]];g.spot=(g.spot+1)%spots.length;const p=g.players[0];[p.x,p.y]=spots[g.spot];p.z=p.vz=0;take(p);
 }else{autoSubs();formation(g.next);take(g.players.find(p=>p.team===g.next&&p.index===0));
  if(g.humans.length>1)pop(`${teamName(g.next)} BALL. ${g.next===0?'RIGHT HOOP >':'< LEFT HOOP'}`,g.next===0?'#ffd0a0':'#bce4ef',1);
  else pop(g.next===0?'SUNBURST BALL. RIGHT HOOP >':'DEFENSE. PROTECT THE LEFT HOOP.','#e6c3ef',1);}
}
// Tied at the horn? 30 seconds of overtime, as many times as it takes.
function gameOver(){const g=state;if(g.mode!=='shootout'&&g.score[0]===g.score[1]&&!g.ended)startOT();else finish();}
function startOT(){
 const g=state;g.period++;g.stats.ot=g.period;g.time=30;g.buzzer=false;g.overWait=0;g.shotClock=14;g.dead=1.8;g.next=g.period%2===1?1:0;g.ball=emptyBall();g.pendingFT=null;g.fouls=[0,0];
 for(const h of g.humans)h.chargeHeld=false;g.players.forEach(p=>p.charging=false);
 S.duck(1.5,.1);sound('horn');pop(g.period>1?`OVERTIME #${g.period}! 30 MORE SECONDS`:'TIED! OVERTIME: 30 SECONDS','#ffcf7a',1.8);celebrate('three',480,200);wipe=.5;fx('w');
}
function moveToward(p,x,y,speed){const dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy);if(d<6){p.vx=p.vy=0;}else{const n=Math.min(1,d/22);p.vx=dx/d*speed*n;p.vy=dy/d*speed*n;}}
// ---- Smarter AI: reads shot quality, the shot clock, passing lanes, spacing and help defense. ----
function openness(p){let m=999;for(const q of state.players)if(q.team!==p.team)m=Math.min(m,dist(p,q));return m;}
function laneOpen(a,b,team,pad=18){
 const dx=b.x-a.x,dy=b.y-a.y,L2=dx*dx+dy*dy||1;
 for(const q of state.players){if(q.team===team)continue;const k=clamp(((q.x-a.x)*dx+(q.y-a.y)*dy)/L2,0,1);if(k<=0||k>=1)continue;if(Math.hypot(q.x-(a.x+dx*k),q.y-(a.y+dy*k))<pad)return false;}
 return true;
}
function shotQuality(p){
 const d=Math.hypot(p.x-hoopX(p.team),p.y-CY),o=openness(p);
 let q=d<75?.86:d<160?.6:d<265?.5:d<330?.38:.12;
 q+=o<26?-.38:o<50?-.2:o<80?-.07:.05;if(state.fire[p.team]>0)q+=.12;if(p.stamina<.4)q-=.06;return q;
}
const SPOTS={3:[[175,90],[175,350],[40,62],[40,378],[262,CY]],5:[[40,62],[40,378],[175,92],[175,348],[262,CY],[72,CY+72]]};
function spacingSpot(p,o){
 const g=state,hx=hoopX(p.team),dir=p.team===0?1:-1,list=(SPOTS[g.size]||SPOTS[3]).map(([dx,y])=>({x:hx-dir*dx,y}));
 const mates=g.players.filter(q=>q.team===p.team&&q.id!==o.id).sort((a,b)=>a.index-b.index),taken=new Set();
 for(const q of mates){let best=-1,bd=1e9;list.forEach((s,i)=>{if(taken.has(i)||Math.hypot(s.x-o.x,s.y-o.y)<85)return;const d=Math.hypot(s.x-q.x,s.y-q.y)+i*6;if(d<bd){bd=d;best=i;}});if(best<0)best=list.findIndex((s,i)=>!taken.has(i));taken.add(best);if(q.id===p.id)return list[best]||{x:hx-dir*160,y:CY};}
 return{x:hx-dir*160,y:CY};
}
function aiLevel(){return state.difficulty;}
function ai(dt){
 const g=state,b=g.ball,o=owner(),d=aiLevel(),ref=o||(b.pass?pBy(b.target):null);
 if(g.mode==='shootout')return;
 for(const p of g.players){
  if(humanOf(p)){continue;}p.think-=dt;p.cutT=Math.max(0,(p.cutT||0)-dt);
  if(p.plant>0){p.vx=p.vy=0;continue;}
  const dir=p.team===0?1:-1,target=hoopX(p.team),own=ownHoop(p.team),cpuTeam=!humanTeam(p.team);
  const speed=(cpuTeam?[118,145,173][d]*g.aiBoost:144)*stamFactor(p)*(p.speedUp>0?1.3:1);
  if(o?.id===p.id){
   if(p.hold>0){p.vx=p.vy=0;p.hold+=dt;p.charging=true;if(p.hold>.59){p.charging=false;const sq=shotQuality(p);launch(p,clamp([.68,.78,.86][d]+Math.random()*.23+(sq-.55)*.3,0,1));p.think=1.8;}continue;}
   const sq=shotQuality(p),closest=openness(p),need=[.6,.55,.5][d]-(1-g.shotClock/14)*.35;
   if(nearHoop(p)&&p.think<0){dunk(p);p.think=2;continue;}
   if(p.think<0&&b.age>.5){
    let best=null;
    if(g.size>1&&b.age>.85)for(const q of g.players){if(q.team!==p.team||q.id===p.id||!laneOpen(p,q,p.team))continue;const v=shotQuality(q)+(dir*(q.x-p.x)>0?.04:0);if(!best||v>best.v)best={p:q,v};}
    if(g.shotClock<2.6||(sq>=need&&!(best&&best.v>sq+.18))){p.hold=.01;jump(p);p.think=1.8;continue;}
    if(best&&(best.v>sq+.15||(closest<36&&best.v>.3))){passBall(p,best.p);p.think=1.7;continue;}
    p.think=[.55,.35,.2][d];
   }
   // Attack an open lane to the rim; otherwise probe toward the open side and shake the defender.
   if(laneOpen(p,{x:target-dir*40,y:CY},p.team,26))moveToward(p,target-dir*58,CY+(p.y<CY?-14:14),speed);
   else{const def=g.players.filter(q=>q.team!==p.team).sort((a,c)=>dist(a,p)-dist(c,p))[0],side=def&&def.y<p.y?1:-1;moveToward(p,target-dir*(150+Math.sin(t*.5+p.id)*30),clamp(p.y+side*60,70,370),speed*.92);
    if(d>=1&&closest<30&&p.cool<=0&&Math.random()<dt*[0,.8,1.6][d]){p.spin=.55;p.boost=.55;p.cool=1.2;sound('squeak');}}
  }else if(ref?.team===p.team){
   if(ref.id===p.id){p.vx*=.5;p.vy*=.5;continue;}
   const o=ref;
   // Spacing: fill open spots (corners, wings, top), cut when your man falls asleep, never clump.
   const myDef=g.players.filter(q=>q.team!==p.team).sort((a,c)=>dist(a,p)-dist(c,p))[0];
   if(!p.cutT&&d>=1&&myDef&&dist(myDef,p)>70&&Math.random()<dt*.35)p.cutT=1.2;
   if(!p.cutT&&((t+p.index*1.7)%8)<.02)p.cutT=1.0;
   let x,y;if(p.cutT>0){x=target-dir*50;y=CY+(p.index%2?24:-24);}else{const s=spacingSpot(p,o);x=s.x;y=s.y;}
   for(const q of g.players){if(q!==p&&q.team===p.team&&dist(q,p)<55){x+=(p.x-q.x)*.8;y+=(p.y-q.y)*.8;}}
   const u=g.pickups[0];if(u&&Math.hypot(u.x-p.x,u.y-p.y)<140){x=u.x;y=u.y;}
   moveToward(p,clamp(x,65,895),clamp(y,50,440),speed*.93);
  }else if(ref){
   const o=ref;
   const ownTeam=g.players.filter(q=>q.team===p.team),nearest=ownTeam.reduce((a,c)=>dist(a,o)<dist(c,o)?a:c),match=g.players.find(q=>q.team!==p.team&&q.index===p.index)||o;
   const hoop={x:own,y:CY},toHoop=(a)=>{const dx=own-a.x,dy=CY-a.y,l=Math.hypot(dx,dy)||1;return{x:dx/l,y:dy/l};};
   if(p.id===nearest.id){
    const v=toHoop(o);moveToward(p,clamp(o.x+v.x*26,65,895),o.y+v.y*26,speed);
    if(b.owner===o.id&&p.cool<=0&&dist(p,o)<33&&o.z<8&&!o.charging&&o.spin<=0){p.cool=1.7;
     if(Math.random()<[.05,.17,.31][d]){take(p);pop(`${teamName(p.team)} STEAL!${humanTeam(1-p.team)&&!humanTeam(p.team)?' GET IT BACK!':''}`,'#b9dce9');sound('steal');}
     else if(Math.random()<.06)reachIn(p,o);}
   }else{
    // Help defense: if the ball beats its man near the rim, the closest helper rotates to stop it.
    const beaten=dist(nearest,hoop)>dist(o,hoop)+8&&dist(o,hoop)<230;
    const helpers=ownTeam.filter(q=>q.id!==nearest.id&&!humanOf(q)).sort((a,c)=>dist(a,o)-dist(c,o));
    if(beaten&&helpers[0]?.id===p.id&&(d>0||dist(p,o)<120)){const v=toHoop(o);moveToward(p,o.x+v.x*30,o.y+v.y*30,speed*1.05);}
    else{const v=toHoop(match),sag=[.15,.3,.42][d],bx=match.x+v.x*30,by=match.y+v.y*30;moveToward(p,clamp(bx+(o.x-bx)*sag,65,895),by+(o.y-by)*sag+(p.index%2?6:-6),speed);}
   }
  }else{
   const teammates=g.players.filter(q=>q.team===p.team),nearest=teammates.reduce((a,c)=>dist(a,b)<dist(c,b)?a:c);
   if(nearest.id===p.id)moveToward(p,b.x,b.y,speed*1.05);else moveToward(p,clamp(b.x-dir*(70+p.index*38),80,880),[CY,95,360,150,400][p.index],speed*.8);
   if(b.shot&&pBy(b.shooter)?.team!==p.team&&dist(p,b)<42&&b.z<110&&p.blockCool<=0){jump(p);p.blockCool=1.8;}
  }
 }
}
function integratePlayers(dt){
 const g=state;
 for(const h of g.humans){const p=controlled(h);if(!p)continue;const v=input(h);
  if(p.plant>0){p.vx=p.vy=0;}else{const base=p.charging?66:(p.boost>0?285:(h.sprintHeld||h.keys.sprint)&&isOffense(h)?265:184),speed=base*stamFactor(p)*(p.speedUp>0?1.3:1);p.vx=v.x*speed;p.vy=v.y*speed;}}
 for(const q of g.players){
  q.cool=Math.max(0,q.cool-dt);q.boost=Math.max(0,q.boost-dt);q.spin=Math.max(0,q.spin-dt);q.blockCool=Math.max(0,q.blockCool-dt);
  if(q.plant>0){q.plant-=dt;q.plantTime+=dt;}else q.plantTime=0;
  if(q.z>0||q.vz>0){q.vz-=820*dt;q.z=Math.max(0,q.z+q.vz*dt);if(!q.z)q.vz=0;}
  q.x=clamp(q.x+q.vx*dt,g.mode==='shootout'?250:62,g.mode==='shootout'?580:898);q.y=clamp(q.y+q.vy*dt,45,445);q.walk+=Math.hypot(q.vx,q.vy)*dt*.1;
  const speed=Math.hypot(q.vx,q.vy),oldSpeed=Math.hypot(q.prevVX||0,q.prevVY||0),turn=oldSpeed&&speed?(q.vx*(q.prevVX||0)+q.vy*(q.prevVY||0))/(oldSpeed*speed):1;
  if((humanOf(q)||q.id===g.ball.owner)&&speed>95&&oldSpeed>45&&turn<.55&&t-(q.squeakAt||-10)>.42){sound('squeak');q.squeakAt=t;}q.prevVX=q.vx;q.prevVY=q.vy;if(Math.abs(q.vx)>4)q.face=q.vx>0?1:-1;
 }
 // Charge calls are resolved before body separation, after both players have moved.
 const handler=owner();
 if(handler&&!g.dead){for(const q of g.players){if(q.team!==handler.team&&q.plant>0&&dist(q,handler)<29&&Math.hypot(handler.vx,handler.vy)>55){if(q.plantTime>.14)offensiveFoul(handler,q);else blockingFoul(handler,q);break;}}}
 for(let i=0;i<g.players.length;i++)for(let j=i+1;j<g.players.length;j++){
  const a=g.players[i],b=g.players[j],dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy),min=20;
  if(d<min&&d>.01&&a.z<15&&b.z<15){const push=(min-d)*.5,nx=dx/d,ny=dy/d;if(a.plant<=0){a.x+=nx*push;a.y+=ny*push;}if(b.plant<=0){b.x-=nx*push;b.y-=ny*push;}}
 }
}
function physics(dt){
 const g=state,b=g.ball;b.age+=dt;b.angle+=Math.hypot(b.vx,b.vy)*dt*.018;
 if(b.owner){const p=owner();if(!p){b.owner=null;return;}const held=p.charging;b.x=p.x+p.face*14;b.y=p.y+4;b.z=p.z+(held?56:18+Math.abs(Math.sin(t*10))*17);b.fire=g.fire[p.team]>0;
  if(!held&&p.z<4&&Math.sin((t-dt)*10)<0&&Math.sin(t*10)>=0)sound('dribble');return;}
 if(b.pass){
  const target=pBy(b.target);if(!target){b.pass=false;return;}
  const dx=target.x-b.x,dy=target.y-b.y,d=Math.hypot(dx,dy),speed=650;
  b.vx=dx/(d||1)*speed;b.vy=dy/(d||1)*speed;b.x+=b.vx*dt;b.y+=b.vy*dt;b.z=34+Math.sin(Math.min(1,b.age/.6)*Math.PI)*10;
  for(const p of g.players){if(p.team!==pBy(b.shooter)?.team&&dist(p,b)<17&&b.age>.12&&p.z<18){take(p);pop(p.team===0?'PASS PICKED OFF!':'INTERCEPTED!','#dbbfef',.8);return;}}
  if(d<18||b.age>1.6){if(target.team===0)g.metrics.catches++;take(target,false);return;}
  return;
 }
 for(let n=0;n<2;n++){
  const h=dt/2,oldZ=b.z,oldX=b.x;b.vz-=GRAVITY*h;b.x+=b.vx*h;b.y+=b.vy*h;b.z+=b.vz*h;
  for(const x of [LEFT,RIGHT]){
   const board=x+(x===LEFT?-26:26);
   if(b.z>70&&b.z<143&&Math.abs(b.y-CY)<37&&((oldX-board)*(b.x-board)<=0||Math.abs(b.x-board)<5)&&!b.scored){b.x=board+(oldX<board?-6:6);b.vx*=-.65;if(b.board==null||b.board<0||b.age-b.board>.16){sound('backboard');b.board=b.age;}b.rim=true;}
   if(!b.scored&&Math.abs(b.z-RIMZ)<12){
    const radial=Math.hypot(b.x-x,b.y-CY),ringDistance=Math.hypot(radial-23,b.z-RIMZ);
    if(ringDistance<8&&radial>1){const nr=(radial-23)/(ringDistance||1),nz=(b.z-RIMZ)/(ringDistance||1),nx=(b.x-x)/radial*nr,ny=(b.y-CY)/radial*nr,dot=b.vx*nx+b.vy*ny+b.vz*nz;
     if(dot<0){b.vx-=1.6*dot*nx;b.vy-=1.6*dot*ny;b.vz-=1.6*dot*nz;b.z+=nz*2;if(!b.rim)sound('rim');b.rim=true;g.shotClock=14;}
    }
   }
   if(b.shot&&!b.scored&&!b.nearMiss&&b.vz<0&&b.z<RIMZ-10&&b.z>RIMZ-70&&Math.hypot(b.x-x,b.y-CY)<70){sound('ooh');b.nearMiss=true;}
   if(b.shot&&!b.scored&&b.vz<0&&oldZ>=RIMZ&&b.z<RIMZ&&Math.hypot(b.x-x,b.y-CY)<14)score(x===RIGHT?0:1);
  }
  if(b.z<6){b.z=6;b.vz=Math.abs(b.vz)*.55;b.vx*=.80;b.vy*=.80;if(b.vz>40)sound('dribble');if(g.mode==='shootout'&&!b.scored&&g.dead<=0){g.dead=.45;g.streak=0;}}
  if(b.x<46||b.x>914){b.x=clamp(b.x,46,914);b.vx*=-.64;}if(b.y<32||b.y>455){b.y=clamp(b.y,32,455);b.vy*=-.64;}
 }
 // A fouled shot that misses: dead ball, then free throws.
 if(g.pendingFT&&!b.scored&&g.dead<=0&&b.age>.35&&((b.z<RIMZ-35&&b.vz<0)||b.z<=6)){b.shot=false;g.dead=.7;pop('NO GOOD. HEADING TO THE LINE.','#ffe2a0',.9);return;}
 if(g.dead<=0&&!b.scored){
  for(const p of g.players){
   if(g.mode==='shootout'&&p.team!==0)continue;
   if(b.shot&&pBy(b.shooter)?.team!==p.team&&p.z>16&&dist(p,b)<29&&Math.abs(b.z-(p.z+54))<25&&b.age>.08){
    b.vx=(p.team===0?1:-1)*150;b.vy=(b.y-p.y)*3;b.vz=130;b.shot=false;b.rim=true;p.blockCool=1.5;pop(p.team===0?'BIG BLOCK!':'BLOCKED!','#e5ceff');sound('rim');burst(b.x,A.project(b.y)-b.z,'#ddc3ff',12);if(p.team===0)g.metrics.blocks++;
   }
   if(b.age>(b.shooter===p.id?1.0:.55)&&b.z<p.z+43&&dist(p,b)<27){take(p);pop(`${teamName(p.team)} REBOUND!`,'#dfc6ef',.7);break;}
  }
 }
 if(g.mode==='shootout'&&!b.owner&&!b.scored&&b.age>3.8&&g.dead<=0){g.dead=.3;g.streak=0;}
}
function update(dt){
 t+=dt;L.update(dt,scene,state);flash=Math.max(0,flash-dt);shake=Math.max(0,shake-dt*28);
 particles=particles.filter(p=>(p.life-=dt)>0);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=350*dt;}messages=messages.filter(m=>(m.life-=dt)>0);
 if(scene==='intro'){if(!document.hidden)intro?.update(dt);refreshIntroSound();return;}
 if(scene!=='play'||!state)return;const g=state;
 if(g.online==='guest'){guestUpdate(dt);return;}
 for(const h of g.humans)h.manualSwitch=Math.max(0,h.manualSwitch-dt);
 g.net=g.net.map(v=>Math.max(0,v-dt*1.5));
 if(g.ft){updateFT(dt);powerTick(dt);staminaTick(dt);return;}
 if(!g.buzzer){g.time=Math.max(0,g.time-dt);if(!g.time){g.buzzer=true;for(const h of g.humans){h.chargeHeld=false;const p=controlled(h);if(p)p.charging=false;}S.duck(2.2,.05);sound('horn');pop('BUZZER!','#ffcd91',1.1);if((g.ball.owner||!g.ball.shot)&&!g.pendingFT){gameOver();return;}}}
 else if(!g.pendingFT){g.overWait+=dt;if(g.overWait>4){gameOver();return;}}
 g.autoSwitch=(g.autoSwitch||0)-dt;
 if(g.dead>0){physics(dt);g.dead-=dt;for(const p of g.players){if(p.z>0){p.vz-=820*dt;p.z=Math.max(0,p.z+p.vz*dt);}}staminaTick(dt);
  if(g.subQueued&&!g.online&&scene==='play'){g.subQueued=false;openSubs(true);return;}
  if(g.dead<=0){if(g.pendingFT)startFT();else nextPossession();}return;}
 for(const h of g.humans)if(h.chargeHeld){h.holdTime+=dt;h.charge=clamp(1-Math.abs(h.holdTime-.6)/.6,0,1);if(h.holdTime>=1.19)releasePrimary(h);}
 ai(dt);integratePlayers(dt);physics(dt);if(scene!=='play')return;powerTick(dt);staminaTick(dt);
 g.chantTimer=(g.chantTimer||0)-dt;if(g.humans.length===1&&g.possession===1&&g.shotClock<=5&&g.shotClock>0&&g.dead<=0&&g.chantTimer<=0){sound('defense');g.chantTimer=2.2;}
 if(g.autoSwitch<=0){g.autoSwitch=.8;for(const h of g.humans)autoDefender(h);}
 if(g.mode!=='shootout'&&!g.buzzer&&g.dead<=0){g.shotClock=Math.max(0,g.shotClock-dt);if(g.shotClock<=0&&(!g.ball.shot||g.ball.age>3.8)){g.next=1-g.possession;g.dead=.9;g.ball.owner=null;g.ball.shot=g.ball.pass=false;for(const h of g.humans){h.chargeHeld=false;const p=controlled(h);if(p)p.charging=false;}pop('SHOT CLOCK! SWITCH BALL.','#ffd0a0',1);sound('buzzer');}}
 if(g.buzzer&&!g.ball.shot&&g.dead<=0&&!g.pendingFT&&!g.ft)gameOver();updateControls();
}
function render(){
 ctx.setTransform(RES,0,0,RES,0,0);frontCtx.setTransform(RES,0,0,RES,0,0);ctx.imageSmoothingEnabled=false;front.hidden=scene!=='end';if(scene==='end'){frontCtx.clearRect(0,0,W,H);L.drawEffects(frontCtx);}
 if(scene==='intro'){if(intro)intro.draw(ctx);return;}
 if(scene==='menu'){A.arena(ctx,null,t,true);ctx.fillStyle='#110d2bbf';ctx.fillRect(0,0,W,H);L.draw(ctx);return;}
 const g=state;A.arena(ctx,g,t);L.draw(ctx);if(!g)return;
 ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
 const multi=g.humans.length>1,ctrlIds=g.humans.map(h=>h.control);
 const things=g.players.filter(p=>g.mode!=='shootout'||p.team===0).map(p=>({y:p.y,type:'player',p}));things.push({y:CY,type:'hoop',x:LEFT},{y:CY,type:'hoop',x:RIGHT},{y:g.ball.y+1,type:'ball'});
 for(const u of g.pickups)things.push({y:u.y,type:'pickup',u});
 const bo=owner();for(const p of g.players){p._bz=p===bo&&!p.charging?g.ball.z-p.z:undefined;const h=humanOf(p);p.tag=multi&&h?'P'+(h.team+1):'';p.tagColor=multi&&h?(h.team===0?'#ffcf8a':'#a6ecff'):'';}
 things.sort((a,b)=>a.y-b.y);for(const it of things){if(it.type==='player')A.player(ctx,it.p,t,ctrlIds.includes(it.p.id)&&(g.online!=='guest'||multi));else if(it.type==='hoop')A.hoop(ctx,it.x,g.net[it.x===LEFT?0:1]);else if(it.type==='pickup')A.pickup(ctx,it.u,t);else A.ball(ctx,g.ball,t);}
 for(const p of particles){ctx.globalAlpha=Math.min(1,p.life*3);A.box(ctx,p.x,p.y,p.size,p.size,p.c);}ctx.globalAlpha=1;
 if(flash>0){ctx.fillStyle=`rgba(255,210,160,${flash*.5})`;ctx.fillRect(0,0,W,H);}ctx.restore();
 L.drawEffects(ctx);L.drawVignette(ctx);A.bug(ctx,g);
 if(g.mode!=='shootout'&&multi){A.lineup(ctx,g,0,false,ctrlIds);A.lineup(ctx,g,1,true,ctrlIds);}else A.lineup(ctx,g,0,false,ctrlIds);
 for(const h of g.humans){if(h.chargeHeld){const p=controlled(h);if(p)A.meter(ctx,p,h.charge,g.difficulty,shotThreshold(h.team));}}
 if(g.ft){const f=g.ft,sh=pBy(f.shooter);if(sh&&(f.phase==='aim'||f.phase==='set')){const human=!!humanTeam(f.team);A.ftMeter(ctx,sh,f.phase==='aim'?f.meter:0,ftZone(),human?(multi?`P${f.team+1}: `:'')+'TAP SHOOT IN THE GREEN':'CPU AT THE LINE',human);}}
 if(messages.length)drawBanner(messages[messages.length-1]);
 const o=owner();
 const status=g.ft?`FREE THROW ${g.ft.total-g.ft.left+1} OF ${g.ft.total}`:g.mode==='shootout'?`SHOOTOUT BEST ${records.shootout}`:g.dead>0?(g.pendingFT?'TO THE FREE THROW LINE':'NEXT BALL: '+teamName(g.next)):(o?o.name.toUpperCase()+' HAS THE BALL':'LOOSE BALL');
 A.txt(ctx,status,480,505,7,'#c6a8db');
 A.txt(ctx,g.mode==='versus'?'P1 LEFT SIDE  /  P2 RIGHT SIDE':g.online?`ONLINE ROOM ${g.room||''}  /  YOU ARE ${g.online==='host'?'SUNBURST':teamName(1)}`:'TOUCH LEFT + DRAG TO MOVE',480,524,5,'#7d648b');
 drawWipe();
}
// Banner eases in (pop + slide) and fades out; purely visual.
function drawBanner(m){
 const size=m.s.length>30?10:12,age=m.total-m.life,k=clamp(age/.18,0,1),e=1-Math.pow(1-k,3),pop=1+(1-e)*.35+Math.sin(Math.min(1,age/.3)*Math.PI)*.04;
 ctx.save();ctx.globalAlpha=clamp(m.life*3,0,1)*e;ctx.translate(480,150-(1-e)*10);ctx.scale(pop,pop);ctx.font=`${size}px Pixel`;const tw=ctx.measureText(m.s).width;
 A.box(ctx,-tw/2-14,-12,tw+28,23,'#140c27e6');A.box(ctx,-tw/2-14,-12,tw+28,2,m.c);A.box(ctx,-tw/2-14,9,tw+28,2,'#00000055');A.txt(ctx,m.s,0,0,size,m.c);ctx.restore();ctx.globalAlpha=1;
}
// Pixel diamond wipe when tip-off starts (render only, ~0.5 s).
function drawWipe(){
 if(wipe<=0)return;const k=clamp(wipe/.5,0,1),cell=40,s=cell*1.45*k;ctx.fillStyle='#0b0718';
 for(let y=0;y<=H+cell;y+=cell)for(let x=0;x<=W+cell;x+=cell){const d=s*(1-((x/W)*.35));if(d<=0)continue;ctx.beginPath();ctx.moveTo(x,y-d/2);ctx.lineTo(x+d/2,y);ctx.lineTo(x,y+d/2);ctx.lineTo(x-d/2,y);ctx.fill();}
}
function frame(ts){
 const ms=ts-last;let elapsed=Math.min(.25,ms/1000||.016),real=elapsed;last=ts;L.monitor(ms);wipe=Math.max(0,wipe-real);
 if(RES>1&&ms<200&&!document.hidden){slowFrames=ms>30?slowFrames+1:Math.max(0,slowFrames-1);if(slowFrames>90){RES=1;canvas.width=960;canvas.height=540;front.width=960;front.height=540;A.setRes(1);A.rebuild();}}
 while(elapsed>0){const dt=Math.min(1/120,elapsed);update(dt);elapsed-=dt;}S.update(real,scene);netTick(real);render();requestAnimationFrame(frame);
}
let lastControlsKey='';
function updateControls(force=false){
 if(!state)return;const g=state;
 const key=g.local.map(h=>isOffense(h)?'o':'d').join('')+(g.ft?'f':'');if(!force&&key===lastControlsKey)return;lastControlsKey=key;
 g.local.forEach((h,slot)=>{
  const sfx=slot?'-2':'',phase=isOffense(h)?'offense':'defense';
  const labels=phase==='offense'?[['SHOOT','HOLD / RELEASE'],['PASS','AIM WITH STICK'],['CROSS','/ SPIN'],['SPRINT','HOLD']]:[['BLOCK','JUMP'],['STEAL','PRESSURE'],['CHARGE','PLANT FEET'],['SWITCH','PLAYER']];
  if(g.ft&&g.ft.team===h.team)labels[0]=['SHOOT','FREE THROW'];
  ['primary','secondary','move','fourth'].forEach((name,i)=>{const b=$('action-'+name+sfx);if(!b)return;b.querySelector('span').textContent=labels[i][0];b.querySelector('small').textContent=labels[i][1];b.setAttribute('aria-label',(slot?'P2 ':'')+labels[i].join(' '));});
  const cp=$('control-phase'+sfx);if(cp)cp.textContent=(g.local.length>1?`P${slot+1} `:'')+(phase==='offense'?(h.team===0?'OFFENSE  >':'<  OFFENSE'):(h.team===0?'<  DEFENSE':'DEFENSE  >'));
 });
}
function dialog(title,body,actions,kicker='LOCKER ROOM'){
 $('dialog-title').textContent=title;$('dialog-body').innerHTML=body;$('dialog-actions').innerHTML='';$('dialog-kicker').textContent=kicker;
 for(const [label,fn,orange,id] of actions){const b=document.createElement('button');b.className='menu-btn'+(orange?' orange':'');b.textContent=label;if(id)b.id=id;b.onclick=()=>{unlock();sound('click');fn();};$('dialog-actions').appendChild(b);}$('dialog').hidden=false;
}
function themeLabel(){return A.THEMES[settings.theme].name;}
function showMenu(){
 leaveOnline(true);clearInput();$('stage').classList.remove('victory','two-player','online-game');scene='menu';state=null;if($('intro-ui'))$('intro-ui').hidden=true;$('main-menu').hidden=false;$('play-ui').hidden=true;$('dialog').hidden=true;$('menu-best').textContent=records.shootout;
 if(A.theme!==settings.theme)A.rebuild(settings.theme);const cl=$('court-label');if(cl)cl.textContent=themeLabel();const ti=$('menu-titles');if(ti)ti.textContent=records.titles;
}
function sizeButtons(prefix,def=3){return `<div class="match-options"><button id="${prefix}-1" class="menu-btn">1v1<small>SOLO DUEL</small></button><button id="${prefix}-3" class="menu-btn${def===3?' orange':''}">3v3<small>QUICK GAME</small></button><button id="${prefix}-5" class="menu-btn">5v5<small>FULL SQUAD</small></button></div>`;}
function quickMenu(){
 unlock();sound('click');dialog('SQUAD UP.',`<p>Lucas runs point for the <b>Sunburst</b>. Nova and Enzo join him in 3v3; Rio and Jett complete the five. Kai, Dante and Leo wait on the bench.</p>${sizeButtons('mode')}<p class="muted-note">90 seconds. 14-second shot clock. Tied? 30-second overtime. You attack the RIGHT hoop. Every mode works offline.</p>`,[['BACK',showMenu]],'QUICK GAME');
 for(const n of [1,3,5])$('mode-'+n).onclick=()=>start('quick',n);
}
function versusMenu(){
 unlock();sound('click');dialog('2 PLAYERS. 1 PHONE.',`<p><b>P1</b> is the <b>Sunburst</b> (left side of the screen: stick + buttons) and attacks the RIGHT hoop. <b>P2</b> is the <b>Night Owls</b> (right side) and attacks the LEFT hoop.</p>${sizeButtons('vs')}<p class="muted-note">Turn the phone sideways and each grab a side. Portrait works too: the controls move under the court.</p>`,[['BACK',showMenu]],'2 PLAYERS');
 for(const n of [1,3,5])$('vs-'+n).onclick=()=>start('versus',n);
}
function profile(){
 dialog('LUCAS / POINT GUARD',`<div class="player-profile"><canvas id="lucas-profile" width="240" height="288" aria-label="Lucas, teen point guard in a cream SUNS cap and black purple orange jersey"></canvas><div><h3>SMALL PIXELS.<br>BIG GAME.</h3><p>Brown hair. Cream cap. Braces and a big smile.</p><p>Black jersey, purple sides, orange trim. An original pixel sun for the whole squad.</p><div class="profile-badge">SUNBURST #1<br>TEAM CAPTAIN / PG</div></div></div>`,[['BACK TO THE TEAM',showMenu]],'MEET YOUR CAPTAIN');
 A.portrait($('lucas-profile').getContext('2d'),{...homeRoster[0],team:0},240,288);
}
function statRow(g){
 const ft=`${g.stats.ftMade[0]}/${g.stats.ftAtt[0]}`;
 return `<div class="stat-row"><div>BUCKETS<b>${g.makes}/${g.attempts}</b></div><div>${g.mode==='shootout'?'BEST STREAK':'PASSES'}<b>${g.mode==='shootout'?g.bestStreak:g.metrics.passes}</b></div><div>STEAL / BLOCK<b>${g.metrics.steals} / ${g.metrics.blocks}</b></div>${g.mode==='shootout'?'':`<div>FREE THROWS<b>${ft}</b></div><div>SUBS / OT<b>${g.stats.subs} / ${g.period}</b></div>`}</div>`;
}
function finish(){
 const g=state;if(!g||g.ended)return;g.ended=true;scene='end';clearInput();$('play-ui').hidden=true;
 const so=g.mode==='shootout',versus=g.mode==='versus'||g.mode==='online',guest=g.online==='guest';
 const mine=guest?1:0,win=so?g.score[0]>0:g.score[mine]>g.score[1-mine];
 S.finish(win||g.mode==='versus');if(win||g.mode==='versus'){celebrate('win',480,200);$('stage').classList.add('victory');}
 if(!guest&&g.mode!=='versus'&&g.mode!=='online'){
  const best=g.score[0]>(so?records.shootout:records.quick);
  if(so)records.shootout=Math.max(records.shootout,g.score[0]);else{records.quick=Math.max(records.quick,g.score[0]);if(g.score[0]>g.score[1])records.wins++;}
  if(g.period)records.otGames++;records.ftMade+=g.stats.ftMade[0];save('lucasHoops.records.v1',records);
  if(window.LA?.store)window.LA.store.recordResult('lucas-hoops',{score:g.score[0]});g.best=best;
 }else save('lucasHoops.records.v1',records);
 if(g.online==='host')net?.send('end',{score:g.score,period:g.period});
 if(g.mode==='tournament'){tourneyResult(g);return;}
 const ot=g.period?` <small>(${g.period>1?g.period+'X ':''}OT)</small>`:'';
 let title;if(so)title='SHOOTOUT COMPLETE';else if(versus){const w=g.score[0]>g.score[1]?0:1;title=g.mode==='versus'?`P${w+1} ${teamName(w)} WINS!`:(w===mine?'YOU WIN!':'GOOD GAME!');}else title=g.score[0]>g.score[1]?'SUNBURST WINS!':'GOOD GAME!';
 const again=g.mode==='online'?(g.online==='host'?['NEW ROOM',()=>{showMenu();onlineMenu();},true]:['MAIN MENU',showMenu,true]):['REMATCH',()=>start(g.mode,g.size),true];
 dialog(title,`<div class="score-big">${so?g.score[0]:g.score[0]+' - '+g.score[1]}${ot}</div><p>${g.best?'<b>NEW PERSONAL BEST!</b>':so?'One big finish. Run it back?':versus?'What a battle. Run it back?':'Keep sharing the ball. Your next highlight is waiting.'}</p>${statRow(g)}<p class="muted-note">Saved here. Shootout best: ${records.shootout} / Wins: ${records.wins} / Cups: ${records.titles} / OT games: ${records.otGames}</p>`,[again,['MAIN MENU',showMenu]].filter((a,i,arr)=>i===0||a[0]!==arr[0][0]),'FINAL BUZZER');
}
// ---- Tournament: 4 teams, semifinals + final, trophy at the end. ----
function tourneyMenu(){
 unlock();sound('click');dialog('THE SUNBURST CUP',`<p>Four teams. One trophy. Win your <b>semifinal</b>, then win the <b>final</b>. Tied games go to overtime.</p>${bracketHTML({sf:[['sunburst','coyotes'],['owls','monsoon']],res:[null,null],final:null})}${sizeButtons('cup')}`,[['BACK',showMenu]],'TOURNAMENT');
 for(const n of [1,3,5])$('cup-'+n).onclick=()=>{const T={size:n,round:0,sf:[['sunburst','coyotes'],['owls','monsoon']],res:[null,null],final:null};start('tournament',n,{opponent:'coyotes',tourney:T});};
}
function bracketHTML(T){
 const name=k=>k?TEAMS[k].name:'???',sc=r=>r?`<b>${r[0]}-${r[1]}</b>`:'',win=(pair,r)=>r?(r[0]>r[1]?pair[0]:pair[1]):null;
 const f=[win(T.sf[0],T.res[0]),win(T.sf[1],T.res[1])],champ=T.final?win(f,T.final):null;
 const cls=(k,r,pair)=>r&&win(pair,r)!==k?' out':k==='sunburst'?' you':'';
 return `<div class="bracket"><div class="round"><div class="match"><span class="${cls(T.sf[0][0],T.res[0],T.sf[0])}">${name(T.sf[0][0])}</span><span class="${cls(T.sf[0][1],T.res[0],T.sf[0])}">${name(T.sf[0][1])}</span>${sc(T.res[0])}</div><div class="match"><span class="${cls(T.sf[1][0],T.res[1],T.sf[1])}">${name(T.sf[1][0])}</span><span class="${cls(T.sf[1][1],T.res[1],T.sf[1])}">${name(T.sf[1][1])}</span>${sc(T.res[1])}</div></div><div class="round final"><div class="match"><span class="${f[0]==='sunburst'?'you':''}">${name(f[0])}</span><span>${name(f[1])}</span>${sc(T.final)}</div></div><div class="round cup"><div class="match champ">&#127942;<span>${champ?name(champ):'CHAMPION'}</span></div></div></div>`;
}
function simGame(){let a=14+Math.floor(Math.random()*16),b=14+Math.floor(Math.random()*16);if(a===b)a+=Math.random()<.5?2:-2;return[a,b];}
function tourneyResult(g){
 const T=g.tourney,res=[g.score[0],g.score[1]],won=res[0]>res[1];
 if(T.round===0){T.res[0]=res;T.res[1]=simGame();}else T.final=res;
 records.tourneyGames=(records.tourneyGames||0)+1;
 if(!won){dialog(T.round?'SO CLOSE. RUNNER-UP!':'KNOCKED OUT!',`<div class="score-big">${res[0]} - ${res[1]}</div>${bracketHTML(T)}${statRow(g)}`,[['NEW TOURNAMENT',tourneyMenu,true],['MAIN MENU',showMenu]],T.round?'CUP FINAL':'SEMIFINAL');return;}
 if(T.round===0){T.round=1;const other=T.res[1][0]>T.res[1][1]?T.sf[1][0]:T.sf[1][1];
  dialog('ON TO THE FINAL!',`<div class="score-big">${res[0]} - ${res[1]}</div><p>The <b>${TEAMS[other].name}</b> won the other semi ${Math.max(...T.res[1])}-${Math.min(...T.res[1])}. They're waiting.</p>${bracketHTML(T)}`,[['PLAY THE FINAL',()=>start('tournament',T.size,{opponent:other,tourney:T,aiBoost:1.06}),true,'play-final'],['MAIN MENU',showMenu]],'SEMIFINAL WON');return;}
 // Champions!
 records.titles++;save('lucasHoops.records.v1',records);celebrate('win',480,200);$('stage').classList.add('victory');
 dialog('SUNBURST CUP CHAMPIONS!',`<div class="trophy-wrap"><canvas id="trophy" width="220" height="230" aria-label="Pixel gold trophy"></canvas><div><div class="score-big">${res[0]} - ${res[1]}</div><p><b>LUCAS LIFTS THE CUP!</b> The whole arena is on its feet.</p><p class="muted-note">Cups won on this device: ${records.titles}</p></div></div>${bracketHTML(T)}`,[['NEW TOURNAMENT',tourneyMenu,true],['MAIN MENU',showMenu]],'TROPHY CEREMONY');
 const tc=$('trophy').getContext('2d');tc.imageSmoothingEnabled=false;A.trophy(tc,110,120,1.25);
}
// ---- Substitutions screen (timeouts and the next whistle). ----
function openSubs(fromWhistle=false){
 const g=state;if(!g||g.mode==='shootout'||g.online)return;scene='paused';clearInput();S.organ('timeout');
 const teams=g.humans.map(h=>h.team);let pick=null;
 function draw(){
  const bar=s=>`<i class="stam"><i style="width:${Math.round(s*100)}%;background:${s>.6?'#79e09a':s>.35?'#f2b14a':'#ff5a4a'}"></i></i>`;
  const html=teams.map(team=>`<div class="sub-team"><div class="panel-label">${teams.length>1?'P'+(team+1)+' ':''}${teamName(team)}: ON COURT</div><div class="sub-row">${g.players.filter(p=>p.team===team).map(p=>`<button class="sub-chip${pick?.id===p.id?' picked':''}" data-on="${p.id}">${p.pos} ${p.name.toUpperCase()}${bar(p.stamina)}</button>`).join('')}</div><div class="panel-label">BENCH</div><div class="sub-row">${g.bench[team].map((b,i)=>`<button class="sub-chip bench" data-team="${team}" data-bench="${i}">${ROSTERS[g.teams[team].key][b.ri].pos} ${ROSTERS[g.teams[team].key][b.ri].name.toUpperCase()}${bar(b.stamina)}</button>`).join('')}</div></div>`).join('');
  dialog(fromWhistle?'WHISTLE. MAKE YOUR SUBS.':'SUBSTITUTIONS',`<p>Tap a tired player, then a bench player to swap. Green = fresh, red = gassed (slower, shakier shot).</p>${html}`,[['BACK TO THE COURT',resume,true,'subs-done']],'BENCH');
  document.querySelectorAll('[data-on]').forEach(el=>el.onclick=()=>{pick=pBy(Number(el.dataset.on));sound('click');draw();});
  document.querySelectorAll('[data-bench]').forEach(el=>el.onclick=()=>{const team=Number(el.dataset.team);if(!pick||pick.team!==team){pop('PICK AN ON-COURT PLAYER FIRST','#ffd27a',.8);return;}swapIn(pick,g.bench[team][Number(el.dataset.bench)]);pick=null;sound('click');draw();});
 }
 function resume(){scene='play';$('dialog').hidden=true;last=performance.now();updateControls(true);}
 draw();
}
function requestSub(){
 const g=state;if(!g||scene!=='play')return;if(g.mode==='shootout'){pop('NO SUBS IN THE SHOOTOUT!','#ffd27a',.8);return;}
 if(g.online){pop('ONLINE GAMES AUTO-SUB TIRED PLAYERS','#ffd27a',1);return;}
 if(g.dead>0||g.ft){openSubs(true);return;}g.subQueued=true;pop('SUB AT THE NEXT WHISTLE','#ffd27a',1);
}
function pause(){
 if(scene!=='play')return;
 if(state?.online){clearInput();dialog('LEAVE THE ONLINE GAME?',`<p>The game keeps running while this is open.</p>`,[['KEEP PLAYING',()=>{$('dialog').hidden=true;},true],['LEAVE GAME',showMenu]],'ONLINE');return;}
 scene='paused';clearInput();S.organ('timeout');dialog('TIME OUT',`<p>The clock is stopped.</p><p><b>Tip:</b> Aim the joystick toward a teammate and tap Pass. On defense, Switch finds another defender. Plant with Charge before the attacker reaches you: too late is a blocking foul.</p>`,[['BACK TO THE COURT',()=>{scene='play';$('dialog').hidden=true;last=performance.now();},true],...(state.mode!=='shootout'?[['SUBSTITUTIONS',()=>openSubs(false)]]:[]),['MAIN MENU',showMenu]],'GAME PAUSED');
}
function refreshSound(){S.sync();$('mute').textContent=settings.sound?'SFX ON':'SFX OFF';$('mute').setAttribute('aria-pressed',String(!settings.sound));const el=$('music');if(el){el.textContent=settings.music?'🎶 ON':'🎶 OFF';el.setAttribute('aria-pressed',String(settings.music));}}
function settingsDialog(){
 dialog('YOUR GAME. YOUR RULES.',`<div class="setting-row"><span>SOUND EFFECTS</span><button id="sound-setting">${settings.sound?'ON':'OFF'}</button></div><div class="setting-row"><span>🎶 MUSIC</span><button id="music-setting">${settings.music?'ON':'OFF'}</button></div><div class="setting-row"><span>DIFFICULTY</span><button id="difficulty-setting">${levels[settings.difficulty]}</button></div><div class="setting-row"><span>POWER-UPS + ON FIRE</span><button id="powerups-setting">${settings.powerups?'ON':'OFF'}</button></div><div class="setting-row"><span>AUTO-SUB MY TEAM</span><button id="autosub-setting">${settings.autoSubs?'ON':'OFF'}</button></div><p>Rookie = relaxed defense + a bigger timing window. Baller and All-Star pick up the pressure, help on defense and take smarter shots.</p><p class="muted-note">No accounts or downloads. Scores stay on this device.</p>`,[['DONE',showMenu]],'SETTINGS');
 $('music-setting').onclick=()=>{settings.music=!settings.music;save('lucasHoops.settings.v1',settings);unlock();refreshSound();settingsDialog();};
 $('sound-setting').onclick=()=>{settings.sound=!settings.sound;save('lucasHoops.settings.v1',settings);unlock();refreshSound();settingsDialog();};$('difficulty-setting').onclick=()=>{settings.difficulty=(settings.difficulty+1)%3;save('lucasHoops.settings.v1',settings);settingsDialog();};
 $('powerups-setting').onclick=()=>{settings.powerups=!settings.powerups;save('lucasHoops.settings.v1',settings);settingsDialog();};$('autosub-setting').onclick=()=>{settings.autoSubs=!settings.autoSubs;save('lucasHoops.settings.v1',settings);settingsDialog();};
}
function themeDialog(){
 unlock();sound('click');const keys=Object.keys(A.THEMES);
 dialog('PICK YOUR COURT',`<div class="theme-grid">${keys.map(k=>`<button class="theme-card${k===settings.theme?' picked':''}" data-theme="${k}" id="theme-${k}"><canvas width="240" height="135" data-preview="${k}"></canvas><span>${A.THEMES[k].name}<small>${A.THEMES[k].sub}</small></span></button>`).join('')}</div>`,[['DONE',showMenu,true]],'COURT THEMES');
 for(const k of keys){A.rebuild(k);const c=document.querySelector(`[data-preview="${k}"]`).getContext('2d');c.setTransform(240/960,0,0,135/540,0,0);c.clearRect(0,0,960,540);A.arena(c,null,0,true);c.setTransform(1,0,0,1,0,0);}
 A.rebuild(settings.theme);
 document.querySelectorAll('[data-theme]').forEach(el=>el.onclick=()=>{settings.theme=el.dataset.theme;save('lucasHoops.settings.v1',settings);A.rebuild(settings.theme);sound('click');document.querySelectorAll('.theme-card').forEach(c=>c.classList.toggle('picked',c===el));const cl=$('court-label');if(cl)cl.textContent=themeLabel();});
}
function how(){
 unlock();dialog('RUN THE WHOLE COURT.',`<p><b>MOVE:</b> Touch anywhere on the left half and drag: the floating stick moves in all directions. Keyboard: WASD or arrow keys.</p><p><b>OFFENSE:</b> Hold <b>Shoot</b> (Space/J), release at the full green meter. Close to the hoop = dunk. Aim the stick toward a teammate and <b>Pass</b> (E/K); control follows the catch. <b>Cross/Spin</b> (Q) beats pressure. Hold <b>Sprint</b> (Shift) for speed.</p><p><b>DEFENSE:</b> <b>Block</b> (Space/J) jumps; <b>Steal</b> (E/K) works nearby (reach too often and it's a foul). <b>Charge</b> (Q) plants your feet: hold your spot before the dribbler hits you for an offensive foul; plant too late and it's a blocking foul. <b>Switch</b> (R/Tab) changes defender.</p><p><b>FREE THROWS:</b> Shooting fouls send you to the line. Tap <b>Shoot</b> when the slider is in the green.</p><p><b>SUBS:</b> Watch the stamina bars. Tap <b>SUB</b> (or Timeout) and swap in a fresh player at the next whistle.</p><p><b>POWER-UPS:</b> Grab a <b>SPEED</b> token for 6 seconds of jets, or a <b>FIRE</b> token. Three buckets in a row = <b>ON FIRE</b>: easier timing and a flaming ball until the other team scores.</p><p><b>OVERTIME:</b> Tied at the horn? 30 more seconds, as many times as it takes.</p><p><b>2 PLAYERS:</b> P1 uses the left side (WASD + F/G/H, Left Shift), P2 the right side (arrows + Enter / . / , and Right Shift).</p><p><b>ONLINE:</b> Host a room, read the 4-letter code to a friend, they join on their phone. Needs internet.</p><p><b>SHOOTOUT:</b> Lucas takes long-range shots for 60 seconds. All buckets = 3. P/Escape pauses.</p>`,[['LET\'S PLAY',showMenu,true]],'HOW TO PLAY');
}
// ---- Online rooms (host-authoritative; see net.js). ----
const r1=v=>Math.round(v*10)/10,r2=v=>Math.round(v*100)/100;
function myName(){try{return window.LA?.players?.current?.()?.name||'Friend';}catch(_){return 'Friend';}}
function netErr(e){const m=String(e?.message||e);return m==='offline'?'No internet. Online play needs Wi-Fi or data.':m==='no_room'?'No room with that code. Check the letters!':m==='full'?'That room already has two players.':m==='bad_code'?'Room codes are 4 letters.':m==='timeout'?"Can't reach the game server. Try again.":'Oops: '+m;}
async function loadNet(){await moduleReady('HoopsNet','net.js');return window.HoopsNet;}
function onlineMenu(){
 unlock();sound('click');let size=3;
 dialog('PLAY A FRIEND ONLINE',`<p>One phone <b>hosts</b> and gets a 4-letter room code. Your friend taps <b>Join</b> on their phone and types it in. Host = <b>Sunburst</b>, friend = <b>Night Owls</b>.</p>${sizeButtons('on')}<p class="muted-note">Needs internet on both phones. Uses the same game server as Poker Table.</p>`,[['HOST A ROOM',()=>hostRoom(size),true,'host-room'],['JOIN WITH A CODE',joinDialog,false,'join-room'],['BACK',showMenu]],'ONLINE');
 for(const n of [1,3,5]){const el=$('on-'+n);el.onclick=()=>{size=n;sound('click');for(const m of [1,3,5])$('on-'+m).classList.toggle('orange',m===n);};}
}
async function hostRoom(size){
 dialog('OPENING A ROOM...',`<p>Connecting to the game server...</p>`,[['CANCEL',showMenu]],'ONLINE');
 try{
  const N=await loadNet();lobby={role:'host',size,guest:null};
  net=await N.host({onMessage:hostMessage});lobby.code=net.code;drawHostLobby();
 }catch(e){net=null;lobby=null;dialog('COULD NOT HOST',`<p>${netErr(e)}</p>`,[['TRY AGAIN',onlineMenu,true],['MAIN MENU',showMenu]],'ONLINE');}
}
function drawHostLobby(){
 if(!lobby||scene==='play')return;const ready=!!lobby.guest;
 dialog(ready?'FRIEND JOINED!':'ROOM CODE',`<div class="room-code" id="room-code">${lobby.code}</div><p>${ready?`<b>${String(lobby.guest.name).toUpperCase()}</b> is in. ${lobby.size} ON ${lobby.size}, ${A.THEMES[settings.theme].name}.`:'Tell your friend this code. Waiting for them to join...'}</p>`,ready?[['START GAME',hostStart,true,'start-online'],['CANCEL',showMenu]]:[['CANCEL',showMenu]],'ONLINE / HOST');
}
function hostMessage(type,data){
 if(type==='probe'){net?.send('host-here',{});return;}
 if(type==='hello'){
  if(lobby&&!lobby.guest){lobby.guest={name:data.name||'Friend'};net.send('welcome',{size:lobby.size,theme:settings.theme});sound('steal');drawHostLobby();}
  else if(lobby?.guest&&lobby.guest.name===data.name&&scene!=='play')net.send('welcome',{size:lobby.size,theme:settings.theme});
  else net.send('full',{});return;}
 if(type==='bye'){peerLost('YOUR FRIEND LEFT THE ROOM.');return;}
 const g=state;if(!g||g.online!=='host')return;const h=g.humans[1];
 if(type==='in'){h.stick.x=clamp(Number(data.x)||0,-1,1);h.stick.y=clamp(Number(data.y)||0,-1,1);h.keys.sprint=!!data.s;}
 else if(type==='ev'){if(scene==='play')doAct(h,String(data.a),!!data.d);}
}
function hostStart(){
 if(!net||!lobby?.guest)return;net.send('start',{size:lobby.size,theme:settings.theme});
 start('online',lobby.size,{online:'host'});state.room=lobby.code;lobby.playing=true;
}
function joinDialog(){
 dialog('JOIN A ROOM',`<p>Type the 4-letter code from the host's screen.</p><input id="code-input" class="code-input" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCD" aria-label="Room code"><p class="muted-note" id="join-status">You'll play as the Night Owls.</p>`,[['JOIN',doJoin,true,'join-go'],['BACK',onlineMenu]],'ONLINE / JOIN');
 const el=$('code-input');el.addEventListener('input',()=>{el.value=el.value.toUpperCase().replace(/[^A-Z]/g,'');});el.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')doJoin();});setTimeout(()=>el.focus(),50);
}
async function doJoin(){
 const code=($('code-input')?.value||'').toUpperCase();const st=$('join-status');if(st)st.textContent='Looking for room '+code+'...';
 try{const N=await loadNet();lobby={role:'guest',code};net=await N.join(code,myName(),{onMessage:guestMessage});
  dialog('YOU\'RE IN!',`<div class="room-code">${code}</div><p>Waiting for the host to tip off...</p>`,[['LEAVE',showMenu]],'ONLINE / GUEST');
 }catch(e){net=null;lobby=null;if(st)st.textContent=netErr(e);else dialog('COULD NOT JOIN',`<p>${netErr(e)}</p>`,[['TRY AGAIN',joinDialog,true],['MAIN MENU',showMenu]],'ONLINE');}
}
function guestMessage(type,data){
 if(type==='welcome'){if(lobby)lobby.size=data.size;return;}
 if(type==='start'){start('online',Number(data.size)||3,{online:'guest',theme:A.THEMES[data.theme]?data.theme:undefined});state.room=lobby?.code;return;}
 if(type==='snap'){if(state?.online==='guest')applySnap(data);return;}
 if(type==='end'){const g=state;if(g?.online==='guest'&&!g.ended){g.score=data.score;g.period=data.period||0;finish();}return;}
 if(type==='bye'){peerLost('THE HOST CLOSED THE ROOM.');}
}
function peerLost(msg){
 const playing=state?.online&&!state.ended;leaveOnline(true);
 if(playing||lobby){scene='end';clearInput();$('play-ui').hidden=true;dialog('CONNECTION ENDED',`<p>${msg}</p>`,[['MAIN MENU',showMenu,true]],'ONLINE');}
 lobby=null;
}
function leaveOnline(quiet){if(net){try{net.close();}catch(_){ }net=null;}lobby=null;}
function snapshot(){
 const g=state,b=g.ball;g.snapN++;
 return{v:g.snapN,tm:r2(g.time),sc:g.score,st:r1(g.shotClock),pe:g.period,po:g.possession,dd:g.dead>0?1:0,bz:g.buzzer?1:0,nx:g.next,pf:g.pendingFT?1:0,
  pl:g.players.map(p=>[p.id,r1(p.x),r1(p.y),r1(p.z),r1(p.vx),r1(p.vy),p.face,r2(p.walk),(p.charging?1:0)|(p.plant>0?2:0)|(p.speedUp>0?8:0)|(p.boost>0?16:0),r2(p.spin),r2(p.stamina),p.ri]),
  b:[r1(b.x),r1(b.y),r1(b.z),b.owner||0,b.shot?1:0,b.pass?1:0,r2(b.angle),b.fire?1:0],
  hu:g.humans.map(h=>[h.control,r2(h.charge),h.chargeHeld?1:0]),
  ft:g.ft?[g.ft.team,g.ft.shooter,g.ft.left,g.ft.total,g.ft.phase,r2(g.ft.meter)]:null,
  pu:g.pickups.map(u=>[u.type,r1(u.x),r1(u.y),r2(u.life)]),fi:g.fire.map(r1),nt:g.net.map(r2),fo:g.fouls,fx:g.fx.splice(0)};
}
function applySnap(s){
 const g=state;if(s.v<=(g.lastSnap||0))return;g.lastSnap=s.v;g.snapAt=performance.now();
 Object.assign(g,{time:s.tm,score:s.sc,shotClock:s.st,period:s.pe,dead:s.dd?.5:0,buzzer:!!s.bz,next:s.nx,fire:s.fi,net:s.nt,fouls:s.fo});g.pendingFT=s.pf?{}:null;
 if(g.possession!==s.po){g.possession=s.po;}
 for(const a of s.pl){const p=pBy(a[0]);if(!p)continue;p.tx=a[1];p.ty=a[2];p.tz=a[3];p.vx=a[4];p.vy=a[5];p.face=a[6];p.walk=a[7];p.charging=!!(a[8]&1);p.plant=a[8]&2?1:0;p.speedUp=a[8]&8?1:0;p.boost=a[8]&16?1:0;p.spin=a[9];p.stamina=a[10];if(p.ri!==a[11])setIdentity(p,p.kit,a[11]);p._fire=g.fire[p.team]>0;if(p.x===0&&p.y===0||Math.hypot(p.tx-p.x,p.ty-p.y)>140){p.x=p.tx;p.y=p.ty;p.z=p.tz;}}
 const b=g.ball;b.tx=s.b[0];b.ty=s.b[1];b.tz=s.b[2];b.owner=s.b[3]||null;b.shot=!!s.b[4];b.pass=!!s.b[5];b.angle=s.b[6];b.fire=!!s.b[7];if(Math.hypot(b.tx-b.x,b.ty-b.y)>160){b.x=b.tx;b.y=b.ty;b.z=b.tz;}
 s.hu.forEach((a,i)=>{const h=g.humans[i];if(!h)return;h.control=a[0];h.charge=a[1];h.chargeHeld=!!a[2];});
 g.ft=s.ft?{team:s.ft[0],shooter:s.ft[1],left:s.ft[2],total:s.ft[3],phase:s.ft[4],meter:s.ft[5]}:null;
 g.pickups=s.pu.map(a=>({type:a[0],x:a[1],y:a[2],life:a[3]}));
 for(const e of s.fx||[]){const [k,...v]=e;
  if(k==='s')S.sound(v[0],{streak:v[1]});else if(k==='t')S.tone(...v);else if(k==='p'){messages.push({s:v[0],c:v[1],life:v[2],total:v[2]});if(messages.length>3)messages.shift();}
  else if(k==='b'){for(let i=0;i<v[3];i++)particles.push({x:v[0],y:v[1],vx:(Math.random()-.5)*180,vy:-Math.random()*150,life:.6+Math.random()*.5,c:v[2],size:2+Math.random()*3});}
  else if(k==='c')L.celebrate(v[0],v[1],v[2]);else if(k==='sh')shake=v[0];else if(k==='fl')flash=.1;else if(k==='w')wipe=.5;}
 updateControls();
}
function guestUpdate(dt){
 const g=state,k=1-Math.exp(-dt*14),kb=1-Math.exp(-dt*22);
 for(const p of g.players){if(p.tx==null)continue;p.x+=(p.tx-p.x)*k;p.y+=(p.ty-p.y)*k;p.z+=(p.tz-p.z)*k;}
 const b=g.ball;if(b.tx!=null){b.x+=(b.tx-b.x)*kb;b.y+=(b.ty-b.y)*kb;b.z+=(b.tz-b.z)*kb;}
 g.net=g.net.map(v=>Math.max(0,v-dt*1.5));
}
let netClock=0,lastSent='',lastSentAt=0;
function netTick(dt){
 if(!net)return;netClock+=dt;const g=state,now=performance.now();
 if(g?.online==='host'&&scene==='play'&&!g.ended){if(netClock>=1/15){netClock=0;net.send('snap',snapshot());}}
 else if(g?.online==='guest'&&scene==='play'&&!g.ended){const v=input(g.humans[1]),msg=JSON.stringify([r2(v.x),r2(v.y),keySets[0].sprint?1:0]);
  if((msg!==lastSent&&now-lastSentAt>90)||now-lastSentAt>300){lastSent=msg;lastSentAt=now;net.send('in',{x:r2(v.x),y:r2(v.y),s:keySets[0].sprint?1:0});}}
 else if(lobby&&netClock>1.5){netClock=0;}
 // Connection watchdog during a match.
 if(g?.online&&scene==='play'&&!g.ended&&net.quietFor>6000)peerLost(g.online==='host'?'LOST YOUR FRIEND\'S CONNECTION.':'LOST THE HOST\'S CONNECTION.');
}
// ---- Input binding: two controller slots (slot 1 only shows in 2-player mode). ----
$('quick').onclick=quickMenu;$('shootout').onclick=()=>start('shootout');$('settings').onclick=()=>{unlock();settingsDialog();};$('how').onclick=how;$('player-card').onclick=profile;$('pause').onclick=pause;
for(const [id,fn] of [['tournament',tourneyMenu],['versus',versusMenu],['online',onlineMenu],['court-btn',themeDialog]])if($(id))$(id).onclick=fn;
if($('subs'))$('subs').onclick=()=>{unlock();requestSub();};
if($('music'))$('music').onclick=()=>{settings.music=!settings.music;save('lucasHoops.settings.v1',settings);unlock();refreshSound();};
$('mute').onclick=()=>{settings.sound=!settings.sound;save('lucasHoops.settings.v1',settings);unlock();refreshSound();};
function bindAction(id,slot,a){
 const el=$(id);if(!el)return;el.addEventListener('pointerdown',e=>{e.preventDefault();unlock();el.setPointerCapture(e.pointerId);pointers.set(e.pointerId,id);el.classList.add('active');act(slot,a,true);});
 function release(e){if(pointers.get(e.pointerId)!==id)return;pointers.delete(e.pointerId);el.classList.remove('active');act(slot,a,false);}
 el.addEventListener('pointerup',release);el.addEventListener('pointercancel',release);el.addEventListener('lostpointercapture',release);
}
for(const [slot,sfx] of [[0,''],[1,'-2']]){
 for(const a of ['primary','secondary','move','fourth'])bindAction('action-'+(a)+sfx,slot,a);
 const zone=$('joystick-zone'+sfx),stick=sticks[slot],joy=$('joystick'+sfx),knob=$('stick-knob'+sfx);if(!zone)continue;
 const stickPosition=e=>{const box=$('stage').getBoundingClientRect();return{x:(e.clientX-box.x)/box.width*960,y:(e.clientY-box.y)/box.height*540};};
 const moveStick=e=>{if(stick.id!==e.pointerId)return;e.preventDefault();const p=stickPosition(e),dx=p.x-stick.ox,dy=p.y-stick.oy,len=Math.hypot(dx,dy),radius=50,mag=clamp((len-5)/(radius-5),0,1);
  stick.x=len?dx/len*mag:0;stick.y=len?dy/len*mag:0;knob.style.left=`${50+stick.x*32}%`;knob.style.top=`${50+stick.y*32}%`;};
 zone.addEventListener('pointerdown',e=>{if(scene!=='play'||stick.id!==null)return;e.preventDefault();unlock();zone.setPointerCapture(e.pointerId);const p=stickPosition(e);stick.id=e.pointerId;stick.ox=p.x;stick.oy=p.y;stick.x=stick.y=0;joy.style.left=p.x/960*100+'%';joy.style.top=p.y/540*100+'%';joy.hidden=false;moveStick(e);});
 zone.addEventListener('pointermove',moveStick);
 const releaseStick=e=>{if(stick.id!==e.pointerId)return;stick.id=null;stick.x=stick.y=0;joy.hidden=true;};
 zone.addEventListener('pointerup',releaseStick);zone.addEventListener('pointercancel',releaseStick);zone.addEventListener('lostpointercapture',releaseStick);
}
const movement={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down'};
const P1KEYS={KeyF:'primary',KeyG:'secondary',KeyH:'move',ShiftLeft:'fourth',KeyR:'switch'},P2KEYS={Enter:'primary',NumpadEnter:'primary',Period:'secondary',Comma:'move',ShiftRight:'fourth',Slash:'switch'};
function keySlot(code){if(state?.mode!=='versus')return 0;return code.startsWith('Arrow')?1:0;}
window.addEventListener('keydown',e=>{
 if(e.target?.tagName==='INPUT')return;
 if(scene==='intro'&&['Space','Enter','Escape','KeyP'].includes(e.code)){e.preventDefault();intro?.skip();return;}
 if(scene!=='menu'&&[...Object.keys(movement),'Space','KeyJ','KeyE','KeyK','KeyQ','KeyR','Tab','Escape','KeyP','ShiftLeft','ShiftRight','Enter','Slash','Period','Comma','KeyF','KeyG','KeyH'].includes(e.code))e.preventDefault();
 if(e.repeat)return;unlock();if(e.code==='Escape'||e.code==='KeyP'){if(scene==='play')pause();else if(scene==='paused'&&$('dialog-kicker').textContent==='GAME PAUSED'){scene='play';$('dialog').hidden=true;}return;}if(scene!=='play')return;
 if(movement[e.code])keySets[keySlot(e.code)][movement[e.code]]=true;
 if(state.mode==='versus'){if(P1KEYS[e.code]){if(e.code==='ShiftLeft')keySets[0].sprint=true;act(0,P1KEYS[e.code],true);}if(P2KEYS[e.code]){if(e.code==='ShiftRight')keySets[1].sprint=true;act(1,P2KEYS[e.code],true);}return;}
 if(['Space','KeyJ'].includes(e.code))act(0,'primary',true);if(['KeyE','KeyK'].includes(e.code))act(0,'secondary',true);if(e.code==='KeyQ')act(0,'move',true);if(['KeyR','Tab'].includes(e.code))act(0,'switch',true);if(e.code.startsWith('Shift'))keySets[0].sprint=true;
});
window.addEventListener('keyup',e=>{
 if(e.target?.tagName==='INPUT')return;
 if(movement[e.code])keySets[keySlot(e.code)][movement[e.code]]=false;
 if(state?.mode==='versus'){if(P1KEYS[e.code]==='primary')act(0,'primary',false);if(P2KEYS[e.code]==='primary')act(1,'primary',false);if(e.code==='ShiftLeft')keySets[0].sprint=false;if(e.code==='ShiftRight')keySets[1].sprint=false;return;}
 if(['Space','KeyJ'].includes(e.code))act(0,'primary',false);if(e.code.startsWith('Shift'))keySets[0].sprint=false;
});
window.addEventListener('blur',()=>{if(scene==='play'&&!state?.online)pause();clearInput();});
document.addEventListener('visibilitychange',()=>{S.visibility(document.hidden);if(document.hidden){if(scene==='play'&&!state?.online)pause();}else last=performance.now();});window.addEventListener('contextmenu',e=>e.preventDefault());
window.HOOPS={get state(){return state;},get scene(){return scene;},get input(){return{x:sticks[0].x,y:sticks[0].y};},get intro(){return intro?.snapshot||null;},get audio(){return S.snapshot;},get lights(){return L.snapshot;},get records(){return records;},get settings(){return settings;},get net(){return net?{role:net.role,code:net.code,status:net.status}:null;},get lobby(){return lobby;},
 version:'2.3',debug:{startFT(team=0,n=2){const g=state,p=g.players.find(q=>q.team===team);g.pendingFT={team,shooter:p.id,n};startFT();},forceOT(){const g=state;g.score[1]=g.score[0];g.time=.05;},start(mode,size,opts){start(mode,size,opts);},spawn(type='bolt',x=480,y=220){state.pickups=[{type,x,y,life:9}];},act(slot,a,d){act(slot,a,d);}}};
function beginIntro(replay=false){
 // A cache-first v14 tab can briefly mix old HTML and new JS during an update.
 if(!window.HoopsIntro||!$('intro-ui')){showMenu();return;}
 clearInput();scene='intro';$('main-menu').hidden=true;$('dialog').hidden=true;$('play-ui').hidden=true;$('intro-ui').hidden=false;
 intro=window.HoopsIntro.create({art:A,player:homeRoster[0],audio:{enabled:()=>!!settings.sound,ready:()=>S.ready,sound,tone,hiss},onDone:result=>{if(result.skipped)S.stopEffects();showMenu();},replay});
 if(navigator.userActivation?.hasBeenActive)unlock();refreshIntroSound();
}
function refreshIntroSound(){const el=$('intro-sound');if(!el)return;const ready=S.ready,label=!settings.sound?'SOUND OFF':ready?'SOUND ON':'TAP FOR SOUND';if(el.textContent!==label)el.textContent=label;const pressed=String(settings.sound&&ready);if(el.getAttribute('aria-pressed')!==pressed)el.setAttribute('aria-pressed',pressed);}
$('stage').addEventListener('pointerdown',e=>{if(scene==='intro'&&!e.target.closest('#intro-sound')){e.preventDefault();intro?.skip();}});
if($('intro-skip'))$('intro-skip').onclick=()=>{if(scene==='intro')intro?.skip();};
$('intro-sound')?.addEventListener('pointerdown',e=>e.stopPropagation());
if($('intro-sound'))$('intro-sound').onclick=e=>{e.stopPropagation();if(settings.sound&&S.ready){settings.sound=false;}else{settings.sound=true;unlock();}save('lucasHoops.settings.v1',settings);refreshSound();refreshIntroSound();};
if($('replay-intro'))$('replay-intro').onclick=()=>{unlock();beginIntro(true);};
window.addEventListener('pointerdown',e=>{if(!e.target.closest('#intro-sound'))unlock();},{capture:true});
window.addEventListener('pagehide',()=>leaveOnline(true));
function menuArt(){A.rebuild(settings.theme);A.logo();A.portrait($('menu-player').getContext('2d'),{...homeRoster[0],team:0},72,84);}
Promise.all([document.fonts.load('12px Pixel'),document.fonts.ready]).then(menuArt);menuArt();beginIntro();refreshSound();requestAnimationFrame(frame);
})();
