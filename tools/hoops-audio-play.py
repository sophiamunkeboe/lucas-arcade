"""v16: independent real Web Audio buses, arena event hooks, visibility, party lighting/offline.
Controlled fixtures set positions/clocks; real keys exercise normal gameplay code.
python3 tools/hoops-audio-play.py [--live]; HOOPS_SCREEN_DIR redirects captures.
"""
import functools,http.server,json,os,socketserver,sys,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('HOOPS_SCREEN_DIR',str(ROOT/'games/lucas-hoops/screens')));OUT.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
socketserver.TCPServer.allow_reuse_address=True
server=socketserver.ThreadingTCPServer(('127.0.0.1',8856),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
BASE='https://lucas-arcade.netlify.app' if '--live' in sys.argv else 'http://127.0.0.1:8856'
report={};errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox','--headless=new'])
 c=b.new_context(viewport={'width':1280,'height':720},device_scale_factor=1)
 c.add_init_script('''window.__audioMeters=[];const _connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(to,...args){if(to instanceof AudioDestinationNode){const a=this.context.createAnalyser();a.fftSize=2048;_connect.call(this,a);window.__audioMeters.push(a);}return _connect.call(this,to,...args);};window.audioRMS=()=>{const a=__audioMeters[0];if(!a)return 0;const d=new Float32Array(a.fftSize);a.getFloatTimeDomainData(d);return Math.sqrt(d.reduce((s,x)=>s+x*x,0)/d.length);};''')
 pg=c.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 pg.goto(BASE+'/games/lucas-hoops/');pg.wait_for_function("typeof HOOPS!=='undefined'");pg.click('#intro-skip');pg.wait_for_function("HOOPS.scene==='menu'");pg.wait_for_function("HOOPS.audio.state==='running'&&HOOPS.audio.counts.pep_step>3")
 pg.wait_for_timeout(600);assert pg.evaluate('HOOPS.audio.sound&&HOOPS.audio.music');assert pg.evaluate('HOOPS.audio.musicGain')>.45
 pg.wait_for_function('audioRMS()>.0001');report['music_output_rms']=pg.evaluate('audioRMS()');pg.screenshot(path=str(OUT/'v16-pep-menu.png'))
 # Settings persistence and genuinely independent buses (meter measures actual samples).
 pg.click('#settings');pg.click('#sound-setting');assert pg.inner_text('#sound-setting')=='OFF';pg.wait_for_timeout(500)
 assert pg.evaluate('HOOPS.audio.sfxActive')==0;assert pg.evaluate('HOOPS.audio.musicActive')>0;pg.wait_for_function('audioRMS()>.0001');report['music_without_sfx']=True
 pg.click('#music-setting');assert pg.inner_text('#music-setting')=='OFF';pg.wait_for_timeout(400)
 assert pg.evaluate('HOOPS.audio.musicActive+HOOPS.audio.sfxActive')==0;assert pg.evaluate('audioRMS()')<.00001
 pg.reload();pg.wait_for_function("HOOPS.scene==='intro'");pg.click('#intro-skip');pg.click('#settings');assert pg.inner_text('#sound-setting')=='OFF' and pg.inner_text('#music-setting')=='OFF';report['independent_settings_persist']=True
 pg.click('#sound-setting');pg.get_by_role('button',name='DONE',exact=True).click();pg.click('#quick');pg.click('#mode-3');pg.keyboard.press('KeyQ');pg.wait_for_function('audioRMS()>.0001');assert pg.evaluate('HOOPS.audio.musicActive')==0;report['sfx_without_music']=True
 pg.click('#music');pg.wait_for_function('HOOPS.audio.counts.pep_step>2');pg.wait_for_timeout(800);assert .17<pg.evaluate('HOOPS.audio.musicGain')<.24;report['gameplay_music_quiet']=True
 pg.click('#mute');assert not pg.evaluate('HOOPS.audio.sound');assert pg.evaluate('HOOPS.audio.sfxActive')==0;pg.click('#mute');assert pg.evaluate('HOOPS.audio.sound');report['hud_toggles']=True
 def counts():return pg.evaluate('HOOPS.audio.counts')
 def wait_sound(n,prior=0):pg.wait_for_function(f'(HOOPS.audio.counts[{json.dumps(n)}]||0)>{prior}',timeout=6000)
 def rig(js=''):
  pg.evaluate('''()=>{const g=HOOPS.state;g.dead=0;g.buzzer=false;g.time=90;g.shotClock=14;g.control=g.players[0].id;g.manualSwitch=5;g.possession=0;g.chantTimer=0;
  for(const p of g.players){p.x=p.team===0?710:120;p.y=400-p.index*90;p.z=p.vz=p.vx=p.vy=p.cool=p.plant=p.hold=0;p.think=10;p.charging=false;}
  const p=g.players[0],o=g.players.find(p=>p.team===1);p.x=400;p.y=220;
  Object.assign(g.ball,{owner:p.id,shot:false,pass:false,scored:false,nearMiss:false,board:-1,age:0,x:p.x,y:p.y,z:25,vx:0,vy:0,vz:0,shooter:p.id});
  '''+js+'}')
 rig();before=counts().get('squeak',0);pg.keyboard.press('KeyQ');wait_sound('squeak',before)
 rig('Object.assign(g.ball,{owner:null,x:894,y:220,z:110,vx:180,vy:0,vz:-25,shot:true});');wait_sound('backboard')
 rig('Object.assign(g.ball,{owner:null,x:840,y:220,z:65,vx:-20,vy:0,vz:-40,shot:true});');wait_sound('ooh')
 rig('g.possession=1;g.ball.owner=o.id;o.x=650;o.y=220;g.shotClock=4.8;');wait_sound('defense')
 rig('g.possession=1;g.ball.owner=o.id;o.x=470;o.y=220;');pg.keyboard.press('KeyQ');wait_sound('whistle');assert pg.evaluate('HOOPS.state.metrics.charges')>0
 # A real timed three fires the streak roar, original organ and multicolor sweep.
 rig();prior=pg.evaluate('HOOPS.state.score[0]');pg.keyboard.down('Space');pg.wait_for_timeout(590);pg.keyboard.up('Space');pg.wait_for_function(f'HOOPS.state.score[0]>{prior}',timeout=6000)
 assert pg.evaluate('HOOPS.lights.event')=='three';wait_sound('organ_made');assert counts()['cheer']>0;pg.screenshot(path=str(OUT/'v16-three-point-sweep.png'))
 pg.wait_for_timeout(1800);pg.evaluate('HOOPS.state.dead=.02;HOOPS.state.next=1');wait_sound('organ_possession')
 pg.wait_for_timeout(1800);pg.keyboard.press('KeyP');wait_sound('organ_timeout');report['organ_stings']=True;pg.get_by_role('button',name='BACK TO THE COURT',exact=True).click()
 # Dunk: music duck, bright additive beams, confetti, scoreboard flash, but crisp HUD.
 rig('p.x=850;');before=counts().get('music_duck',0);pg.keyboard.press('Space');pg.wait_for_function("HOOPS.lights.event==='dunk'")
 pg.wait_for_timeout(280);assert pg.evaluate('HOOPS.audio.ducking');assert pg.evaluate('HOOPS.audio.musicGain')<.04;assert pg.evaluate('HOOPS.lights.confetti')>20
 pg.screenshot(path=str(OUT/'v16-light-show.png'));report['dunk_light_show']=pg.evaluate('HOOPS.lights');assert counts()['music_duck']>before
 pg.wait_for_timeout(1900);assert pg.evaluate('HOOPS.audio.musicGain')>.15;report['duck_and_recover']=True
 # Buzzer-beater and end-game fanfare with win-screen light show.
 rig('g.time=.01;g.attempts++;Object.assign(g.ball,{owner:null,x:870,y:220,z:90,vx:0,vy:0,vz:-60,shot:true,points:3});');pg.wait_for_function("HOOPS.lights.event==='buzzer'");wait_sound('horn')
 pg.wait_for_function("HOOPS.scene==='end'",timeout=6000);wait_sound('victory_fanfare');assert pg.evaluate("HOOPS.lights.event==='win'");pg.wait_for_timeout(700);pg.screenshot(path=str(OUT/'v16-victory-show.png'))
 pg.get_by_role('button',name='REMATCH',exact=True).click();rig('g.score=[0,9];g.time=.025;');pg.wait_for_function("HOOPS.scene==='end'");wait_sound('sad_trombone');report['win_loss_cues']=True
 pg.get_by_role('button',name='REMATCH',exact=True).click()
 pg.wait_for_function('(HOOPS.audio.counts.pep_step||0)>=75',timeout=25000);assert pg.evaluate('HOOPS.audio.sfxActive<=48&&HOOPS.audio.musicActive<=48');report['original_groove_looped']=True
 # Controlled visibility event: stop scheduled sources AND suspend the real context.
 pg.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
 pg.wait_for_function("HOOPS.audio.state==='suspended'");a=pg.evaluate('HOOPS.audio');assert a['sfxActive']==0 and a['musicActive']==0 and a['outputGain']==0,a;assert pg.evaluate("HOOPS.scene==='paused'");report['hidden_audio_stopped']=True
 pg.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))");pg.wait_for_function("HOOPS.audio.state==='running'");pg.get_by_role('button',name='MAIN MENU',exact=True).click()
 # Muting music also silences victory/organ cues; SFX still active.
 pg.click('#settings');pg.click('#music-setting');assert not pg.evaluate('HOOPS.audio.music');pg.get_by_role('button',name='DONE',exact=True).click();pg.click('#shootout');pg.evaluate('HOOPS.state.score[0]=3;HOOPS.state.time=.025');old=counts().get('victory_fanfare',0);pg.wait_for_function("HOOPS.scene==='end'");pg.wait_for_timeout(300);assert counts().get('victory_fanfare',0)==old and pg.evaluate('HOOPS.audio.musicActive')==0;report['musical_cues_respect_music_mute']=True
 report['arena_sound_counts']=counts()
 # Cached new modules, toggles and sounds work on a fresh offline reload.
 pg.evaluate('navigator.serviceWorker.ready');pg.wait_for_function('navigator.serviceWorker.controller!==null');assert 'lucas-arcade-v16' in pg.evaluate('caches.keys()')
 c.set_offline(True);pg.reload();pg.wait_for_function("typeof HOOPS!=='undefined'");pg.click('#intro-skip');pg.click('#quick');pg.click('#mode-3');pg.click('#music');pg.wait_for_function('HOOPS.audio.musicActive>0');pg.keyboard.press('KeyQ');wait_sound('squeak');report['offline_audio_lights']=True;c.set_offline(False)
 report['sounds']=counts();report['audio']=pg.evaluate('HOOPS.audio')
 # Phone-size touch dunk with all music, effects and six-beam celebration active.
 phone=b.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True,device_scale_factor=1);mp=phone.new_page();mp.on('pageerror',lambda e:errors.append('phone '+str(e)));mp.on('console',lambda m:errors.append('phone '+m.text) if m.type=='error' else None)
 mp.goto(BASE+'/games/lucas-hoops/');mp.click('#intro-skip');mp.click('#quick');mp.click('#mode-3');mp.evaluate('HOOPS.state.players[0].x=850');mp.locator('#action-primary').tap();mp.wait_for_function("HOOPS.lights.event==='dunk'");mp.wait_for_timeout(280);mp.screenshot(path=str(OUT/'v16-phone-light-show.png'))
 timing=mp.evaluate('''()=>new Promise(resolve=>{const a=[];let last=performance.now();function tick(t){a.push(t-last);last=t;if(a.length===120){a.sort((x,y)=>x-y);resolve({median:a[60],p95:a[114],frames:a.length});}else requestAnimationFrame(tick);}requestAnimationFrame(tick);})''');assert timing['p95']<65;report['phone_full_light_show_frame_ms']=timing;phone.close()
 # Sustained slow frames reduce beams/particles; reduced-motion caps effects too.
 slow=b.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True,reduced_motion='reduce');slow.add_init_script("window.requestAnimationFrame=f=>setTimeout(()=>f(performance.now()),42)")
 sp=slow.new_page();sp.on('pageerror',lambda e:errors.append('slow '+str(e)));sp.goto(BASE+'/games/lucas-hoops/');sp.wait_for_function("typeof HOOPS!=='undefined'");sp.click('#intro-skip');sp.wait_for_function('HOOPS.lights.level===0',timeout=12000);assert sp.evaluate('HOOPS.lights.reducedMotion');report['adaptive_low_fps']=sp.evaluate('HOOPS.lights');slow.close();c.close();b.close()
server.shutdown();report['errors']=errors;print(json.dumps(report,indent=2));assert not errors,errors
