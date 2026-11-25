/* Lucas Hoops "My Court" painter. Cosmetic only: the design is a 216x104 pixel layer (one cell = 4 court units)
   that art.js lays on the floor under the court lines, using the same floor projection as everything else.
   Saved on this phone only (localStorage, small PNG). Never sent online. */
window.HoopsPaint=(()=>{
'use strict';
const GW=216,GH=104,KEY='lucasHoops.court.v1',CY=220;
const PALETTE=['#fc8d25','#ffc262','#e2452b','#674392','#a68abe','#2876e8','#3fb6c9','#31c46c','#f2e14c','#ffffff','#161326','#8b5a2b','#ff4bd8','#9aa3b5'];
const layer=document.createElement('canvas');layer.width=GW;layer.height=GH;const lc=layer.getContext('2d',{willReadFrequently:true});
const STAMPS={
 star:{label:'STAR',rows:['....#....','....#....','...###...','#########','.#######.','..#####..','..##.##..','.##...##.','.#.....#.'],map:{'#':null}},
 flame:{label:'FLAME',rows:['...r...','..rr...','..ror..','.rooor.','.royor.','roooyor','royyyor','royyyyr','.ryyyr.','..rrr..'],map:{r:'#e2452b',o:'#fc8d25',y:'#ffc262'}},
 lh:{label:'LH',rows:['kkkkkkkkkkkkkkk','koooooooooooook','kopooooopooopok','kopooooopooopok','kopooooopppppok','kopooooopooopok','koppppoopooopok','koooooooooooook','kkkkkkkkkkkkkkk'],map:{k:'#161326',o:'#fc8d25',p:'#674392'}},
 sun:{label:'SUN',art:true}
};
let ui=null,undo=[],tool='brush',size=1,color=PALETTE[0],drawing=null,dirty=true,raf=0,done=null;
function hasSaved(){try{return !!localStorage.getItem(KEY);}catch(e){return false;}}
function load(cb){let d=null;try{d=localStorage.getItem(KEY);}catch(e){}lc.clearRect(0,0,GW,GH);if(!d){cb&&cb(false);return;}const im=new Image();im.onload=()=>{lc.clearRect(0,0,GW,GH);lc.drawImage(im,0,0);cb&&cb(true);};im.onerror=()=>cb&&cb(false);im.src=d;}
function save(){try{localStorage.setItem(KEY,layer.toDataURL('image/png'));return true;}catch(e){return false;}}
function snap(){undo.push(lc.getImageData(0,0,GW,GH));if(undo.length>30)undo.shift();}
const SIZES=[1,3,6];
function dab(x,y){const s=SIZES[size],o=Math.floor(s/2);if(tool==='eraser')lc.clearRect(x-o,y-o,s,s);else{lc.fillStyle=color;lc.fillRect(x-o,y-o,s,s);}}
function line(a,b){const n=Math.max(Math.abs(b.x-a.x),Math.abs(b.y-a.y),1);for(let i=0;i<=n;i++)dab(Math.round(a.x+(b.x-a.x)*i/n),Math.round(a.y+(b.y-a.y)*i/n));}
function hex(c){const n=parseInt(c.slice(1),16);return[n>>16&255,n>>8&255,n&255,255];}
function fill(x,y){
 const img=lc.getImageData(0,0,GW,GH),d=img.data,i0=(y*GW+x)*4,t=[d[i0],d[i0+1],d[i0+2],d[i0+3]],r=hex(color);
 const same=i=>t[3]===0?d[i+3]<40:Math.abs(d[i]-t[0])+Math.abs(d[i+1]-t[1])+Math.abs(d[i+2]-t[2])+Math.abs(d[i+3]-t[3])<48;
 if(t[0]===r[0]&&t[1]===r[1]&&t[2]===r[2]&&t[3]===255)return;
 const st=[x,y],seen=new Uint8Array(GW*GH);
 while(st.length){const yy=st.pop(),xx=st.pop();if(xx<0||yy<0||xx>=GW||yy>=GH)continue;const k=yy*GW+xx;if(seen[k])continue;seen[k]=1;const i=k*4;if(!same(i))continue;d[i]=r[0];d[i+1]=r[1];d[i+2]=r[2];d[i+3]=255;st.push(xx+1,yy,xx-1,yy,xx,yy+1,xx,yy-1);}
 lc.putImageData(img,0,0);
}
function stamp(key,x,y){
 const S=STAMPS[key],k=[1,2,3][size];
 if(S.art){const n=[18,28,40][size],t=document.createElement('canvas');t.width=t.height=120;const tc=t.getContext('2d');window.HoopsArt.sun(tc,60,60,42);
  const sm=document.createElement('canvas');sm.width=sm.height=n;const sc=sm.getContext('2d');sc.imageSmoothingEnabled=false;sc.drawImage(t,0,0,n,n);
  const im=sc.getImageData(0,0,n,n);for(let i=3;i<im.data.length;i+=4)im.data[i]=im.data[i]>110?255:0;sc.putImageData(im,0,0);
  lc.imageSmoothingEnabled=false;lc.drawImage(sm,Math.round(x-n/2),Math.round(y-n/2));return;}
 const h=S.rows.length,w=S.rows[0].length,ox=Math.round(x-w*k/2),oy=Math.round(y-h*k/2);
 S.rows.forEach((row,ry)=>[...row].forEach((ch,rx)=>{if(ch==='.')return;lc.fillStyle=S.map[ch]||color;lc.fillRect(ox+rx*k,oy+ry*k,k,k);}));
}
// Flat top-down court guide (same geometry as art.js rebuild, court units 48..912 x 40..454).
function guide(c,w,h){
 const sx=w/864,sy=h/414,X=x=>(x-48)*sx,Y=y=>(y-40)*sy;c.save();c.strokeStyle='#ffffff';c.globalAlpha=.42;c.lineWidth=2;
 c.strokeRect(1,1,w-2,h-2);c.strokeRect(X(48),Y(CY-90),146*sx,180*sy);c.strokeRect(X(766),Y(CY-90),146*sx,180*sy);
 c.beginPath();c.moveTo(X(480),0);c.lineTo(X(480),h);c.stroke();
 const arc=(cx,r,a0,a1)=>{c.beginPath();c.ellipse(X(cx),Y(CY),r*sx,r*sy,0,a0,a1);c.stroke();};
 c.save();c.beginPath();c.rect(0,0,w,h);c.clip();arc(194,62,-Math.PI/2,Math.PI/2);arc(766,62,Math.PI/2,Math.PI*1.5);arc(83,265,-Math.PI/2,Math.PI/2);arc(877,265,Math.PI/2,Math.PI*1.5);c.restore();
 arc(480,67,0,Math.PI*2);c.globalAlpha=.25;c.fillStyle='#674392';c.fillRect(X(48),Y(CY-90),146*sx,180*sy);c.fillRect(X(766),Y(CY-90),146*sx,180*sy);
 c.globalAlpha=.5;c.fillStyle='#ff6b2b';c.fillRect(X(48)+2,Y(CY)-8,5,16);c.fillRect(w-7,Y(CY)-8,5,16);c.restore();
}
function render(){
 raf=0;if(!ui)return;const cv=ui.querySelector('#paint-canvas'),c=cv.getContext('2d');c.imageSmoothingEnabled=false;
 const fl=['#dfbe8d','#e6c99d','#d9b586','#e9cca0','#dcb98c'];for(let r=0;r<32;r++)for(let col=-1;col<16;col++){c.fillStyle=fl[(r*7+col*13+80)%5];c.fillRect(col*58+(r%2)*29,r*13,57,12);}
 c.drawImage(layer,0,0,cv.width,cv.height);guide(c,cv.width,cv.height);
}
function queue(){if(!raf)raf=requestAnimationFrame(render);}
function cell(e){const cv=ui.querySelector('#paint-canvas'),r=cv.getBoundingClientRect();return{x:Math.max(0,Math.min(GW-1,Math.floor((e.clientX-r.left)/r.width*GW))),y:Math.max(0,Math.min(GH-1,Math.floor((e.clientY-r.top)/r.height*GH)))};}
function refreshTools(){
 ui.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('on',b.dataset.tool===tool));ui.querySelectorAll('[data-size]').forEach(b=>b.classList.toggle('on',+b.dataset.size===size));
 ui.querySelectorAll('[data-color]').forEach(b=>b.classList.toggle('on',b.dataset.color===color));ui.querySelector('#paint-undo').disabled=!undo.length;
}
function open(opts={}){
 done=opts.onClose||null;undo=[];
 const stage=document.getElementById('stage');ui=document.createElement('section');ui.id='paint';ui.className='screen';
 ui.innerHTML=`<div class="paint-head"><b>PAINT MY COURT</b><small>Draw from above. The lines stay on top.</small></div>
 <div class="paint-main"><canvas id="paint-canvas" width="864" height="416" aria-label="Court painting canvas, seen from above"></canvas>
 <div class="paint-tools">
  <div class="paint-row">${[['brush','BRUSH'],['eraser','ERASE'],['fill','FILL']].map(([k,l])=>`<button data-tool="${k}" id="tool-${k}">${l}</button>`).join('')}</div>
  <div class="paint-row">${['S','M','L'].map((l,i)=>`<button data-size="${i}" id="size-${i}">${l}</button>`).join('')}</div>
  <div class="paint-row stamps">${Object.entries(STAMPS).map(([k,s])=>`<button data-tool="stamp-${k}" id="tool-stamp-${k}">${s.label}</button>`).join('')}</div>
  <div class="paint-palette">${PALETTE.map(p=>`<button data-color="${p}" style="background:${p}" aria-label="Color ${p}"></button>`).join('')}</div>
  <div class="paint-row"><button id="paint-undo">UNDO</button><button id="paint-clear">CLEAR</button></div>
  <div class="paint-row"><button id="paint-cancel">CANCEL</button><button id="paint-save" class="go">SAVE</button></div>
 </div></div>`;
 stage.appendChild(ui);
 const cv=ui.querySelector('#paint-canvas');
 cv.addEventListener('pointerdown',e=>{e.preventDefault();if(drawing)return;try{cv.setPointerCapture(e.pointerId);}catch(_){}const p=cell(e);snap();
  if(tool==='fill')fill(p.x,p.y);else if(tool.startsWith('stamp-'))stamp(tool.slice(6),p.x,p.y);else{drawing={id:e.pointerId,last:p};dab(p.x,p.y);}queue();refreshTools();});
 cv.addEventListener('pointermove',e=>{if(!drawing||e.pointerId!==drawing.id)return;e.preventDefault();const p=cell(e);line(drawing.last,p);drawing.last=p;queue();});
 const end=e=>{if(drawing&&e.pointerId===drawing.id)drawing=null;};cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);cv.addEventListener('lostpointercapture',end);
 ui.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.tool;refreshTools();});
 ui.querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>{size=+b.dataset.size;refreshTools();});
 ui.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{color=b.dataset.color;if(tool==='eraser')tool='brush';refreshTools();});
 ui.querySelector('#paint-undo').onclick=()=>{const u=undo.pop();if(u)lc.putImageData(u,0,0);queue();refreshTools();};
 ui.querySelector('#paint-clear').onclick=()=>{snap();lc.clearRect(0,0,GW,GH);queue();refreshTools();};
 ui.querySelector('#paint-cancel').onclick=()=>{load(()=>close(false));};
 ui.querySelector('#paint-save').onclick=()=>{const ok=save();close(ok);};
 load(()=>{if(ui){undo=[];queue();refreshTools();}});refreshTools();queue();
}
function close(saved){if(ui)ui.remove();ui=null;drawing=null;const d=done;done=null;d&&d(saved);}
return{GW,GH,layer,load,save,hasSaved,open,close,get isOpen(){return !!ui;},_state:()=>({tool,size,color,undo:undo.length})};
})();
