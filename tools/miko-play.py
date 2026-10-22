"""Soak test for games/miko Zoomies: start a run, mash random steering/jump/trick for a full run, report stats + console errors."""
import os, sys, time, random, threading, http.server, socketserver, functools, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8818
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.ThreadingTCPServer(('127.0.0.1', PORT), functools.partial(Q, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
q = sys.argv[1] if len(sys.argv) > 1 else 'low'
mode = sys.argv[2] if len(sys.argv) > 2 else 'zoomies'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); errs = []
    pg.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: errs.append(f'pageerror: {e}'))
    extra = '&mode=sandbox' if mode == 'sandbox' else ''
    pg.goto(f'http://127.0.0.1:{PORT}/games/miko/index.html?q={q}&noadapt=1&fps=1{extra}')
    pg.wait_for_function('window.MIKO && MIKO.perf.log.length > 1', timeout=180000)
    if mode == 'zoomies':
        pg.click('#startBtn'); pg.wait_for_timeout(4000); pg.evaluate('MIKO.zoom.S.time = 25')
    t0 = time.time(); seen = set(); maxy = 0
    while time.time() - t0 < (75 if mode == 'zoomies' else 25):
        x = random.choice([-1, -0.7, -0.3, 0, 0, 0.3, 0.7, 1]); y = random.choice([0, 0, 0.5, -0.5])
        js = f"MIKO.input.st.x={x};MIKO.input.st.y={y};" + ("MIKO.input.st.jump=true;" if random.random() < 0.45 else "") + ("MIKO.input.st.trick=true;" if random.random() < 0.2 else "") + "MIKO.input.st.loaf=!document.getElementById('alert').classList.contains('hidden');"
        pg.evaluate(js)
        info = pg.evaluate("[MIKO.zoom.S.phase, MIKO.ctrl.mode, MIKO.ctrl.pos.y.toFixed(2), MIKO.ctrl.ground && MIKO.ctrl.ground.name || '', MIKO.zoom.S.score, MIKO.zoom.S.noise|0]")
        seen.add(info[1]); seen.add('ph:' + info[0]); seen.add('on:' + info[3]); maxy = max(maxy, float(info[2]))
        if any(abs(c) > 50 for c in pg.evaluate("[MIKO.ctrl.pos.x, MIKO.ctrl.pos.z]")): errs.append('cat escaped the house!')
        time.sleep(0.35)
    S = pg.evaluate("JSON.stringify({phase: MIKO.zoom.S.phase, score: MIKO.zoom.S.score, bestCombo: MIKO.zoom.S.bestCombo, tricks: MIKO.zoom.S.tricks, paws: MIKO.zoom.S.paws, knocked: MIKO.zoom.S.knocked, caught: MIKO.zoom.S.caught, sneaky: MIKO.zoom.S.sneaky, wipes: MIKO.zoom.S.wipes, pos: MIKO.ctrl.pos, fps: MIKO.perf.log, level: MIKO.level, info: MIKO.renderer.info.render, mem: MIKO.renderer.info.memory, prog: MIKO.renderer.info.programs.length})")
    print(S); print('seen:', sorted(seen)); print('max y:', maxy)
    pg.screenshot(path='/tmp/miko-play-end.png')
    print('errors:', len(errs)); [print('  ', e[:300]) for e in errs[:20]]
    b.close()
srv.shutdown()
