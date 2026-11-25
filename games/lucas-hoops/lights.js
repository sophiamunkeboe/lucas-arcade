/* Cached additive spotlight cones + bounded confetti. No per-frame gradient allocations. */
window.HoopsLights=(()=>{
'use strict';
const COLORS=['#a054ef','#ff8d37','#ff4bb8','#3fe0ef','#ffd36c'];
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const beams=COLORS.map(color=>{const c=document.createElement('canvas');c.width=180;c.height=620;const x=c.getContext('2d'),g=x.createLinearGradient(90,0,90,620);g.addColorStop(0,color+'b0');g.addColorStop(.7,color+'55');g.addColorStop(1,color+'00');x.fillStyle=g;x.beginPath();x.moveTo(85,0);x.lineTo(95,0);x.lineTo(180,620);x.lineTo(0,620);x.fill();return c;});
// Render-only polish: colored floor pools where the beams land, a rim flare and a soft arena vignette.
const pools=COLORS.map(color=>{const c=document.createElement('canvas');c.width=220;c.height=80;const x=c.getContext('2d');x.translate(110,40);x.scale(1,.36);const g=x.createRadialGradient(0,0,4,0,0,110);g.addColorStop(0,color+'cc');g.addColorStop(.55,color+'44');g.addColorStop(1,color+'00');x.fillStyle=g;x.fillRect(-110,-110,220,220);return c;});
const flare=(()=>{const c=document.createElement('canvas');c.width=160;c.height=160;const x=c.getContext('2d'),g=x.createRadialGradient(80,80,2,80,80,80);g.addColorStop(0,'#fff6d8ff');g.addColorStop(.25,'#ffc46a99');g.addColorStop(1,'#ff7a2a00');x.fillStyle=g;x.fillRect(0,0,160,160);return c;})();
const vignette=(()=>{const c=document.createElement('canvas');c.width=480;c.height=270;const x=c.getContext('2d'),g=x.createRadialGradient(240,150,90,240,135,300);g.addColorStop(0,'#05031000');g.addColorStop(.7,'#05031022');g.addColorStop(1,'#050310aa');x.fillStyle=g;x.fillRect(0,0,480,270);return c;})();
function create(A,beat){
 let clock=0,show=null,confetti=[],level=2,frameEMA=16.7,slow=0,healthy=0,scene='intro',game=null,bursts=0;
 const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
 function burst(x=480,y=220){
  const n=reduce?18:[28,60,105][level];bursts++;
  for(let i=0;i<n;i++){const a=i*2.39996,v=75+(i*43)%190;confetti.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-80,life:2+(i%7)*.12,c:COLORS[i%5],w:3+(i%3)*2,rot:i});}
  if(confetti.length>150)confetti.splice(0,confetti.length-150);
 }
 function celebrate(kind='two',x=870,y=225){
  const full=['dunk','buzzer','win'].includes(kind),duration=kind==='win'?9:full?2.7:kind==='three'?1.8:1.0;
  show={kind,start:clock,until:clock+duration,full,lastBurst:clock,x,y};if(full)burst(x,y);
 }
 function update(dt,newScene,g){
  clock+=dt;scene=newScene;game=g;if(show&&clock>show.until)show=null;
  if(show?.kind==='win'&&clock-show.lastBurst>2.1){burst(120+(Math.floor(clock)*179)%720,180);show.lastBurst=clock;}
  confetti=confetti.filter(p=>(p.life-=dt)>0);for(const p of confetti){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=135*dt;p.rot+=dt*3;}
 }
 function monitor(ms){
  if(ms>200||document.hidden)return;frameEMA=frameEMA*.96+ms*.04;
  if(frameEMA>25){slow++;healthy=0;}else if(frameEMA<19){healthy++;slow=Math.max(0,slow-1);}
  if(slow>35&&level>0){level--;slow=0;}if(healthy>360&&level<2){level++;healthy=0;}
 }
 function draw(c){
  if(scene==='intro')return;
  const musicBeat=Math.max(0,beat()),pulse=reduce?.65:.65+.35*Math.sin(musicBeat*Math.PI*2),dead=scene!=='play'||game?.dead>0,full=show?.full;
  const base=full?.25:show?.kind==='three'?.20:dead?.16:.032;
  const count=reduce?2:Math.min([2,4,6][level],full?6:dead||show?4:2);
  c.save();c.globalCompositeOperation='lighter';
  for(let i=0;i<count;i++){
   const source=[95,865,265,695,415,545][i],phase=musicBeat*.34+i*1.45,target=480+Math.sin(phase)*410;
   const aim=-Math.atan2(target-source,400),color=(i+Math.floor(musicBeat/4))%5;
   const alpha=base*(full?(.5+.5*pulse):(.75+.25*pulse));
   c.save();c.translate(source,-12);c.rotate(aim);c.globalAlpha=alpha;c.drawImage(beams[color],-90,0,180,660);c.restore();
   const fx=source-Math.sin(aim)*540,fy=-12+Math.cos(aim)*540;if(fy>190&&level>0){c.globalAlpha=Math.min(.5,alpha*2.4);c.drawImage(pools[color],fx-110,fy-40);}
  }
  if(show&&show.y!=null&&show.kind!=='win'){const age=clock-show.start,k=clamp(1-age/.7);if(k>0){c.globalAlpha=k*.85;const s=90+age*120;c.drawImage(flare,show.x-s/2,show.y-s/2,s,s);}}
  if(show){const age=clock-show.start,flash=clamp(1-age/(show.kind==='two'?.35:.65));
   c.globalAlpha=flash*(full?.23:.13);A.box(c,0,99,960,65,COLORS[Math.floor(musicBeat*2)%5]);
   if(full){c.globalAlpha=(reduce?.10:.10+pulse*.12);A.box(c,350,25,260,98,COLORS[Math.floor(musicBeat)%5]);}
  }
  c.restore();
 }
 function drawEffects(c){
  if(scene==='intro')return;for(const p of confetti){c.globalAlpha=clamp(p.life*1.6);const w=p.w*Math.max(.25,Math.abs(Math.sin(p.rot)));A.box(c,p.x,p.y,w,p.w*.6,p.c);}c.globalAlpha=1;
 }
 function drawVignette(c){c.save();c.globalAlpha=1;c.drawImage(vignette,0,0,960,540);c.restore();}
 return{update,monitor,draw,drawEffects,drawVignette,celebrate,reset(){show=null;confetti=[];},get snapshot(){return{level,frameEMA,scene,event:show?.kind||null,full:!!show?.full,confetti:confetti.length,bursts,reducedMotion:reduce,beat:beat()};}};
}
return{create};
})();
