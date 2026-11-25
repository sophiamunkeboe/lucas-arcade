"""Lucas Hoops My Court painter checks on phone viewports: touch brush, fill, stamps, eraser, undo, save, the design on
the slanted floor in a game, reload persistence, edit/cancel, and the online fallback to Sunburst for the guest.
python3 tools/hoops-paint.py   (screens go to HOOPS_SCREEN_DIR, default /workspace/hoops-v2.2-shots)"""
import functools,http.server,json,os,socketserver,sys,threading,time
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('HOOPS_SCREEN_DIR','/workspace/hoops-v2.2-shots'));OUT.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
socketserver.TCPServer.allow_reuse_address=True
server=socketserver.ThreadingTCPServer(('127.0.0.1',8853),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
BASE='http://127.0.0.1:8853';HOOPS=BASE+'/games/lucas-hoops/'
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

def touch_stroke(page,cdp,pts,i=1):
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{**pts[0],'id':i}]})
 for q in pts[1:]:cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{**q,'id':i}]});page.wait_for_timeout(16)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(60)
def tap(page,cdp,pt):touch_stroke(page,cdp,[pt])
def canvas_pt(page,fx,fy):
 b=page.locator('#paint-canvas').bounding_box();return {'x':b['x']+fx*b['width'],'y':b['y']+fy*b['height']}
