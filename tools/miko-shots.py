"""Screenshots + console check for games/miko (headless Chromium at iPhone size).
Usage: python3 tools/miko-shots.py [shot ...]    (serves the repo on :8817 itself)"""
import sys, os, time, threading, http.server, socketserver, functools
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'games', 'miko', 'screens')
SHOTS = sys.argv[1:] or ['start', 'close', 'overview', 'fall', 'combo', 'wallrun', 'maxzoom', 'freeze', 'end']
NAMES = {'start': '01-start-screen', 'close': '02-miko-closeup', 'overview': '03-room-overview', 'fall': '04-object-mid-fall',
         'combo': '05-mid-run-combo', 'wallrun': '06-wall-run-curtains', 'maxzoom': '07-maximum-zoom', 'freeze': '08-human-wakes-loaf', 'end': '09-end-who-me'}
EXTRA = {'close': '&day=1', 'overview': '&day=1'}

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 8817), functools.partial(Q, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()

errors = {}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])
    for s in SHOTS:
        name, extra = s.split(':')[0], (s.split(':')[1] if ':' in s else EXTRA.get(s, ''))
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=float(os.environ.get('DSF', '2')), is_mobile=True, has_touch=True,
                            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
        pg = ctx.new_page(); errs = []
        pg.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: errs.append(f'pageerror: {e}'))
        t0 = time.time()
        pg.goto(f'http://127.0.0.1:8817/games/miko/index.html?shot={name}&q=high{extra}')
        try:
            pg.wait_for_function('window.__shotReady === true', timeout=240000)
        except Exception as e:
            errs.append(f'timeout: {e}')
        fps = pg.evaluate('window.MIKO ? MIKO.perf.log.join(",") : ""')
        fn = os.path.join(OUT, NAMES.get(name, name) + ('-' + extra.strip('&').replace('=', '') if ':' in s else '') + '.png')
        pg.screenshot(path=fn)
        errors[name] = errs
        print(f'{name}: {time.time()-t0:.1f}s fps-log=[{fps}] -> {os.path.basename(fn)}', flush=True)
        for e in errs: print('   ', e[:400])
        ctx.close()
    b.close()
srv.shutdown()
