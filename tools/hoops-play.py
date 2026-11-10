"""Lucas Hoops: real input, phone/desktop, made shots, full shootout and offline regression.
Run: python3 tools/hoops-play.py [--live]
"""
import functools, http.server, json, os, socketserver, sys, threading
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'games/lucas-hoops/screens'; OUT.mkdir(exist_ok=True)
PORT=8829
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
socketserver.TCPServer.allow_reuse_address=True
server=socketserver.ThreadingTCPServer(('127.0.0.1',PORT),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
BASE='https://lucas-arcade.netlify.app' if '--live' in sys.argv else f'http://127.0.0.1:{PORT}'
errors=[];report={}
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--headless=new','--no-sandbox'])
    context=browser.new_context(viewport={'width':1280,'height':720},device_scale_factor=1)
    page=context.new_page()
    page.on('pageerror',lambda e:errors.append('pageerror: '+str(e)))
    page.on('console',lambda m: errors.append(m.text) if m.type=='error' else None)
    page.goto(BASE+'/games/lucas-hoops/index.html')
    page.evaluate('document.fonts.ready')
    page.wait_for_timeout(350)
    page.screenshot(path=str(OUT/'01-main-menu.png'))
    # Thumbnail is a real menu crop, not a separate external asset.
    if '--live' not in sys.argv:
        page.locator('.brand').screenshot(path=str(ROOT/'games/lucas-hoops/thumb.png'))
    page.click('#how');assert '90 seconds' in page.inner_text('#dialog-body');page.get_by_role('button',name="LET'S PLAY").click()
    page.click('#settings');page.click('#difficulty-setting');assert 'BALLER' in page.inner_text('#difficulty-setting');page.click('#difficulty-setting');page.click('#difficulty-setting');page.get_by_role('button',name='DONE',exact=True).click()
    page.click('#shootout')
    page.wait_for_timeout(400)
    page.keyboard.down('Space');page.wait_for_timeout(585)
    page.screenshot(path=str(OUT/'02-timing-meter.png'))
    page.keyboard.up('Space')
    page.wait_for_function('HOOPS.state.score[0] >= 3',timeout=7000)
    page.screenshot(path=str(OUT/'03-swish.png'))
    report['first_shot']=page.evaluate('({score:HOOPS.state.score,attempts:HOOPS.state.attempts,makes:HOOPS.state.makes})')
    # Play the full 60 seconds: deliberately mix perfect shots and early misses.
    for i in range(24):
        if page.evaluate("HOOPS.scene !== 'play'"): break
        page.wait_for_function("HOOPS.scene !== 'play' || (HOOPS.state.ball.owner===1 && HOOPS.state.dead<=0)",timeout=8000)
        if page.evaluate("HOOPS.scene !== 'play'"):break
        page.keyboard.down('Space');page.wait_for_timeout(590 if i%4 else 170);page.keyboard.up('Space')
        page.wait_for_timeout(1550)
    page.wait_for_function("HOOPS.scene==='end'",timeout=70000)
    assert page.inner_text('#dialog-title')=='SHOOTOUT COMPLETE'
    page.screenshot(path=str(OUT/'04-shootout-final.png'))
    report['shootout']=page.evaluate('({time:HOOPS.state.time,score:HOOPS.state.score,attempts:HOOPS.state.attempts,makes:HOOPS.state.makes})')
    assert report['shootout']['time']==0
    assert report['shootout']['makes']>0
    assert page.evaluate("JSON.parse(localStorage.getItem('lucasHoops.records.v1')).shootout")>0
    page.get_by_role('button',name='REMATCH',exact=True).click();assert page.evaluate('HOOPS.state.time')>59
    page.keyboard.press('KeyP');remaining=page.evaluate('HOOPS.state.time');page.wait_for_timeout(300);assert page.evaluate('HOOPS.state.time')==remaining
    page.get_by_role('button',name='MAIN MENU',exact=True).click()
    page.click('#quick');page.keyboard.down('ArrowRight');page.wait_for_timeout(1860);page.keyboard.up('ArrowRight')
    page.keyboard.press('Space')
    page.wait_for_function('HOOPS.state.metrics.dunks>0',timeout=3000)
    page.wait_for_function('HOOPS.state.score[0]>=2',timeout=4000)
    page.screenshot(path=str(OUT/'05-quick-game-dunk.png'))
    page.wait_for_timeout(1800)
    # CPU actually attacks and takes a shot, no scripting its state.
    page.wait_for_function('HOOPS.state.ball.shooter===2 || HOOPS.state.score[1]>0',timeout=14000)
    report['cpu_attacks']=True
    page.keyboard.press('Escape');page.get_by_role('button',name='MAIN MENU',exact=True).click()
    # Arcade tile must navigate into the game. Debug shelf is existing arcade UI mode.
    page.goto(BASE+'/index.html?debug=shelf')
    page.wait_for_timeout(500)
    report['tile_registered']=page.evaluate("LA.games.some(g=>g.id==='lucas-hoops'&&g.url==='games/lucas-hoops/index.html')")
    # Capture can be reached from arcade after the usual player screen; test the actual tile via existing debug=shelf.
    tile=page.locator('[data-game="lucas-hoops"]')
    if not tile.count():
        # Existing arcade requires a selected player. Create a local test player with its own API.
        page.evaluate("LA.players.create('Hoops Tester','bella','1234')")
        page.reload();page.wait_for_timeout(500)
    anchors=page.locator('a[href="games/lucas-hoops/index.html"]')
    if anchors.count():
        anchors.first.click()
    else:
        # Depending on arcade markup, the tile is a button.
        page.get_by_text('Lucas Hoops',exact=True).click()
    page.wait_for_url('**/games/lucas-hoops/index.html')
    report['tile_opens']=True
    # Every file in the precache must exist, and SW must control the standalone game.
    page.evaluate('navigator.serviceWorker.ready')
    page.wait_for_function('navigator.serviceWorker.controller!==null',timeout=20000)
    report['sw']=page.evaluate('caches.keys()')
    context.set_offline(True);page.reload();page.wait_for_function("typeof HOOPS!=='undefined'")
    page.click('#quick');page.wait_for_timeout(700)
    assert page.evaluate("HOOPS.scene==='play'")
    report['offline']=True;context.set_offline(False)
    # Real phone-sized touch controls with two simultaneous pointers (move + shoot).
    phone=browser.new_context(viewport={'width':844,'height':390},device_scale_factor=1,is_mobile=True,has_touch=True)
    mobile=phone.new_page();mobile.on('pageerror',lambda e:errors.append('mobile '+str(e)))
    mobile.goto(BASE+'/games/lucas-hoops/index.html');mobile.evaluate('document.fonts.ready');mobile.click('#quick')
    cdp=phone.new_cdp_session(mobile)
    rb=mobile.locator('#right').bounding_box();sb=mobile.locator('#shoot').bounding_box()
    right={'x':rb['x']+rb['width']/2,'y':rb['y']+rb['height']/2,'id':1}
    shoot={'x':sb['x']+sb['width']/2,'y':sb['y']+sb['height']/2,'id':2}
    x0=mobile.evaluate('HOOPS.state.p.x')
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[right]})
    mobile.wait_for_timeout(500)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[right,shoot]})
    mobile.wait_for_timeout(580)
    assert mobile.evaluate('HOOPS.state.p.x')>x0+80
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    mobile.wait_for_timeout(100)
    assert mobile.evaluate('HOOPS.state.attempts')>=1
    report['multi_touch']=True
    mobile.screenshot(path=str(OUT/'06-phone-landscape.png'))
    report['phone_layout']=mobile.locator('#stage').bounding_box()
    phone.close();context.close();browser.close()
server.shutdown()
report['errors']=errors
print(json.dumps(report,indent=2))
assert not errors,errors
