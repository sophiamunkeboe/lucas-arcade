"""v2 controlled fixtures plus real key actions for charge, blocks, passing and buzzer-beaters."""
import functools,http.server,json,socketserver,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
socketserver.TCPServer.allow_reuse_address=True
s=socketserver.ThreadingTCPServer(('127.0.0.1',8830),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=s.serve_forever,daemon=True).start()
report={};errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
 pg=b.new_page(viewport={'width':1280,'height':720});pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 pg.goto('http://127.0.0.1:8830/games/lucas-hoops/');pg.click('#quick');pg.click('#mode-3')
 # A real pass from the initial formation, aimed upcourt toward Nova.
 pg.evaluate('HOOPS.state.shotClock=8')
 pg.keyboard.down('ArrowUp');pg.keyboard.down('ArrowRight');pg.wait_for_timeout(80);pg.keyboard.press('KeyE');pg.keyboard.up('ArrowUp');pg.keyboard.up('ArrowRight')
 pg.wait_for_function('HOOPS.state.metrics.catches>0',timeout=3000);assert pg.evaluate('HOOPS.state.metrics.passes')>0;report['directional_pass_and_catch']=True
 assert pg.evaluate('HOOPS.state.shotClock')<8;report['pass_preserves_shot_clock']=True
 def rig(js=''):
  pg.evaluate('''()=>{const g=HOOPS.state;g.dead=0;g.buzzer=false;g.time=90;g.shotClock=14;g.control=g.players[0].id;g.manualSwitch=5;g.possession=1;
  for(const p of g.players){p.x=p.team===0?750:820;p.y=400-p.index*90;p.z=p.vz=p.vx=p.vy=p.cool=p.plant=p.hold=0;p.think=8;p.charging=false;}
  const p=g.players[0],o=g.players.find(p=>p.team===1);p.x=400;p.y=220;o.x=430;o.y=220;
  Object.assign(g.ball,{owner:o.id,shot:false,pass:false,scored:false,age:0,x:o.x,y:o.y,z:25,vx:0,vy:0,vz:0});
  '''+js+'}')
 rig();before=pg.evaluate('HOOPS.state.control');pg.keyboard.press('KeyR');assert pg.evaluate('HOOPS.state.control')!=before;report['switch']=True
 for _ in range(8):
  rig();pg.keyboard.press('KeyE');pg.wait_for_timeout(30)
  if pg.evaluate('HOOPS.state.metrics.steals>0'):break
 assert pg.evaluate('HOOPS.state.metrics.steals>0');report['steal']=True
 rig('o.x=470;');pg.keyboard.press('KeyQ');pg.wait_for_function('HOOPS.state.metrics.charges>0',timeout=4000);report['charge_call']=True
 rig('p.x=500;Object.assign(g.ball,{owner:null,x:500,y:220,z:85,vx:0,vy:0,vz:-20,shot:true,shooter:o.id,age:.35,scored:false});');pg.keyboard.press('Space');pg.wait_for_function('HOOPS.state.metrics.blocks>0',timeout=3000);report['block']=True
 rig('p.x=380;g.possession=0;g.ball.owner=p.id;for(const q of g.players){if(q.team===1){q.x=90;q.y=400;}}');pg.keyboard.press('KeyQ');assert pg.evaluate('HOOPS.state.metrics.crossovers')>0;report['crossover']=True
 pg.wait_for_timeout(700);x=pg.evaluate('HOOPS.state.players[0].x');pg.keyboard.down('Shift');pg.keyboard.down('ArrowRight');pg.wait_for_timeout(300);pg.keyboard.up('ArrowRight');pg.keyboard.up('Shift');assert pg.evaluate('HOOPS.state.players[0].x')>x+65;report['sprint']=True
 rig('p.x=400;g.possession=0;g.ball.owner=p.id;for(const q of g.players){if(q.team===1){q.x=90;q.y=400;}}');prior=pg.evaluate('HOOPS.state.score[0]');pg.keyboard.down('Space');pg.wait_for_timeout(590);pg.evaluate('HOOPS.state.shotClock=.2');pg.keyboard.up('Space');pg.wait_for_function(f'HOOPS.state.score[0]>{prior}',timeout=5000);report['3v3_made_shot']=True;report['shot_clock_beater']=True
 rig('Object.assign(g.ball,{owner:null,x:893,y:220,z:94,vx:0,vy:0,vz:-100,shot:true,shooter:p.id,age:.3,rim:false});');pg.wait_for_function('HOOPS.state.ball.rim===true');report['rim_physics']=True
 rig('Object.assign(g.ball,{owner:null,x:400,y:220,z:20,vx:0,vy:0,vz:0,shot:false,shooter:o.id,age:2});');pg.wait_for_function('HOOPS.state.ball.owner===HOOPS.state.control');report['rebound']=True
 pg.evaluate('HOOPS.state.shotClock=.05');pg.wait_for_function('HOOPS.state.dead>0');report['shot_clock']=True
 pg.keyboard.press('KeyP');pg.get_by_role('button',name='MAIN MENU',exact=True).click();pg.click('#shootout');pg.evaluate('HOOPS.state.time=1.2')
 pg.keyboard.down('Space');pg.wait_for_timeout(590);pg.keyboard.up('Space');pg.wait_for_function("HOOPS.scene==='end'",timeout=7000);assert pg.evaluate('HOOPS.state.score[0]')==3;report['buzzer_beater']=True
 b.close()
s.shutdown();report['errors']=errors;print(json.dumps(report,indent=2));assert not errors
