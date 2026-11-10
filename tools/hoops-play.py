"""Lucas Hoops v2: full 3v3 game, 60-second Shootout, contextual controls, real multitouch,
1v1/5v5, arcade tile, offline and no console errors. python3 tools/hoops-play.py [--live]
HOOPS_SCREEN_DIR optionally selects a non-repository screenshot directory.
"""
import functools,http.server,json,os,socketserver,sys,threading,time
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('HOOPS_SCREEN_DIR',str(ROOT/'games/lucas-hoops/screens')));OUT.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
socketserver.TCPServer.allow_reuse_address=True
server=socketserver.ThreadingTCPServer(('127.0.0.1',8829),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
BASE='https://lucas-arcade.netlify.app' if '--live' in sys.argv else 'http://127.0.0.1:8829'
report={};errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox','--headless=new'])
 context=browser.new_context(viewport={'width':1280,'height':720},device_scale_factor=1)
 page=context.new_page();page.on('pageerror',lambda e:errors.append('page: '+str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(BASE+'/games/lucas-hoops/');page.evaluate('document.fonts.ready');page.wait_for_timeout(250)
 page.screenshot(path=str(OUT/'v2-menu.png'))
 if '--live' not in sys.argv:page.locator('.brand').screenshot(path=str(ROOT/'games/lucas-hoops/thumb.png'))
 page.click('#player-card');page.screenshot(path=str(OUT/'v2-lucas-closeup.png'));page.get_by_role('button',name='BACK TO THE TEAM').click()
 page.click('#how');assert 'floating stick' in page.inner_text('#dialog-body');assert 'Charge' in page.inner_text('#dialog-body');page.get_by_role('button',name="LET'S PLAY").click()
 page.click('#settings');page.click('#difficulty-setting');assert page.inner_text('#difficulty-setting')=='BALLER';page.click('#difficulty-setting');page.click('#difficulty-setting');page.get_by_role('button',name='DONE',exact=True).click()
 page.click('#quick');page.click('#mode-3');assert page.evaluate('HOOPS.state.players.length')==6
 page.wait_for_timeout(350);page.screenshot(path=str(OUT/'v2-offense.png'))
 page.keyboard.down('ArrowUp');page.keyboard.down('ArrowRight');page.wait_for_timeout(80);page.keyboard.press('KeyE');page.keyboard.up('ArrowUp');page.keyboard.up('ArrowRight')
 page.wait_for_function('HOOPS.state.metrics.catches>0',timeout=4000);report['pass_and_catch']=True
 defense_saved=False;switch_done=False;start=time.time()
 # A full 90-second match with real inputs. No clock/state acceleration or fabricated score.
 while page.evaluate("HOOPS.scene==='play'") and time.time()-start<110:
  info=page.evaluate('''()=>{const g=HOOPS.state,o=g.players.find(p=>p.id===g.ball.owner),p=g.players.find(p=>p.id===g.control);return{phase:g.possession,owner:o?.team,dead:g.dead,dx:(o?.x||p.x)-p.x,dy:(o?.y||p.y)-p.y};}''')
  if info['dead']>0:page.wait_for_timeout(350);continue
  if info.get('owner')==0:
   page.keyboard.down('Space');page.wait_for_timeout(590);page.keyboard.up('Space');page.wait_for_timeout(1300)
  else:
   if not defense_saved and info['phase']==1:
    page.screenshot(path=str(OUT/'v2-defense.png'));defense_saved=True
   if not switch_done and info['phase']==1:
    old=page.evaluate('HOOPS.state.control');page.keyboard.press('KeyR');assert page.evaluate('HOOPS.state.control')!=old;switch_done=True
   xkey='ArrowRight' if info['dx']>0 else 'ArrowLeft';ykey='ArrowDown' if info['dy']>0 else 'ArrowUp'
   page.keyboard.down(xkey);page.keyboard.down(ykey);page.wait_for_timeout(280);page.keyboard.up(xkey);page.keyboard.up(ykey);page.keyboard.press('KeyE');page.wait_for_timeout(250)
 page.wait_for_function("HOOPS.scene==='end'",timeout=15000)
 assert page.evaluate('HOOPS.state.time')==0
 report['full_3v3_game']=page.evaluate('({time:HOOPS.state.time,score:HOOPS.state.score,metrics:HOOPS.state.metrics,players:HOOPS.state.players.length})')
 assert defense_saved and switch_done
 page.screenshot(path=str(OUT/'v2-match-final.png'));page.get_by_role('button',name='MAIN MENU',exact=True).click()
 page.click('#shootout');page.wait_for_timeout(100);page.keyboard.down('Space');page.wait_for_timeout(590);page.keyboard.up('Space')
 page.wait_for_function('HOOPS.state.score[0]>=3',timeout=6000);report['made_shot']=True
 for i in range(25):
  page.wait_for_function("HOOPS.scene!=='play'||(HOOPS.state.ball.owner!==null&&HOOPS.state.dead<=0)",timeout=7000)
  if page.evaluate("HOOPS.scene!=='play'"):break
  page.keyboard.down('Space');page.wait_for_timeout(590 if i%5 else 150);page.keyboard.up('Space');page.wait_for_timeout(1600)
 page.wait_for_function("HOOPS.scene==='end'",timeout=70000)
 assert page.inner_text('#dialog-title')=='SHOOTOUT COMPLETE';assert page.evaluate('HOOPS.state.time')==0
 report['full_shootout']=page.evaluate('({time:HOOPS.state.time,score:HOOPS.state.score,makes:HOOPS.state.makes,attempts:HOOPS.state.attempts})')
 page.screenshot(path=str(OUT/'v2-shootout-final.png'));page.get_by_role('button',name='REMATCH',exact=True).click();assert page.evaluate('HOOPS.state.time')>59
 page.keyboard.press('KeyP');remaining=page.evaluate('HOOPS.state.time');page.wait_for_timeout(300);assert page.evaluate('HOOPS.state.time')==remaining;report['pause_rematch']=True
 page.get_by_role('button',name='MAIN MENU',exact=True).click()
 for n in [1,5]:
  page.click('#quick');page.click('#mode-'+str(n));assert page.evaluate('HOOPS.state.players.length')==n*2;page.wait_for_timeout(700);page.keyboard.press('KeyP');page.get_by_role('button',name='MAIN MENU',exact=True).click()
 report['1v1_5v5']=True
 # An actual arcade tile, with a local-only player if the arcade needs one.
 page.goto(BASE+'/index.html');page.evaluate("LA.players.create('Hoops Tester','bella','1234')");page.reload();page.locator('a[href="games/lucas-hoops/index.html"]').click();page.wait_for_url('**/games/lucas-hoops/index.html');report['arcade_tile']=True
 # Fresh canonical folder URL is explicitly precached, too.
 page.goto(BASE+'/games/lucas-hoops/');page.evaluate('navigator.serviceWorker.ready');page.wait_for_function('navigator.serviceWorker.controller!==null')
 report['caches']=page.evaluate('caches.keys()');assert 'lucas-arcade-v14' in report['caches']
 context.set_offline(True);page.reload();page.wait_for_function("typeof HOOPS!=='undefined'");page.click('#quick');page.click('#mode-3');page.wait_for_timeout(500);assert page.evaluate("HOOPS.scene==='play'");report['offline']=True;context.set_offline(False)
 # Real two-finger touch: diagonal floating joystick + a held/released shot.
 phone=browser.new_context(viewport={'width':844,'height':390},device_scale_factor=1,is_mobile=True,has_touch=True)
 mobile=phone.new_page();mobile.on('pageerror',lambda e:errors.append('phone: '+str(e)));mobile.on('console',lambda m:errors.append('phone: '+m.text) if m.type=='error' else None)
 mobile.goto(BASE+'/games/lucas-hoops/');mobile.evaluate('document.fonts.ready');mobile.click('#quick');mobile.click('#mode-3')
 cdp=phone.new_cdp_session(mobile);stage=mobile.locator('#stage').bounding_box()
 def tp(x,y,id):return {'x':stage['x']+x/960*stage['width'],'y':stage['y']+y/540*stage['height'],'id':id}
 first=tp(220,350,1);drag=tp(265,310,1);shot=tp(816,345,2)
 before=mobile.evaluate('({x:HOOPS.state.players[0].x,y:HOOPS.state.players[0].y})')
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[first]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[drag]});mobile.wait_for_timeout(300)
 after=mobile.evaluate('({x:HOOPS.state.players[0].x,y:HOOPS.state.players[0].y})');assert after['x']>before['x']+20 and after['y']<before['y']-15
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[drag,shot]});mobile.wait_for_timeout(550)
 assert mobile.evaluate('HOOPS.state.charge')>.8;mobile.locator('#stage').screenshot(path=str(OUT/'v2-phone-offense.png'))
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[drag]});mobile.wait_for_timeout(50);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});assert mobile.evaluate('HOOPS.state.attempts')>=1;report['diagonal_joystick_multitouch_shot']=True
 # Possession fixture only for testing mobile defensive labels and Switch while moving.
 mobile.evaluate('''()=>{const g=HOOPS.state,o=g.players.find(p=>p.team===1);g.ball.owner=o.id;g.ball.shot=false;g.possession=1;g.dead=0;g.manualSwitch=5;}''');mobile.wait_for_timeout(100)
 assert mobile.locator('#action-primary span').inner_text()=='BLOCK';assert mobile.locator('#action-move span').inner_text()=='CHARGE'
 old=mobile.evaluate('HOOPS.state.control');switch=tp(816,497,2)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[first]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[drag]});cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[drag,switch]});mobile.wait_for_timeout(100);assert mobile.evaluate('HOOPS.state.control')!=old
 mobile.locator('#stage').screenshot(path=str(OUT/'v2-phone-defense.png'));cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});report['defense_context_and_touch_switch']=True
 mobile.keyboard.press('KeyP');mobile.get_by_role('button',name='MAIN MENU',exact=True).click();mobile.click('#quick');mobile.click('#mode-5')
 timing=mobile.evaluate('''()=>new Promise(resolve=>{const a=[];let last=performance.now();function tick(t){a.push(t-last);last=t;if(a.length===120){a.sort((x,y)=>x-y);resolve({median:a[60],p95:a[114],frames:a.length});}else requestAnimationFrame(tick);}requestAnimationFrame(tick);})''')
 report['phone_5v5_frame_ms']=timing;assert timing['p95']<65
 phone.close();context.close();browser.close()
server.shutdown();report['errors']=errors;print(json.dumps(report,indent=2));assert not errors,errors
