"""Targeted deterministic fixtures for edge cases, in addition to real-input hoops-play.py."""
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
 pg=b.new_page(viewport={'width':1280,'height':720});pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.goto('http://127.0.0.1:8830/games/lucas-hoops/index.html');pg.click('#quick')
 # Repeated input fixtures absorb the intentional 5% rookie steal miss chance.
 for _ in range(8):
  pg.evaluate('''()=>{const g=HOOPS.state;g.p.cool=0;g.p.x=500;g.p.z=0;g.cpu.x=520;g.cpu.z=0;g.ball.owner=2;g.cpuThink=5;}''')
  pg.keyboard.press('KeyE');pg.wait_for_timeout(50)
  if pg.evaluate('HOOPS.state.metrics.steals>0'):break
 assert pg.evaluate('HOOPS.state.metrics.steals>0');report['steal']=True
 pg.evaluate('''()=>{const g=HOOPS.state;g.p.x=500;g.p.z=65;g.p.vz=0;g.cpu.x=250;Object.assign(g.ball,{owner:0,x:500,y:248,vx:0,vy:100,shot:true,shooter:2,age:.4,scored:false});}''')
 pg.wait_for_function('HOOPS.state.metrics.blocks>0');report['block']=True
 pg.evaluate('''()=>{const g=HOOPS.state;g.p.x=400;g.p.z=0;g.cpu.x=250;Object.assign(g.ball,{owner:0,x:879,y:234,vx:0,vy:130,shot:true,shooter:1,age:.3,scored:false,rim:false});}''')
 pg.wait_for_function('HOOPS.state.ball.rim===true');report['rim_collision']=True
 pg.evaluate('''()=>{const g=HOOPS.state;g.p.x=400;g.p.z=0;g.p.vz=0;g.cpu.x=250;Object.assign(g.ball,{owner:0,x:400,y:375,vx:0,vy:5,shot:false,shooter:2,age:2,scored:false});}''')
 pg.wait_for_function('HOOPS.state.ball.owner===1');report['rebound']=True
 pg.evaluate('HOOPS.state.shotClock=.05');pg.wait_for_function('HOOPS.state.dead>0 && HOOPS.state.next===2');report['shot_clock_turnover']=True
 pg.keyboard.press('KeyP');pg.get_by_role('button',name='MAIN MENU',exact=True).click();pg.click('#shootout')
 pg.evaluate('HOOPS.state.time=1.1')
 pg.keyboard.down('Space');pg.wait_for_timeout(590);pg.keyboard.up('Space')
 pg.wait_for_function("HOOPS.scene==='end'",timeout=7000)
 assert pg.evaluate('HOOPS.state.score[0]')==3;report['buzzer_beater_counts']=True
 pg.get_by_role('button',name='MAIN MENU',exact=True).click();pg.click('#quick');pg.evaluate('HOOPS.state.time=.15')
 pg.wait_for_function("HOOPS.scene==='end'");assert 'GAME' in pg.inner_text('#dialog-title');report['quick_game_end']=True
 b.close()
s.shutdown();report['errors']=errors;print(json.dumps(report,indent=2));assert not errors
