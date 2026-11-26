"""v2.3.2: does a player actually hear the DE-FENSE chant in normal play? Chromium AND WebKit, phone sizes.
No fixtures: real tap to unlock audio, a normal 3v3 vs CPU (player idle), plus 2 PLAYERS and the tournament.
Passes if the recorded chant (defense_sample) plays within 30 s of tip-off in each.
python3 tools/hoops-chant-play.py [--live] [chromium|webkit]"""
import functools,http.server,json,os,socketserver,sys,threading,time
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('HOOPS_SCREEN_DIR','/workspace/hoops-v2.2-shots'));OUT.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
socketserver.TCPServer.allow_reuse_address=True
server=socketserver.ThreadingTCPServer(('127.0.0.1',8860),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
BASE='https://lucas-arcade.netlify.app' if '--live' in sys.argv else 'http://127.0.0.1:8860'
ENGINES=[e for e in ['chromium','webkit'] if e in sys.argv] or ['chromium','webkit']
PHONE={'iphone13_land':dict(viewport={'width':844,'height':390},device_scale_factor=3,has_touch=True),'android_small':dict(viewport={'width':640,'height':360},device_scale_factor=2,has_touch=True)}
report={};errors=[]
def n(pg):return pg.evaluate('HOOPS.audio.counts.defense_sample||0')
def first_chant(pg,limit=30):
 t0=time.time();base=n(pg)
 while time.time()-t0<limit:
  if n(pg)>base:return round(time.time()-t0,1)
  pg.wait_for_timeout(250)
 return None
with sync_playwright() as p:
 for eng in ENGINES:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']) if eng=='chromium' else p.webkit.launch()
  for name,opts in PHONE.items():
   c=b.new_context(**opts,**({'is_mobile':True} if eng=='chromium' else {}));pg=c.new_page();tag=f'{eng}/{name}';r={};mp3=[]
   pg.on('pageerror',lambda e,t=tag:errors.append(f'{t}: {e}'));pg.on('console',lambda m,t=tag:errors.append(f'{t}: {m.text}') if m.type=='error' else None)
   pg.on('response',lambda res:mp3.append([res.status,res.headers.get('content-type')]) if 'defense-chant.mp3' in res.url else None)
   pg.goto(BASE+'/games/lucas-hoops/');pg.wait_for_function("typeof HOOPS!=='undefined'&&(HOOPS.scene==='intro'||HOOPS.scene==='menu')",timeout=30000)
   if pg.locator('#intro-skip').is_visible():pg.locator('#intro-skip').tap()
   pg.wait_for_function("HOOPS.scene==='menu'");pg.locator('#quick').tap();pg.locator('#mode-3').tap()
   pg.wait_for_function("HOOPS.audio.state==='running'",timeout=10000);pg.wait_for_function("HOOPS.audio.chant!=='loading'&&HOOPS.audio.chant!=='idle'",timeout=15000)
   r['version']=pg.evaluate('HOOPS.version');r['decode']=pg.evaluate('HOOPS.audio.chant');r['mp3']=mp3[:1];assert r['decode']=='ready',r
   r['quick_3v3_first_chant_s']=first_chant(pg);assert r['quick_3v3_first_chant_s'] is not None,(tag,'no chant in 30 s')
   pg.screenshot(path=str(OUT/f'chant-real-{eng}-{name}.png'))
   if name=='iphone13_land':
    # 2 PLAYERS on one phone (P2 = Night Owls): crowd chants for the home team's defense too.
    pg.keyboard.press('KeyP');pg.get_by_role('button',name='MAIN MENU',exact=True).click();pg.click('#versus');pg.click('#vs-3');pg.wait_for_function("HOOPS.scene==='play'")
    r['two_player_first_chant_s']=first_chant(pg);assert r['two_player_first_chant_s'] is not None,(tag,'2P')
    pg.keyboard.press('KeyP');pg.get_by_role('button',name='MAIN MENU',exact=True).click();pg.click('#tournament');pg.click('#cup-3');pg.wait_for_function("HOOPS.scene==='play'")
    r['tournament_first_chant_s']=first_chant(pg);assert r['tournament_first_chant_s'] is not None,(tag,'tournament')
    # SFX off: no chant.
    pg.click('#mute');n0=n(pg);pg.evaluate("HOOPS.state.chantCool=0;HOOPS.state.chantPoss=false");pg.wait_for_timeout(12000);r['sfx_off_chants']=n(pg)-n0;assert r['sfx_off_chants']==0,(r,pg.evaluate('HOOPS.audio.sound'))
   report[tag]=r;c.close()
  b.close()
server.shutdown()
report['errors']=[e for e in errors if 'favicon' not in e];print(json.dumps(report,indent=1));assert not report['errors']
