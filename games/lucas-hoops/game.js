/* Lucas Hoops. Original art, game and synthesized sound. No remote dependencies. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const canvas = $('court'), ctx = canvas.getContext('2d', {alpha:false});
const W=960,H=540,FLOOR=396,RIM=246,LEFT=104,RIGHT=856,GRAVITY=900;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f;}catch(_){return f;}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(_){}};
let settings=read('lucasHoops.settings.v1',{sound:true,difficulty:0});
settings.difficulty=clamp(Number(settings.difficulty)||0,0,2);
const levels=['ROOKIE','BALLER','ALL-STAR'];
let records=read('lucasHoops.records.v1',{shootout:0,quick:0,wins:0});
let audio, t=0, scene='menu', state=null, last=0, flash=0, shake=0;
const keys={left:false,right:false}, pointers=new Map();
let chargeHeld=false, particles=[], messages=[], trail=[];
const noiseData=new Float32Array(22050);
for(let i=0;i<noiseData.length;i++) noiseData[i]=Math.random()*2-1;
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
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function line(points,c,width=2){ctx.strokeStyle=c;ctx.lineWidth=width;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(Math.round(p[0]),Math.round(p[1])):ctx.moveTo(Math.round(p[0]),Math.round(p[1])));ctx.stroke();}
function text(s,x,y,size=14,color='#fff',align='center'){
 ctx.font=`${size}px Pixel, monospace`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle='#071736';ctx.fillText(s,x+2,y+3);ctx.fillStyle=color;ctx.fillText(s,x,y);
}
function circle(x,y,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.arc(Math.round(x),Math.round(y),r,0,Math.PI*2);ctx.fill();}
function ballArt(x,y,r=9,angle=0){
 ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(angle);circle(0,0,r+1,'#542b24');circle(0,0,r,'#f49a39');
 rect(-r+2,-r+3,r-1,3,'#ffc16a');ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.clip();
 line([[-r,0],[r,0]],'#8c4527',2);line([[0,-r],[0,r]],'#8c4527',2);
 ctx.strokeStyle='#8c4527';ctx.lineWidth=1.5;for(const dx of [-r*1.25,r*1.25]){ctx.beginPath();ctx.ellipse(dx,0,r,r*1.35,0,0,Math.PI*2);ctx.stroke();}ctx.restore();ctx.restore();
}
function hoop(x,net=0,mini=false){
 const dir=x<W/2?-1:1;
 // Steel support and transparent backboard.
 rect(x+dir*52,207,10,190,'#09203f');rect(x+dir*52,210,4,180,'#527794');rect(x+dir*45,390,29,7,'#092039');
 line([[x+dir*53,217],[x+dir*26,205]],'#8bb2cc',6);
 rect(x+dir*27-3,187,7,78,'#c2edff');rect(x+dir*27,192,2,67,'#6b9ec7');rect(x+dir*25-2,217,4,25,'#fff');
 const pulse=Math.sin(net*17)*Math.max(0,net)*4;
 line([[x-20,RIM+3],[x-12-pulse,RIM+32],[x+11+pulse,RIM+32],[x+20,RIM+3]],'#cce3eb',2);
 for(let i=0;i<5;i++){const xx=x-18+i*9;line([[xx,RIM+3],[x+(xx-x)*.6+6+pulse,RIM+30]],'#d6e6ed',1);line([[xx,RIM+3],[x+(xx-x)*.6-6-pulse,RIM+30]],'#7da2c1',1);}
 line([[x-17,RIM+14],[x+17,RIM+14]],'#91b4ca',1);line([[x-14,RIM+24],[x+14,RIM+24]],'#91b4ca',1);
 rect(x-23,RIM-3,46,5,'#803a22');rect(x-22,RIM-4,44,3,'#ff9d4b');rect(x-22,RIM+1,44,3,'#da612d');
}
const bg=document.createElement('canvas');bg.width=W;bg.height=H;
function makeCourt(){
 const c=bg.getContext('2d');
 // Draw once, not hundreds of spectators on every frame.
 c.fillStyle='#101e43';c.fillRect(0,0,W,H);
 const g=c.createLinearGradient(0,0,0,310);g.addColorStop(0,'#0b1635');g.addColorStop(1,'#304974');c.fillStyle=g;c.fillRect(0,0,W,310);
 for(let i=0;i<9;i++){c.fillStyle=i%2?'#15284d':'#1b3158';c.fillRect(i*120,25,4,255);}
 for(let row=0;row<5;row++){
  const yy=143+row*28;
  c.fillStyle='#101b3a';c.fillRect(0,yy+18,W,8);c.fillStyle='#364e77';c.fillRect(0,yy+23,W,3);
  for(let i=0;i<49;i++){
   const x=i*21+(row%2?8:0),seed=(i*173+row*97)%37;
   const shirt=['#5774a7','#d7894d','#7c73ac','#b3c9cf','#425b96','#457d85'][seed%6];
   c.fillStyle=shirt;c.fillRect(x,yy+8,12,13);c.fillStyle=['#d5a47e','#925e49','#bd886b','#e6bc96'][seed%4];c.fillRect(x+2,yy,8,9);c.fillStyle='#273247';c.fillRect(x+2,yy,8,3);
  }
 }
 // Team banners, ad boards, glowing fieldhouse sign.
 c.textAlign='center';
 for(const x of [155,735]){c.fillStyle='#245dc8';c.fillRect(x,26,65,81);c.fillStyle='#d4eaff';c.fillRect(x+5,31,55,4);c.font='10px Pixel';c.fillText('LH',x+32,60);c.fillStyle='#efb458';c.font='23px Pixel';c.fillText('01',x+32,90);}
 c.fillStyle='#0d234d';c.fillRect(0,287,960,31);c.fillStyle='#4d79af';c.fillRect(0,286,960,3);
 c.font='10px Pixel';for(const x of [130,830]){c.fillStyle='#91b3dc';c.fillText('MAKE SOME NOISE',x,307);}c.fillStyle='#c8e6ff';c.fillText('LUCAS FIELDHOUSE',480,307);
 // Parquet court, individually offset planks.
 for(let row=0;row<11;row++)for(let col=-1;col<17;col++){
  const x=col*66+(row%2)*33,y=318+row*14;
  c.fillStyle=['#bf8952','#cb965b','#d09d65','#c28c52','#d6a56e'][(row*13+col*7+50)%5];c.fillRect(x+1,y+1,65,13);
  c.fillStyle='#e3b57b33';c.fillRect(x+5,y+4,35,1);
 }
 c.fillStyle='#172c68';c.fillRect(0,456,W,84);c.fillStyle='#37598c';c.fillRect(0,455,W,3);
 c.strokeStyle='#ffe1a2';c.lineWidth=3;c.strokeRect(53,326,854,116);
 c.fillStyle='#31519c';c.fillRect(55,336,137,96);c.fillRect(768,336,137,96);
 c.strokeStyle='#f7d8a0';c.strokeRect(55,336,137,96);c.strokeRect(768,336,137,96);
 c.beginPath();c.ellipse(192,384,28,48,0,0,Math.PI*2);c.stroke();c.beginPath();c.ellipse(768,384,28,48,0,0,Math.PI*2);c.stroke();
 c.beginPath();c.ellipse(72,384,278,55,0,-Math.PI/2,Math.PI/2);c.stroke();c.beginPath();c.ellipse(888,384,278,55,0,Math.PI/2,Math.PI*1.5);c.stroke();
 c.beginPath();c.moveTo(480,326);c.lineTo(480,442);c.ellipse(480,384,62,40,0,0,Math.PI*2);c.stroke();
 c.save();c.translate(480,383);c.scale(1,.64);c.rotate(-.12);c.fillStyle='#315aab';c.fillRect(-36,-30,72,60);c.strokeStyle='#f2d29a';c.lineWidth=3;c.strokeRect(-36,-30,72,60);c.font='23px Pixel';c.fillStyle='#f6dfb4';c.fillText('LH',0,8);c.restore();
}
function menuPattern(){
 ctx.fillStyle='#132e6c';ctx.fillRect(0,0,W,H);
 for(let y=-40;y<600;y+=106)for(let x=-70;x<1050;x+=126){
  const xx=x+(Math.round(y/106)%2)*63;ctx.globalAlpha=.14;rect(xx,y,41,28,'#96bbfb');rect(xx+4,y+4,33,20,'#102958');rect(xx+15,y+12,12,12,'#739bdf');
  line([[xx+8,y+30],[xx+13,y+48],[xx+29,y+48],[xx+35,y+30]],'#a2c8ff',2);line([[xx+10,y+29],[xx+33,y+29]],'#a2c8ff',3);
  line([[xx+12,y+32],[xx+25,y+47]],'#9db8e7',1);line([[xx+30,y+32],[xx+17,y+47]],'#9db8e7',1);
 }ctx.globalAlpha=1;
 const g=ctx.createRadialGradient(370,260,20,430,260,650);g.addColorStop(0,'#2c5db233');g.addColorStop(1,'#06133499');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
}
function logo(){
 const el=$('logo'),old=ctx;const c=el.getContext('2d');c.clearRect(0,0,360,200);c.imageSmoothingEnabled=false;
 // A checkered, tapering net and an original lightning-ball crest.
 c.fillStyle='#091a43';c.beginPath();c.moveTo(87,66);c.lineTo(274,66);c.lineTo(235,180);c.lineTo(125,180);c.closePath();c.fill();
 for(let row=0;row<6;row++)for(let col=0;col<9;col++){
  const left=94+row*6,width=174-row*12,cell=width/9;
  c.fillStyle=(row+col)%2?'#c8e9ff':'#2b63c1';c.fillRect(Math.round(left+col*cell),75+row*16,Math.ceil(cell),15);
 }
 c.fillStyle='#081a40';c.fillRect(81,63,197,12);c.fillStyle='#f59e38';c.fillRect(85,62,189,6);
 // Pixel-stair ball silhouette.
 const spans=[[8,32],[4,42],[2,48],[0,52],[0,52],[2,48],[4,42],[8,32]];
 c.save();c.translate(125,8);c.scale(2.1,2.1);
 spans.forEach((s,i)=>{c.fillStyle='#09204a';c.fillRect(s[0]-2,i*6-2,s[1]+4,10);});
 spans.forEach((s,i)=>{c.fillStyle=i<3?'#ffbd57':i<6?'#f29432':'#d76a24';c.fillRect(s[0],i*6,s[1],7);});
 c.fillStyle='#ffda8b';c.fillRect(10,7,14,4);c.fillRect(6,12,5,8);c.fillStyle='#944a2c';c.fillRect(25,0,2,50);c.fillRect(0,24,52,2);
 c.fillRect(9,0,2,7);c.fillRect(13,7,2,10);c.fillRect(15,17,2,17);c.fillRect(11,34,2,9);c.fillRect(7,43,2,5);
 c.fillRect(41,0,2,7);c.fillRect(37,7,2,10);c.fillRect(35,17,2,17);c.fillRect(39,34,2,9);c.fillRect(43,43,2,5);c.restore();
 c.fillStyle='#fff2bd';c.beginPath();c.moveTo(232,51);c.lineTo(211,92);c.lineTo(230,92);c.lineTo(213,131);c.lineTo(257,81);c.lineTo(235,81);c.lineTo(251,51);c.fill();
}
function person(p,isCPU=false){
 const x=Math.round(p.x),y=Math.round(FLOOR-p.z),moving=Math.abs(p.vx)>12;
 const swing=moving?Math.sin(p.walk)*7:Math.sin(t*2)*.5;
 ctx.globalAlpha=.3;ctx.fillStyle='#1c243a';ctx.beginPath();ctx.ellipse(x,FLOOR+2,21-p.z*.045,5-p.z*.008,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 ctx.save();ctx.translate(x,y);if(p.face<0)ctx.scale(-1,1);
 const skin=isCPU?'#ad795c':'#e6b48a',shade=isCPU?'#825139':'#bb805e';
 // Pixel-sprite legs and chunky sneakers.
 rect(-12,-24,9,14+swing,shade);rect(4,-24,9,14-swing,skin);
 rect(-12,-12+swing,8,8,'#f5edda');rect(5,-12-swing,8,8,'#f5edda');
 rect(-16,-4+swing,15,5,'#12294e');rect(3,-4-swing,16,5,'#12294e');rect(-16,-5+swing,14,3,'#e0eeff');rect(3,-5-swing,14,3,'#fff');
 // Shorts, jersey outline, trim and number.
 rect(-15,-43,31,20,'#112348');rect(-15,-30,13,9,isCPU?'#a65a1d':'#183d9a');rect(3,-30,13,9,isCPU?'#a65a1d':'#183d9a');
 rect(-15,-58,31,29,'#102441');rect(-12,-57,25,26,isCPU?'#ed9736':'#4484f3');rect(-12,-57,4,26,isCPU?'#ffcf68':'#99c8ff');
 rect(-8,-57,16,4,'#f6e4b8');rect(-12,-34,25,3,'#f5e7cb');
 ctx.font='11px Pixel';ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText(isCPU?'7':'1',1,-39);
 // Arms rise when charging, jumping to block, or dunking.
 const up=p.z>12||p.charging;
 if(up){rect(-21,-72,7,25,shade);rect(-21,-76,10,7,skin);rect(15,-71,7,25,skin);rect(13,-77,10,8,skin);}
 else {rect(-20,-53,8,23+swing*.4,shade);rect(14,-53,8,18-swing*.4,skin);rect(15,-36-swing*.4,11,7,skin);}
 // Neck, head, hair, eyes, ear and little headband.
 rect(-6,-65,13,10,shade);rect(-11,-86,25,24,'#16243b');rect(-10,-83,23,20,skin);rect(-10,-80,5,17,shade);rect(12,-77,5,9,skin);
 rect(-11,-89,24,9,isCPU?'#302d3b':'#6b452b');rect(-12,-83,6,10,isCPU?'#302d3b':'#6b452b');rect(-12,-82,25,4,isCPU?'#ffda74':'#e4f6ff');
 rect(6,-76,4,4,'#1c2334');rect(9,-68,5,2,shade);ctx.restore();
 if(!isCPU){ctx.fillStyle='#7cbdff';ctx.beginPath();ctx.moveTo(x-5,FLOOR+12);ctx.lineTo(x+5,FLOOR+12);ctx.lineTo(x,FLOOR+17);ctx.fill();}
}
function player(x,face){return{x,z:0,vz:0,vx:0,face,walk:0,charging:false,cool:0,boost:0};}
function resetBall(){return{x:0,y:0,vx:0,vy:0,owner:1,shooter:0,age:0,shot:false,scored:false,rim:false,points:2,angle:0};}
function start(mode){
 unlock();sound('click');$('main-menu').hidden=true;$('dialog').hidden=true;$('play-ui').hidden=false;scene='play';
 state={mode,time:mode==='shootout'?60:90,shotClock:14,score:[0,0],p:player(mode==='shootout'?440:370,1),cpu:player(640,-1),ball:resetBall(),charge:0,holdTime:0,dead:0,next:1,net:[0,0],cpuThink:1.5,cpuHold:0,stealTimer:2,attempts:0,makes:0,streak:0,bestStreak:0,spot:0,buzzer:false,overWait:0,ended:false,metrics:{steals:0,blocks:0,dunks:0},started:performance.now()};
 particles=[];messages=[];trail=[];clearInput();pop(mode==='shootout'?'60 SECONDS. LET IT FLY!':'YOU ATTACK THE RIGHT HOOP!', '#d9ecff',2.2);refreshSound();
}
function clearInput(){keys.left=keys.right=false;pointers.clear();chargeHeld=false;if(state)state.p.charging=false;}
function showMenu(){clearInput();scene='menu';$('main-menu').hidden=false;$('play-ui').hidden=true;$('dialog').hidden=true;$('menu-best').textContent=records.shootout;}
function pop(s,c='#fff',life=1.2){messages.push({s,c,life,total:life});if(messages.length>3)messages.shift();}
function burst(x,y,c='#ffe18a',count=16){for(let i=0;i<count;i++)particles.push({x,y,vx:(Math.random()-.5)*220,vy:-Math.random()*180,life:.65+Math.random()*.4,c,size:2+Math.random()*4});}
function take(owner){
 const g=state,b=g.ball;b.owner=owner;b.shot=false;b.scored=false;b.vx=b.vy=0;b.age=0;g.shotClock=14;g.cpuThink=1+Math.random();g.cpuHold=0;
 if(owner===1){g.p.face=1;}else{g.cpu.face=-1;chargeHeld=false;g.p.charging=false;}
}
function inRange(p,right=true){return Math.abs(p.x-(right?RIGHT:LEFT))<82;}
function jump(p){if(p.z<.1){p.vz=365;p.z=.2;tone(240,.06,.025,'triangle',360);}}
function beginShot(){
 if(scene!=='play'||!state||state.dead>0||chargeHeld||state.buzzer)return;
 unlock();const g=state;
 if(g.ball.owner===1){
  if(inRange(g.p)&&g.mode!=='shootout'){dunk(1);return;}
  chargeHeld=true;g.holdTime=0;g.charge=0;g.p.charging=true;jump(g.p);
 }else{jump(g.p);}
}
function releaseShot(){
 if(!chargeHeld||!state)return;chargeHeld=false;state.p.charging=false;
 if(scene==='play'&&state.ball.owner===1)launch(1,state.charge);
}
function launch(who,q){
 const g=state,p=who===1?g.p:g.cpu,b=g.ball,target=who===1?RIGHT:LEFT,dir=who===1?1:-1;
 const perfect=q>=[.80,.85,.90][settings.difficulty];
 const error=perfect?0:(Math.random()<.5?-1:1)*(25+(1-q)*105);
 b.owner=0;b.x=p.x+dir*18;b.y=FLOOR-p.z-73;b.shooter=who;b.shot=true;b.scored=false;b.rim=false;b.age=0;b.points=g.mode==='shootout'||Math.abs(p.x-target)>258?3:2;b.perfect=perfect;b.dunk=false;
 const flight=clamp(.72+Math.abs(target-b.x)/700,.7,1.65);
 b.vx=(target+error-b.x)/flight;b.vy=(RIM-b.y-.5*GRAVITY*flight*flight)/flight;
 if(who===1){g.attempts++;pop(perfect?'PERFECT RELEASE!':q<.45?'TOO EARLY!':g.holdTime>.6?'A LITTLE LATE!':'NICE TRY! ',perfect?'#a5ffb7':'#ffe1a0',.9);if(perfect)burst(p.x,FLOOR-p.z-104,'#a5ffb7',8);}
 // Defense can jump to contest. Physics decides whether the hand reaches the ball.
 if(who===1&&g.mode==='quick'&&Math.abs(g.cpu.x-p.x)<110&&Math.random()<[.12,.35,.7][settings.difficulty])jump(g.cpu);
 tone(410,.09,.025,'sine',760);
}
function dunk(who){
 const g=state,p=who===1?g.p:g.cpu,b=g.ball,target=who===1?RIGHT:LEFT;
 p.x=clamp(p.x,target-40,target+40);p.z=113;p.vz=90;
 b.owner=0;b.x=target;b.y=RIM-27;b.vx=0;b.vy=170;b.shot=true;b.scored=false;b.rim=false;b.age=0;b.shooter=who;b.points=2;b.perfect=true;b.dunk=true;
 if(who===1){g.attempts++;g.metrics.dunks++;}pop('BOOM! DUNK!','#ffd47c',1.4);shake=8;burst(target,RIM,'#ffcb69',22);
}
function steal(){
 if(scene!=='play'||!state||state.dead>0||state.p.cool>0)return;
 unlock();const g=state,p=g.p;p.cool=.65;
 if(g.ball.owner===1){p.boost=.35;pop('PASS FAKE!','#a9cfff',.65);tone(300,.05,.03,'sine',500);}
 else if(g.mode==='quick'&&g.ball.owner===2&&Math.abs(p.x-g.cpu.x)<67&&g.cpu.z<20){
  if(Math.random()<[.95,.72,.5][settings.difficulty]){take(1);g.metrics.steals++;pop('STEAL!','#9ff9bf');sound('steal');burst(p.x,FLOOR-45,'#a7d9ff',8);}else{pop('STAY WITH IT!','#b5ceff',.65);}
 }else if(!g.ball.owner){jump(p);}
}
function scored(who){
 const g=state,b=g.ball;if(b.scored)return;
 b.scored=true;b.shot=false;b.vx*=.15;g.score[who-1]+=b.points;g.net[who===1?1:0]=1;g.dead=1.1;g.next=who===1?2:1;
 if(who===1){g.makes++;g.streak++;g.bestStreak=Math.max(g.bestStreak,g.streak);}else{g.streak=0;}
 pop(who===1?(b.dunk?'SLAM DUNK! ':b.perfect?'SWISH! ':'BUCKET! ')+`+${b.points}`:`CPU +${b.points}`,who===1?'#b8ffcf':'#ffd592',1.5);
 sound(b.dunk?'rim':'swish');sound('cheer');burst(b.x,RIM+10,who===1?'#9fedc5':'#ffc980',24);flash=.12;
}
function newPossession(){
 const g=state;trail=[];g.dead=0;
 if(g.buzzer){finish();return;}
 if(g.mode==='shootout'){
  const spots=[440,385,490,340,415];g.spot=(g.spot+1)%spots.length;g.p.x=spots[g.spot];g.p.z=g.p.vz=0;g.ball=resetBall();take(1);
 }else{
  const who=g.next;g.p.x=who===1?360:310;g.cpu.x=who===1?620:560;
  g.p.z=g.p.vz=g.cpu.z=g.cpu.vz=0;g.ball=resetBall();take(who);
  pop(who===1?'YOUR BALL. RIGHT HOOP >':'DEFEND! CPU ATTACKS LEFT <',who===1?'#add6ff':'#ffce91',1.1);
 }
}
function ai(dt){
 const g=state,c=g.cpu,p=g.p,b=g.ball,d=settings.difficulty;
 if(g.mode!=='quick')return;
 g.cpuThink-=dt;g.stealTimer-=dt;
 let target=c.x;
 if(b.owner===2){
  if(g.cpuHold>0){c.charging=true;g.cpuHold+=dt;if(g.cpuHold>.57){c.charging=false;g.cpuHold=0;launch(2,[.66,.76,.86][d]+Math.random()*.24);g.cpuThink=2;}}
  else{
   target=LEFT+([125,95,58][d]);
   if(inRange(c,false)&&g.cpuThink<0){dunk(2);g.cpuThink=2;}
   else if((Math.abs(c.x-target)<25||g.shotClock<3)&&g.cpuThink<0){g.cpuHold=.01;jump(c);}
  }
 }else if(b.owner===1){
  target=clamp(p.x+75,150,850);
  if(g.stealTimer<0){g.stealTimer=2+Math.random()*2;
   if(Math.abs(c.x-p.x)<48&&p.z<8&&!chargeHeld&&Math.random()<[.1,.25,.42][d]){take(2);pop('CPU STEAL! GET IT BACK!','#ffcc91');sound('steal');}}
 }else if(!b.scored){target=b.x;}
 c.vx=g.cpuHold>0?0:clamp(target-c.x,-1,1)*[124,158,192][d];c.x=clamp(c.x+c.vx*dt,65,895);if(Math.abs(c.vx)>10)c.face=c.vx>0?1:-1;
}
function physics(dt){
 const g=state,b=g.ball;
 b.age+=dt;b.angle+=b.vx*dt*.012;
 if(b.owner){
  const p=b.owner===1?g.p:g.cpu,hold=(b.owner===1?chargeHeld:g.cpuHold>0);
  b.x=p.x+p.face*23;b.y=FLOOR-p.z-(hold?77:35+Math.abs(Math.sin(t*10))*21);
  if(!hold&&p.z<5&&Math.sin((t-dt)*10)<0&&Math.sin(t*10)>=0)sound('dribble');return;
 }
 // Two substeps: continuous net crossing plus small-circle rim collision.
 for(let n=0;n<2;n++){
  const h=dt/2,oldY=b.y;b.vy+=GRAVITY*h;b.x+=b.vx*h;b.y+=b.vy*h;
  for(const x of [LEFT,RIGHT]){
   const board=x+(x===LEFT?-27:27);
   if(b.y>180&&b.y<264&&Math.abs(b.x-board)<11&&!b.scored){b.x=board+(b.x<board?-11:11);b.vx*=-.66;sound('rim');b.rim=true;}
   for(const rx of [x-23,x+23]){
    const dx=b.x-rx,dy=b.y-RIM,dist=Math.hypot(dx,dy);
    if(dist<11&&dist>.001&&!b.scored){
     const nx=dx/dist,ny=dy/dist,dot=b.vx*nx+b.vy*ny;
     b.x=rx+nx*11;b.y=RIM+ny*11;if(dot<0){b.vx-=1.58*dot*nx;b.vy-=1.58*dot*ny;if(!b.rim)sound('rim');b.rim=true;g.shotClock=14;}
    }
   }
   if(b.shot&&!b.scored&&b.vy>0&&oldY<=RIM&&b.y>RIM&&Math.abs(b.x-x)<14){
    // Own basket counts for the side attacking this hoop, never the shooter by mistake.
    scored(x===RIGHT?1:2);
   }
  }
  if(b.y>FLOOR-7){b.y=FLOOR-7;b.vy=-Math.abs(b.vy)*.60;b.vx*=.79;if(Math.abs(b.vy)>45)sound('dribble');
   if(g.mode==='shootout'&&!b.scored&&g.dead<=0){g.streak=0;g.dead=.5;g.next=1;}}
  if(b.x<42||b.x>918){b.x=clamp(b.x,42,918);b.vx*=-.65;}
 }
 if(!b.scored&&g.dead<=0){
  for(const [p,who] of [[g.p,1],[g.cpu,2]]){
   if(who===2&&g.mode==='shootout')continue;
   // An elevated defender's hand can knock a live shot away.
   if(b.shot&&b.shooter!==who&&p.z>20&&Math.abs(p.x-b.x)<28&&Math.abs(FLOOR-p.z-83-b.y)<27&&b.age>.1){
    b.vx=(who===1?1:-1)*160;b.vy=-140;b.shot=false;b.rim=true;
    pop(who===1?'BIG BLOCK!':'BLOCKED!','#bee1ff');sound('rim');burst(b.x,b.y,'#c8e8ff',12);if(who===1)g.metrics.blocks++;
   }
   if(b.age>(b.shooter===who?.9:.5)&&b.y>FLOOR-p.z-61&&Math.abs(p.x-b.x)<30){
    take(who);pop(who===1?'REBOUND!':'CPU REBOUND',who===1?'#a8e5ff':'#ffd29b',.8);break;
   }
  }
 }
 if(g.mode==='shootout'&&!b.owner&&!b.scored&&b.age>3.8&&g.dead<=0){g.dead=.35;g.streak=0;}
}
function update(dt){
 t+=dt;flash=Math.max(0,flash-dt);shake=Math.max(0,shake-dt*28);
 particles=particles.filter(p=>(p.life-=dt)>0);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=400*dt;}
 for(const m of messages)m.life-=dt;messages=messages.filter(m=>m.life>0);
 if(scene!=='play'||!state)return;
 const g=state;
 if(!g.buzzer){g.time=Math.max(0,g.time-dt);if(g.time===0){g.buzzer=true;chargeHeld=false;g.p.charging=false;sound('buzzer');pop('BUZZER!','#ffd18a',1.3);
   if(g.ball.owner||!g.ball.shot){finish();return;}}}
 else{g.overWait+=dt;if(g.overWait>4){finish();return;}}
 for(const p of [g.p,g.cpu]){p.cool=Math.max(0,p.cool-dt);p.boost=Math.max(0,p.boost-dt);p.walk+=Math.abs(p.vx)*dt*.09;
  if(p.z>0||p.vz>0){p.vz-=920*dt;p.z=Math.max(0,p.z+p.vz*dt);if(p.z===0)p.vz=0;}}
 g.net=g.net.map(v=>Math.max(0,v-dt*1.4));
 if(g.dead>0){physics(dt);g.dead-=dt;if(g.dead<=0)newPossession();return;}
 const p=g.p;const move=Number(keys.right)-Number(keys.left);
 p.vx=move*(p.charging?90:p.boost>0?330:235);p.x=clamp(p.x+p.vx*dt,g.mode==='shootout'?250:67,g.mode==='shootout'?580:893);if(move)p.face=move;
 if(chargeHeld){g.holdTime+=dt;g.charge=clamp(1-Math.abs(g.holdTime-.6)/.6,0,1);if(g.holdTime>=1.19)releaseShot();}
 ai(dt);physics(dt);
 if(scene!=='play')return;
 if(g.mode==='quick'&&!g.buzzer){g.shotClock-=dt;if(g.shotClock<=0){
  const owner=g.ball.owner||g.ball.shooter||1;g.next=owner===1?2:1;g.dead=.9;g.ball.owner=0;g.ball.shot=false;chargeHeld=false;p.charging=false;
  pop('SHOT CLOCK! SWITCH BALL.','#ffc986',1.1);sound('buzzer');}}
 if(g.buzzer&&!g.ball.shot&&g.dead<=0)finish();
 if(!g.ball.owner){trail.push({x:g.ball.x,y:g.ball.y});if(trail.length>9)trail.shift();}else trail=[];
}
function meter(){
 const g=state,p=g.p,x=clamp(p.x,100,860),y=FLOOR-p.z-118;
 rect(x-53,y-20,106,36,'#091932');rect(x-49,y-16,98,14,'#34517b');rect(x+30,y-16,19,14,'#6bdc92');
 rect(x-49,y-16,98*g.charge,14,g.charge>.82?'#baffca':'#f4b24b');rect(x+30,y-16,2,14,'#d5ffe0');
 rect(x-51+g.charge*98,y-20,4,22,'#fff');text('RELEASE AT TOP',x,y+9,7,'#d9eaff');
}
function drawHUD(){
 const g=state,so=g.mode==='shootout';
 rect(296,14,368,81,'#050f29');rect(300,18,360,73,'#1d3d7a');rect(300,18,360,4,'#6b9cdc');rect(300,78,360,13,'#10244c');
 rect(429,22,102,51,'#080f24');
 const s=Math.ceil(g.time),time=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
 text(time,480,49,21,g.time<10?'#ffd278':'#fff');
 text('LUCAS',364,35,10,'#b9d9ff');text(String(g.score[0]).padStart(2,'0'),364,61,23,'#fff');
 text(so?'BEST':'CPU',598,35,10,so?'#ffdb97':'#ffbd7c');text(String(so?records.shootout:g.score[1]).padStart(2,'0'),598,61,23,so?'#ffda8f':'#fff');
 text(so?'3-POINT SHOOTOUT':'1 ON 1  /  '+levels[settings.difficulty],480,84,7,'#a9c9f7');
 if(!so){rect(454,102,52,33,'#0b1a35');text(String(Math.ceil(g.shotClock)).padStart(2,'0'),480,120,17,g.shotClock<5?'#ff9469':'#ffda80');text('SHOT',480,143,7,'#a6c4e7');}
 else {text(`MADE ${g.makes}/${g.attempts}`,480,116,10,'#c1ddff');if(g.streak>1)text(`${g.streak} IN A ROW!`,480,142,9,'#ffdc85');}
 const owner=g.dead>0&&g.ball.scored?(g.next===1?'YOUR BALL NEXT  >':'<  CPU BALL NEXT'):g.ball.owner===1?'YOUR BALL  >':g.ball.owner===2?'<  DEFEND':'CHASE THE REBOUND';
 text(so?'EVERY BUCKET = 3':owner,480,477,9,'#a4c9ff');text('HOLD SHOOT. RELEASE WHEN THE METER IS FULL.',480,514,6,'#799dcf');
 if(chargeHeld)meter();
 if(messages.length){const m=messages[messages.length-1];ctx.globalAlpha=clamp(m.life*3,0,1);const y=175+Math.min(.12,m.total-m.life)*-25;
  const size=m.s.length>28?12:16;ctx.font=`${size}px Pixel`;const tw=ctx.measureText(m.s).width;rect(480-tw/2-15,y-17,tw+30,35,'#0a1a37de');text(m.s,480,y,size,m.c);ctx.globalAlpha=1;}
}
function render(){
 ctx.imageSmoothingEnabled=false;
 if(scene==='menu'){menuPattern();return;}
 ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
 ctx.drawImage(bg,0,0);const g=state;if(!g){ctx.restore();return;}
 hoop(LEFT,g.net[0]);hoop(RIGHT,g.net[1]);
 // Landing halo marks your current shootout spot.
 if(g.mode==='shootout'){ctx.strokeStyle='#c8e9ff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(g.p.x,FLOOR+3,28,9,0,0,Math.PI*2);ctx.stroke();}
 if(g.mode==='quick')person(g.cpu,true);person(g.p);
 for(let i=0;i<trail.length;i++){ctx.globalAlpha=i/trail.length*.24;circle(trail[i].x,trail[i].y,4+i*.3,'#ffcf83');}ctx.globalAlpha=1;
 ballArt(g.ball.x,g.ball.y,8,g.ball.angle);
 for(const p of particles){ctx.globalAlpha=Math.min(1,p.life*3);rect(p.x,p.y,p.size,p.size,p.c);}ctx.globalAlpha=1;
 if(flash>0){ctx.fillStyle=`rgba(255,233,180,${flash*.45})`;ctx.fillRect(0,0,W,H);}
 ctx.restore();drawHUD();
}
function frame(ts){let elapsed=Math.min(.25,(ts-last)/1000||.016);last=ts;while(elapsed>0){const dt=Math.min(1/120,elapsed);update(dt);elapsed-=dt;}render();requestAnimationFrame(frame);}
function dialog(title,body,actions,kicker='LOCKER ROOM'){
 $('dialog-title').textContent=title;$('dialog-body').innerHTML=body;$('dialog-actions').innerHTML='';$('dialog-kicker').textContent=kicker;
 for(const [label,fn,orange] of actions){const b=document.createElement('button');b.className='menu-btn'+(orange?' orange':'');b.textContent=label;b.onclick=()=>{unlock();sound('click');fn();};$('dialog-actions').appendChild(b);}
 $('dialog').hidden=false;
}
function finish(){
 const g=state;if(!g||g.ended)return;g.ended=true;scene='end';clearInput();$('play-ui').hidden=true;
 const so=g.mode==='shootout',newBest=g.score[0]>(so?records.shootout:records.quick);
 if(so)records.shootout=Math.max(records.shootout,g.score[0]);else{records.quick=Math.max(records.quick,g.score[0]);if(g.score[0]>g.score[1])records.wins++;}
 save('lucasHoops.records.v1',records);
 if(window.LA?.store)window.LA.store.recordResult('lucas-hoops',{score:g.score[0]});
 const title=so?'SHOOTOUT COMPLETE':g.score[0]>g.score[1]?'LUCAS WINS!':g.score[0]===g.score[1]?'TIE GAME!':'GOOD GAME!';
 const accuracy=g.attempts?Math.round(g.makes/g.attempts*100):0;
 dialog(title,`<div class="score-big">${so?g.score[0]:g.score[0]+' - '+g.score[1]}</div><p>${newBest?'<b>NEW PERSONAL BEST!</b>':so?'Three points at a time. One big finish.':'Another run? You have got this.'}</p><div class="stat-row"><div>BUCKETS<b>${g.makes}/${g.attempts}</b></div><div>ACCURACY<b>${accuracy}%</b></div><div>${so?'BEST STREAK':'STEALS / BLOCKS'}<b>${so?g.bestStreak:g.metrics.steals+' / '+g.metrics.blocks}</b></div></div><p class="muted-note">Saved on this device. Shootout best: ${records.shootout} &nbsp; / &nbsp; Wins: ${records.wins}</p>`,[['REMATCH',()=>start(g.mode),true],['MAIN MENU',showMenu]],'FINAL BUZZER');
}
function pause(){
 if(scene!=='play')return;scene='paused';clearInput();
 dialog('TIME OUT',`<p>The clock is stopped. Take a breather.</p><p><b>Tip:</b> Hold SHOOT for a jump shot. Release at the top of the timing meter. Get close for a dunk!</p>`,[['BACK TO THE COURT',()=>{scene='play';$('dialog').hidden=true;last=performance.now();},true],['MAIN MENU',showMenu]],'GAME PAUSED');
}
function refreshSound(){$('mute').textContent=settings.sound?'SFX ON':'SFX OFF';$('mute').setAttribute('aria-pressed',String(!settings.sound));}
function settingsDialog(){
 dialog('YOUR GAME. YOUR RULES.',`<div class="setting-row"><span>SOUND</span><button id="sound-setting">${settings.sound?'ON':'OFF'}</button></div><div class="setting-row"><span>DIFFICULTY</span><button id="difficulty-setting">${levels[settings.difficulty]}</button></div><p>Rookie = relaxed defense + a bigger perfect-release window.</p><p class="muted-note">No downloads. No accounts. Everything stays on this device.</p>`,[['DONE',showMenu]],'SETTINGS');
 $('sound-setting').onclick=()=>{settings.sound=!settings.sound;save('lucasHoops.settings.v1',settings);unlock();refreshSound();settingsDialog();};
 $('difficulty-setting').onclick=()=>{settings.difficulty=(settings.difficulty+1)%3;save('lucasHoops.settings.v1',settings);settingsDialog();};
}
$('quick').onclick=()=>start('quick');$('shootout').onclick=()=>start('shootout');$('settings').onclick=()=>{unlock();sound('click');settingsDialog();};
$('how').onclick=()=>{unlock();sound('click');dialog('MAKE YOUR HIGHLIGHT.',`<p><b>MOVE:</b> Left / Right arrows or A / D. On a phone, use the blue move pad. Attack the <b>RIGHT hoop</b>; CPU attacks left.</p><p><b>SHOOT:</b> Hold Space or J to jump and fill the meter. Release when it is full and green. Close to the hoop? Tap for a <b>DUNK!</b></p><p><b>DEFENSE:</b> Tap SHOOT without the ball to jump and block. Press E or K (PASS / STEAL) nearby to steal. With the ball it is a <b>pass fake</b> and speed boost (no teammate in 1v1).</p><p><b>QUICK GAME:</b> 90 seconds. 2s inside, 3s outside. 14-second shot clock. Chase missed shots for rebounds!</p><p><b>SHOOTOUT:</b> 60 seconds, every basket is worth 3. You move between long-range spots after each try. Shots released before the buzzer still count.</p><p class="muted-note">P / Escape pauses. Sound and difficulty live in Settings. Best scores save here on this device.</p>`,[['LET\'S PLAY',showMenu,true]],'HOW TO PLAY');};
$('pause').onclick=pause;$('mute').onclick=()=>{settings.sound=!settings.sound;save('lucasHoops.settings.v1',settings);unlock();refreshSound();};
function bindHold(id,on,off){
 const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();unlock();el.setPointerCapture(e.pointerId);if(pointers.has(e.pointerId))return;pointers.set(e.pointerId,id);on();});
 function up(e){if(pointers.get(e.pointerId)!==id)return;pointers.delete(e.pointerId);off();}
 el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('lostpointercapture',up);
}
bindHold('left',()=>keys.left=true,()=>keys.left=false);bindHold('right',()=>keys.right=true,()=>keys.right=false);
bindHold('shoot',beginShot,releaseShot);bindHold('steal',steal,()=>{});
const shootKeys=new Set(['Space','KeyJ']);
window.addEventListener('keydown',e=>{
 if(['ArrowLeft','ArrowRight','Space','KeyA','KeyD','KeyJ','KeyK','KeyE','Escape','KeyP'].includes(e.code)&&scene!=='menu')e.preventDefault();
 if(e.repeat)return;unlock();
 if(e.code==='Escape'||e.code==='KeyP'){if(scene==='play')pause();else if(scene==='paused'){scene='play';$('dialog').hidden=true;}return;}
 if(scene!=='play')return;
 if(e.code==='ArrowLeft'||e.code==='KeyA')keys.left=true;if(e.code==='ArrowRight'||e.code==='KeyD')keys.right=true;
 if(shootKeys.has(e.code))beginShot();if(e.code==='KeyE'||e.code==='KeyK')steal();
});
window.addEventListener('keyup',e=>{
 if(e.code==='ArrowLeft'||e.code==='KeyA')keys.left=false;if(e.code==='ArrowRight'||e.code==='KeyD')keys.right=false;if(shootKeys.has(e.code))releaseShot();
});
window.addEventListener('blur',()=>{if(scene==='play')pause();clearInput();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(scene==='play')pause();if(audio)audio.suspend().catch(()=>{});}else{last=performance.now();}});
window.addEventListener('contextmenu',e=>e.preventDefault());
// Read-only state for deterministic regression testing; no gameplay shortcuts.
window.HOOPS={get state(){return state;},get scene(){return scene;}};
Promise.all([document.fonts.load('12px Pixel'),document.fonts.ready]).then(()=>{makeCourt();logo();});
makeCourt();logo();showMenu();refreshSound();requestAnimationFrame(frame);
})();
