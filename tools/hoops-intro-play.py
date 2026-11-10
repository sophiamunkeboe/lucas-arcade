"""Real-time cinematic regression: all beats, audio opt-in/mute, skip/replay, session short,
offline first-view playback, game handoff and phone touch/performance. --live targets Netlify.
HOOPS_SCREEN_DIR redirects screenshots outside the checkout for production checks.
"""
import functools,http.server,json,os,socketserver,subprocess,sys,threading,time
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('HOOPS_SCREEN_DIR',str(ROOT/'games/lucas-hoops/screens')));OUT.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
socketserver.TCPServer.allow_reuse_address=True
server=socketserver.ThreadingTCPServer(('127.0.0.1',8842),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
BASE='https://lucas-arcade.netlify.app' if '--live' in sys.argv else 'http://127.0.0.1:8842';report={};errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox','--headless=new'])
 c=b.new_context(viewport={'width':1280,'height':720},device_scale_factor=1);pg=c.new_page()
 pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 start=time.time();pg.goto(BASE+'/games/lucas-hoops/');pg.wait_for_function("HOOPS.scene==='intro'");assert pg.evaluate('HOOPS.intro.duration')==7.4
 assert pg.locator('#main-menu').is_hidden();pg.click('#intro-sound');pg.wait_for_function('HOOPS.intro.audioReady===true')
 pg.wait_for_function('HOOPS.intro.time>=1.87');pg.screenshot(path=str(OUT/'intro-dribble.png'))
 pg.wait_for_function('HOOPS.intro.time>=4.92');pg.screenshot(path=str(OUT/'intro-dunk.png'))
 pg.wait_for_function('HOOPS.intro.time>=5.62');pg.screenshot(path=str(OUT/'intro-logo-slam.png'))
 pg.wait_for_function("HOOPS.scene==='menu'",timeout=12000);intro=pg.evaluate('HOOPS.intro')
 assert intro['done'] and not intro['skipped'];assert intro['events'].count('dribble')==3;assert all(n in intro['events'] for n in ['open','burst','rise','ignite','slam','drop','logo']);assert intro['soundEvents']>=8
 report['first_full_playback']=intro;report['wall_seconds']=round(time.time()-start,2)
 assert 7<=report['wall_seconds']<11
 # Replay is full length even after a session view; pointer skip is immediate.
 pg.click('#replay-intro');assert pg.evaluate('HOOPS.intro.duration')==7.4;pg.mouse.click(180,260);pg.wait_for_function("HOOPS.scene==='menu'");assert pg.evaluate('HOOPS.intro.skipped');assert pg.evaluate('HOOPS.audio.sfxActive')==0;report['tap_skip_and_audio_stop']=True
 # Later visits in the same tab/session are a 2.6-second highlight reel.
 pg.reload();pg.wait_for_function("HOOPS.scene==='intro'");assert pg.evaluate('HOOPS.intro.shortened');assert pg.evaluate('HOOPS.intro.duration')==2.6;pg.wait_for_function("HOOPS.scene==='menu'",timeout=5000);report['short_session_revisit']=True
 pg.click('#replay-intro');pg.keyboard.press('Escape');assert pg.evaluate("HOOPS.scene==='menu'");report['keyboard_skip']=True
 # The existing sound setting is honored for a complete muted intro.
 pg.click('#settings');assert pg.locator('#sound-setting').inner_text()=='ON';pg.click('#sound-setting');assert pg.locator('#sound-setting').inner_text()=='OFF';pg.get_by_role('button',name='DONE',exact=True).click()
 pg.click('#replay-intro');pg.wait_for_function("HOOPS.scene==='menu'",timeout=12000);muted=pg.evaluate('HOOPS.intro');assert not muted['soundEnabled'] and muted['soundEvents']==0;report['muted_full_intro']=True
 # Canonical folder reload plus full first-view timeline work without network.
 pg.evaluate('navigator.serviceWorker.ready');pg.wait_for_function('navigator.serviceWorker.controller!==null');assert 'lucas-arcade-v16' in pg.evaluate('caches.keys()')
 pg.evaluate("sessionStorage.removeItem('lucasHoops.introSeen.v1')");c.set_offline(True);pg.reload();pg.wait_for_function("HOOPS.scene==='intro'");assert pg.evaluate('HOOPS.intro.duration')==7.4;pg.wait_for_function("HOOPS.scene==='menu'",timeout=12000)
 pg.click('#quick');pg.click('#mode-3');assert pg.evaluate('HOOPS.state.players.length')==6;report['offline_full_intro_and_game']=True
 c.set_offline(False)
 # Mobile first-visit intro: sample two seconds of real RAF and tap with a real touch.
 phone=b.new_context(viewport={'width':844,'height':390},device_scale_factor=1,is_mobile=True,has_touch=True)
 phone.add_init_script("localStorage.setItem('lucasHoops.settings.v1',JSON.stringify({sound:false,difficulty:0}));")
 mobile=phone.new_page();mobile.on('pageerror',lambda e:errors.append('phone '+str(e)));mobile.on('console',lambda m:errors.append('phone '+m.text) if m.type=='error' else None)
 mobile.goto(BASE+'/games/lucas-hoops/');mobile.wait_for_function("HOOPS.scene==='intro'")
 timing=mobile.evaluate('''()=>new Promise(resolve=>{const a=[];let last=performance.now();function tick(t){a.push(t-last);last=t;if(a.length===120){a.sort((x,y)=>x-y);resolve({median:a[60],p95:a[114],frames:a.length});}else requestAnimationFrame(tick);}requestAnimationFrame(tick);})''')
 assert timing['p95']<65;report['phone_frame_ms']=timing
 mobile.touchscreen.tap(300,200);mobile.wait_for_function("HOOPS.scene==='menu'");assert mobile.evaluate('HOOPS.intro.skipped');report['phone_touch_skip']=True
 phone.close()
 # An already-open cache-first v14 page must not crash if it receives new game JS.
 legacy=subprocess.check_output(['git','show','9b95bd8:games/lucas-hoops/index.html'],cwd=ROOT,text=True)
 old=b.new_context(viewport={'width':960,'height':540});oldpg=old.new_page();oldpg.on('pageerror',lambda e:errors.append('legacy '+str(e)))
 oldpg.route('**/games/lucas-hoops/',lambda r:r.fulfill(status=200,content_type='text/html',body=legacy))
 oldpg.goto(BASE+'/games/lucas-hoops/');oldpg.wait_for_function("HOOPS.scene==='menu'");oldpg.click('#quick');oldpg.click('#mode-3');assert oldpg.evaluate('HOOPS.state.players.length')==6;report['v14_cached_html_handoff']=True
 old.close();c.close();b.close()
server.shutdown();report['errors']=errors;print(json.dumps(report,indent=2));assert not errors,errors
