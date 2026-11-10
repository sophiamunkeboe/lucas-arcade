/* Lucas Hoops v2: full-court squads, original art, offline-first. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),A=window.HoopsArt;
const canvas=$('court'),ctx=canvas.getContext('2d',{alpha:false});
const W=960,H=540,LEFT=90,RIGHT=870,CY=A.CY,RIMZ=A.RIMZ,GRAVITY=760;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f;}catch(_){return f;}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(_){}};
let settings=read('lucasHoops.settings.v1',{sound:true,difficulty:0});
settings.difficulty=clamp(Number(settings.difficulty)||0,0,2);
let records=read('lucasHoops.records.v1',{shootout:0,quick:0,wins:0});
const levels=['ROOKIE','BALLER','ALL-STAR'];
let audio,t=0,scene='menu',state=null,last=0,flash=0,shake=0,lastPhase='';
const keys={left:false,right:false,up:false,down:false,sprint:false};
const stick={id:null,x:0,y:0,ox:0,oy:0},pointers=new Map();
let chargeHeld=false,sprintHeld=false,particles=[],messages=[];
const noiseData=new Float32Array(22050);for(let i=0;i<noiseData.length;i++)noiseData[i]=Math.random()*2-1;
function unlock(){
 if(!settings.sound)return;
 try{if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch(_){}
}
function tone(freq,duration,vol=.08,type='triangle',end=freq){
 if(!settings.sound||!audio||audio.state!=='running')return;
 const o=audio.createOscillator(),g=audio.createGain(),now=audio.currentTime;
 o.type=type;o.frequency.setValueAtTime(freq,now);o.frequency.exponentialRampToValueAtTime(Math.max(end,20),now+duration);
 g.gain.setValueAtTime(vol,now);g.gain.exponentialRampToValueAtTime(.001,now+duration);
 o.connect(g);g.connect(audio.destination);o.start();o.stop(now+duration);
}
function hiss(duration,vol=.08,freq=1800){
 if(!settings.sound||!audio||audio.state!=='running')return;
 const b=audio.createBuffer(1,noiseData.length,22050);b.copyToChannel(noiseData,0);
 const s=audio.createBufferSource(),g=audio.createGain(),f=audio.createBiquadFilter();s.buffer=b;s.loop=true;f.type='bandpass';f.frequency.value=freq;f.Q.value=.7;
 const now=audio.currentTime;g.gain.setValueAtTime(vol,now);g.gain.exponentialRampToValueAtTime(.001,now+duration);
 s.connect(f);f.connect(g);g.connect(audio.destination);s.start();s.stop(now+duration);
}
function sound(name){
 if(name==='dribble')tone(145,.075,.10,'sine',47);
 if(name==='swish'){hiss(.25,.16,3300);tone(740,.12,.035,'sine',1100);}
 if(name==='rim'){tone(650,.15,.1,'triangle',390);tone(1050,.1,.025,'sine',700);}
 if(name==='buzzer'){tone(160,.7,.09,'sawtooth',155);tone(240,.7,.035,'square',235);}
 if(name==='cheer'){hiss(.9,.16,900);tone(660,.16,.05,'square',880);setTimeout(()=>tone(990,.28,.04,'triangle'),130);}
 if(name==='steal'){tone(440,.09,.07,'square',880);}
 if(name==='click')tone(570,.065,.04,'square',780);
}
const homeRoster=[
 {name:'Lucas',pos:'PG',number:1,star:true,skin:'#edc09f',shade:'#c38d70',hair:'#63432e'},
 {name:'Nova',pos:'SG',number:8,skin:'#b98462',shade:'#87563d',hair:'#332631'},
 {name:'Rio',pos:'SF',number:23,skin:'#d9a67f',shade:'#a27052',hair:'#4d352b'},
 {name:'Jett',pos:'PF',number:32,skin:'#8d634e',shade:'#634232',hair:'#231f2d'},
 {name:'Enzo',pos:'C',number:14,skin:'#e2af84',shade:'#af7754',hair:'#70482f'}
];
const awayRoster=[
 {name:'Milo',pos:'PG',number:3,skin:'#c59778',shade:'#91664c',hair:'#352938'},
 {name:'Zeke',pos:'SG',number:11,skin:'#956b54',shade:'#684733',hair:'#24202f'},
 {name:'Arlo',pos:'SF',number:19,skin:'#edba91',shade:'#bf8965',hair:'#58422f'},
 {name:'Finn',pos:'PF',number:27,skin:'#d9a27c',shade:'#9e6b4f',hair:'#4e342d'},
 {name:'Atlas',pos:'C',number:42,skin:'#91664f',shade:'#65432f',hair:'#252235'}
];
function makePlayers(size){
 const ids=size===1?[0]:size===3?[0,1,4]:[0,1,2,3,4];let id=0;
 return [homeRoster,awayRoster].flatMap((roster,team)=>ids.map((n,i)=>({...roster[n],id:++id,team,index:i,x:0,y:0,z:0,vx:0,vy:0,vz:0,walk:0,face:team===0?1:-1,cool:0,boost:0,spin:0,plant:0,plantTime:0,charging:false,hold:0,think:1+i*.4,blockCool:0,stamina:1})));
}
function pBy(id){return state?.players.find(p=>p.id===id)||null;}
function controlled(){return pBy(state?.control);}
function owner(){return pBy(state?.ball.owner);}
function input(){
 let x=stick.x+Number(keys.right)-Number(keys.left),y=stick.y+Number(keys.down)-Number(keys.up),len=Math.hypot(x,y);
 if(len>1){x/=len;y/=len;}return{x,y,len:Math.min(1,len)};
}
function emptyBall(){return{x:440,y:CY,z:30,vx:0,vy:0,vz:0,owner:null,shooter:null,target:null,shot:false,pass:false,age:0,scored:false,rim:false,points:2,angle:0};}
function clearInput(){
 for(const k of Object.keys(keys))keys[k]=false;stick.id=null;stick.x=stick.y=0;chargeHeld=sprintHeld=false;pointers.clear();$('joystick').hidden=true;
 document.querySelectorAll('.circle-button').forEach(el=>el.classList.remove('active'));
 if(state)state.players.forEach(p=>p.charging=false);
}
function pop(s,c='#fff',life=1.2){messages.push({s,c,life,total:life});if(messages.length>3)messages.shift();}
function burst(x,y,c='#ffe18a',n=14){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*180,vy:-Math.random()*150,life:.6+Math.random()*.5,c,size:2+Math.random()*3});}
function start(mode,size=3){
 unlock();sound('click');clearInput();scene='play';$('main-menu').hidden=true;$('dialog').hidden=true;$('play-ui').hidden=false;
 const players=makePlayers(mode==='shootout'?1:size).filter(p=>mode!=='shootout'||p.team===0);
 state={mode,size:mode==='shootout'?1:size,players,control:players[0].id,possession:0,ball:emptyBall(),time:mode==='shootout'?60:90,shotClock:14,score:[0,0],fouls:[0,0],dead:0,next:0,net:[0,0],holdTime:0,charge:0,attempts:0,makes:0,streak:0,bestStreak:0,spot:0,buzzer:false,overWait:0,ended:false,autoSwitch:0,manualSwitch:0,dribble:0,metrics:{passes:0,catches:0,switches:0,steals:0,charges:0,blocks:0,dunks:0,crossovers:0,aiPasses:0},started:performance.now()};
 particles=[];messages=[];formation(0);take(players[0]);lastPhase='';updateControls();refreshSound();pop(mode==='shootout'?'LUCAS. 60 SECONDS. ALL THREES!':`${size} ON ${size}. SUNBURST BALL!`,'#ffd0a0',1.8);
}
function formation(team){
 const g=state,ys=g.size===1?[CY]:g.size===3?[CY,85,370]:[CY,65,145,310,410];
 for(const p of g.players){const attack=p.team===team;const dir=p.team===0?1:-1;
  p.x=attack?(p.index===0?(p.team===0?380:580):480+dir*(50+p.index*38)):(team===0?545:415)+(p.index%2)*34;
  p.y=ys[p.index];p.z=p.vz=p.vx=p.vy=0;p.plant=p.plantTime=p.hold=0;p.charging=false;p.think=1+p.index*.3;
 }
 if(g.mode==='shootout'){g.players[0].x=440;g.players[0].y=CY;}
}
function setControl(p,manual=false){
 if(!p||p.team!==0)return;
 if(state.control!==p.id){state.control=p.id;chargeHeld=false;state.players.forEach(q=>q.charging=false);}
 if(manual){state.manualSwitch=2.5;state.metrics.switches++;pop(p.name.toUpperCase()+'  /  '+p.pos,'#d9b8ff',.65);}
}
function autoDefender(force=false){
 const g=state;if(g.mode==='shootout'||g.possession!==1||(!force&&g.manualSwitch>0))return;
 const b=owner()||g.ball,nearest=g.players.filter(p=>p.team===0).sort((a,c)=>dist(a,b)-dist(c,b))[0],current=controlled();
 if(force||(!input().len&&dist(current,b)>dist(nearest,b)+85))setControl(nearest);
}
function take(p,resetClock=true){
 if(!p)return;const g=state,b=g.ball,changed=g.possession!==p.team;
 b.owner=p.id;b.shot=b.pass=b.scored=false;b.target=null;b.vx=b.vy=b.vz=0;b.age=0;if(resetClock||changed)g.shotClock=14;g.possession=p.team;p.think=1.0;p.hold=0;
 if(p.team===0)setControl(p);else if(changed||!g.manualSwitch)autoDefender(true);
 updateControls();
}
function isOffense(){return state?.mode==='shootout'||state?.possession===0;}
function jump(p){if(p&&p.z<.1&&p.plant<=0){p.vz=310;p.z=.1;tone(240,.05,.025,'triangle',370);}}
function nearHoop(p){return Math.hypot(p.x-(p.team===0?RIGHT:LEFT),p.y-CY)<72;}
function beginPrimary(){
 if(scene!=='play'||!state||state.dead>0)return;
 unlock();const p=controlled(),b=state.ball;
 if(isOffense()&&b.owner===p.id&&!state.buzzer){
  if(chargeHeld)return;if(nearHoop(p)&&state.mode!=='shootout'){dunk(p);return;}
  chargeHeld=true;state.holdTime=0;state.charge=0;p.charging=true;p.plant=0;jump(p);
 }else{jump(p);p.blockCool=.7;}
}
function releasePrimary(){
 if(!chargeHeld||!state)return;chargeHeld=false;const p=controlled();p.charging=false;
 if(scene==='play'&&state.ball.owner===p.id)launch(p,state.charge);
}
function launch(p,q){
 const g=state,b=g.ball,target=p.team===0?RIGHT:LEFT,threshold=[.8,.85,.9][settings.difficulty],perfect=q>=threshold;
 const error=perfect?0:(Math.random()<.5?-1:1)*(23+(1-q)*80),errorY=perfect?0:(Math.random()-.5)*(1-q)*90;
 b.owner=null;b.target=null;b.pass=false;b.x=p.x+p.face*12;b.y=p.y;b.z=p.z+55;b.shooter=p.id;b.shot=true;b.scored=false;b.rim=false;b.age=0;b.perfect=perfect;b.dunk=false;
 b.points=g.mode==='shootout'||Math.hypot(p.x-target,p.y-CY)>265?3:2;
 const flight=clamp(.65+Math.hypot(target-b.x,CY-b.y)/800,.65,1.45);
 b.vx=(target+error-b.x)/flight;b.vy=(CY+errorY-b.y)/flight;b.vz=(RIMZ-b.z+.5*GRAVITY*flight*flight)/flight;
 p.charging=false;p.hold=0;
 if(p.team===0){g.attempts++;pop(perfect?'PERFECT RELEASE!':q<.45?'TOO EARLY!':'JUST MISSED THE TIMING',perfect?'#c5ffd0':'#ffcd9f',.8);if(perfect)burst(p.x,A.project(p.y)-p.z-65,'#c5ffd0',8);}
 tone(420,.08,.025,'triangle',760);
 // A visible shot contest, not a hidden accuracy penalty.
 for(const defender of g.players){if(defender.team!==p.team&&dist(defender,p)<78&&Math.random()<[.08,.3,.65][settings.difficulty])jump(defender);}
}
function dunk(p){
 const g=state,b=g.ball,target=p.team===0?RIGHT:LEFT;
 p.x=clamp(p.x,target-27,target+27);p.y=CY;p.z=65;p.vz=80;
 Object.assign(b,{owner:null,target:null,x:target,y:CY,z:RIMZ+24,vx:0,vy:0,vz:-150,shot:true,pass:false,scored:false,rim:false,age:0,shooter:p.id,points:2,perfect:true,dunk:true});
 if(p.team===0){g.attempts++;g.metrics.dunks++;}shake=5;pop('BOOM! DUNK!','#ffd19e',1);burst(target,A.project(CY)-RIMZ,'#ffbd6d',18);
}
function choosePass(p,direction=input()){
 const choices=state.players.filter(q=>q.team===p.team&&q.id!==p.id);
 if(!choices.length)return null;
 const directional=direction.len>.15;
 const candidates=choices.map(q=>{const d=dist(p,q),dot=directional?((q.x-p.x)*direction.x+(q.y-p.y)*direction.y)/(d||1):0;return{p:q,d,dot};});
 const ahead=directional?candidates.filter(q=>q.dot>.25):candidates;
 return (ahead.length?ahead:candidates).sort((a,b)=>(a.d/(directional?1+Math.max(0,a.dot)*1.5:1))-(b.d/(directional?1+Math.max(0,b.dot)*1.5:1)))[0].p;
}
function passBall(p,target=null){
 const g=state,b=g.ball;if(b.owner!==p.id||p.cool>0||p.charging)return;
 target=target||choosePass(p);
 if(!target){cross();pop('SOLO. TRY A CROSSOVER!','#d4b5ee',.7);return;}
 Object.assign(b,{owner:null,target:target.id,pass:true,shot:false,scored:false,age:0,x:p.x,y:p.y,z:36,shooter:p.id,vz:0,passStartX:p.x,passStartY:p.y});
 p.cool=.35;p.think=1.3;if(p.team===0){g.metrics.passes++;pop('TO '+target.name.toUpperCase()+'!','#e2c9ff',.65);}else g.metrics.aiPasses++;
 tone(320,.07,.045,'triangle',600);updateControls();
}
function secondary(){
 if(scene!=='play'||!state||state.dead>0)return;const p=controlled(),o=owner();
 if(isOffense()){if(o?.id===p.id)passBall(p);else if(o?.team===0)passBall(o,p);return;}
 if(p.cool>0)return;p.cool=.55;
 if(o&&o.team!==p.team&&dist(p,o)<52&&o.z<15){
  if(Math.random()<[.98,.78,.57][settings.difficulty]&&o.spin<=0){take(p);state.metrics.steals++;sound('steal');pop('STEAL! GO SUNBURST!','#c2ffc9');burst(p.x,A.project(p.y)-30,'#e3c5ff',10);}
  else pop('KEEP PRESSURING!','#ead2ff',.65);
 }else if(!o){jump(p);}else pop('GET CLOSER TO STEAL','#e0c8f4',.6);
}
function cross(){
 if(scene!=='play'||!state||state.dead>0)return;const p=controlled();if(!isOffense()){plant();return;}
 if(p.cool>0)return;p.cool=.65;p.boost=.55;p.spin=.55;p.plant=0;state.metrics.crossovers++;
 const v=input();p.y=clamp(p.y+(v.len>.1?v.y:(p.y<CY?1:-1))*14,45,445);pop('CROSS / SPIN!','#ffd3ac',.7);tone(360,.09,.04,'triangle',690);
}
function plant(){
 const p=controlled();if(!p||p.z>0)return;p.plant=1.8;p.plantTime=0;p.vx=p.vy=0;p.charging=false;pop('FEET SET. HOLD YOUR GROUND.','#ffd6a1',.8);
}
function switchPlayer(){
 const g=state;if(!g||scene!=='play'||g.mode==='shootout')return;
 const b=owner()||g.ball,ours=g.players.filter(p=>p.team===0).sort((a,c)=>dist(a,b)-dist(c,b));
 if(ours.length===1){pop('LUCAS IS YOUR GUY!','#dec4f5',.6);return;}
 const i=ours.findIndex(p=>p.id===g.control);setControl(ours[(i+1)%ours.length],true);
}
function fourthDown(){if(isOffense())sprintHeld=true;else switchPlayer();}
function offensiveFoul(handler,defender){
 const g=state;g.fouls[handler.team]++;g.next=defender.team;g.possession=defender.team;g.dead=1.1;g.ball.owner=null;g.ball.shot=g.ball.pass=false;g.ball.vx=g.ball.vy=0;handler.vx=handler.vy=0;handler.x+=handler.team===0?-15:15;
 chargeHeld=false;handler.charging=false;defender.plant=0;g.metrics.charges+=defender.team===0?1:0;pop('CHARGE! OFFENSIVE FOUL!','#ffcb84',1.3);sound('buzzer');updateControls();
}
function score(team){
 const g=state,b=g.ball;if(b.scored)return;b.scored=true;b.shot=false;b.pass=false;b.vx*=.15;b.vy*=.15;g.score[team]+=b.points;g.net[team===0?1:0]=1;g.dead=1.0;g.next=1-team;
 if(team===0){g.makes++;g.streak++;g.bestStreak=Math.max(g.bestStreak,g.streak);}else g.streak=0;
 const who=team===0?'SUNBURST':'OWLS';pop((b.dunk?'SLAM DUNK! ':b.perfect?'SWISH! ':who+' BUCKET! ')+`+${b.points}`,team===0?'#ffcf9b':'#bce4ef',1.2);
 sound(b.dunk?'rim':'swish');sound('cheer');burst(b.x,A.project(CY)-RIMZ,'#ffd08a',22);flash=.1;
}
function nextPossession(){
 const g=state;if(g.buzzer){finish();return;}g.dead=0;g.ball=emptyBall();
 if(g.mode==='shootout'){
  const spots=[[440,CY],[400,100],[470,350],[360,320],[420,130]];g.spot=(g.spot+1)%spots.length;const p=g.players[0];[p.x,p.y]=spots[g.spot];p.z=p.vz=0;take(p);
 }else{formation(g.next);take(g.players.find(p=>p.team===g.next&&p.index===0));pop(g.next===0?'SUNBURST BALL. RIGHT HOOP >':'DEFENSE. PROTECT THE LEFT HOOP.','#e6c3ef',1);}
}
function moveToward(p,x,y,speed){const dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy);if(d<6){p.vx=p.vy=0;}else{const n=Math.min(1,d/22);p.vx=dx/d*speed*n;p.vy=dy/d*speed*n;}}
function ai(dt){
 const g=state,b=g.ball,o=owner(),d=settings.difficulty;
 if(g.mode==='shootout')return;
 for(const p of g.players){
  if(p.id===g.control){continue;}p.think-=dt;
  if(p.plant>0){p.vx=p.vy=0;continue;}
  const dir=p.team===0?1:-1,target=p.team===0?RIGHT:LEFT,speed=p.team===0?144:[118,145,173][d];
  if(o?.id===p.id){
   if(p.hold>0){p.vx=p.vy=0;p.hold+=dt;p.charging=true;if(p.hold>.59){p.charging=false;launch(p,[.68,.78,.86][d]+Math.random()*.23);p.think=1.8;}continue;}
   const defenders=g.players.filter(q=>q.team!==p.team),closest=Math.min(...defenders.map(q=>dist(p,q)));
   // Find an open cutter/wing, not just a random name on the roster.
   if(g.size>1&&p.think<-.3&&b.age>.85&&closest<105){
    const choices=g.players.filter(q=>q.team===p.team&&q.id!==p.id).map(q=>({p:q,open:Math.min(...defenders.map(r=>dist(q,r))),progress:dir*(q.x-p.x)})).filter(q=>q.open>42&&q.progress>-90).sort((a,c)=>(c.open+c.progress*.35)-(a.open+a.progress*.35));
    if(choices.length){passBall(p,choices[0].p);p.think=1.7;continue;}
   }
   const drive=(p.index%2===0&&closest>60)?62:154;
   moveToward(p,target-dir*drive,CY+Math.sin(t*.4+p.id)*18,speed);
   if(nearHoop(p)&&p.think<0){dunk(p);p.think=2;}
   else if((Math.hypot(p.x-target,p.y-CY)<220&&p.think<-.5)||g.shotClock<3){p.hold=.01;jump(p);}
  }else if(o?.team===p.team){
   const lanes=g.size===3?[CY,80,375]:[CY,60,140,315,415],cut=((t+p.index*1.7)%8)<1.7;
   const x=target-dir*(cut?105:160+(p.index%3)*60),y=cut?CY:lanes[p.index];moveToward(p,x,y,speed*.93);
  }else if(o){
   const ownTeam=g.players.filter(q=>q.team===p.team),nearest=ownTeam.reduce((a,c)=>dist(a,o)<dist(c,o)?a:c),match=g.players.find(q=>q.team!==p.team&&q.index===p.index)||o;
   const help=Math.hypot(o.x-(p.team===0?LEFT:RIGHT),o.y-CY)<180&&dist(p,o)<145;
   const mark=p.id===nearest.id||help?o:match;moveToward(p,clamp(mark.x-dir*28,65,895),mark.y+(p.index%2?10:-10),speed);
   if(p.cool<=0&&p.id===nearest.id&&dist(p,o)<33&&o.z<8&&!o.charging&&o.spin<=0){p.cool=1.7;
    if(Math.random()<[.05,.17,.31][d]){take(p);if(p.team===1)pop('OWLS STEAL! GET IT BACK!','#b9dce9');sound('steal');}}
  }else{
   const teammates=g.players.filter(q=>q.team===p.team),nearest=teammates.reduce((a,c)=>dist(a,b)<dist(c,b)?a:c);
   if(nearest.id===p.id)moveToward(p,b.x,b.y,speed*1.05);else moveToward(p,clamp(b.x-dir*(70+p.index*38),80,880),[CY,95,360,150,400][p.index],speed*.8);
   if(b.shot&&pBy(b.shooter)?.team!==p.team&&dist(p,b)<42&&b.z<110&&p.blockCool<=0){jump(p);p.blockCool=1.8;}
  }
 }
}
function integratePlayers(dt){
 const g=state,p=controlled(),v=input();
 if(p.plant>0){p.vx=p.vy=0;}else{const speed=p.charging?66:(p.boost>0?285:(sprintHeld||keys.sprint)&&isOffense()?265:184);p.vx=v.x*speed;p.vy=v.y*speed;}
 for(const q of g.players){
  q.cool=Math.max(0,q.cool-dt);q.boost=Math.max(0,q.boost-dt);q.spin=Math.max(0,q.spin-dt);q.blockCool=Math.max(0,q.blockCool-dt);
  if(q.plant>0){q.plant-=dt;q.plantTime+=dt;}else q.plantTime=0;
  if(q.z>0||q.vz>0){q.vz-=820*dt;q.z=Math.max(0,q.z+q.vz*dt);if(!q.z)q.vz=0;}
  q.x=clamp(q.x+q.vx*dt,g.mode==='shootout'?250:62,g.mode==='shootout'?580:898);q.y=clamp(q.y+q.vy*dt,45,445);q.walk+=Math.hypot(q.vx,q.vy)*dt*.1;if(Math.abs(q.vx)>4)q.face=q.vx>0?1:-1;
 }
 // Charge calls are resolved before body separation, after both players have moved.
 const handler=owner();
 if(handler&&!g.dead){for(const q of g.players){if(q.team!==handler.team&&q.plant>0&&q.plantTime>.14&&dist(q,handler)<29&&Math.hypot(handler.vx,handler.vy)>55){offensiveFoul(handler,q);break;}}}
 for(let i=0;i<g.players.length;i++)for(let j=i+1;j<g.players.length;j++){
  const a=g.players[i],b=g.players[j],dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy),min=20;
  if(d<min&&d>.01&&a.z<15&&b.z<15){const push=(min-d)*.5,nx=dx/d,ny=dy/d;if(a.plant<=0){a.x+=nx*push;a.y+=ny*push;}if(b.plant<=0){b.x-=nx*push;b.y-=ny*push;}}
 }
}
function physics(dt){
 const g=state,b=g.ball;b.age+=dt;b.angle+=Math.hypot(b.vx,b.vy)*dt*.018;
 if(b.owner){const p=owner();if(!p){b.owner=null;return;}const held=p.charging;b.x=p.x+p.face*14;b.y=p.y+4;b.z=p.z+(held?56:18+Math.abs(Math.sin(t*10))*17);
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
   if(b.z>70&&b.z<143&&Math.abs(b.y-CY)<37&&((oldX-board)*(b.x-board)<=0||Math.abs(b.x-board)<5)&&!b.scored){b.x=board+(oldX<board?-6:6);b.vx*=-.65;if(!b.rim)sound('rim');b.rim=true;}
   if(!b.scored&&Math.abs(b.z-RIMZ)<12){
    const radial=Math.hypot(b.x-x,b.y-CY),ringDistance=Math.hypot(radial-23,b.z-RIMZ);
    if(ringDistance<8&&radial>1){const nr=(radial-23)/(ringDistance||1),nz=(b.z-RIMZ)/(ringDistance||1),nx=(b.x-x)/radial*nr,ny=(b.y-CY)/radial*nr,dot=b.vx*nx+b.vy*ny+b.vz*nz;
     if(dot<0){b.vx-=1.6*dot*nx;b.vy-=1.6*dot*ny;b.vz-=1.6*dot*nz;b.z+=nz*2;if(!b.rim)sound('rim');b.rim=true;g.shotClock=14;}
    }
   }
   if(b.shot&&!b.scored&&b.vz<0&&oldZ>=RIMZ&&b.z<RIMZ&&Math.hypot(b.x-x,b.y-CY)<14)score(x===RIGHT?0:1);
  }
  if(b.z<6){b.z=6;b.vz=Math.abs(b.vz)*.55;b.vx*=.80;b.vy*=.80;if(b.vz>40)sound('dribble');if(g.mode==='shootout'&&!b.scored&&g.dead<=0){g.dead=.45;g.streak=0;}}
  if(b.x<46||b.x>914){b.x=clamp(b.x,46,914);b.vx*=-.64;}if(b.y<32||b.y>455){b.y=clamp(b.y,32,455);b.vy*=-.64;}
 }
 if(g.dead<=0&&!b.scored){
  for(const p of g.players){
   if(g.mode==='shootout'&&p.team!==0)continue;
   if(b.shot&&pBy(b.shooter)?.team!==p.team&&p.z>16&&dist(p,b)<29&&Math.abs(b.z-(p.z+54))<25&&b.age>.08){
    b.vx=(p.team===0?1:-1)*150;b.vy=(b.y-p.y)*3;b.vz=130;b.shot=false;b.rim=true;p.blockCool=1.5;pop(p.team===0?'BIG BLOCK!':'BLOCKED!','#e5ceff');sound('rim');burst(b.x,A.project(b.y)-b.z,'#ddc3ff',12);if(p.team===0)g.metrics.blocks++;
   }
   if(b.age>(b.shooter===p.id?1.0:.55)&&b.z<p.z+43&&dist(p,b)<27){take(p);pop(p.team===0?'SUNBURST REBOUND!':'OWLS REBOUND!','#dfc6ef',.7);break;}
  }
 }
 if(g.mode==='shootout'&&!b.owner&&!b.scored&&b.age>3.8&&g.dead<=0){g.dead=.3;g.streak=0;}
}
function update(dt){
 t+=dt;flash=Math.max(0,flash-dt);shake=Math.max(0,shake-dt*28);
 particles=particles.filter(p=>(p.life-=dt)>0);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=350*dt;}messages=messages.filter(m=>(m.life-=dt)>0);
 if(scene!=='play'||!state)return;const g=state;
 if(!g.buzzer){g.time=Math.max(0,g.time-dt);if(!g.time){g.buzzer=true;chargeHeld=false;controlled().charging=false;sound('buzzer');pop('BUZZER!','#ffcd91',1.1);if(g.ball.owner||!g.ball.shot){finish();return;}}}
 else{g.overWait+=dt;if(g.overWait>4){finish();return;}}
 g.net=g.net.map(v=>Math.max(0,v-dt*1.5));g.manualSwitch=Math.max(0,g.manualSwitch-dt);g.autoSwitch-=dt;
 if(g.dead>0){physics(dt);g.dead-=dt;for(const p of g.players){if(p.z>0){p.vz-=820*dt;p.z=Math.max(0,p.z+p.vz*dt);}}if(g.dead<=0)nextPossession();return;}
 if(chargeHeld){g.holdTime+=dt;g.charge=clamp(1-Math.abs(g.holdTime-.6)/.6,0,1);if(g.holdTime>=1.19)releasePrimary();}
 ai(dt);integratePlayers(dt);physics(dt);if(scene!=='play')return;
 if(g.autoSwitch<=0){g.autoSwitch=.8;autoDefender();}
 if(g.mode!=='shootout'&&!g.buzzer&&g.dead<=0){g.shotClock=Math.max(0,g.shotClock-dt);if(g.shotClock<=0&&(!g.ball.shot||g.ball.age>3.8)){g.next=1-g.possession;g.dead=.9;g.ball.owner=null;g.ball.shot=g.ball.pass=false;chargeHeld=false;controlled().charging=false;pop('SHOT CLOCK! SWITCH BALL.','#ffd0a0',1);sound('buzzer');}}
 if(g.buzzer&&!g.ball.shot&&g.dead<=0)finish();updateControls();
}
function render(){
 ctx.imageSmoothingEnabled=false;
 if(scene==='menu'){A.arena(ctx,null,t,true);ctx.fillStyle='#110d2bbf';ctx.fillRect(0,0,W,H);return;}
 const g=state;A.arena(ctx,g,t);if(!g)return;
 ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
 const things=g.players.filter(p=>g.mode!=='shootout'||p.team===0).map(p=>({y:p.y,type:'player',p}));things.push({y:CY,type:'hoop',x:LEFT},{y:CY,type:'hoop',x:RIGHT},{y:g.ball.y+1,type:'ball'});
 things.sort((a,b)=>a.y-b.y);for(const it of things){if(it.type==='player')A.player(ctx,it.p,t,it.p.id===g.control);else if(it.type==='hoop')A.hoop(ctx,it.x,g.net[it.x===LEFT?0:1]);else A.ball(ctx,g.ball,t);}
 for(const p of particles){ctx.globalAlpha=Math.min(1,p.life*3);A.box(ctx,p.x,p.y,p.size,p.size,p.c);}ctx.globalAlpha=1;
 if(flash>0){ctx.fillStyle=`rgba(255,210,160,${flash*.5})`;ctx.fillRect(0,0,W,H);}ctx.restore();
 A.bug(ctx,g);A.lineup(ctx,g);
 if(chargeHeld)A.meter(ctx,controlled(),g.charge,settings.difficulty);
 if(messages.length){const m=messages[messages.length-1],size=m.s.length>30?10:12;ctx.globalAlpha=clamp(m.life*3,0,1);ctx.font=`${size}px Pixel`;const tw=ctx.measureText(m.s).width;A.box(ctx,480-tw/2-12,139,tw+24,23,'#140c27dc');A.txt(ctx,m.s,480,150,size,m.c);ctx.globalAlpha=1;}
 const o=owner();A.txt(ctx,g.mode==='shootout'?`SHOOTOUT BEST ${records.shootout}`:g.dead>0?'NEXT BALL: '+(g.next===0?'SUNBURST':'OWLS'):(o?o.name.toUpperCase()+' HAS THE BALL':'LOOSE BALL'),480,505,7,'#c6a8db');
 A.txt(ctx,'TOUCH LEFT + DRAG TO MOVE',480,524,5,'#7d648b');
}
function frame(ts){let elapsed=Math.min(.25,(ts-last)/1000||.016);last=ts;while(elapsed>0){const dt=Math.min(1/120,elapsed);update(dt);elapsed-=dt;}render();requestAnimationFrame(frame);}
function updateControls(){
 if(!state)return;const phase=isOffense()?'offense':'defense';if(lastPhase===phase)return;lastPhase=phase;
 const labels=phase==='offense'?[['SHOOT','HOLD / RELEASE'],['PASS','AIM WITH STICK'],['CROSS','/ SPIN'],['SPRINT','HOLD']]:[['BLOCK','JUMP'],['STEAL','PRESSURE'],['CHARGE','PLANT FEET'],['SWITCH','PLAYER']];
 ['primary','secondary','move','fourth'].forEach((name,i)=>{const b=$('action-'+name);b.querySelector('span').textContent=labels[i][0];b.querySelector('small').textContent=labels[i][1];b.setAttribute('aria-label',labels[i].join(' '));});
 $('control-phase').textContent=phase==='offense'?'OFFENSE  >':'<  DEFENSE';
}
function dialog(title,body,actions,kicker='LOCKER ROOM'){
 $('dialog-title').textContent=title;$('dialog-body').innerHTML=body;$('dialog-actions').innerHTML='';$('dialog-kicker').textContent=kicker;
 for(const [label,fn,orange] of actions){const b=document.createElement('button');b.className='menu-btn'+(orange?' orange':'');b.textContent=label;b.onclick=()=>{unlock();sound('click');fn();};$('dialog-actions').appendChild(b);}$('dialog').hidden=false;
}
function showMenu(){clearInput();scene='menu';$('main-menu').hidden=false;$('play-ui').hidden=true;$('dialog').hidden=true;$('menu-best').textContent=records.shootout;}
function quickMenu(){
 unlock();sound('click');dialog('SQUAD UP.',`<p>Lucas runs point for the <b>Sunburst</b>. Nova and Enzo join him in 3v3; Rio and Jett complete the five.</p><div class="match-options"><button id="mode-1" class="menu-btn">1v1<small>SOLO DUEL</small></button><button id="mode-3" class="menu-btn orange">3v3<small>QUICK GAME</small></button><button id="mode-5" class="menu-btn">5v5<small>FULL SQUAD</small></button></div><p class="muted-note">90 seconds. 14-second shot clock. You attack the RIGHT hoop. Every mode works offline.</p>`,[['BACK',showMenu]],'QUICK GAME');
 for(const n of [1,3,5])$('mode-'+n).onclick=()=>start('quick',n);
}
function profile(){
 dialog('LUCAS / POINT GUARD',`<div class="player-profile"><canvas id="lucas-profile" width="240" height="288" aria-label="Lucas, teen point guard in a cream SUNS cap and black purple orange jersey"></canvas><div><h3>SMALL PIXELS.<br>BIG GAME.</h3><p>Brown hair. Cream cap. Braces and a big smile.</p><p>Black jersey, purple sides, orange trim. An original pixel sun for the whole squad.</p><div class="profile-badge">SUNBURST #1<br>TEAM CAPTAIN / PG</div></div></div>`,[['BACK TO THE TEAM',showMenu]],'MEET YOUR CAPTAIN');
 A.portrait($('lucas-profile').getContext('2d'),{...homeRoster[0],team:0},240,288);
}
function finish(){
 const g=state;if(!g||g.ended)return;g.ended=true;scene='end';clearInput();$('play-ui').hidden=true;
 const so=g.mode==='shootout',best=g.score[0]>(so?records.shootout:records.quick);if(so)records.shootout=Math.max(records.shootout,g.score[0]);else{records.quick=Math.max(records.quick,g.score[0]);if(g.score[0]>g.score[1])records.wins++;}save('lucasHoops.records.v1',records);
 if(window.LA?.store)window.LA.store.recordResult('lucas-hoops',{score:g.score[0]});
 const title=so?'SHOOTOUT COMPLETE':g.score[0]>g.score[1]?'SUNBURST WINS!':g.score[0]===g.score[1]?'TIE GAME!':'GOOD GAME!';
 dialog(title,`<div class="score-big">${so?g.score[0]:g.score[0]+' - '+g.score[1]}</div><p>${best?'<b>NEW PERSONAL BEST!</b>':so?'One big finish. Run it back?':'Keep sharing the ball. Your next highlight is waiting.'}</p><div class="stat-row"><div>BUCKETS<b>${g.makes}/${g.attempts}</b></div><div>${so?'BEST STREAK':'PASSES'}<b>${so?g.bestStreak:g.metrics.passes}</b></div><div>STEAL / BLOCK<b>${g.metrics.steals} / ${g.metrics.blocks}</b></div></div><p class="muted-note">Saved here. Shootout best: ${records.shootout} / Wins: ${records.wins}</p>`,[['REMATCH',()=>start(g.mode,g.size),true],['MAIN MENU',showMenu]],'FINAL BUZZER');
}
function pause(){
 if(scene!=='play')return;scene='paused';clearInput();dialog('TIME OUT',`<p>The clock is stopped.</p><p><b>Tip:</b> Aim the joystick toward a teammate and tap Pass. On defense, Switch finds another defender. Plant with Charge before the attacker reaches you.</p>`,[['BACK TO THE COURT',()=>{scene='play';$('dialog').hidden=true;last=performance.now();},true],['MAIN MENU',showMenu]],'GAME PAUSED');
}
function refreshSound(){$('mute').textContent=settings.sound?'SFX ON':'SFX OFF';$('mute').setAttribute('aria-pressed',String(!settings.sound));}
function settingsDialog(){
 dialog('YOUR GAME. YOUR RULES.',`<div class="setting-row"><span>SOUND</span><button id="sound-setting">${settings.sound?'ON':'OFF'}</button></div><div class="setting-row"><span>DIFFICULTY</span><button id="difficulty-setting">${levels[settings.difficulty]}</button></div><p>Rookie = relaxed defense + a bigger timing window. Baller and All-Star pick up the pressure.</p><p class="muted-note">No accounts or downloads. Scores stay on this device.</p>`,[['DONE',showMenu]],'SETTINGS');
 $('sound-setting').onclick=()=>{settings.sound=!settings.sound;save('lucasHoops.settings.v1',settings);unlock();refreshSound();settingsDialog();};$('difficulty-setting').onclick=()=>{settings.difficulty=(settings.difficulty+1)%3;save('lucasHoops.settings.v1',settings);settingsDialog();};
}
function how(){
 unlock();dialog('RUN THE WHOLE COURT.',`<p><b>MOVE:</b> Touch anywhere on the left half and drag: the floating stick moves in all directions. Keyboard: WASD or arrow keys.</p><p><b>OFFENSE:</b> Hold <b>Shoot</b> (Space/J), release at the full green meter. Close to the hoop = dunk. Aim the stick toward a teammate and <b>Pass</b> (E/K); control follows the catch. <b>Cross/Spin</b> (Q) beats pressure. Hold <b>Sprint</b> (Shift) for speed.</p><p><b>DEFENSE:</b> <b>Block</b> (Space/J) jumps; <b>Steal</b> (E/K) works nearby. <b>Charge</b> (Q) plants your feet: hold your spot before the dribbler hits you for an offensive foul. <b>Switch</b> (R/Tab) changes defender; the nearest defender is selected automatically when possession changes.</p><p><b>SQUADS:</b> Quick Game defaults to 3v3. Pick 1v1 or 5v5 too. Teammates spread out, cut and help on defense. The lineup highlights your player.</p><p><b>SHOOTOUT:</b> Lucas takes long-range shots for 60 seconds. All buckets = 3; shots released before the buzzer count. P/Escape pauses.</p>`,[['LET\'S PLAY',showMenu,true]],'HOW TO PLAY');
}
$('quick').onclick=quickMenu;$('shootout').onclick=()=>start('shootout');$('settings').onclick=()=>{unlock();settingsDialog();};$('how').onclick=how;$('player-card').onclick=profile;$('pause').onclick=pause;
$('mute').onclick=()=>{settings.sound=!settings.sound;save('lucasHoops.settings.v1',settings);unlock();refreshSound();};
function bindAction(id,down,up=()=>{}){
 const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();unlock();el.setPointerCapture(e.pointerId);pointers.set(e.pointerId,id);el.classList.add('active');down();});
 function release(e){if(pointers.get(e.pointerId)!==id)return;pointers.delete(e.pointerId);el.classList.remove('active');up();}
 el.addEventListener('pointerup',release);el.addEventListener('pointercancel',release);el.addEventListener('lostpointercapture',release);
}
bindAction('action-primary',beginPrimary,releasePrimary);bindAction('action-secondary',secondary);bindAction('action-move',cross);bindAction('action-fourth',fourthDown,()=>sprintHeld=false);
const zone=$('joystick-zone');
function stickPosition(e){const box=$('stage').getBoundingClientRect();return{x:(e.clientX-box.x)/box.width*960,y:(e.clientY-box.y)/box.height*540};}
function moveStick(e){
 if(stick.id!==e.pointerId)return;e.preventDefault();const p=stickPosition(e),dx=p.x-stick.ox,dy=p.y-stick.oy,len=Math.hypot(dx,dy),radius=50,mag=clamp((len-5)/(radius-5),0,1);
 stick.x=len?dx/len*mag:0;stick.y=len?dy/len*mag:0;$('stick-knob').style.left=`${50+stick.x*32}%`;$('stick-knob').style.top=`${50+stick.y*32}%`;
}
zone.addEventListener('pointerdown',e=>{if(scene!=='play'||stick.id!==null)return;e.preventDefault();unlock();zone.setPointerCapture(e.pointerId);const p=stickPosition(e);stick.id=e.pointerId;stick.ox=p.x;stick.oy=p.y;stick.x=stick.y=0;$('joystick').style.left=p.x/960*100+'%';$('joystick').style.top=p.y/540*100+'%';$('joystick').hidden=false;moveStick(e);});
zone.addEventListener('pointermove',moveStick);
function releaseStick(e){if(stick.id!==e.pointerId)return;stick.id=null;stick.x=stick.y=0;$('joystick').hidden=true;}
zone.addEventListener('pointerup',releaseStick);zone.addEventListener('pointercancel',releaseStick);zone.addEventListener('lostpointercapture',releaseStick);
const movement={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down'};
window.addEventListener('keydown',e=>{
 if(scene!=='menu'&&[...Object.keys(movement),'Space','KeyJ','KeyE','KeyK','KeyQ','KeyR','Tab','Escape','KeyP','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();
 if(e.repeat)return;unlock();if(e.code==='Escape'||e.code==='KeyP'){if(scene==='play')pause();else if(scene==='paused'){scene='play';$('dialog').hidden=true;}return;}if(scene!=='play')return;
 if(movement[e.code])keys[movement[e.code]]=true;if(['Space','KeyJ'].includes(e.code))beginPrimary();if(['KeyE','KeyK'].includes(e.code))secondary();if(e.code==='KeyQ')cross();if(['KeyR','Tab'].includes(e.code))switchPlayer();if(e.code.startsWith('Shift'))keys.sprint=true;
});
window.addEventListener('keyup',e=>{if(movement[e.code])keys[movement[e.code]]=false;if(['Space','KeyJ'].includes(e.code))releasePrimary();if(e.code.startsWith('Shift'))keys.sprint=false;});
window.addEventListener('blur',()=>{if(scene==='play')pause();clearInput();});document.addEventListener('visibilitychange',()=>{if(document.hidden){if(scene==='play')pause();if(audio)audio.suspend().catch(()=>{});}else last=performance.now();});window.addEventListener('contextmenu',e=>e.preventDefault());
window.HOOPS={get state(){return state;},get scene(){return scene;},get input(){return{x:stick.x,y:stick.y};}};
function menuArt(){A.rebuild();A.logo();A.portrait($('menu-player').getContext('2d'),{...homeRoster[0],team:0},72,84);}
Promise.all([document.fonts.load('12px Pixel'),document.fonts.ready]).then(menuArt);menuArt();showMenu();refreshSound();requestAnimationFrame(frame);
})();
