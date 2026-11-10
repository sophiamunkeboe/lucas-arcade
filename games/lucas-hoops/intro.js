/* A real 7.4-second, canvas-only Sunburst cinematic. Same Lucas renderer as the game.
   There is one animation loop (the game's); no timers, video or remote assets. */
window.HoopsIntro=(()=>{
'use strict';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const DURATION=7.4,SHORT=2.6,INTRO_RIM=130,SEEN='lucasHoops.introSeen.v1';
function beam(color){
 const c=document.createElement('canvas');c.width=280;c.height=680;const x=c.getContext('2d'),g=x.createLinearGradient(140,0,140,680);
 g.addColorStop(0,color+'99');g.addColorStop(.72,color+'30');g.addColorStop(1,color+'00');x.fillStyle=g;x.beginPath();x.moveTo(132,0);x.lineTo(148,0);x.lineTo(280,680);x.lineTo(0,680);x.fill();return c;
}
const purpleBeam=beam('#a45be6'),orangeBeam=beam('#ff9a43');
const glow=document.createElement('canvas');glow.width=glow.height=96;
{const c=glow.getContext('2d'),g=c.createRadialGradient(48,48,2,48,48,48);g.addColorStop(0,'#ffe8989c');g.addColorStop(.3,'#ff952a77');g.addColorStop(1,'#e34b1300');c.fillStyle=g;c.fillRect(0,0,96,96);}
function create({art:A,player,audio,onDone,replay=false}){
 let seen=false;try{seen=sessionStorage.getItem(SEEN)==='1';}catch(_){}
 const shortened=seen&&!replay,duration=shortened?SHORT:DURATION,rate=DURATION/duration;
 const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
 let elapsed=0,time=0,done=false,skipped=false,phase='presents',soundEvents=0,events=[],trail=[],lastTrail=0;
 const sparks=Array.from({length:70},(_,i)=>({angle:i*2.39996,speed:80+(i*47)%270,life:1+(i%13)*.07,size:2+(i%3)}));
 const beats=[
  [.16,'open'],[1.32,'dribble'],[1.88,'dribble'],[2.44,'dribble'],[2.72,'burst'],[3.78,'rise'],[4.22,'ignite'],[5.10,'slam'],[5.15,'drop'],[5.29,'logo']
 ];let nextBeat=0;
 function cue(name){
  events.push(name);if(!audio.enabled()||!audio.ready())return;soundEvents++;
  if(name==='open'){audio.tone(52,.75,.08,'triangle',83);audio.hiss(.6,.025,700);}
  if(name==='dribble'){audio.sound('dribble');audio.tone(85,.15,.10,'sine',35);audio.hiss(.045,.035,650);}
  if(name==='burst'){audio.hiss(.46,.10,1300);audio.tone(130,.40,.045,'triangle',650);}
  if(name==='rise'){audio.tone(370,.92,.045,'triangle',1250);audio.hiss(.8,.035,2400);}
  if(name==='ignite'){audio.hiss(.65,.075,2000);audio.tone(150,.30,.05,'sawtooth',300);}
  if(name==='slam'){audio.tone(105,.65,.20,'sine',28);audio.sound('rim');audio.hiss(1.8,.22,900);audio.hiss(1.3,.09,1550);}
  if(name==='drop'){audio.tone(76,1.35,.18,'sine',25);audio.tone(58,.72,.035,'sawtooth',26);}
  if(name==='logo'){audio.tone(523,.21,.045,'triangle',784);audio.hiss(.15,.04,3200);}
 }
 function finish(skip=false){if(done)return;done=true;skipped=skip;try{sessionStorage.setItem(SEEN,'1');}catch(_){}onDone({skipped:skip});}
 function pose(){
  const p={...player,team:0,id:1,x:360,y:A.CY+20,z:0,vx:0,vy:0,walk:0,charging:false,spin:0,plant:0},b={x:380,y:p.y,z:32,angle:time*5};
  if(time<1.0){p.y=A.CY+20;b.x=p.x+19;b.z=30;}
  else if(time<2.7){
   const f=(time-1.04)/.56*Math.PI;p.dribblePose=f;p.y=A.CY+20;b.x=p.x+Math.cos(f)*26;b.y=p.y+6;b.z=7+Math.abs(Math.cos(f))*27;
  }else if(time<3.75){
   const f=clamp((time-2.7)/1.05);p.x=mix(360,758,f*f*.4+f*.6);p.y=mix(A.CY+20,A.CY,f);p.vx=380;p.walk=(time-2.7)*48;b.x=p.x+20;b.y=p.y;b.z=22+Math.abs(Math.sin(time*20))*18;
  }else if(time<4.22){
   const f=smooth((time-3.75)/.47);p.x=mix(758,820,f);p.y=A.CY;p.z=mix(0,108,f);p.charging=true;p.introDunk=true;b.x=p.x+17;b.y=p.y;b.z=p.z+104;
  }else if(time<4.85){
   const f=clamp((time-4.22)/.63);p.x=mix(820,850,f);p.y=A.CY;p.z=108+Math.sin(f*Math.PI)*9;p.charging=true;p.introDunk=true;b.x=p.x+17;b.y=p.y;b.z=p.z+104;
  }else if(time<5.10){
   const f=clamp((time-4.85)/.25);p.x=mix(850,854,f);p.y=A.CY;p.z=mix(108,26,f*f);p.charging=true;p.introDunk=true;b.x=mix(867,870,f);b.y=A.CY;b.z=mix(212,INTRO_RIM,f*f);
  }else{
   const f=time-5.10;p.x=854;p.y=A.CY;p.z=f<.4?26+Math.sin(f*10)*2:Math.max(0,26-(f-.4)*80);p.charging=f<.6;p.introDunk=f<.6;b.x=870;b.y=A.CY;b.z=Math.max(6,INTRO_RIM-f*140);b.angle=time*9;
  }
  return{p,b};
 }
 function update(dt){
  if(done)return;elapsed+=dt;time=Math.min(DURATION,elapsed*rate);
  phase=time<1?'presents':time<2.7?'dribble':time<3.75?'sprint':time<4.22?'rise':time<4.85?'slowmo':time<5.10?'dunk':time<5.29?'impact':time<7.0?'logo':'transition';
  while(nextBeat<beats.length&&time>=beats[nextBeat][0])cue(beats[nextBeat++][1]);
  if(time-lastTrail>.018){const {b}=pose();trail.push({...b,at:time});lastTrail=time;if(trail.length>12)trail.shift();}
  if(elapsed>=duration)finish(false);
 }
 function spotlight(c,x,angle,image,alpha){c.save();c.globalCompositeOperation='screen';c.globalAlpha=alpha;c.translate(x,-15);c.rotate(angle);c.drawImage(image,-140,0);c.restore();}
 function flame(c,b){
  const y=A.project(b.y)-b.z;
  c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.7;c.drawImage(glow,b.x-36,y-36,72,72);c.restore();
  for(let i=0;i<13;i++){const phase=time*15+i*2.7,xx=b.x+Math.sin(phase)*9,yy=y-6-(i%4)*5-Math.sin(phase*1.7)*5;A.box(c,xx,yy,3+(i%3),6+(i%6),i%3?'#ff992f':'#ffe28a');}
  for(let i=0;i<7;i++){const life=(time*1.6+i*.137)%1;A.box(c,b.x-12-life*25+Math.sin(i*11)*7,y-8-life*31,2,3,i%2?'#ffb54d':'#ffe491');}
 }
 function draw(c){
  const {p,b}=pose(),impact=Math.max(0,time-5.10);
  c.imageSmoothingEnabled=false;A.box(c,0,0,960,540,'#080510');
  let zoom=1+smooth((time-.55)/.75)*.72-smooth((time-2.7)/.6)*.22;
  zoom-=smooth((time-5.35)/.5)*.15;if(reduce)zoom=1.12;
  let cx=360+smooth((time-2.7)/1.6)*330;cx=clamp(cx,480/zoom,960-480/zoom);
  const cy=mix(270,225,smooth((time-3.7)/.7));
  c.save();c.translate(480,270);c.scale(zoom,zoom);c.translate(-cx,-cy);
  if(impact>0&&impact<.45&&!reduce){const sh=(1-impact/.45)*9;c.translate(Math.sin(time*133)*sh,Math.cos(time*157)*sh*.6);}
  A.arena(c,null,time);A.box(c,0,0,960,540,time<2.7?'#0904139c':'#0b05134f');
  const sweep=time<1?.36:.10,aimY=A.project(p.y)-p.z*.35+15;
  spotlight(c,160,-Math.atan2(p.x-160,aimY)+Math.sin(time*.8)*sweep,purpleBeam,.72);spotlight(c,785,-Math.atan2(p.x-785,aimY)+Math.cos(time*.9)*sweep,orangeBeam,.66);
  c.save();c.globalAlpha=.20;c.fillStyle='#ee944b';c.beginPath();c.ellipse(p.x,A.project(p.y)+2,63,18,0,0,Math.PI*2);c.fill();c.restore();
  if(time>=2.7&&time<3.9){
   for(let i=0;i<24;i++){const xx=p.x-30-(i*53+time*510)%370,yy=A.project(p.y)-15-((i*37)%130);A.path(c,[[xx,yy],[xx-23-(i%5)*13,yy+2]],i%3?'#c483f477':'#ffc075aa',i%4===0?3:1);}
   for(let i=3;i>=1;i--){c.globalAlpha=.06+(3-i)*.04;A.sprite(c,{...p,walk:p.walk-i*.4},p.x-i*25,A.project(p.y)-p.z,.94,time);}c.globalAlpha=1;
  }
  A.hoop(c,90,0,INTRO_RIM);
  const net=impact<.65&&impact>0?(1-impact/.65)*1.8:0;
  c.save();if(net&&!reduce)c.translate(Math.sin(impact*70)*net*3,Math.sin(impact*57)*net*1.5);A.hoop(c,870,net,INTRO_RIM);c.restore();
  // The same cap, teen face/braces and Sunburst jersey seen in the lineup/game.
  c.save();c.globalAlpha=.28;c.fillStyle='#160a23';c.beginPath();c.ellipse(p.x,A.project(p.y)+2,27,8,0,0,Math.PI*2);c.fill();c.restore();
  A.sprite(c,p,p.x,A.project(p.y)-p.z,.94,time);
  for(let i=0;i<trail.length;i++){const q=trail[i],age=time-q.at;if(age>.19)continue;c.globalAlpha=(1-age/.19)*.19;A.dot(c,q.x,A.project(q.y)-q.z,7,'#ffb85b');}c.globalAlpha=1;
  if(time>=4.18&&time<5.22)flame(c,b);A.ball(c,b,time);
  if(impact>0){
   for(let i=0;i<42;i++){const s=sparks[i],life=impact/s.life;if(life>1)continue;c.globalAlpha=1-life;const xx=870+Math.cos(s.angle)*s.speed*impact,yy=A.project(A.CY)-INTRO_RIM+Math.sin(s.angle)*s.speed*.7*impact+180*impact*impact;A.box(c,xx,yy,s.size,s.size*1.6,i%3?'#ffb24c':'#fff0b1');}c.globalAlpha=1;
   if(impact<.75){c.strokeStyle=`rgba(255,185,98,${(1-impact/.75)*.6})`;c.lineWidth=3;c.beginPath();c.ellipse(870,A.project(A.CY)-INTRO_RIM,impact*430,impact*210,0,0,Math.PI*2);c.stroke();}
  }
  c.restore();
  // A letterboxed, made-for-Lucas opening, not a game menu masquerading as an intro.
  A.box(c,0,0,960,24,'#090510');A.box(c,0,516,960,24,'#090510');
  if(time<1.12){c.globalAlpha=clamp(time/.25)*clamp((1.12-time)/.23);A.txt(c,"LUCAS'S ARCADE PRESENTS",480,108,13,'#f3d9ff');A.txt(c,'SUNBURST FIELDHOUSE  /  AFTER DARK',480,132,6,'#c48bdb');c.globalAlpha=1;}
  if(time>=1.10&&time<2.7){A.txt(c,'LUCAS  /  #1',480,450,10,'#ffd195');A.txt(c,'THE COURT IS HIS.',480,472,6,'#c6a0d9');}
  if(time>=4.22&&time<4.85){A.txt(c,'UP. UP. AND AWAY.',480,463,7,'#ffce95');}
  if(impact>0&&impact<.13){A.box(c,0,0,960,540,`rgba(255,225,184,${(1-impact/.13)*.48})`);}
  if(time>=5.15){
   const a=time-5.15,scale=a<.20?mix(2.0,.97,smooth(a/.20)):1+Math.sin(a*13)*.025*Math.exp(-a*4);
   A.box(c,0,24,960,492,`rgba(12,5,28,${clamp(a/.35)*.60})`);
   for(let i=0;i<26;i++){const s=sparks[i],age=a+i*.04,xx=(i*173+17)%960,yy=500-(age*65+(i*31)%380)%460;A.box(c,xx+Math.sin(time+i)*9,yy,2,3,i%3?'#cf6b30':'#ffc179');}
   c.save();c.translate(480,265);c.scale(scale,scale);
   // Original stepped sun-ball crest and custom chunky pixel wordmark.
   A.sun(c,0,-107,40);
   c.textAlign='center';c.textBaseline='middle';c.lineJoin='miter';
   for(const [word,y,size,color] of [['LUCAS',-17,37,'#e9dbff'],['HOOPS!',56,68,'#fff4de']]){
    c.font=`${size}px Pixel,monospace`;c.lineWidth=12;c.strokeStyle='#10081f';c.strokeText(word,0,y);c.lineWidth=4;c.strokeStyle='#64348e';c.strokeText(word,0,y+5);c.fillStyle=color;c.fillText(word,0,y);
   }
   A.txt(c,'SMALL PIXELS. BIG GAME.',0,122,8,'#ffc583');c.restore();
   if(a<.7){c.strokeStyle=`rgba(181,109,244,${(1-a/.7)*.7})`;c.lineWidth=4;c.beginPath();c.arc(480,275,40+a*680,0,Math.PI*2);c.stroke();}
   if(a<1.0){for(let i=0;i<18;i++){if(Math.sin(time*17+i*31)>.72){const x=(i*149+55)%960,y=85+(i*41)%160;A.path(c,[[x-4,y],[x+4,y]],'#eadfff',1);A.path(c,[[x,y-4],[x,y+4]],'#fff',1);}}}
  }
  if(time>7.0){A.box(c,0,0,960,540,`rgba(13,9,32,${smooth((time-7.0)/.4)})`);}
 }
 return{update,draw,skip:()=>finish(true),get snapshot(){return{elapsed,time,duration,shortened,phase,done,skipped,events:[...events],soundEvents,audioReady:audio.ready(),soundEnabled:audio.enabled()};}};
}
return{create,DURATION,SHORT};
})();