def tapsel(page,cdp,sel):b=page.locator(sel).bounding_box();tap(page,cdp,{'x':b['x']+b['width']/2,'y':b['y']+b['height']/2})
COUNT="(()=>{const d=HoopsPaint.layer.getContext('2d').getImageData(0,0,216,104).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i])n++;return n})()"
PIX="(([x,y])=>{const d=HoopsPaint.layer.getContext('2d').getImageData(x,y,1,1).data;return [d[0],d[1],d[2],d[3]]})"
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox','--headless=new'])
 for name in ['iphone13_land','android_small','iphone13_port']:
  c=browser.new_context(**PHONES[name]);pg=c.new_page();watch(pg,name);to_menu(pg);cdp=c.new_cdp_session(pg);r={}
  tapsel(pg,cdp,'#court-btn');pg.wait_for_timeout(250)
  assert pg.locator('.theme-card').count()==5 and 'TAP TO PAINT' in pg.inner_text('#theme-custom')
  tapsel(pg,cdp,'#theme-custom');pg.wait_for_selector('#paint-canvas');assert pg.evaluate('HoopsPaint.isOpen')
  # 1. Brush (size L, orange): a closed box around the left half-court by finger.
  tapsel(pg,cdp,'#size-2');tapsel(pg,cdp,'[data-color="#fc8d25"]')
  box=[(.08,.12),(.42,.12),(.42,.88),(.08,.88),(.08,.12)];pts=[]
  for (a,b),(c2,d) in zip(box,box[1:]):pts+=[canvas_pt(pg,a+(c2-a)*t/12,b+(d-b)*t/12) for t in range(13)]
  touch_stroke(pg,cdp,pts);r['brush_cells']=pg.evaluate(COUNT);assert r['brush_cells']>300,r
  # 2. Fill bucket (purple) inside the box: stays inside the orange border.
  tapsel(pg,cdp,'#tool-fill');tapsel(pg,cdp,'[data-color="#674392"]');tap(pg,cdp,canvas_pt(pg,.25,.5))
  inside=pg.evaluate(PIX+'([54,52])');outside=pg.evaluate(PIX+'([160,52])');assert inside[:3]==[0x67,0x43,0x92] and outside[3]==0,(inside,outside)
  r['fill_cells']=pg.evaluate(COUNT)
  # 3. Stamps on the right half: star (yellow), flame, sun logo, LH badge.
  tapsel(pg,cdp,'[data-color="#f2e14c"]');tapsel(pg,cdp,'#size-1')
  for k,(fx,fy) in [('star',(.58,.25)),('flame',(.58,.75)),('sun',(.78,.5)),('lh',(.92,.2))]:
   n0=pg.evaluate(COUNT);tapsel(pg,cdp,'#tool-stamp-'+k);tap(pg,cdp,canvas_pt(pg,fx,fy));assert pg.evaluate(COUNT)>n0+10,k
  # 4. Thin brush line (white, S), eraser and undo.
  tapsel(pg,cdp,'#tool-brush');tapsel(pg,cdp,'#size-0');tapsel(pg,cdp,'[data-color="#ffffff"]')
  touch_stroke(pg,cdp,[canvas_pt(pg,.5+t/40,.93) for t in range(16)])
  n1=pg.evaluate(COUNT);tapsel(pg,cdp,'#tool-eraser');tapsel(pg,cdp,'#size-2');touch_stroke(pg,cdp,[canvas_pt(pg,.2+t/60,.5) for t in range(10)])
  n2=pg.evaluate(COUNT);assert n2<n1,(n1,n2);tapsel(pg,cdp,'#paint-undo');n3=pg.evaluate(COUNT);assert n3==n1,(n1,n3)
  r['undo_ok']=True;pg.wait_for_timeout(100);shot(pg,f'paint-editor-{name}.png')
  # 5. Save -> back on the picker with My Court picked; persisted as a compact PNG.
  tapsel(pg,cdp,'#paint-save');pg.wait_for_selector('#theme-custom.picked');assert pg.evaluate('HOOPS.settings.theme')=='custom'
  r['saved_bytes']=pg.evaluate("localStorage.getItem('lucasHoops.court.v1').length");assert r['saved_bytes']<20000
  pg.wait_for_timeout(150);shot(pg,f'paint-picker-{name}.png')
  # 6. Play on it: the floor under the court lines shows the design; lines stay on top.
  pg.get_by_role('button',name='DONE').click();assert pg.inner_text('#court-label')=='MY COURT'
  pg.click('#quick');pg.click('#mode-3');pg.wait_for_function("HOOPS.scene==='play'");pg.wait_for_timeout(1400);shot(pg,f'paint-game-{name}.png')
  assert pg.evaluate('HOOPS.state&&HOOPS.scene')=='play'
  # 7. Reload: design + theme come back from localStorage. Then edit again via PAINT MY COURT, cancel keeps it.
  pg.reload();pg.wait_for_function('HOOPS.scene==="intro"||HOOPS.scene==="menu"');pg.wait_for_timeout(400)
  assert pg.evaluate('HOOPS.settings.theme')=='custom' and pg.evaluate(COUNT)==n3
  to_menu(pg);pg.click('#court-btn');pg.click('#paint-edit');pg.wait_for_selector('#paint-canvas');pg.wait_for_timeout(200)
  tapsel(pg,cdp,'#paint-clear');assert pg.evaluate(COUNT)==0;tapsel(pg,cdp,'#paint-cancel');pg.wait_for_selector('#theme-custom')
  assert pg.evaluate(COUNT)==n3;r['reload_and_cancel_ok']=True
  report['paint_'+name]=r
  if name=='iphone13_land':
   # Online: host on My Court plays on it; the guest falls back to Sunburst (painted courts are never sent).
   gc=browser.new_context(**PHONES['android_small']);guest=gc.new_page();watch(guest,'guest');to_menu(guest)
   pg.get_by_role('button',name='DONE').click();pg.click('#online');pg.click('#host-room');pg.wait_for_selector('#room-code',timeout=20000);code=pg.inner_text('#room-code').strip()
   guest.click('#online');guest.click('#join-room');guest.fill('#code-input',code);guest.click('#join-go');guest.wait_for_function("document.getElementById('dialog-title').textContent.includes('IN!')",timeout=20000)
   pg.wait_for_selector('#start-online',timeout=10000);pg.click('#start-online');guest.wait_for_function("HOOPS.scene==='play'",timeout=10000);pg.wait_for_timeout(800)
   report['online_fallback']={'host':pg.evaluate('HoopsArt.theme'),'guest':guest.evaluate('HoopsArt.theme'),'guest_has_design':guest.evaluate(COUNT)}
   assert report['online_fallback']['host']=='custom' and report['online_fallback']['guest']=='sunburst' and report['online_fallback']['guest_has_design']==0
   shot(guest,'paint-online-guest-sunburst.png');gc.close()
  c.close()
 browser.close()
server.shutdown()
errors=[e for e in errors if 'favicon' not in e]
report['errors']=errors;print(json.dumps(report,indent=1));assert not errors,errors
