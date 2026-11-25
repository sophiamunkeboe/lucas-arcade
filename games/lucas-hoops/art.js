/* Original pixel arena and character art. No official team, league or sponsor artwork. */
window.HoopsArt=(()=>{
'use strict';
const W=960,H=540,TOP=174,DEPTH=.60,CY=220,RIMZ=85;
const project=y=>TOP+y*DEPTH;
const bg=document.createElement('canvas');bg.width=W;bg.height=H;let RES=1,trail=[];
function setRes(r){r=r>=2?2:1;if(r===RES&&bg.width===W*r)return false;RES=r;bg.width=W*r;bg.height=H*r;return true;}
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
 }else{const K=kit(p);box(c,-12,-23,25,3,K.head);if(K.head2)box(c,-11,-22,23,1,K.head2);}
 c.restore();
}
const KITS={
 sunburst:{name:'SUNBURST',jersey:'#17151e',panel:'#7042a5',trim:'#f59b38',shorts:'#1c182a',shortSide:'#7042a5',band:'#f09b40',shoe:'#c295e0',head:'#a074ce',head2:'#f3a346',num:'#f7ead8',sun:true},
 owls:{name:'NIGHT OWLS',jersey:'#347ca9',panel:'#a8dde4',trim:'#dceef4',shorts:'#234b7b',shortSide:'#78bcd0',band:'#f09b40',shoe:'#bde4ed',head:'#85cadf',num:'#f7ead8'},
 coyotes:{name:'COYOTES',jersey:'#b4532a',panel:'#f2d29b',trim:'#3a2318',shorts:'#7d3a1f',shortSide:'#f2d29b',band:'#3a2318',shoe:'#f2d29b',head:'#f2d29b',num:'#fff3dc'},
 monsoon:{name:'MONSOON',jersey:'#1f7a62',panel:'#9ff0c8',trim:'#ffe36b',shorts:'#145646',shortSide:'#9ff0c8',band:'#ffe36b',shoe:'#9ff0c8',head:'#9ff0c8',num:'#f2fff8'}
};
function kit(p){return p.kit?KITS[p.kit]||KITS.owls:p.team===0?KITS.sunburst:KITS.owls;}
function sprite(c,p,x,y,scale=.65,time=0,selected=false){
 const speed=Math.hypot(p.vx||0,p.vy||0),dribble=Number.isFinite(p.dribblePose),K=kit(p);
 const running=!dribble&&speed>12&&!(p.z>10),phase=p.walk||0,s=running?Math.sin(phase):0,bob=running?-Math.abs(Math.cos(phase))*2.2:0;
 const air=!dribble&&p.z>10,land=p._land>0?p._land:0;
 c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);
 if(land)c.scale(1+land*.9,1-land*.9);
 if(p.spin>0)c.scale(Math.cos(p.spin*14)*.5+.65,1);
 const skin=p.skin||'#e5b691',shade=p.shade||'#bc8768';
 if(dribble){
  // Intro-only wide stance: a clear lane for the ball to cross between his legs.
  path(c,[[-8,-27],[-17,-16],[-21,-5]],shade,9);path(c,[[8,-27],[17,-16],[21,-5]],skin,9);
  box(c,-25,-9,8,6,'#f7e9d5');box(c,17,-9,8,6,'#f7e9d5');box(c,-28,-5,15,5,'#181125');box(c,15,-5,15,5,'#181125');box(c,-28,-5,14,2,'#c295e0');box(c,15,-5,14,2,'#c295e0');
 }else if(air){
  // Jump pose: knees tucked, toes pointed.
  box(c,-12,-27,8,10,shade);box(c,-14,-19,8,8,shade);box(c,4,-27,8,12,skin);box(c,6,-17,8,6,'#f7e9d5');
  box(c,-17,-13,12,5,'#161225');box(c,-17,-13,11,2,K.shoe);box(c,5,-11,13,5,'#161225');box(c,5,-11,12,2,K.shoe);
 }else{
  // Four-beat run cycle: stride forward/back with the lifted foot clearing the floor.
  const la=Math.max(0,s)*5,lb=Math.max(0,-s)*5,oa=-s*3,ob=s*3;
  box(c,-12+oa,-25,8,15-la,shade);box(c,4+ob,-25,8,15-lb,skin);box(c,-12+oa,-11-la,8,7,'#f7e9d5');box(c,4+ob,-11-lb,8,7,'#f7e9d5');
  box(c,-15+oa,-5-la,14,5,'#161225');box(c,2+ob,-5-lb,15,5,'#161225');box(c,-15+oa,-5-la,13,2,K.shoe);box(c,2+ob,-5-lb,14,2,K.shoe);
  if(p.boost>.3||p.speedUp>0){box(c,-15+oa,-1-la,14,1,'#fff6c2');box(c,2+ob,-1-lb,15,1,'#fff6c2');}
 }
 if(p._fire&&!dribble){c.save();c.globalAlpha=.85;flame(c,-8,-2,time+p.id,1.1);flame(c,9,-2,time+p.id*2,1.1);c.restore();}
 c.translate(0,Math.round(bob));
 box(c,-15,-34,30,12,K.shorts);box(c,-15,-34,5,13,K.shortSide);box(c,10,-34,5,13,K.shortSide);box(c,-15,-24,30,2,K.band);
 box(c,-15,-58,30,26,'#151421');box(c,-12,-56,24,23,K.jersey);box(c,-14,-55,5,23,K.panel);box(c,10,-55,4,23,K.panel);
 box(c,-12,-56,24,2,'#ffffff18');box(c,-12,-37,24,3,'#00000030');
 path(c,[[-10,-56],[-6,-53],[6,-53],[11,-56]],K.trim,3);box(c,-13,-34,27,2,K.trim);
 // Tiny, original rising-sun motif and jersey number.
 if(K.sun){box(c,-4,-51,8,3,'#f5a24a');box(c,-6,-49,12,2,'#f5a24a');box(c,-1,-54,2,2,'#f5a24a');box(c,-8,-52,2,2,'#f5a24a');box(c,7,-52,2,2,'#f5a24a');}
 txt(c,String(p.number||1),1,-40,9,K.num,'center',false);
 const arms=p.z>10||p.charging||p.plant>0,f=p.face||1;
 if(dribble){const side=Math.cos(p.dribblePose),handY=-23+Math.abs(Math.sin(p.dribblePose))*8;path(c,[[-17,-50],[-22,-35],[-12+side*10,handY]],shade,7);path(c,[[17,-50],[23,-35],[12+side*10,handY]],skin,7);}
 else if(p.introDunk){path(c,[[-17,-52],[-23,-75],[-17,-101]],shade,7);box(c,-22,-106,10,7,skin);path(c,[[17,-51],[23,-80],[18,-105]],skin,7);box(c,14,-110,10,8,skin);}
 else if(arms){const reach=p.charging?-4:0;box(c,-21,-72+reach,7,25,shade);box(c,-21,-76+reach,10,7,skin);box(c,15,-70+reach,7,25,skin);box(c,13,-76+reach,10,8,skin);}
 else if(Number.isFinite(p._bz)){
  // Dribble hand follows the ball: palm on top at the peak, wrist snap on the way down.
  const hy=Math.max(-50,Math.min(-22,-(p._bz/scale)-6-bob)),hx=f*19;
  if(f>0){box(c,-20,-53+s*2,7,22,shade);path(c,[[15,-52],[21,(hy-52)/2],[hx,hy]],skin,7);box(c,hx-4,hy-2,9,6,skin);}
  else{box(c,14,-53+s*2,7,22,skin);path(c,[[-15,-52],[-21,(hy-52)/2],[hx,hy]],shade,7);box(c,hx-5,hy-2,9,6,shade);}
 }
 else{const a=running?s*4:0;box(c,-20+a*.4,-53,7,23-a,shade);box(c,14-a*.4,-53,7,21+a,skin);box(c,15-a*.4,-35+a,9,6,skin);}
 box(c,-5,-65,12,9,shade);face(c,p,0,-62,1);c.restore();
}
function portrait(c,p,width,height){c.clearRect(0,0,width,height);c.imageSmoothingEnabled=false;const scale=height/103;sprite(c,{...p,vx:0,vy:0,z:0},width/2,height-4,scale,0,false);}
function getFace(p){
 const key=p.name+'|'+(p.kit||p.team);if(!faceCache.has(key)){const c=document.createElement('canvas');c.width=40;c.height=43;face(c.getContext('2d'),p,20,43,1.1);faceCache.set(key,c);}return faceCache.get(key);
}
const THEMES={
 sunburst:{name:'SUNBURST ARENA',sub:'HOME COURT',sky:['#090611','#281339','#3b1c45'],rafter:['#3a2454','#161127'],banner:['#14101f','#342055','#ad5c29','#eedac1','#a68abe'],glow:'#7f359744',ribbon:['#fc8d25','#ffc262','#441c2c'],seatsA:['#463344','#543853','#3d354f','#705046','#29233f'],seatsB:['#75564f','#634950','#8c6a5b','#4f3e45'],rail:['#24102d','#e27d2b','#d59765'],railText:['MAKE SOME NOISE','SUNBURST FIELDHOUSE'],apron:['#100d18','#45265f'],floor:['#dfbe8d','#e6c99d','#d9b586','#e9cca0','#dcb98c'],sheen:'#f8ddb255',edge:['#291333','#26152f'],paint:'#674392',line:'#fff1cc',center:'sun',base:['S U N B U R S T','#f2a052'],under:['#1d102c','#0b0916'],crowd:'seats'},
 owls:{name:'NIGHT OWLS ROOST',sub:'AWAY ARENA',sky:['#03070f','#0b2133','#0f3346'],rafter:['#1d4a5c','#0a1622'],banner:['#08121b','#163c52','#3fb6c9','#d7f3f8','#86b9c6'],glow:'#2b8fae40',ribbon:['#2fb9cf','#a6f1ff','#0b2a35'],seatsA:['#25384a','#2b4258','#203246','#3b4f5f','#172636'],seatsB:['#4b6a7c','#3f5a6c','#5f7f8c','#344a5a'],rail:['#0b1d2a','#3fb6c9','#9fdbe6'],railText:['WHO? WHO? WHO?','THE ROOST'],apron:['#060b12','#12324a'],floor:['#b98a5e','#c4966a','#ae8156','#c99d70','#b68a60'],sheen:'#f0d2a844',edge:['#0e2333','#0c1d2b'],paint:'#1f5f7a',line:'#e9fbff',center:'owl',base:['N I G H T   O W L S','#7fd6e6'],under:['#0b1a26','#050a10'],crowd:'seats'},
 street:{name:'STREET COURT',sub:'OUTDOOR / SUNSET',sky:['#2a1a4a','#c2557a','#ff9e57'],rafter:null,banner:null,glow:'#ffcf7a33',ribbon:null,rail:['#55525c','#8b8794','#efe6d2'],railText:['NO DUNKING? JK.','LUCAS HOOPS PARK'],apron:['#26242c','#3b3944'],floor:['#4b4b57','#52525e','#474753','#565662','#4e4e5a'],sheen:'#ffffff12',edge:['#34323c','#302e38'],paint:'#2e6b9e',line:'#f4f4f0',center:'sun',base:['C I T Y   C O U R T','#ffd36b'],under:['#24222a','#141218'],crowd:'fence',planks:false},
 neon:{name:'RETRO NEON',sub:'ARCADE NIGHT',sky:['#05010c','#1a0630','#2a0a40'],rafter:['#ff4bd855','#3ff3ff33'],banner:['#0b0316','#2a0a40','#ff4bd8','#3ff3ff','#c88cff'],glow:'#ff4bd833',ribbon:['#ff4bd8','#ffd0f4','#2a0130'],seatsA:['#1a0b2a','#22103a','#160924','#2a1240','#120720'],seatsB:['#ff4bd8','#3ff3ff','#3a1a55','#2a1240'],rail:['#12041f','#3ff3ff','#ff9cf0'],railText:['INSERT COIN','NEON NIGHT'],apron:['#05010c','#1f0835'],floor:['#140a26','#170b2b','#120822','#180c2e','#150a28'],sheen:'#ff4bd826',edge:['#2a0a40','#24083a'],paint:'#3a0f4f',line:'#3ff3ff',center:'neon',base:['R E T R O   N E O N','#ff8bf0'],under:['#14042a','#05010c'],crowd:'seats',grid:true}
};
// "My Court": the Sunburst arena with the player's own painted floor (paint.js). Cosmetic only.
THEMES.custom={...THEMES.sunburst,name:'MY COURT',sub:'PAINTED BY YOU',paint:'#67439238',center:'none',base:['M Y   C O U R T','#f2a052'],railText:['MAKE SOME NOISE','MY COURT'],custom:true};
let customLayer=null;function setCustom(cv){customLayer=cv||null;}
let themeKey='sunburst';
function owlMark(c,x,y,r){
 c.save();c.translate(x,y);box(c,-r*.8,-r*.75,r*1.6,r*1.5,'#1d5875');box(c,-r*.95,-r*.95,r*.45,r*.45,'#1d5875');box(c,r*.5,-r*.95,r*.45,r*.45,'#1d5875');
 for(const s of [-1,1]){dot(c,s*r*.38,-r*.15,r*.34,'#e9fbff');dot(c,s*r*.38,-r*.15,r*.18,'#f2b43c');dot(c,s*r*.38,-r*.15,r*.08,'#0b1a26');}
 c.fillStyle='#f2b43c';c.beginPath();c.moveTo(-r*.12,r*.12);c.lineTo(r*.12,r*.12);c.lineTo(0,r*.38);c.fill();
 for(let i=-2;i<=2;i++)box(c,i*r*.22-2,r*.45,4,4,'#3fb6c9');c.restore();
}
function rebuild(key){
 if(key&&THEMES[key])themeKey=key;const T=THEMES[themeKey];
 faceCache.clear();const c=bg.getContext('2d');c.setTransform(RES,0,0,RES,0,0);c.imageSmoothingEnabled=false;
 const g=c.createLinearGradient(0,0,0,490);g.addColorStop(0,T.sky[0]);g.addColorStop(.3,T.sky[1]);g.addColorStop(1,T.sky[2]);c.fillStyle=g;c.fillRect(0,0,W,H);
 if(T.crowd==='fence'){
  // Sunset skyline, streetlights and a chain-link fence. All invented.
  dot(c,780,70,30,'#ffd27a');dot(c,780,70,24,'#ffe9a8');
  for(let i=0;i<22;i++){const bw=34+(i*37)%40,bh=40+(i*53)%70,bx=i*46-10;box(c,bx,178-bh-40,bw,bh+40,['#2a1d3d','#352449','#22182f'][i%3]);for(let wy=178-bh-32;wy<160;wy+=10)for(let wx=bx+5;wx<bx+bw-6;wx+=9)if((wx*7+wy*13)%5<2)box(c,wx,wy,4,5,'#ffcf7a');}
  box(c,0,96,W,82,'#00000033');c.strokeStyle='#9a96a866';c.lineWidth=1;for(let x=-90;x<W+90;x+=14){c.beginPath();c.moveTo(x,96);c.lineTo(x+82,178);c.stroke();c.beginPath();c.moveTo(x+82,96);c.lineTo(x,178);c.stroke();}
  box(c,0,94,W,3,'#8b8794');for(let x=20;x<W;x+=150)box(c,x,94,4,84,'#77737f');
  for(const x of [60,900]){box(c,x,20,5,158,'#3a3742');box(c,x-14,18,24,6,'#3a3742');box(c,x-12,24,18,3,'#fff2b8');}
 }else{
  for(let i=0;i<10;i++){path(c,[[i*110,0],[i*110+50,90]],T.rafter[0],3);path(c,[[i*110+20,0],[i*110+65,70]],T.rafter[1],4);}
  for(const [x,n] of [[106,13],[225,28],[724,46],[844,72]]){
   box(c,x-23,13,46,61,T.banner[0]);box(c,x-19,16,38,53,T.banner[1]);box(c,x-23,16,46,5,T.banner[2]);txt(c,String(n),x,43,18,T.banner[3]);txt(c,'LEGENDS',x,64,5,T.banner[4]);
  }
 }
 const glow=c.createRadialGradient(480,120,10,480,120,470);glow.addColorStop(0,T.glow);glow.addColorStop(1,'#10091900');c.fillStyle=glow;c.fillRect(0,0,W,250);
 if(T.crowd==='seats'){
  box(c,0,82,W,13,T.ribbon[0]);box(c,0,86,W,2,T.ribbon[1]);
  for(let row=0;row<5;row++){
   const yy=102+row*12;box(c,0,yy+9,W,3,'#100e1b');
   for(let col=0;col<80;col++){
    const x=col*12+(row%2)*5,k=(row*41+col*29)%43;
    box(c,x,yy+3,7,7,T.seatsA[k%5]);box(c,x+1,yy,5,5,T.seatsB[k%4]);box(c,x+1,yy,5,1,'#29212d');
   }
  }
 }
 box(c,0,163,W,14,T.rail[0]);box(c,0,163,W,3,T.rail[1]);
 for(const x of [140,480,820])txt(c,x===480?T.railText[1]:T.railText[0],x,172,7,T.rail[2]);
 // Floor, apron and original court markings.
 box(c,0,178,W,304,T.apron[0]);box(c,23,183,914,285,T.apron[1]);
 for(let row=0;row<24;row++)for(let col=-1;col<18;col++){
  const x=col*58+(row%2)*29,y=188+row*11,k=(row*7+col*13+80)%5;
  if(T.planks===false){box(c,x,y,58,11,T.floor[k]);if((row*31+col*17)%7===0)box(c,x+(row*13)%50,y+4,2,2,'#ffffff18');}
  else{box(c,x+1,y,57,10,T.floor[k]);box(c,x+7,y+3,30,1,T.sheen);}
 }
 c.save();c.translate(0,TOP);c.scale(1,DEPTH);
 if(T.grid){c.strokeStyle='#ff4bd855';c.lineWidth=1;for(let x=48;x<=912;x+=36){c.beginPath();c.moveTo(x,40);c.lineTo(x,454);c.stroke();}for(let y=40;y<=454;y+=36){c.beginPath();c.moveTo(48,y);c.lineTo(912,y);c.stroke();}}
 box(c,32,22,896,16,T.edge[0]);box(c,32,457,896,18,T.edge[0]);box(c,32,22,15,450,T.edge[1]);box(c,913,22,15,450,T.edge[1]);
 // Painted design: flat court cells drawn through the same floor transform (x, TOP+y*DEPTH), under paint + lines.
 if(T.custom&&customLayer){c.imageSmoothingEnabled=false;c.drawImage(customLayer,48,40,864,414);}
 box(c,48,CY-90,146,180,T.paint);box(c,766,CY-90,146,180,T.paint);
 if(T.grid){c.shadowColor=T.line;c.shadowBlur=8;}
 c.strokeStyle=T.line;c.lineWidth=2;c.strokeRect(48,40,864,414);c.strokeRect(48,CY-90,146,180);c.strokeRect(766,CY-90,146,180);
 c.save();c.beginPath();c.rect(48,40,864,414);c.clip();c.beginPath();c.arc(194,CY,62,-Math.PI/2,Math.PI/2);c.stroke();c.beginPath();c.arc(766,CY,62,Math.PI/2,Math.PI*1.5);c.stroke();
 c.beginPath();c.arc(83,CY,265,-Math.PI/2,Math.PI/2);c.stroke();c.beginPath();c.arc(877,CY,265,Math.PI/2,Math.PI*1.5);c.stroke();
 c.restore();path(c,[[480,40],[480,454]],T.line,2);c.beginPath();c.arc(480,CY,67,0,Math.PI*2);c.stroke();c.shadowBlur=0;
 if(T.center==='owl')owlMark(c,480,CY,40);else if(T.center==='neon'){c.strokeStyle='#ff4bd8';c.lineWidth=3;c.beginPath();c.arc(480,CY,50,0,Math.PI*2);c.stroke();sun(c,480,CY,36);}else if(T.center!=='none')sun(c,480,CY,42);
 c.restore();txt(c,T.base[0],480,459,12,T.base[1]);
 const floorGlow=c.createLinearGradient(0,475,0,540);floorGlow.addColorStop(0,T.under[0]);floorGlow.addColorStop(1,T.under[1]);c.fillStyle=floorGlow;c.fillRect(0,476,W,64);
}
function arena(c,g,time,menu=false){
 c.drawImage(bg,0,0,W,H);
 // Scrolling upper-deck LED ribbon (render-only).
 const T=THEMES[themeKey];if(T.ribbon){const off=(time*34)%178;box(c,0,82,W,13,T.ribbon[0]);box(c,0,86,W,2,T.ribbon[1]);for(let x=-178;x<W+178;x+=178)txt(c,'LUCAS HOOPS',x+73+off,90,7,T.ribbon[2],'center',false);
  const sweep=(time*220)%(W+300)-150;c.globalAlpha=.35;box(c,sweep,82,60,13,'#fff1c4');c.globalAlpha=1;}
 if(T.crowd==='fence'){box(c,402,116,6,62,'#3a3742');box(c,552,116,6,62,'#3a3742');}
 // Sparse, deterministic camera flashes: no per-frame crowd sprites or allocations.
 for(let i=0;i<26;i++){if(Math.sin(time*(.75+(i%4)*.16)+i*17.7)>.996){const x=(i*127+31)%W,y=104+(i*19)%53;box(c,x-3,y,7,1,'#ede3ff');box(c,x,y-3,1,7,'#fff');}}
 // Suspended four-sided video cube. Small score bug remains independent at top-left.
 if(T.crowd!=='fence'){path(c,[[413,0],[430,29]],'#605571',2);path(c,[[546,0],[530,29]],'#605571',2);}
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
 const sy=project(p.y),scale=.64,h=Math.min(1,(p.z||0)/90);
 if((p._lz||0)>6&&!(p.z>0))p._land=.12;p._lz=p.z||0;if(p._land>0)p._land=Math.max(0,p._land-1/60);
 c.globalAlpha=.30-h*.14;c.fillStyle='#1e1228';c.beginPath();c.ellipse(Math.round(p.x),Math.round(sy+2),15-h*6,4.5-h*1.5,0,0,Math.PI*2);c.fill();c.globalAlpha=1;
 if(selected){const pulse=Math.sin(time*6)*1.5;c.strokeStyle=p.plant>0?'#ffd37e':'#f5a955';c.lineWidth=2;c.beginPath();c.ellipse(Math.round(p.x),Math.round(sy+2),19+pulse,7+pulse*.35,0,0,Math.PI*2);c.stroke();c.globalAlpha=.25;c.lineWidth=4;c.stroke();c.globalAlpha=1;}
 if(p.plant>0){path(c,[[p.x-17,sy+5],[p.x+17,sy+5]],'#ffdf9b',3);txt(c,'SET',p.x,sy+19,6,'#ffe6aa');}
 sprite(c,p,p.x,sy-p.z,scale,time,selected);
 if(selected){txt(c,(p.tag?p.tag+' ':'')+p.name.toUpperCase(),p.x,sy+15,7,p.tagColor||'#ffe2ad');c.fillStyle=p.tagColor||'#ffa852';c.beginPath();c.moveTo(p.x-4,sy+21);c.lineTo(p.x+4,sy+21);c.lineTo(p.x,sy+25);c.fill();}
}
function ball(c,b,time){
 const sy=project(b.y),yy=sy-b.z,r=6,h=Math.min(1,b.z/160);
 // Render-only motion trail for shots and passes (fire-colored when a team is hot).
 if((b.shot||b.pass)&&!b.owner){trail.push({x:b.x,y:yy,a:1});if(trail.length>9)trail.shift();}else if(trail.length)trail.shift();
 for(let i=0;i<trail.length;i++){const q=trail[i],k=(i+1)/trail.length;c.globalAlpha=k*(b.fire?.55:.28);const s=2+k*(b.fire?6:4);box(c,q.x-s/2,q.y-s/2,s,s,b.fire?(i%2?'#ffd25a':'#ff5a1f'):'#ffd7a0');}
 c.globalAlpha=.26-h*.12;c.fillStyle='#1e1228';c.beginPath();c.ellipse(Math.round(b.x),Math.round(sy+2),6-h*2.5,2.2-h*.8,0,0,Math.PI*2);c.fill();c.globalAlpha=1;
 const squash=b.z<9?Math.min(.28,(9-b.z)/20):0;
 c.save();c.translate(Math.round(b.x),Math.round(yy+squash*6));if(squash)c.scale(1+squash,1-squash);
 if(b.fire){c.globalAlpha=.55+Math.sin(time*30)*.2;dot(c,0,-2,r+4,'#ff6a1f');c.globalAlpha=1;}
 dot(c,0,0,r+1,'#4a2321');dot(c,0,0,r,'#f5a141');
 c.save();c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.clip();box(c,-r,1,r*2,r,'#d97a2e');box(c,1,-r,r,r*2,'#e88b35');c.rotate(b.angle||0);path(c,[[-7,0],[7,0]],'#7a3f24',1);path(c,[[0,-7],[0,7]],'#7a3f24',1);c.strokeStyle='#7a3f24';c.lineWidth=1;c.beginPath();c.arc(-8,0,6,-.9,.9);c.stroke();c.beginPath();c.arc(8,0,6,Math.PI-.9,Math.PI+.9);c.stroke();c.restore();
 box(c,-4,-5,3,2,'#ffe0a8');box(c,-5,-3,2,2,'#ffd089');
 c.restore();
}
function lineup(c,g,team=0,right=false,controls=[g.control]){
 const ours=g.players.filter(p=>p.team===team),n=ours.length,w=Math.max(190,n*54+12),x=right?W-14-w:14,y=474,K=KITS[ours[0]?.kit]||KITS.sunburst;
 box(c,x,y,w,58,'#130d25df');box(c,x,y,w,2,team===0?'#9966ce':'#6fb7cf');txt(c,(g.teams?.[team]?.name)||K.name,x+6,y-7,6,'#b9a0cf','left');
 ours.forEach((p,i)=>{
  const xx=x+7+i*54,selected=controls.includes(p.id);
  if(selected){box(c,xx-2,y+3,50,52,team===0?'#563077':'#1f4d63');box(c,xx-2,y+3,50,2,'#ffb462');}
  txt(c,p.pos,xx+22,y+10,6,selected?'#ffd09c':'#c3a9dc');c.drawImage(getFace(p),xx+9,y+11,28,26);txt(c,p.name.toUpperCase(),xx+22,y+43,6,selected?'#ffe8c6':'#c7b7d9');
  // Stamina bar: green fresh, orange tired, red gassed.
  const st=Math.max(0,Math.min(1,p.stamina??1));box(c,xx+3,y+50,40,4,'#0a0716');box(c,xx+3,y+50,40*st,4,st>.6?'#79e09a':st>.35?'#f2b14a':'#ff5a4a');
 });
}
function bug(c,g){
 const tm=g.teams||[{abbr:'SUN',color:'#eda35e'},{abbr:'OWL',color:'#8dc4df'}];
 box(c,14,13,266,60,'#110b20f2');box(c,14,13,266,3,'#e88938');box(c,14,16,6,54,'#7540a3');
 txt(c,tm[0].abbr,30,32,10,tm[0].color,'left');txt(c,String(g.score[0]).padStart(2,'0'),100,32,17,'#fff');txt(c,tm[1].abbr,153,32,10,tm[1].color,'left');txt(c,String(g.score[1]).padStart(2,'0'),230,32,17,'#fff');
 if(g.fire?.[0]>0)flame(c,124,30,g.t||0,.8);if(g.fire?.[1]>0)flame(c,254,30,g.t||0,.8);
 const seconds=Math.ceil(g.time),clock=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`,per=g.period?(g.period>1?'OT'+g.period:'OT'):'Q1';
 txt(c,`${g.mode==='shootout'?'3PT':g.size+'v'+g.size}  ${per}  ${clock}`,29,57,9,g.period?'#ffcf7a':g.time<10?'#ffbd6f':'#dbc9e8','left');
 if(g.mode!=='shootout'){box(c,245,46,30,22,'#372047');txt(c,String(Math.ceil(g.shotClock)).padStart(2,'0'),260,58,10,'#ffb26f');}
 else txt(c,`${g.makes}/${g.attempts}`,255,58,8,'#ffcd8d');
 if(g.fouls&&g.mode!=='shootout')txt(c,`FOULS ${g.fouls[0]}-${g.fouls[1]}`,150,80,5,'#9b86b3');
}
function flame(c,x,y,time,s=1){
 const f=Math.sin(time*24)*1.5;box(c,x-4*s,y-2*s,8*s,7*s,'#ff5a1f');box(c,x-3*s,y-6*s-f,6*s,6*s,'#ff8a2a');box(c,x-2*s,y-9*s+f,4*s,5*s,'#ffd25a');box(c,x-1*s,y-11*s-f,2*s,3*s,'#fff2b0');
}
function pickup(c,u,time){
 const sy=project(u.y),bob=Math.sin(time*4+u.x)*3,blink=u.life<2.5&&Math.sin(time*18)>0;if(blink)return;
 c.globalAlpha=.3;c.fillStyle='#1e1228';c.beginPath();c.ellipse(u.x,sy+2,10,3,0,0,Math.PI*2);c.fill();c.globalAlpha=1;
 const y=sy-22+bob;box(c,u.x-11,y-11,22,22,'#120b22');box(c,u.x-9,y-9,18,18,u.type==='bolt'?'#2f6bd8':'#8a2a1a');box(c,u.x-9,y-9,18,2,'#ffffff55');
 if(u.type==='bolt'){c.fillStyle='#ffe36b';c.beginPath();c.moveTo(u.x+2,y-8);c.lineTo(u.x-5,y+1);c.lineTo(u.x,y+1);c.lineTo(u.x-2,y+8);c.lineTo(u.x+5,y-1);c.lineTo(u.x,y-1);c.closePath();c.fill();}
 else flame(c,u.x,y+4,time,1);
 txt(c,u.type==='bolt'?'SPEED':'FIRE',u.x,y+19,5,'#fff1c4');
}
function trophy(c,x,y,s=1){
 c.save();c.translate(x,y);c.scale(s,s);
 box(c,-34,70,68,14,'#4a2a17');box(c,-28,62,56,10,'#6b3d1f');box(c,-30,74,60,3,'#f2b43c');
 box(c,-8,30,16,34,'#d99a1f');box(c,-4,30,4,34,'#ffe08a');box(c,-18,56,36,8,'#d99a1f');
 box(c,-36,-40,72,10,'#ffcf4a');box(c,-32,-30,64,30,'#f2b43c');box(c,-24,0,48,14,'#e0a325');box(c,-14,14,28,16,'#d99a1f');
 box(c,-28,-30,8,40,'#ffe9a8');box(c,-52,-34,16,8,'#f2b43c');box(c,-56,-28,8,26,'#f2b43c');box(c,-52,-4,16,8,'#f2b43c');box(c,36,-34,16,8,'#f2b43c');box(c,48,-28,8,26,'#f2b43c');box(c,36,-4,16,8,'#f2b43c');
 sun(c,4,-14,10);txt(c,'CHAMPS',0,77,6,'#ffe9a8','center',false);c.restore();
}
function meter(c,p,q,difficulty,thr){
 const x=Math.max(70,Math.min(890,p.x)),y=project(p.y)-p.z-85,threshold=thr??[.8,.85,.9][difficulty];
 box(c,x-49,y-13,98,30,'#0c0a20');box(c,x-45,y-10,90,12,'#6d536f');box(c,x-45+90*threshold,y-10,90*(1-threshold),12,'#75d49a');
 box(c,x-45,y-10,90*q,12,q>=threshold?'#c5ffcc':'#ffb45a');box(c,x-46+90*q,y-13,3,18,'#fff');txt(c,'RELEASE AT FULL',x,y+11,6,'#e6d6ed');
}
function ftMeter(c,p,m,zone,label,human){
 const x=Math.max(80,Math.min(880,p.x)),y=project(p.y)-p.z-92;
 box(c,x-62,y-16,124,36,'#0c0a20');box(c,x-56,y-10,112,12,'#6d536f');box(c,x-56+112*(.5-zone/2),y-10,112*zone,12,'#75d49a');box(c,x-2+0,y-12,2,16,'#c5ffcc');
 box(c,x-57+112*m,y-14,4,20,'#fff');txt(c,label,x,y+12,6,human?'#ffe6aa':'#e6d6ed');
}
function logo(){
 const c=document.getElementById('logo').getContext('2d');c.clearRect(0,0,360,200);c.imageSmoothingEnabled=false;
 c.save();c.translate(180,102);c.scale(1,.85);sun(c,0,0,66);c.restore();
 path(c,[[110,117],[125,176],[235,176],[250,117]],'#b7a5dc',4);
 for(let row=0;row<4;row++)for(let col=0;col<7;col++){const left=115+row*5,cell=(130-row*10)/7;box(c,left+col*cell,123+row*13,cell-1,12,(row+col)%2?'#dcd0ee':'#6c449b');}
 path(c,[[104,117],[256,117]],'#ffb358',7);
 c.fillStyle='#ffe5a9';c.beginPath();c.moveTo(252,44);c.lineTo(226,91);c.lineTo(250,91);c.lineTo(226,135);c.lineTo(280,78);c.lineTo(257,78);c.lineTo(272,44);c.fill();
}
rebuild();return{W,H,TOP,DEPTH,CY,RIMZ,KITS,THEMES,get theme(){return themeKey;},kit,setRes,setCustom,flame,pickup,trophy,ftMeter,get RES(){return RES;},project,box,path,txt,dot,sun,face,sprite,portrait,rebuild,arena,hoop,player,ball,lineup,bug,meter,logo};
})();
