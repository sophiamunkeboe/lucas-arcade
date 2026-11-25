"""Lucas Hoops v2.3 checks: intro, menu + court themes, full game with forced overtime, free throws (debug + natural
blocking/shooting fouls), subs (manual + CPU auto), power-ups, 2 players on one phone (touch, landscape + portrait),
tournament to the trophy, online room create/join between two browser contexts (real Supabase Realtime), phone
viewports, Miko + the other games still load, no console errors.
python3 tools/hoops-v23.py   (screens go to HOOPS_SCREEN_DIR, default /workspace/hoops-v2.2-shots)"""
import functools,http.server,json,os,socketserver,sys,threading,time
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('HOOPS_SCREEN_DIR','/workspace/hoops-v2.2-shots'));OUT.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
socketserver.TCPServer.allow_reuse_address=True
server=socketserver.ThreadingTCPServer(('127.0.0.1',8851),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
BASE='http://127.0.0.1:8851';HOOPS=BASE+'/games/lucas-hoops/'
report={};errors=[]
only=set(sys.argv[1:])
def want(k):return not only or k in only
def watch(page,tag):
 page.on('pageerror',lambda e:errors.append(f'{tag} page: {e}'));page.on('console',lambda m:errors.append(f'{tag}: {m.text}') if m.type=='error' else None)
def shot(page,name):page.screenshot(path=str(OUT/name))
def to_menu(page):
 page.goto(HOOPS);page.wait_for_function("HOOPS.scene==='intro'||HOOPS.scene==='menu'",timeout=20000);page.keyboard.press('Space');page.wait_for_function("HOOPS.scene==='menu'");page.evaluate('document.fonts.ready');page.wait_for_timeout(200)
def stage_pt(page,x,y,i):
 st=page.locator('#stage').bounding_box();return {'x':st['x']+x/960*st['width'],'y':st['y']+y/540*st['height'],'id':i}
def el_pt(page,sel,i):
 b=page.locator(sel).bounding_box();return {'x':b['x']+b['width']/2,'y':b['y']+b['height']/2,'id':i}
PHONES={'iphone13_land':dict(viewport={'width':844,'height':390},device_scale_factor=3,is_mobile=True,has_touch=True),
 'iphone13_port':dict(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True),
 'android_small':dict(viewport={'width':640,'height':360},device_scale_factor=2,is_mobile=True,has_touch=True),
 'desktop':dict(viewport={'width':1280,'height':720},device_scale_factor=1)}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox','--headless=new'])
 if want('intro'):
  for name,opts in PHONES.items():
   c=browser.new_context(**opts);pg=c.new_page();watch(pg,name);pg.goto(HOOPS);pg.wait_for_function("HOOPS.scene==='intro'",timeout=20000);pg.wait_for_timeout(2600)
   assert pg.evaluate('HOOPS.intro&&HOOPS.intro.elapsed>1'),'intro not playing';shot(pg,f'intro-{name}.png')
   pg.wait_for_function("HOOPS.scene==='menu'",timeout=15000);pg.wait_for_timeout(350);shot(pg,f'menu-{name}.png')
   vis=pg.evaluate("['quick','tournament','shootout','versus','online','court-btn','how','settings'].every(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.width>0&&r.bottom<=innerHeight+1&&r.right<=innerWidth+1;})")
   assert vis,f'menu buttons clipped on {name}';report[f'intro_menu_{name}']=True;c.close()
 c=browser.new_context(**PHONES['iphone13_land']);pg=c.new_page();watch(pg,'land')
 if want('themes'):
  to_menu(pg);pg.click('#court-btn');pg.wait_for_timeout(250);shot(pg,'theme-picker.png');pg.click('#theme-neon');pg.get_by_role('button',name='DONE').click()
  assert pg.inner_text('#court-label')=='RETRO NEON';pg.reload();pg.wait_for_function('HOOPS.scene==="intro"||HOOPS.scene==="menu"');assert pg.evaluate("HOOPS.settings.theme")=='neon'
  to_menu(pg);pg.click('#quick');pg.click('#mode-3');pg.wait_for_timeout(1300);shot(pg,'theme-neon-game.png')
  pg.keyboard.press('KeyP');pg.get_by_role('button',name='MAIN MENU',exact=True).click()
  for k in ['owls','street','sunburst']:
   pg.click('#court-btn');pg.click('#theme-'+k);pg.get_by_role('button',name='DONE').click()
   if k!='sunburst':pg.click('#quick');pg.click('#mode-5');pg.wait_for_timeout(1300);shot(pg,f'theme-{k}-game.png');pg.keyboard.press('KeyP');pg.get_by_role('button',name='MAIN MENU',exact=True).click()
  report['themes_persist']=True
 if want('ot'):
  # Full 1P 3v3 game: real 90 s clock with key inputs, tie forced at the horn -> overtime -> plays to the end.
  to_menu(pg);pg.click('#quick');pg.click('#mode-3');start=time.time();forced=False;ot_shot=False
  while pg.evaluate("HOOPS.scene==='play'") and time.time()-start<200:
   info=pg.evaluate('''()=>{const g=HOOPS.state,o=g.players.find(p=>p.id===g.ball.owner),p=g.players.find(p=>p.id===g.control);return{t:g.time,per:g.period,owner:o?.team,dead:g.dead,ft:!!g.ft,dx:(o?.x||p.x)-p.x,dy:(o?.y||p.y)-p.y};}''')
   if not forced and info['t']<3 and info['per']==0:pg.evaluate('HOOPS.debug.forceOT()');forced=True
   if info['per']>0 and not ot_shot:pg.wait_for_timeout(500);shot(pg,'overtime.png');ot_shot=True
   if info['ft']:
    if pg.evaluate("HOOPS.state.ft.team===0&&HOOPS.state.ft.phase==='aim'"):pg.wait_for_function("!HOOPS.state.ft||Math.abs(HOOPS.state.ft.meter-.5)<.05",timeout=6000);pg.keyboard.press('Space')
    pg.wait_for_timeout(150);continue
   if info['dead']>0:pg.wait_for_timeout(250);continue
   if info.get('owner')==0:pg.keyboard.down('Space');pg.wait_for_timeout(590);pg.keyboard.up('Space');pg.wait_for_timeout(1000)
   else:
    xk='ArrowRight' if info['dx']>0 else 'ArrowLeft';yk='ArrowDown' if info['dy']>0 else 'ArrowUp'
    pg.keyboard.down(xk);pg.keyboard.down(yk);pg.wait_for_timeout(250);pg.keyboard.up(xk);pg.keyboard.up(yk);pg.keyboard.press('KeyE');pg.wait_for_timeout(200)
  pg.wait_for_function("HOOPS.scene==='end'",timeout=60000)
  r=pg.evaluate('({score:HOOPS.state.score,period:HOOPS.state.period,time:HOOPS.state.time,ft:HOOPS.state.stats,fouls:HOOPS.state.metrics.fouls})');assert r['period']>=1 and r['score'][0]!=r['score'][1],r
  shot(pg,'ot-final.png');report['full_game_overtime']=r;pg.get_by_role('button',name='MAIN MENU',exact=True).click()
 if want('ft'):
  to_menu(pg);pg.click('#quick');pg.click('#mode-3');pg.wait_for_timeout(600)
  pg.evaluate('HOOPS.debug.startFT(0,2)');pg.wait_for_function("HOOPS.state.ft&&HOOPS.state.ft.phase==='aim'",timeout=4000);pg.wait_for_timeout(300);shot(pg,'free-throw-meter.png');before=pg.evaluate('HOOPS.state.score[0]')
  pg.wait_for_function("Math.abs(HOOPS.state.ft.meter-.5)<.04",timeout=5000);pg.keyboard.press('Space')
  pg.wait_for_function(f"HOOPS.state.score[0]>{before}",timeout=4000);pg.wait_for_function("HOOPS.state.ft&&HOOPS.state.ft.phase==='aim'",timeout=4000);pg.wait_for_timeout(200)
  pg.wait_for_function("Math.abs(HOOPS.state.ft.meter-.5)>.3",timeout=4000);pg.keyboard.press('Space');pg.wait_for_function('!HOOPS.state.ft',timeout=5000)
  st=pg.evaluate('HOOPS.state.stats');assert st['ftAtt'][0]==2 and st['ftMade'][0]==1,st;report['ft_meter_make_and_miss']=st
  # Natural blocking foul: plant (Q) too late as the CPU dribbler drives at you near your rim -> 2 CPU free throws.
  pg.evaluate('''()=>{const g=HOOPS.state,me=g.players[0],o=g.players.find(p=>p.team===1&&p.index===0);g.dead=0;g.ft=null;g.pendingFT=null;g.manualSwitch=5;g.control=me.id;
   for(const p of g.players){p.x=p.team===0?700:760;p.y=400-p.index*100;p.think=9;p.vx=p.vy=0;}me.x=150;me.y=220;o.x=176;o.y=220;o.think=9;g.ball.owner=o.id;g.possession=1;g.ball.shot=false;g.ball.pass=false;}''')
  pg.evaluate('''()=>{const g=HOOPS.state,o=g.players.find(p=>p.team===1&&p.index===0);o.think=9;const iv=setInterval(()=>{if(!HOOPS.state||HOOPS.state.dead>0||HOOPS.state.pendingFT){clearInterval(iv);return;}o.vx=-160;o.think=9;},5);}''')
  pg.keyboard.press('KeyQ');pg.wait_for_function('HOOPS.state.ft&&HOOPS.state.ft.team===1',timeout=4000);report['blocking_foul_to_cpu_free_throws']=True
  pg.wait_for_function('!HOOPS.state.ft',timeout=9000);assert pg.evaluate('HOOPS.state.stats.ftAtt[1]')==2
  # Natural shooting foul: contested jumper with the dice loaded -> free throws (or and-one).
  pg.wait_for_function('HOOPS.state.dead<=0&&HOOPS.state.ball.owner',timeout=6000)
  pg.evaluate('''()=>{const g=HOOPS.state,me=g.players[0],d=g.players.find(p=>p.team===1&&p.index===0);g.manualSwitch=5;g.control=me.id;for(const p of g.players){p.think=9;p.vx=p.vy=0;p.x=p.team===0?300:340;p.y=400-p.index*100;}
   me.x=700;me.y=220;d.x=760;d.y=220;d.cool=9;g.ball.owner=me.id;g.possession=0;g.ball.shot=false;}''')
  pg.keyboard.down('Space');pg.wait_for_timeout(560);pg.evaluate('''()=>{const g=HOOPS.state,me=g.players[0],d=g.players.find(p=>p.team===1&&p.index===0);d.cool=9;d.x=me.x+12;d.y=me.y;d.z=20;d.vz=80;window._rnd=Math.random;Math.random=()=>0.01;}''')
  pg.keyboard.up('Space');pg.evaluate('Math.random=window._rnd')
  pg.wait_for_function('HOOPS.state.pendingFT||HOOPS.state.ft',timeout=3000);pg.wait_for_function('HOOPS.state.ft&&HOOPS.state.ft.team===0',timeout=6000);report['shooting_foul_free_throws']=pg.evaluate('({n:HOOPS.state.ft.total,andOne:HOOPS.state.ft.andOne})')
  pg.keyboard.press('KeyP');pg.get_by_role('button',name='MAIN MENU',exact=True).click()
 if want('subs'):
  to_menu(pg);pg.click('#quick');pg.click('#mode-3');pg.wait_for_timeout(500)
  pg.evaluate('HOOPS.state.players.filter(p=>p.team===0)[1].stamina=.2')
  pg.click('#pause');pg.get_by_role('button',name='SUBSTITUTIONS',exact=True).click();shot(pg,'subs-screen.png')
  nova=pg.evaluate('HOOPS.state.players.filter(p=>p.team===0)[1].id');pg.click(f'[data-on="{nova}"]');pg.click('[data-bench="0"]')
  nm=pg.evaluate('HOOPS.state.players.filter(p=>p.team===0)[1].name');assert nm!='Nova',nm;assert pg.evaluate('HOOPS.state.stats.subs')==1
  pg.click('#subs-done');assert pg.evaluate("HOOPS.scene==='play'")
  # SUB button queues the screen for the next whistle.
  pg.click('#subs');assert pg.evaluate('HOOPS.state.subQueued');pg.evaluate('HOOPS.state.shotClock=.05')
  pg.wait_for_function("HOOPS.scene==='paused'",timeout=4000);assert 'WHISTLE' in pg.inner_text('#dialog-title');pg.click('#subs-done')
  # CPU auto-sub at a stoppage.
  pg.evaluate('''()=>{const g=HOOPS.state;g.players.filter(p=>p.team===1)[2].stamina=.2;g.shotClock=.05;}''');cpu_before=pg.evaluate('HOOPS.state.players.filter(p=>p.team===1)[2].name')
  pg.wait_for_function(f"HOOPS.state.players.filter(p=>p.team===1)[2].name!=='{cpu_before}'",timeout=5000)
  report['subs']={'manual':nm,'cpu_auto':pg.evaluate('HOOPS.state.players.filter(p=>p.team===1)[2].name'),'from':cpu_before}
  pg.keyboard.press('KeyP');pg.get_by_role('button',name='MAIN MENU',exact=True).click()
 if want('power'):
  to_menu(pg);pg.click('#quick');pg.click('#mode-3');pg.wait_for_timeout(500)
  pg.evaluate('(()=>{const p=HOOPS.state.players.find(q=>q.id===HOOPS.state.control);HOOPS.debug.spawn("bolt",p.x+30,p.y);})()');pg.wait_for_timeout(120);shot(pg,'powerup-token.png')
  pg.keyboard.down('ArrowRight');pg.wait_for_function('HOOPS.state.players.some(p=>p.speedUp>0)',timeout=3000);pg.keyboard.up('ArrowRight')
  pg.evaluate('(()=>{const p=HOOPS.state.players.find(q=>q.id===HOOPS.state.control);HOOPS.debug.spawn("flame",p.x,p.y);})()');pg.wait_for_function('HOOPS.state.fire[0]>0',timeout=3000);pg.wait_for_timeout(400);shot(pg,'on-fire.png')
  # Hot streak: three straight Sunburst buckets lights the team up.
  pg.evaluate('HOOPS.state.fire=[0,0];HOOPS.state.teamStreak=[2,0]')
  pg.evaluate('''()=>{const g=HOOPS.state,p=g.players[0];Object.assign(g.ball,{owner:null,x:870,y:220,z:95,vx:0,vy:0,vz:-60,shot:true,shooter:p.id,age:.5,scored:false,points:2});g.dead=0;}''')
  pg.wait_for_function('HOOPS.state.fire[0]>0',timeout=3000);report['powerups']={'speed':True,'fire_token':True,'hot_streak':pg.evaluate('HOOPS.state.stats.fires')}
  pg.keyboard.press('KeyP');pg.get_by_role('button',name='MAIN MENU',exact=True).click()
  pg.click('#settings');pg.click('#powerups-setting');assert pg.inner_text('#powerups-setting')=='OFF';pg.click('#powerups-setting');pg.get_by_role('button',name='DONE',exact=True).click()
 if want('tourney'):
  to_menu(pg);pg.click('#tournament');shot(pg,'tournament-bracket.png');pg.click('#cup-3');pg.wait_for_timeout(500)
  assert pg.evaluate("HOOPS.state.teams[1].key")=='coyotes';shot(pg,'tournament-semi.png')
  pg.evaluate('HOOPS.state.score=[24,12];HOOPS.state.time=.05');pg.wait_for_function("HOOPS.scene==='end'",timeout=8000);assert pg.inner_text('#dialog-title')=='ON TO THE FINAL!';shot(pg,'tournament-semi-won.png')
  pg.click('#play-final');pg.wait_for_timeout(400);opp=pg.evaluate('HOOPS.state.teams[1].key');assert opp in ('owls','monsoon')
  titles=pg.evaluate('HOOPS.records.titles');pg.evaluate('HOOPS.state.score=[30,28];HOOPS.state.time=.05');pg.wait_for_function("HOOPS.scene==='end'",timeout=8000)
  assert pg.inner_text('#dialog-title')=='SUNBURST CUP CHAMPIONS!';pg.wait_for_timeout(900);shot(pg,'tournament-trophy.png');assert pg.evaluate('HOOPS.records.titles')==titles+1
  report['tournament']={'final_vs':opp,'titles':titles+1};pg.get_by_role('button',name='MAIN MENU',exact=True).click()
 c.close()
 if want('2p'):
  for name in ['iphone13_land','iphone13_port']:
   c=browser.new_context(**PHONES[name]);pg=c.new_page();watch(pg,'2p-'+name);to_menu(pg);pg.click('#versus');pg.click('#vs-3');pg.wait_for_timeout(700)
   cdp=c.new_cdp_session(pg)
   b0=pg.evaluate('(()=>{const g=HOOPS.state,a=g.players.find(p=>p.id===g.humans[0].control),b=g.players.find(p=>p.id===g.humans[1].control);return{ax:a.x,ay:a.y,bx:b.x,by:b.y};})()')
   z1=pg.locator('#joystick-zone').bounding_box();z2=pg.locator('#joystick-zone-2').bounding_box()
   t1={'x':z1['x']+z1['width']*.5,'y':z1['y']+z1['height']*.5,'id':1};t1m={'x':t1['x']+40,'y':t1['y'],'id':1}
   t2={'x':z2['x']+z2['width']*.5,'y':z2['y']+z2['height']*.5,'id':2};t2m={'x':t2['x']+40,'y':t2['y'],'id':2}
   cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[t1]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[t1m]});cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[t1m,t2]})
   cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[t1m,t2m]});pg.wait_for_timeout(400);shot(pg,f'2p-{name}.png')
   a1=pg.evaluate('(()=>{const g=HOOPS.state,a=g.players.find(p=>p.id===g.humans[0].control),b=g.players.find(p=>p.id===g.humans[1].control);return{ax:a.x,ay:a.y,bx:b.x,by:b.y};})()')
   cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   assert a1['ax']>b0['ax']+20,(b0,a1)
   assert a1['bx']>b0['bx']+20,(b0,a1)
   # P2 is on defense: P2's SWITCH (4th button) changes P2's defender; P1's SHOOT starts a shot meter.
   old=pg.evaluate('HOOPS.state.humans[1].control');sp=el_pt(pg,'#action-fourth-2',3);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[sp]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   assert pg.evaluate('HOOPS.state.humans[1].control')!=old
   pp=el_pt(pg,'#action-primary',4);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[pp]});pg.wait_for_timeout(300);assert pg.evaluate('HOOPS.state.humans[0].chargeHeld');cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   assert pg.evaluate('HOOPS.state.attempts')>=1
   report['2p_'+name]={'p1_moved':round(a1['ax']-b0['ax']),'p2_moved':round(a1['bx']-b0['bx']),'p2_switch':True,'p1_shot':True}
   if name=='iphone13_land':
    # Keyboard split too: P1 WASD, P2 arrows.
    pg.wait_for_function('HOOPS.state.dead<=0',timeout=5000);k0=pg.evaluate('(()=>{const g=HOOPS.state;return[g.players.find(p=>p.id===g.humans[0].control).y,g.players.find(p=>p.id===g.humans[1].control).y]})()')
    pg.keyboard.down('KeyS');pg.keyboard.down('ArrowUp');pg.wait_for_timeout(300);pg.keyboard.up('KeyS');pg.keyboard.up('ArrowUp')
    k1=pg.evaluate('(()=>{const g=HOOPS.state;return[g.players.find(p=>p.id===g.humans[0].control).y,g.players.find(p=>p.id===g.humans[1].control).y]})()');report['2p_keyboard']=[k0,k1]
   c.close()
 if want('online'):
  hc=browser.new_context(**PHONES['iphone13_land']);gc=browser.new_context(**PHONES['android_small'])
  host=hc.new_page();guest=gc.new_page();watch(host,'host');watch(guest,'guest')
  to_menu(host);to_menu(guest)
  host.click('#online');host.click('#host-room');host.wait_for_selector('#room-code',timeout=20000);code=host.inner_text('#room-code').strip();shot(host,'online-host-code.png')
  guest.click('#online');guest.click('#join-room');guest.fill('#code-input',code);guest.click('#join-go');guest.wait_for_function("document.getElementById('dialog-title').textContent.includes('IN!')",timeout=20000)
  host.wait_for_selector('#start-online',timeout=10000);host.click('#start-online')
  guest.wait_for_function("HOOPS.scene==='play'&&HOOPS.state.online==='guest'",timeout=10000);guest.wait_for_function('HOOPS.state.lastSnap>5',timeout=10000)
  g0=host.evaluate('(()=>{const g=HOOPS.state,p=g.players.find(p=>p.id===g.humans[1].control);return{x:p.x,y:p.y}})()')
  guest.keyboard.down('ArrowRight');guest.wait_for_timeout(700);guest.keyboard.up('ArrowRight')
  g1=host.evaluate('(()=>{const g=HOOPS.state,p=g.players.find(p=>p.id===g.humans[1].control);return{x:p.x,y:p.y}})()');assert g1['x']>g0['x']+25,(g0,g1)
  # Snapshots flow host -> guest: positions agree within a frame or two.
  hp=host.evaluate('HOOPS.state.players.map(p=>[p.id,Math.round(p.x)])');gp=guest.evaluate('HOOPS.state.players.map(p=>[p.id,Math.round(p.x)])')
  drift=max(abs(a[1]-b[1]) for a,b in zip(hp,gp))
  shot(host,'online-host-game.png');shot(guest,'online-guest-game.png')
  # Guest's button taps are relayed: on defense SWITCH changes the guest's defender on the host.
  host.wait_for_function('HOOPS.state.possession===0&&HOOPS.state.dead<=0',timeout=8000);old=host.evaluate('HOOPS.state.humans[1].control');guest.keyboard.press('KeyR');host.wait_for_function(f'HOOPS.state.humans[1].control!=={old}',timeout=3000)
  host.evaluate('HOOPS.state.score=[10,14];HOOPS.state.time=.05');guest.wait_for_function("HOOPS.scene==='end'",timeout=10000);host.wait_for_function("HOOPS.scene==='end'")
  gt=guest.inner_text('#dialog-title');ht=host.inner_text('#dialog-title');shot(guest,'online-guest-final.png')
  report['online']={'code':code,'guest_moved':round(g1['x']-g0['x']),'max_drift_px':drift,'guest_switch_relayed':True,'host_title':ht,'guest_title':gt,'snaps':guest.evaluate('HOOPS.state.lastSnap')}
  assert gt=='YOU WIN!' and ht=='GOOD GAME!'
  hc.close();gc.close()
 if want('others'):
  c=browser.new_context(**PHONES['iphone13_port']);pg=c.new_page();watch(pg,'arcade');pg.goto(BASE+'/index.html');pg.evaluate("LA.players.create('Hoops Tester','bella','1234')");pg.reload();pg.wait_for_timeout(500)
  for gm in ['pop-the-dog','fetch-frenzy','blackjack','poker','smash-room','lucas-hoops']:
   pg.goto(f'{BASE}/games/{gm}/index.html');pg.wait_for_timeout(1500);assert gm in pg.url,(gm,pg.url)
  report['other_games_load']=True;c.close()
  mb=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--headless=new','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
  mc=mb.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);mp=mc.new_page();watch(mp,'miko');mp.goto(BASE+'/games/miko/index.html?q=low&noadapt=1&fps=1')
  mp.wait_for_function('window.MIKO && MIKO.perf.log.length > 1',timeout=180000);report['miko_loads_threejs']=mp.evaluate("performance.getEntriesByType('resource').some(e=>e.name.includes('three.module.js'))");mb.close()
 browser.close()
server.shutdown()
errors=[e for e in errors if 'favicon' not in e]
report['errors']=errors;print(json.dumps(report,indent=1));assert not errors,errors
