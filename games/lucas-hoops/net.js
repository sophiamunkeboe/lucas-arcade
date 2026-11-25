/* Lucas Hoops online rooms. Same backend + pattern as Poker Table: the arcade's Supabase project, a 4-letter
   room code and a public Realtime channel. Hoops needs no tables or server code: the HOST phone runs the game
   and broadcasts snapshots; the GUEST phone sends its stick + button taps. Nothing secret is sent. */
window.HoopsNet=(()=>{
'use strict';
const SB_URL='https://xmxztvljmuniuojlvcxv.supabase.co';
const SB_KEY='sb_publishable_yCNpEO52oApeLPgB28TqsQ_q9x77cYv'; // publishable (public) key, same one Poker uses
const LETTERS='ABCDEFGHJKMNPQRSTUVWXYZ';
let sb=null;
function loadLib(){
 if(window.supabase)return Promise.resolve();
 return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='../../js/vendor/supabase.js';s.onload=resolve;s.onerror=()=>reject(new Error('offline'));document.head.appendChild(s);});
}
async function client(){if(!navigator.onLine)throw new Error('offline');await loadLib();return sb||(sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}));}
const code4=()=>Array.from({length:4},()=>LETTERS[Math.floor(Math.random()*LETTERS.length)]).join('');
function open(role,code,handlers){
 return client().then(c=>new Promise((resolve,reject)=>{
  const me=Math.random().toString(36).slice(2,10);let lastHeard=Date.now(),closed=false,status='connecting';
  const ch=c.channel('hoops:'+code,{config:{broadcast:{self:false,ack:false},private:false}});
  ch.on('broadcast',{event:'m'},({payload})=>{if(!payload||payload.from===me||closed)return;lastHeard=Date.now();try{handlers.onMessage?.(payload.type,payload.data||{},payload);}catch(e){console.warn(e);}});
  const timer=setTimeout(()=>{if(status!=='SUBSCRIBED'){closed=true;try{c.removeChannel(ch);}catch(_){ }reject(new Error('timeout'));}},9000);
  ch.subscribe(st=>{status=st;if(st==='SUBSCRIBED'){clearTimeout(timer);resolve(api);}else if((st==='CHANNEL_ERROR'||st==='TIMED_OUT')&&!closed){handlers.onStatus?.(st);}});
  const api={role,code,me,
   send(type,data){if(closed||status!=='SUBSCRIBED')return false;ch.send({type:'broadcast',event:'m',payload:{from:me,type,data}});return true;},
   get quietFor(){return Date.now()-lastHeard;},heard(){lastHeard=Date.now();},
   get status(){return status;},
   close(){if(closed)return;try{ch.send({type:'broadcast',event:'m',payload:{from:me,type:'bye',data:{}}});}catch(_){ }closed=true;setTimeout(()=>{try{c.removeChannel(ch);}catch(_){ }},150);}};
 }));
}
// Host: pick a code, make sure nobody else is hosting it, then wait for a friend.
async function host(handlers){
 for(let attempt=0;attempt<4;attempt++){
  const code=code4();let taken=false;
  const conn=await open('host',code,{...handlers,onMessage(type,data,raw){if(type==='taken'||type==='host-here')taken=true;else handlers.onMessage?.(type,data,raw);}});
  conn.send('probe',{});await new Promise(r=>setTimeout(r,500));
  if(!taken)return conn;conn.close();
 }
 throw new Error('busy');
}
async function join(code,name,handlers){
 code=String(code||'').toUpperCase().replace(/[^A-Z]/g,'').slice(0,4);if(code.length!==4)throw new Error('bad_code');
 let welcomed=null;
 const conn=await open('guest',code,{...handlers,onMessage(type,data,raw){if(type==='welcome'||type==='full')welcomed={type,data};handlers.onMessage?.(type,data,raw);}});
 for(let i=0;i<12&&!welcomed;i++){conn.send('hello',{name});await new Promise(r=>setTimeout(r,500));}
 if(!welcomed){conn.close();throw new Error('no_room');}
 if(welcomed.type==='full'){conn.close();throw new Error('full');}
 return conn;
}
return{host,join};
})();
