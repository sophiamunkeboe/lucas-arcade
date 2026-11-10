/* Original pixel arena and character art. No official team, league or sponsor artwork. */
window.HoopsArt=(()=>{
'use strict';
const W=960,H=540,TOP=174,DEPTH=.60,CY=220,RIMZ=85;
const project=y=>TOP+y*DEPTH;
const bg=document.createElement('canvas');bg.width=W;bg.height=H;
const faceCache=new Map();
function box(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function path(c,pts,color,w=2){c.strokeStyle=color;c.lineWidth=w;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(Math.round(p[0]),Math.round(p[1])):c.moveTo(Math.round(p[0]),Math.round(p[1])));c.stroke();}
function txt(c,s,x,y,size=12,color='#fff',align='center',shadow=true){c.font=`${size}px Pixel,monospace`;c.textAlign=align;c.textBaseline='middle';if(shadow){c.fillStyle='#100c23';c.fillText(s,x+1,y+2);}c.fillStyle=color;c.fillText(s,x,y);}
function dot(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(Math.round(x),Math.round(y),r,0,Math.PI*2);c.fill();}
function sun(c,x,y,r=28,flat=false){
 c.save();c.translate(x,y);c.fillStyle='#f48d26';
 for(let i=0;i<8;i++){c.save();c.rotate(i*Math.PI/4);c.fillRect(r+4,-4,10,8);c.restore();}
 // Stepped silhouette keeps our mark visibly pixel-made.
 box(c,-r*.65,-r,r*1.3,r*2,'#f48d26');box(c,-r,-r*.65,r*2,r*1.3,'#f48d26');
 c.save();c.beginPath();c.arc(0,0,r-3,0,Math.PI*2);c.clip();path(c,[[-r,0],[r,0]],'#a64b23',3);path(c,[[0,-r],[0,r]],'#a64b23',3);
 for(const xx of [-r*1.5,r*1.5]){c.strokeStyle='#a64b23';c.lineWidth=3;c.beginPath();c.ellipse(xx,0,r*1.2,r*1.5,0,0,Math.PI*2);c.stroke();}c.restore();c.restore();
}
function face(c,p,x=0,y=0,scale=1){
 c.save();c.translate(x,y);c.scale(scale,scale);
 const skin=p.skin||'#e5b691',shade=p.shade||'#bc8768',hair=p.hair||'#503522';
 box(c,-12,-27,25,27,'#161326');box(c,-11,-25,23,23,skin);box(c,-11,-23,4,18,shade);box(c,11,-19,4,9,skin);
 box(c,-12,-29,25,8,hair);box(c,-12,-24,5,9,hair);box(c,8,-24,5,5,hair);
 box(c,-5,-17,3,3,'#29233a');box(c,5,-17,3,3,'#29233a');box(c,-5,-18,4,1,hair);box(c,5,-18,4,1,hair);box(c,0,-13,3,3,shade);
 // A cheerful smile; Lucas has tiny silver brace pixels across the teeth.
 box(c,-4,-8,12,3,'#9e5e52');box(c,-2,-8,9,2,'#fff8dc');box(c,0,-6,5,1,shade);
 if(p.star){box(c,-2,-7,9,1,'#adb5c4');for(const xx of [-1,2,5])box(c,xx,-8,1,2,'#bbc5d5');
  // Cream baseball cap, brown fringe and original purple block lettering.
  box(c,-13,-33,25,10,'#f6efd4');box(c,-9,-36,17,5,'#f6efd4');box(c,-12,-32,5,7,'#e1d6b9');box(c,-14,-24,31,4,'#d3c4a1');box(c,-8,-23,24,2,'#f9f1d8');
  txt(c,'SUNS',0,-28,3.8,'#69459b','center',false);
 }else if(p.team===0){box(c,-12,-23,25,3,'#a074ce');box(c,-11,-22,23,1,'#f3a346');}
 else {box(c,-12,-23,25,3,'#85cadf');}
 c.restore();
}
function sprite(c,p,x,y,scale=.65,time=0,selected=false){
 const speed=Math.hypot(p.vx||0,p.vy||0),dribble=Number.isFinite(p.dribblePose),swing=dribble?Math.sin(p.dribblePose*2)*2:speed>12?Math.sin(p.walk||0)*6:0;
 c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);
 if(p.spin>0)c.scale(Math.cos(p.spin*14)*.5+.65,1);
 const skin=p.skin||'#e5b691',shade=p.shade||'#bc8768',ours=p.team===0;
 if(dribble){
  // Intro-only wide stance: a clear lane for the ball to cross between his legs.
  path(c,[[-8,-27],[-17,-16],[-21,-5]],shade,9);path(c,[[8,-27],[17,-16],[21,-5]],skin,9);
  box(c,-25,-9,8,6,'#f7e9d5');box(c,17,-9,8,6,'#f7e9d5');box(c,-28,-5,15,5,'#181125');box(c,15,-5,15,5,'#181125');box(c,-28,-5,14,2,'#c295e0');box(c,15,-5,14,2,'#c295e0');
 }else{
 box(c,-12,-25,8,15+swing,shade);box(c,4,-25,8,15-swing,skin);box(c,-12,-11+swing,8,7,'#f7e9d5');box(c,4,-11-swing,8,7,'#f7e9d5');
 box(c,-15,-5+swing,14,5,'#161225');box(c,2,-5-swing,15,5,'#161225');box(c,-15,-5+swing,13,2,ours?'#c295e0':'#bde4ed');box(c,2,-5-swing,14,2,ours?'#c295e0':'#bde4ed');
 }
 box(c,-15,-34,30,12,ours?'#1c182a':'#234b7b');box(c,-15,-34,5,13,ours?'#7042a5':'#78bcd0');box(c,10,-34,5,13,ours?'#7042a5':'#78bcd0');box(c,-15,-24,30,2,'#f09b40');
 box(c,-15,-58,30,26,'#151421');box(c,-12,-56,24,23,ours?'#17151e':'#347ca9');box(c,-14,-55,5,23,ours?'#7042a5':'#a8dde4');box(c,10,-55,4,23,ours?'#7042a5':'#a8dde4');
 path(c,[[-10,-56],[-6,-53],[6,-53],[11,-56]],ours?'#f59b38':'#dceef4',3);box(c,-13,-34,27,2,ours?'#f59b38':'#dceef4');
 // Tiny, original rising-sun motif and jersey number.
 if(ours){box(c,-4,-51,8,3,'#f5a24a');box(c,-6,-49,12,2,'#f5a24a');box(c,-1,-54,2,2,'#f5a24a');box(c,-8,-52,2,2,'#f5a24a');box(c,7,-52,2,2,'#f5a24a');}
 txt(c,String(p.number||1),1,-40,9,'#f7ead8','center',false);
 const arms=p.z>10||p.charging||p.plant>0;
 if(dribble){const side=Math.cos(p.dribblePose),handY=-23+Math.abs(Math.sin(p.dribblePose))*8;path(c,[[-17,-50],[-22,-35],[-12+side*10,handY]],shade,7);path(c,[[17,-50],[23,-35],[12+side*10,handY]],skin,7);}
 else if(p.introDunk){path(c,[[-17,-52],[-23,-75],[-17,-101]],shade,7);box(c,-22,-106,10,7,skin);path(c,[[17,-51],[23,-80],[18,-105]],skin,7);box(c,14,-110,10,8,skin);}
 else if(arms){box(c,-21,-72,7,25,shade);box(c,-21,-76,10,7,skin);box(c,15,-70,7,25,skin);box(c,13,-76,10,8,skin);}
 else{box(c,-20,-53,7,24+swing*.3,shade);box(c,14,-53,7,21-swing*.3,skin);box(c,15,-35-swing*.3,9,6,skin);}
 box(c,-5,-65,12,9,shade);face(c,p,0,-62,1);c.restore();
}
function portrait(c,p,width,height){c.clearRect(0,0,width,height);c.imageSmoothingEnabled=false;const scale=height/103;sprite(c,{...p,vx:0,vy:0,z:0},width/2,height-4,scale,0,false);}
function getFace(p){
 if(!faceCache.has(p.name)){const c=document.createElement('canvas');c.width=40;c.height=43;face(c.getContext('2d'),p,20,43,1.1);faceCache.set(p.name,c);}return faceCache.get(p.name);
}
function rebuild(){
 faceCache.clear();const c=bg.getContext('2d');c.imageSmoothingEnabled=false;
 const g=c.createLinearGradient(0,0,0,490);g.addColorStop(0,'#090611');g.addColorStop(.3,'#281339');g.addColorStop(1,'#3b1c45');c.fillStyle=g;c.fillRect(0,0,W,H);
 // Dim, colored rafters. Everything in the arena is invented, including jersey numbers.
 for(let i=0;i<10;i++){path(c,[[i*110,0],[i*110+50,90]],'#3a2454',3);path(c,[[i*110+20,0],[i*110+65,70]],'#161127',4);}
 for(const [x,n] of [[106,13],[225,28],[724,46],[844,72]]){
  box(c,x-23,13,46,61,'#14101f');box(c,x-19,16,38,53,'#342055');box(c,x-23,16,46,5,'#ad5c29');txt(c,String(n),x,43,18,'#eedac1');txt(c,'LEGENDS',x,64,5,'#a68abe');
 }
 const glow=c.createRadialGradient(480,120,10,480,120,470);glow.addColorStop(0,'#7f359744');glow.addColorStop(1,'#10091900');c.fillStyle=glow;c.fillRect(0,0,W,250);
 // Upper-deck orange LED ribbons.
 box(c,0,82,W,13,'#fc8d25');box(c,0,86,W,2,'#ffc262');
 for(let x=8;x<W;x+=178)txt(c,'LUCAS HOOPS',x+73,90,7,'#441c2c','center',false);
 for(let row=0;row<5;row++){
  const yy=102+row*12;box(c,0,yy+9,W,3,'#100e1b');
  for(let col=0;col<80;col++){
   const x=col*12+(row%2)*5,k=(row*41+col*29)%43;
   box(c,x,yy+3,7,7,['#463344','#543853','#3d354f','#705046','#29233f'][k%5]);box(c,x+1,yy,5,5,['#75564f','#634950','#8c6a5b','#4f3e45'][k%4]);box(c,x+1,yy,5,1,'#29212d');
  }
 }
 box(c,0,163,W,14,'#24102d');box(c,0,163,W,3,'#e27d2b');
 for(const x of [140,480,820])txt(c,x===480?'SUNBURST FIELDHOUSE':'MAKE SOME NOISE',x,172,7,'#d59765');
 // Maple floor, black-purple apron and original court markings.
 box(c,0,178,W,304,'#100d18');box(c,23,183,914,285,'#45265f');
 for(let row=0;row<24;row++)for(let col=-1;col<18;col++){
  const x=col*58+(row%2)*29,y=188+row*11;box(c,x+1,y,57,10,['#dfbe8d','#e6c99d','#d9b586','#e9cca0','#dcb98c'][(row*7+col*13+80)%5]);box(c,x+7,y+3,30,1,'#f8ddb255');
 }
 c.save();c.translate(0,TOP);c.scale(1,DEPTH);
 box(c,32,22,896,16,'#291333');box(c,32,457,896,18,'#291333');box(c,32,22,15,450,'#26152f');box(c,913,22,15,450,'#26152f');
 box(c,48,CY-90,146,180,'#674392');box(c,766,CY-90,146,180,'#674392');
 c.strokeStyle='#fff1cc';c.lineWidth=2;c.strokeRect(48,40,864,414);c.strokeRect(48,CY-90,146,180);c.strokeRect(766,CY-90,146,180);
 c.save();c.beginPath();c.rect(48,40,864,414);c.clip();c.beginPath();c.arc(194,CY,62,-Math.PI/2,Math.PI/2);c.stroke();c.beginPath();c.arc(766,CY,62,Math.PI/2,Math.PI*1.5);c.stroke();
 c.beginPath();c.arc(83,CY,265,-Math.PI/2,Math.PI/2);c.stroke();c.beginPath();c.arc(877,CY,265,Math.PI/2,Math.PI*1.5);c.stroke();
 c.restore();path(c,[[480,40],[480,454]],'#fff0cc',2);c.beginPath();c.arc(480,CY,67,0,Math.PI*2);c.stroke();sun(c,480,CY,42);
 c.restore();txt(c,'S U N B U R S T',480,459,12,'#f2a052');
 const floorGlow=c.createLinearGradient(0,475,0,540);floorGlow.addColorStop(0,'#1d102c');floorGlow.addColorStop(1,'#0b0916');c.fillStyle=floorGlow;c.fillRect(0,476,W,64);
}
function arena(c,g,time,menu=false){
 c.drawImage(bg,0,0);
 // Sparse, deterministic camera flashes: no per-frame crowd sprites or allocations.
 for(let i=0;i<26;i++){if(Math.sin(time*(.75+(i%4)*.16)+i*17.7)>.996){const x=(i*127+31)%W,y=104+(i*19)%53;box(c,x-3,y,7,1,'#ede3ff');box(c,x,y-3,1,7,'#fff');}}
 // Suspended four-sided video cube. Small score bug remains independent at top-left.
 path(c,[[413,0],[430,29]],'#605571',2);path(c,[[546,0],[530,29]],'#605571',2);
 c.fillStyle='#d8752a';c.beginPath();c.moveTo(350,38);c.lineTo(383,29);c.lineTo(383,116);c.lineTo(350,104);c.closePath();c.fill();
 c.beginPath();c.moveTo(577,29);c.lineTo(610,38);c.lineTo(610,104);c.lineTo(577,116);c.closePath();c.fill();
 box(c,354,47,22,47,'#ff9e3e');box(c,583,47,22,47,'#ff9e3e');txt(c,'LH',365,69,8,'#692c2a');txt(c,'LH',595,69,8,'#692c2a');
 box(c,380,25,200,98,'#0d0917');box(c,383,28,194,5,'#ffad48');box(c,386,36,188,57,'#392056');
 txt(c,'LUCAS HOOPS',480,45,9,'#ffca7b');
 for(let i=0;i<8;i++){const x=399+i*23;box(c,x,70,10,14,['#67418c','#ad6338','#a18a74'][i%3]);box(c,x+1,62,8,9,['#bd977e','#9e7963','#745755'][i%3]);box(c,x+1,61,8,3,'#352a39');box(c,x+2,66,1,1,'#352337');box(c,x+6,66,1,1,'#352337');box(c,x+3,69,3,1,'#e5c1a1');}
 box(c,386,94,188,22,'#1e102b');const score=g?g.score:[0,0],seconds=Math.ceil(g?.time??90),clock=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
 txt(c,`${score[0]}  ${clock}  ${score[1]}`,480,105,11,'#f9bd69');
}
function hoop(c,x,net=0,rimHeight=RIMZ){
 const base=project(CY),r=base-rimHeight,dir=x<480?-1:1;
 box(c,x+dir*43-4,r-27,9,rimHeight+27,'#151326');box(c,x+dir*43-3,r-25,3,rimHeight+24,'#b4a1b6');box(c,x+dir*39-9,base,26,7,'#151322');
 path(c,[[x+dir*44,r-29],[x+dir*25,r-35]],'#aa94ae',5);
 box(c,x+dir*26-3,r-49,7,63,'#d8def0');box(c,x+dir*26,r-45,2,54,'#a487b4');
 const pulse=Math.sin(net*20)*net*4;
 path(c,[[x-20,r+3],[x-12-pulse,r+25],[x+12+pulse,r+25],[x+20,r+3]],'#e2d3db',2);
 for(let i=0;i<5;i++){const xx=x-18+i*9;path(c,[[xx,r+2],[x+(xx-x)*.6+6+pulse,r+24]],'#c1b2c4',1);path(c,[[xx,r+2],[x+(xx-x)*.6-6-pulse,r+24]],'#e9dce0',1);}
 c.strokeStyle='#ff9f47';c.lineWidth=3;c.beginPath();c.ellipse(x,r,23,6,0,0,Math.PI*2);c.stroke();path(c,[[x-21,r+2],[x+21,r+2]],'#f27027',3);
}
function player(c,p,time,selected=false){
 const sy=project(p.y),scale=.64;
 c.globalAlpha=.28; c.fillStyle='#34223f';c.beginPath();c.ellipse(p.x,sy+2,14-p.z*.025,4-p.z*.005,0,0,Math.PI*2);c.fill();c.globalAlpha=1;
 if(selected){c.strokeStyle=p.plant>0?'#ffd37e':'#f5a955';c.lineWidth=2;c.beginPath();c.ellipse(p.x,sy+2,19,7,0,0,Math.PI*2);c.stroke();}
 if(p.plant>0){path(c,[[p.x-17,sy+5],[p.x+17,sy+5]],'#ffdf9b',3);txt(c,'SET',p.x,sy+19,6,'#ffe6aa');}
 sprite(c,p,p.x,sy-p.z,scale,time,selected);
 if(selected){txt(c,p.name.toUpperCase(),p.x,sy+15,7,'#ffe2ad');c.fillStyle='#ffa852';c.beginPath();c.moveTo(p.x-4,sy+21);c.lineTo(p.x+4,sy+21);c.lineTo(p.x,sy+25);c.fill();}
}
function ball(c,b,time){
 const sy=project(b.y),yy=sy-b.z,r=6;c.globalAlpha=.22;c.fillStyle='#33213a';c.beginPath();c.ellipse(b.x,sy+2,5,2,0,0,Math.PI*2);c.fill();c.globalAlpha=1;
 c.save();c.translate(Math.round(b.x),Math.round(yy));c.rotate(b.angle||0);dot(c,0,0,r+1,'#6e3b31');dot(c,0,0,r,'#f5a141');box(c,-3,-4,5,2,'#ffd089');path(c,[[-6,0],[6,0]],'#99582f',1);path(c,[[0,-6],[0,6]],'#99582f',1);c.restore();
}
function lineup(c,g){
 const ours=g.players.filter(p=>p.team===0),n=ours.length,w=Math.max(190,n*54+12),x=14,y=474;
 box(c,x,y,w,58,'#130d25df');box(c,x,y,w,2,'#9966ce');txt(c,'SUNBURST',x+6,y-7,6,'#b9a0cf','left');
 ours.forEach((p,i)=>{
  const xx=x+7+i*54,selected=p.id===g.control;
  if(selected){box(c,xx-2,y+3,50,52,'#563077');box(c,xx-2,y+3,50,2,'#ffb462');}
  txt(c,p.pos,xx+22,y+10,6,selected?'#ffd09c':'#c3a9dc');c.drawImage(getFace(p),xx+9,y+11,28,29);txt(c,p.name.toUpperCase(),xx+22,y+46,6,selected?'#ffe8c6':'#c7b7d9');
 });
}
function bug(c,g){
 box(c,14,13,266,60,'#110b20f2');box(c,14,13,266,3,'#e88938');box(c,14,16,6,54,'#7540a3');
 txt(c,'SUN',30,32,10,'#eda35e','left');txt(c,String(g.score[0]).padStart(2,'0'),100,32,17,'#fff');txt(c,'OWL',153,32,10,'#8dc4df','left');txt(c,String(g.score[1]).padStart(2,'0'),230,32,17,'#fff');
 const seconds=Math.ceil(g.time),clock=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
 txt(c,`${g.mode==='shootout'?'3PT':g.size+'v'+g.size}  Q1  ${clock}`,29,57,9,g.time<10?'#ffbd6f':'#dbc9e8','left');
 if(g.mode!=='shootout'){box(c,245,46,30,22,'#372047');txt(c,String(Math.ceil(g.shotClock)).padStart(2,'0'),260,58,10,'#ffb26f');}
 else txt(c,`${g.makes}/${g.attempts}`,255,58,8,'#ffcd8d');
}
function meter(c,p,q,difficulty){
 const x=Math.max(70,Math.min(890,p.x)),y=project(p.y)-p.z-85,threshold=[.8,.85,.9][difficulty];
 box(c,x-49,y-13,98,30,'#0c0a20');box(c,x-45,y-10,90,12,'#6d536f');box(c,x-45+90*threshold,y-10,90*(1-threshold),12,'#75d49a');
 box(c,x-45,y-10,90*q,12,q>=threshold?'#c5ffcc':'#ffb45a');box(c,x-46+90*q,y-13,3,18,'#fff');txt(c,'RELEASE AT FULL',x,y+11,6,'#e6d6ed');
}
function logo(){
 const c=document.getElementById('logo').getContext('2d');c.clearRect(0,0,360,200);c.imageSmoothingEnabled=false;
 c.save();c.translate(180,102);c.scale(1,.85);sun(c,0,0,66);c.restore();
 path(c,[[110,117],[125,176],[235,176],[250,117]],'#b7a5dc',4);
 for(let row=0;row<4;row++)for(let col=0;col<7;col++){const left=115+row*5,cell=(130-row*10)/7;box(c,left+col*cell,123+row*13,cell-1,12,(row+col)%2?'#dcd0ee':'#6c449b');}
 path(c,[[104,117],[256,117]],'#ffb358',7);
 c.fillStyle='#ffe5a9';c.beginPath();c.moveTo(252,44);c.lineTo(226,91);c.lineTo(250,91);c.lineTo(226,135);c.lineTo(280,78);c.lineTo(257,78);c.lineTo(272,44);c.fill();
}
rebuild();return{W,H,TOP,DEPTH,CY,RIMZ,project,box,path,txt,dot,sun,face,sprite,portrait,rebuild,arena,hoop,player,ball,lineup,bug,meter,logo};
})();
