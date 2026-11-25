"""v2.3.1: the real recorded DE-FENSE crowd chant (games/lucas-hoops/defense-chant.mp3) on phone viewports.
Checks: the file loads (200) and decodes, the chant fires at the usual trigger (CPU ball, shot clock <= 5) and makes
real output on the SFX bus, it doesn't re-fire while still playing, the SFX switch silences it, and sw v18 precaches it.
python3 tools/hoops-chant.py [--live]"""
import functools,http.server,json,os,socketserver,sys,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('HOOPS_SCREEN_DIR','/workspace/hoops-v2.2-shots'));OUT.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
socketserver.TCPServer.allow_reuse_address=True
server=socketserver.ThreadingTCPServer(('127.0.0.1',8857),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
BASE='https://lucas-arcade.netlify.app' if '--live' in sys.argv else 'http://127.0.0.1:8857'
METER='''window.__m=[];const _c=AudioNode.prototype.connect;AudioNode.prototype.connect=function(to,...a){if(to instanceof AudioDestinationNode){const n=this.context.createAnalyser();n.fftSize=2048;_c.call(this,n);window.__m.push(n);}return _c.call(this,to,...a);};
window.audioRMS=()=>{const a=__m[0];if(!a)return 0;const d=new Float32Array(a.fftSize);a.getFloatTimeDomainData(d);return Math.sqrt(d.reduce((s,x)=>s+x*x,0)/d.length);};'''
RIG='''()=>{const g=HOOPS.state;g.dead=0;g.time=80;g.chantTimer=0;g.possession=1;const o=g.players.find(p=>p.team===1);
 for(const p of g.players){p.think=10;p.vx=p.vy=0;}o.x=650;o.y=220;Object.assign(g.ball,{owner:o.id,shot:false,pass:false,x:o.x,y:o.y,z:25,vx:0,vy:0,vz:0});g.shotClock=4.8;}'''
PHONES={'iphone13_land':dict(viewport={'width':844,'height':390},device_scale_factor=3,is_mobile=True,has_touch=True),
 'iphone13_port':dict(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True),
 'android_small':dict(viewport={'width':640,'height':360},device_scale_factor=2,is_mobile=True,has_touch=True)}
report={};errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox','--headless=new','--autoplay-policy=no-user-gesture-required'])
 for name,opts in PHONES.items():
  c=b.new_context(**opts);c.add_init_script(METER);pg=c.new_page();r={};statuses=[]
  pg.on('pageerror',lambda e,n=name:errors.append(f'{n}: {e}'));pg.on('console',lambda m,n=name:errors.append(f'{n}: {m.text}') if m.type=='error' else None)
  pg.on('response',lambda res:statuses.append(res.status) if res.url.endswith('defense-chant.mp3') else None)
  pg.goto(BASE+'/games/lucas-hoops/');pg.wait_for_function("typeof HOOPS!=='undefined'&&(HOOPS.scene==='intro'||HOOPS.scene==='menu')",timeout=30000)
  pg.locator('#intro-skip').tap() if pg.locator('#intro-skip').is_visible() else pg.keyboard.press('Space')
  pg.wait_for_function("HOOPS.scene==='menu'");pg.wait_for_function("HOOPS.audio.state==='running'",timeout=10000)
  pg.wait_for_function("HOOPS.audio.chant==='ready'",timeout=15000);r['file_status']=statuses[:1];assert 200 in statuses,statuses
  r['version']=pg.evaluate('HOOPS.version');assert r['version']=='2.3.1'
  # Music off so the meter hears only effects.
  pg.click('#settings');
  if pg.inner_text('#music-setting')=='ON':pg.click('#music-setting')
  pg.get_by_role('button',name='DONE',exact=True).click();pg.click('#quick');pg.click('#mode-3');pg.wait_for_function("HOOPS.scene==='play'");pg.wait_for_timeout(900)
  pg.evaluate(RIG);pg.wait_for_function("(HOOPS.audio.counts.defense_sample||0)>0",timeout=4000)
  peak=0
  for _ in range(12):pg.wait_for_timeout(100);peak=max(peak,pg.evaluate('audioRMS()'))
  r['chant_rms_peak']=round(peak,4);assert peak>.01,peak
  # No re-trigger while the 4.5 s clip plays (timer = clip length + 0.4 s).
  pg.evaluate('HOOPS.state.shotClock=4.9');pg.wait_for_timeout(1500);r['no_overlap']=pg.evaluate('HOOPS.audio.counts.defense_sample')==1;assert r['no_overlap']
  pg.screenshot(path=str(OUT/f'chant-{name}.png'))
  # SFX switch off: the trigger point is reached but nothing plays.
  pg.click('#mute');assert not pg.evaluate('HOOPS.audio.sound');n0=pg.evaluate('HOOPS.audio.counts.defense_sample')
  pg.evaluate(RIG);pg.wait_for_timeout(800);assert pg.evaluate('HOOPS.audio.counts.defense_sample')==n0;assert pg.evaluate('audioRMS()')<.00001;r['sfx_off_silent']=True;pg.click('#mute')
  if name=='iphone13_land':
   pg.evaluate('navigator.serviceWorker.ready');pg.wait_for_function('navigator.serviceWorker.controller!==null',timeout=15000)
   pg.wait_for_function("caches.keys().then(k=>window.__k=k)||true");pg.wait_for_timeout(500)
   r['caches']=pg.evaluate('caches.keys()');assert 'lucas-arcade-v18' in r['caches'],r['caches']
   r['precached']=pg.evaluate("caches.open('lucas-arcade-v18').then(c=>c.keys()).then(k=>k.some(q=>q.url.endsWith('/games/lucas-hoops/defense-chant.mp3')))");assert r['precached']
  report[name]=r;c.close()
 b.close()
server.shutdown()
report['errors']=[e for e in errors if 'favicon' not in e];print(json.dumps(report,indent=1));assert not report['errors']
