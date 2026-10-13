/* Smash Room - Lucas's Arcade.
   Throw dishes (and TVs, printers, bowling balls...) at the brick wall. The 5 neon store signs hang up high:
   first hit = flicker, second hit = lights OUT. Turn off all 5 to win a prize.
   Goo gun + paintball paint stay on the wall (the fire hose washes them off) and can be saved to the Wall of Fame.
   Rage Meter, 5-in-3-seconds combos, stopwatch challenge, and silly surprises:
   rubber dishes, a duck, a disco ball party, Marley's broom, Gorda's cake patrol and Bella's RBF from the doorway.
   Test links: ?debug=play (skips login, no saving)  &shot=art|party|dogs|prize|start   */
(function () {
  'use strict';
  const GAME_ID = 'smash-room';
  const Q = new URLSearchParams(location.search);
  const DEBUG = Q.get('debug');
  const $ = id => document.getElementById(id);
  const sfx = LA.sfx;
  const app = $('app'), canvas = $('c'), ctx = canvas.getContext('2d');
  const TB = 84;                                    // tool bar height
  const LOGOS = ['aer', 'munkeboe', 'sel', 'taylor', 'thankq'];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const TOOL = {}; SR.TOOLS.forEach(t => { TOOL[t.id] = t; });

  let W = 0, H = 0, DPR = 1, wallH = 0, floorTop = 0, floorBot = 0;
  let bg = null, art = null, actx = null;
  const S = {
    mode: 'start', watch: false, watchStart: 0, tool: 'dish', color: SR.COLORS[0], score: 0, rage: 0, rageUntil: 0,
    breaks: [], broken: 0, nextDisco: 25, discoUntil: 0, logos: [], proj: [], parts: [], debris: [], cakes: [], drips: [], wets: [], swings: [],
    pinata: null, wrap: null, duck: null, duckNext: 0, bella: { until: 0, china: false }, marley: null, gorda: null,
    hose: null, goo: null, shake: 0, won: false, t: 0, imgs: {}, lastLogoHose: {},
  };

  // ---------------- sounds (Web Audio, made in code) ----------------
  function au() { const a = sfx.audio(); return a && !sfx.isMuted() && a.ctx.state === 'running' ? a : null; }
  function tn(type, f0, f1, at, dur, peak) {
    const a = au(); if (!a) return; const c = a.ctx, t = c.currentTime + (at || 0);
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.master); o.start(t); o.stop(t + dur + 0.05);
  }
  function nz(at, dur, peak, type, f, q, f1) {
    const a = au(); if (!a) return; const c = a.ctx, t = c.currentTime + (at || 0);
    const s = c.createBufferSource(); s.buffer = a.noiseBuf; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t);
    if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur); fl.Q.value = q || 1;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(a.master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  const snd = {
    shatter(big) { nz(0, big ? 0.5 : 0.3, 0.5, 'highpass', 2500, 0.7); nz(0, 0.08, 0.5, 'bandpass', 1200, 1);
      for (let i = 0; i < (big ? 9 : 6); i++) tn('sine', rnd(2500, 6500), 0, rnd(0.02, 0.35), 0.08, 0.06); },
    thud() { tn('sine', 140, 40, 0, 0.35, 0.6); nz(0, 0.15, 0.4, 'lowpass', 600, 1); },
    crack() { nz(0, 0.12, 0.6, 'bandpass', 1800, 2); nz(0.03, 0.2, 0.3, 'lowpass', 900, 1); tn('square', 90, 50, 0, 0.12, 0.15); },
    splat() { nz(0, 0.22, 0.5, 'lowpass', 1400, 2, 200); tn('sine', 300, 90, 0, 0.15, 0.2); },
    splash() { nz(0, 0.5, 0.5, 'bandpass', 1500, 0.8, 500); nz(0.05, 0.4, 0.2, 'highpass', 4000, 1); },
    buzz() { tn('sawtooth', 120, 0, 0, 0.25, 0.12); tn('sawtooth', 60, 0, 0.05, 0.2, 0.1); nz(0, 0.05, 0.2, 'highpass', 5000); },
    zap() { tn('square', 1600, 80, 0, 0.35, 0.18); nz(0, 0.3, 0.3, 'highpass', 3000, 1); tn('sawtooth', 120, 30, 0.1, 0.5, 0.12); },
    quack() { [0, 0.2].forEach(t0 => { tn('sawtooth', 620, 380, t0, 0.14, 0.18); nz(t0, 0.14, 0.15, 'bandpass', 1100, 4); }); },
    bubble() { nz(0, 0.03, 0.6, 'bandpass', rnd(1500, 3000), 3); tn('sine', rnd(500, 900), 120, 0, 0.04, 0.2); },
    squish() { nz(0, 0.18, 0.35, 'lowpass', 800, 4, 150); tn('sine', 220, 120, 0, 0.12, 0.08); },
    pew() { tn('square', 900, 200, 0, 0.1, 0.12); nz(0, 0.05, 0.2, 'highpass', 3000); },
    coin() { tn('square', 988, 0, 0, 0.08, 0.1); tn('square', 1319, 0, 0.08, 0.25, 0.1); },
    swing() { nz(0, 0.18, 0.3, 'bandpass', 600, 1, 2400); },
    combo() { [523, 659, 784, 1047, 1319].forEach((f, i) => tn('square', f, 0, i * 0.06, 0.12, 0.09)); },
    printer() { for (let i = 0; i < 6; i++) tn('square', 300 + i * 40, 0, i * 0.07, 0.06, 0.06); nz(0, 0.4, 0.4, 'lowpass', 900, 1); },
  };
  let hoseNode = null;
  function hoseSound(on) {
    const a = au();
    if (on && a && !hoseNode) {
      const c = a.ctx, s = c.createBufferSource(); s.buffer = a.noiseBuf; s.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.6;
      const g = c.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(0.25, c.currentTime + 0.1);
      s.connect(f); f.connect(g); g.connect(a.master); s.start(); hoseNode = { s, g, c };
    } else if (!on && hoseNode) {
      const h = hoseNode; hoseNode = null; h.g.gain.linearRampToValueAtTime(0, h.c.currentTime + 0.1); h.s.stop(h.c.currentTime + 0.15);
    }
  }

  // ---------------- layout ----------------
  function resize() {
    const nw = app.clientWidth, nh = app.clientHeight;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = nw * DPR; canvas.height = nh * DPR;
    const old = art;
    W = nw; H = nh; wallH = Math.round((H - TB) * 0.74); floorTop = wallH + 8; floorBot = H - TB - 4;
    bg = document.createElement('canvas'); bg.width = W * DPR; bg.height = H * DPR;
    const b = bg.getContext('2d'); b.scale(DPR, DPR); SR.room(b, W, wallH, H);
    art = document.createElement('canvas'); art.width = W * DPR; art.height = wallH * DPR;
    actx = art.getContext('2d'); actx.scale(DPR, DPR); actx.lineCap = actx.lineJoin = 'round';
    if (old) actx.drawImage(old, 0, 0, old.width, old.height, 0, 0, W, wallH);
    layoutLogos();
  }
  function layoutLogos() {
    const rows = W < 600 ? [[0, 1, 2], [3, 4]] : [[0, 1, 2, 3, 4]];
    const per = rows[0].length, lw = Math.min(170, (W - 20) / (per + 0.25));
    let y = 66;
    rows.forEach(r => {
      let h = 0;
      r.forEach((i, k) => {
        const L = S.logos[i]; if (!L) return;
        const ar = L.on ? L.on.height / L.on.width : 0.37;
        L.w = lw; L.h = lw * ar; L.x = W / 2 + (k - (r.length - 1) / 2) * (lw + 6) - lw / 2; L.y = y; h = Math.max(h, L.h);
      });
      y += h + 10;
    });
  }
  function loadImg(src) { return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }

  // ---------------- scoring ----------------
  function addScore(n) { const m = performance.now() < S.rageUntil ? 2 : 1; S.score += n * m; $('score').textContent = S.score; }
  function toast(txt) { const t = $('toast'); t.textContent = txt; t.classList.remove('hidden'); t.style.animation = 'none'; void t.offsetWidth; t.style.animation = ''; }
  function broke(n, pts) {
    const now = performance.now();
    addScore(pts);
    S.broken += n || 1;
    for (let i = 0; i < (n || 1); i++) S.breaks.push(now);
    S.breaks = S.breaks.filter(t => now - t < 3000);
    if (S.breaks.length >= 5) { S.breaks = []; addScore(50); snd.combo(); toast('COMBO! +50'); S.shake = 0.35; }
    if (now > S.rageUntil) {
      S.rage = Math.min(1, S.rage + 0.08 * (n || 1));
      if (S.rage >= 1) { S.rageUntil = now + 7000; toast('RAGE MODE! x2'); sfx.heyGrowl && sfx.heyGrowl(0.8); S.shake = 0.6; LA.music.duck(0.3, 1200); }
    }
    if (S.broken >= S.nextDisco) { S.nextDisco += 30; disco(); }
    if (Math.random() < 0.08 && performance.now() > S.bella.until) bella(false);
  }
  function disco() { S.discoUntil = performance.now() + 9000; LA.music.play('disco'); toast('DISCO PARTY!'); sfx.fanfare(); }
  function bella(china) {
    S.bella = { until: performance.now() + (china ? 4500 : 2200), china, start: performance.now() };
    if (china) { toast("MOM'S GOOD CHINA!!"); sfx.heyGrowl ? sfx.heyGrowl(1.25) : sfx.bark(1.2, false, 1); addScore(25); }
  }

  // ---------------- logos ----------------
  function hitLogo(x, y, pad) {
    pad = pad || 6;
    for (const L of S.logos) {
      if (L.hits >= 2) continue;
      if (x > L.x - pad && x < L.x + L.w + pad && y > L.y - pad && y < L.y + L.h + pad) {
        L.hits++; L.flash = 0.25;
        if (L.hits === 1) { snd.buzz(); addScore(20); }
        else { snd.zap(); addScore(50); for (let i = 0; i < 24; i++) part('spark', L.x + L.w / 2, L.y + L.h / 2, { color: pick(['#fff', '#ffd23f', '#7df9ff']) }); checkWin(); }
        return true;
      }
    }
    return false;
  }
  function checkWin() {
    if (S.won || S.logos.some(L => L.hits < 2)) return;
    S.won = true; toast('LIGHTS OUT!');
    const secs = S.watch ? Math.round((performance.now() - S.watchStart) / 100) / 10 : null;
    setTimeout(() => showPrize(secs), 1300);
  }

  // ---------------- particles + floor junk ----------------
  function part(kind, x, y, o) {
    const p = Object.assign({ kind, x, y, vx: rnd(-260, 260), vy: rnd(-380, 40), rot: rnd(0, 6), vr: rnd(-12, 12), life: 0, max: rnd(0.6, 1.2),
      size: rnd(5, 12), color: '#fff', floorY: rnd(floorTop + 6, floorBot - 6), g: 900 }, o || {});
    if (S.parts.length < 500) S.parts.push(p);
    return p;
  }
  const LANDS = { shard: 1, candy: 1, paper: 1, chunk: 1, coin: 1, tin: 1 };
  function toFloor(p) {
    if (S.debris.length > 260) S.debris.shift();
    S.debris.push({ kind: p.kind, x: p.x, y: p.floorY, color: p.color, size: p.size, rot: p.rot, sides: p.sides });
  }
  function shards(x, y, n, colors, o) { for (let i = 0; i < n; i++) part('shard', x, y, Object.assign({ color: pick(colors), sides: Math.random() < 0.5 ? 3 : 4 }, o || {})); }

  // ---------------- art layer (goo, paint, cream, cracks) ----------------
  function blob(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
  function splat(x, y, r, col, drips) {
    blob(actx, x, y, r, col);
    for (let i = 0; i < 9; i++) { const a = rnd(0, 6.3), d = rnd(r * 0.6, r * 1.5); blob(actx, x + Math.cos(a) * d, y + Math.sin(a) * d, rnd(r * 0.15, r * 0.45), col); }
    actx.fillStyle = 'rgba(255,255,255,.35)'; actx.beginPath(); actx.arc(x - r * 0.3, y - r * 0.3, r * 0.25, 0, 7); actx.fill();
    for (let i = 0; i < (drips || 0); i++) drip(x + rnd(-r, r), y + rnd(0, r * 0.6), col, rnd(r * 0.18, r * 0.32));
  }
  function drip(x, y, col, w) { if (S.drips.length < 120) S.drips.push({ x, y, col, w, len: 0, max: rnd(25, 110), sp: rnd(10, 32) }); }
  function crack(x, y, size) {
    actx.strokeStyle = 'rgba(20,8,8,.85)'; actx.lineWidth = 2.2;
    for (let i = 0; i < 7; i++) {
      let a = rnd(0, 6.3), px = x, py = y; actx.beginPath(); actx.moveTo(px, py);
      for (let k = 0; k < 4; k++) { a += rnd(-0.6, 0.6); px += Math.cos(a) * size * rnd(0.15, 0.35); py += Math.sin(a) * size * rnd(0.15, 0.35); actx.lineTo(px, py); }
      actx.stroke();
    }
    blob(actx, x, y, size * 0.18, 'rgba(25,10,10,.8)');
  }
  function gooStroke(x0, y0, x1, y1, col) {
    actx.strokeStyle = col; actx.lineWidth = 15; actx.beginPath(); actx.moveTo(x0, y0); actx.lineTo(x1, y1); actx.stroke();
    actx.strokeStyle = 'rgba(255,255,255,.35)'; actx.lineWidth = 4; actx.beginPath(); actx.moveTo(x0 - 3, y0 - 3); actx.lineTo(x1 - 3, y1 - 3); actx.stroke();
    const d = Math.hypot(x1 - x0, y1 - y0);
    if (Math.random() < d / 70) drip(x1 + rnd(-4, 4), y1 + 4, col, rnd(4, 8));
  }
  function wash(x, y, r) {
    actx.save(); actx.globalCompositeOperation = 'destination-out'; actx.fillStyle = 'rgba(0,0,0,.18)';
    actx.beginPath(); actx.arc(x, y, r, 0, 7); actx.fill(); actx.restore();
    S.drips.forEach(d => { if (Math.abs(d.x - x) < r && d.y + d.len > y - r) d.len = d.max; });
  }

  // ---------------- throwing ----------------
  function throwAt(kind, x, y, o) {
    const fromX = W / 2 + rnd(-30, 30), fromY = H - TB + 10;
    const heavy = TOOL[kind] && TOOL[kind].heavy;
    S.proj.push(Object.assign({ kind, x0: fromX, y0: fromY, x1: x, y1: y, t: 0, dur: kind === 'paint' ? 0.16 : heavy ? 0.55 : 0.42, rot: 0, vr: rnd(6, 14) * (Math.random() < 0.5 ? -1 : 1), size0: 80, size1: 42 }, o || {}));
    if (kind === 'paint') snd.pew(); else sfx.whoosh();
  }
  function onTap(x, y) {
    const tool = S.tool;
    if (S.watch && !S.watchStart) S.watchStart = performance.now();
    // the duck always wants to be tapped
    if (S.duck && Math.hypot(x - S.duck.x, y - S.duck.y) < 40 && !S.duck.fly) { S.duck.fly = true; snd.quack(); addScore(15); toast('QUACK!'); return; }
    if (tool === 'bat' || tool === 'hammer') return melee(x, y, tool === 'hammer');
    if (tool === 'pinata') { if (S.pinata && pinD(x, y) < 90) return whackPinata(S.pinata.x, S.pinata.y); }
    if (tool === 'bubble' || tool === 'hose' || tool === 'goo') return;
    if (y > wallH - 4) y = wallH - 10 - rnd(0, 30);   // everything flies at the wall
    if (tool === 'pinata') return throwAt('dish', x, y);
    if (tool === 'dish') {
      const r = Math.random();
      if (r < 0.07) return throwAt('duck', x, y);
      if (r < 0.19) return throwAt('rubber', x, y);
      if (r < 0.36) return throwAt('china', x, y);
      return throwAt('dish', x, y, { cake: Math.random() < 0.35 });
    }
    if (tool === 'balloon') return throwAt('balloon', x, y, { color: pick(['#3dc8ff', '#ff3d7f', '#ffd23f', '#7dff3a']) });
    if (tool === 'bottle') return throwAt('bottle', x, y, { color: pick(['#2fa04f', '#8a5a1c', '#3d8fd6']) });
    if (tool === 'paint') return throwAt('paint', x, y, { color: S.color, size0: 22, size1: 12 });
    throwAt(tool, x, y);
  }
  function land(p) {
    const x = p.x1, y = p.y1, k = p.kind;
    if (S.pinata && pinD(x, y) < 50 && k !== 'paint') whackPinata(x, y);
    const onLogo = k === 'duck' || k === 'rubber' ? false : hitLogo(x, y);
    if (k === 'rubber') {
      sfx.boing(); toast('RUBBER DISH! BOING!');
      S.proj.push({ kind: 'rubber', x0: x, y0: y, x1: W / 2 + rnd(-80, 80), y1: H + 60, t: 0, dur: 0.6, rot: 0, vr: 14, size0: 42, size1: 110, back: true });
      return;
    }
    if (k === 'duck') {
      snd.quack(); toast('A DUCK?! QUACK!');
      S.parts.push({ kind: 'duckfly', x, y, vx: rnd(-120, 120), vy: -260, g: -40, life: 0, max: 3, rot: 0, vr: 0, size: 44 });
      return;
    }
    if (k === 'dish' || k === 'china' || k === 'golden') {
      snd.shatter(k === 'golden');
      shards(x, y, 18, k === 'china' ? ['#fff', '#2f5bb5', '#fff', '#d4a628'] : k === 'golden' ? ['#ffd23f', '#fff3a0', '#b8860b'] : ['#fff', '#e8edf3', '#cfd6df']);
      if (k === 'golden') { for (let i = 0; i < 14; i++) part('coin', x, y, { color: '#ffd23f', size: 8 }); snd.coin(); toast('GOLDEN! +100'); }
      if (k === 'china') bella(true);
      if (p.cake || (k === 'china' && Math.random() < 0.5)) { const c = part('cakefall', x, y, { vx: rnd(-60, 60), vy: -120, vr: 0, rot: 0, size: 34 }); c.cake = true; }
      broke(1, TOOL[k === 'china' ? 'dish' : k].pts + (k === 'china' ? 15 : 0));
    } else if (k === 'bottle') {
      snd.shatter(false); shards(x, y, 16, [p.color, p.color, '#ffffffaa']); broke(1, TOOL.bottle.pts);
    } else if (k === 'pie') {
      snd.splat(); splat(x, y, 26, '#fffdf2', 4); part('tin', x, y, { color: '#c8ccd2', size: 22, vx: rnd(-40, 40), vy: 0 }); broke(1, TOOL.pie.pts);
    } else if (k === 'balloon') {
      snd.splash(); S.wets.push({ x, y, r: 46, life: 0, col: p.color });
      for (let i = 0; i < 26; i++) part('water', x, y, { color: '#bfeaffcc', size: rnd(3, 7), max: rnd(0.4, 0.9) });
      broke(1, TOOL.balloon.pts);
    } else if (k === 'tv') {
      snd.shatter(true); crack(x, y, 60); shards(x, y, 14, ['#6fd3ff', '#bfeaff']); for (let i = 0; i < 8; i++) part('chunk', x, y, { color: '#3a3a44', size: rnd(10, 18) });
      for (let i = 0; i < 18; i++) part('spark', x, y, { color: pick(['#fff', '#7df9ff']) }); broke(1, TOOL.tv.pts); S.shake = 0.3;
    } else if (k === 'printer') {
      snd.printer(); crack(x, y, 50); for (let i = 0; i < 9; i++) part('chunk', x, y, { color: pick(['#e9edf2', '#cfd6df', '#3a3a44']), size: rnd(10, 18) });
      for (let i = 0; i < 10; i++) part('paper', x, y, { color: '#fff', size: 16, g: 160, vx: rnd(-160, 160), vy: rnd(-220, -60), max: 4 });
      toast(pick(['PAPER JAM!', 'PC LOAD LETTER?!', 'OUT OF INK!'])); broke(1, TOOL.printer.pts); S.shake = 0.3;
    } else if (k === 'bowling') {
      snd.thud(); snd.crack(); crack(x, y, 80); for (let i = 0; i < 10; i++) part('chunk', x, y, { color: pick(['#8a3a2a', '#6a2a1e']), size: rnd(6, 12) });
      S.parts.push({ kind: 'ball', x, y, vx: rnd(-60, 60), vy: 0, g: 900, life: 0, max: 99, rot: 0, vr: 3, size: 46, floorY: rnd(floorTop + 20, floorBot - 20), color: '#2d1f6b' });
      broke(1, TOOL.bowling.pts); S.shake = 0.5;
    } else if (k === 'paint') {
      snd.splat(); splat(x, y, rnd(12, 18), p.color, 2); addScore(TOOL.paint.pts);
    }
    if (onLogo) S.shake = Math.max(S.shake, 0.2);
  }
  function melee(x, y, big) {
    snd.swing(); S.swings.push({ x, y, big, t: 0 });
    setTimeout(() => {
      if (S.pinata && pinD(x, y) < 90) return whackPinata(x, y);
      if (S.wrap && y > S.wrap.y) { popAt(x, y, 60); return; }
      const hit = hitLogo(x, y, 18);
      if (y < wallH) {
        snd.crack(); if (big) snd.thud(); crack(x, y, big ? 70 : 38);
        for (let i = 0; i < (big ? 12 : 6); i++) part('chunk', x, y, { color: pick(['#8a3a2a', '#6a2a1e', '#c9b8a0']), size: rnd(4, big ? 12 : 8) });
        broke(1, TOOL[big ? 'hammer' : 'bat'].pts); S.shake = big ? 0.4 : 0.15;
      } else if (!hit) { snd.thud(); }
    }, 110);
  }
  function whackPinata(x, y) {
    const P = S.pinata; if (!P) return;
    P.hits++; P.swing += 0.6 * (x < P.x ? 1 : -1); sfx.crunch();
    for (let i = 0; i < 6; i++) part('confetti', P.dx || P.x, P.dy || P.y, { color: pick(SR.COLORS), size: 5, max: 1 });
    if (P.hits >= 4) {
      sfx.pop(); toast('CANDY!'); S.pinata = null;
      for (let i = 0; i < 40; i++) part('candy', P.dx || P.x, P.dy || P.y, { color: pick(SR.COLORS), size: rnd(7, 11) });
      for (let i = 0; i < 30; i++) part('confetti', P.dx || P.x, P.dy || P.y, { color: pick(SR.COLORS), size: 6, max: 2 });
      broke(2, TOOL.pinata.pts);
      setTimeout(() => { if (S.tool === 'pinata' && !S.pinata) spawnPinata(); }, 2000);
    }
  }
  function pinD(x, y) { const P = S.pinata; return Math.hypot(x - (P.dx || P.x), y - (P.dy || P.y)); }
  function spawnPinata() { S.pinata = { x: W / 2 + rnd(-40, 40), y: wallH * 0.62, hits: 0, swing: 0.4, a: 0, av: 0 }; }
  function makeWrap() {
    const w = Math.min(W - 40, 420), h = Math.min(260, (H - TB) * 0.38), x = (W - w) / 2, y = H - TB - h - 12;
    const b = []; const step = 34;
    for (let yy = y + 20; yy < y + h - 10; yy += step * 0.86) for (let xx = x + 20 + ((Math.round((yy - y) / (step * 0.86)) % 2) * step / 2); xx < x + w - 10; xx += step) b.push({ x: xx, y: yy, popped: false });
    S.wrap = { x, y, w, h, b };
  }
  function popAt(x, y, r) {
    let n = 0;
    S.wrap.b.forEach(b => { if (!b.popped && Math.hypot(b.x - x, b.y - y) < (r || 18)) { b.popped = true; n++; } });
    if (!n) return;
    for (let i = 0; i < Math.min(n, 4); i++) setTimeout(snd.bubble, i * 30);
    addScore(n); S.rage = Math.min(1, S.rage + 0.004 * n);
    if (S.wrap.b.every(b => b.popped)) { toast('POP-A-THON! +50'); broke(1, 50); setTimeout(() => { if (S.tool === 'bubble') makeWrap(); }, 900); }
  }

  // ---------------- pointer ----------------
  function pos(e) { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  function onDown(e) {
    if (S.mode !== 'play') return;
    e.preventDefault(); canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    const [x, y] = pos(e);
    if (S.watch && !S.watchStart) S.watchStart = performance.now();
    if (S.tool === 'goo') { S.goo = { x, y }; snd.squish(); if (y < wallH) { gooStroke(x, y, x + 0.1, y, S.color); } return; }
    if (S.tool === 'hose') { S.hose = { x, y }; hoseSound(true); return; }
    if (S.tool === 'bubble' && S.wrap && y > S.wrap.y - 10) { S.popping = true; popAt(x, y); return; }
    onTap(x, y);
  }
  function onMove(e) {
    if (S.mode !== 'play') return;
    const [x, y] = pos(e);
    if (S.goo) { const yy = Math.min(y, wallH - 12); if (S.goo.y < wallH) gooStroke(S.goo.x, Math.min(S.goo.y, wallH - 12), x, yy, S.color); S.goo = { x, y }; if (Math.random() < 0.06) snd.squish(); }
    if (S.hose) { S.hose.x = x; S.hose.y = y; }
    if (S.popping) popAt(x, y);
  }
  function onUp() { S.goo = null; S.popping = false; if (S.hose) { S.hose = null; hoseSound(false); } }

  // ---------------- update ----------------
  function update(dt) {
    const now = performance.now(); S.t += dt;
    S.rage = Math.max(0, S.rage - dt * (now < S.rageUntil ? 0.14 : 0.035));
    S.shake = Math.max(0, S.shake - dt);
    if (S.discoUntil && now > S.discoUntil) { S.discoUntil = 0; LA.music.play('smash'); }
    S.logos.forEach(L => { L.flash = Math.max(0, (L.flash || 0) - dt); });
    // projectiles
    S.proj = S.proj.filter(p => { p.t += dt / p.dur; p.rot += p.vr * dt; if (p.t >= 1) { if (!p.back) land(p); return false; } return true; });
    // particles
    S.parts = S.parts.filter(p => {
      p.life += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.kind === 'paper') { p.vx *= 0.98; p.vy = Math.min(p.vy, 70); p.x += Math.sin(p.life * 4) * 40 * dt; }
      if (p.kind === 'ball') {
        if (p.y >= p.floorY) { p.y = p.floorY; p.vy = -p.vy * 0.3; if (Math.abs(p.vy) < 40) p.vy = 0; p.vx *= 0.995; p.vr = p.vx / 23; if (!p.thud) { p.thud = 1; snd.thud(); } }
        if (p.x < -60 || p.x > W + 60) return false;
        return S.parts.indexOf(p) > -1 && p.life < 20;
      }
      if (p.kind === 'cakefall') {
        if (p.y >= p.floorY) { S.cakes.push({ x: Math.max(30, Math.min(W - 30, p.x)), y: p.floorY }); return false; }
        return true;
      }
      if (LANDS[p.kind] && p.y >= p.floorY && p.vy > 0) { toFloor(p); return false; }
      if (p.kind === 'duckfly') return p.y > -60 && p.life < p.max;
      return p.life < (LANDS[p.kind] ? 6 : p.max) && p.y < H + 40;
    });
    // goo drips ooze down the wall
    S.drips = S.drips.filter(d => {
      if (d.len >= d.max) return false;
      const nl = Math.min(d.max, d.len + d.sp * dt * (1.2 - d.len / d.max)), by = Math.min(wallH - 10, d.y + nl);
      actx.strokeStyle = d.col; actx.lineWidth = d.w; actx.beginPath(); actx.moveTo(d.x, d.y + d.len); actx.lineTo(d.x, by); actx.stroke();
      d.len = nl; if (d.y + d.len >= wallH - 10) { blob(actx, d.x, wallH - 10, d.w * 0.8, d.col); return false; }
      if (d.len >= d.max) blob(actx, d.x, d.y + d.len, d.w * 0.75, d.col);
      return true;
    });
    S.wets = S.wets.filter(w => (w.life += dt) < 2.5);
    S.swings = S.swings.filter(s => (s.t += dt) < 0.3);
    // fire hose
    if (S.hose) {
      const h = S.hose;
      for (let i = 0; i < 3; i++) part('water', h.x + rnd(-10, 10), h.y + rnd(-10, 10), { color: '#bfeaffcc', size: rnd(3, 6), max: 0.5, vy: rnd(-120, 60), vx: rnd(-140, 140) });
      if (h.y < wallH) wash(h.x, h.y, 30);
      S.logos.forEach((L, i) => {
        if (L.hits < 2 && h.x > L.x && h.x < L.x + L.w && h.y > L.y && h.y < L.y + L.h && now - (S.lastLogoHose[i] || 0) > 700) { S.lastLogoHose[i] = now; hitLogo(h.x, h.y); }
      });
      if (S.pinata && pinD(h.x, h.y) < 50) S.pinata.av += (h.x < S.pinata.x ? -1 : 1) * dt * 6;
      if (S.duck && !S.duck.fly && Math.hypot(h.x - S.duck.x, h.y - S.duck.y) < 50) { S.duck.fly = true; snd.quack(); }
    }
    // pinata swings on its rope
    if (S.pinata) { const P = S.pinata; P.av += (-P.a * 9 + P.swing * 10) * dt; P.swing = 0; P.av *= 0.985; P.a += P.av * dt; }
    // duck wanders the floor now and then
    if (!S.duck && S.t > S.duckNext && S.mode === 'play') {
      if (S.duckNext) { const left = Math.random() < 0.5; S.duck = { x: left ? -40 : W + 40, y: rnd(floorTop + 30, floorBot - 30), vx: left ? 45 : -45, fly: false }; snd.quack(); }
      S.duckNext = S.t + rnd(18, 32);
    }
    if (S.duck) { const d = S.duck; if (d.fly) { d.y -= 260 * dt; d.x += d.vx * 2 * dt; } else d.x += d.vx * dt; if (d.x < -60 || d.x > W + 60 || d.y < -60) S.duck = null; }
    // Marley sweeps when the floor gets messy
    if (!S.marley && S.debris.length >= 24) { const left = Math.random() < 0.5; S.marley = { x: left ? -90 : W + 90, dir: left ? 1 : -1, y: (floorTop + floorBot) / 2 + 10, t: 0 }; toast('Marley\u2019s on broom duty!'); sfx.bark(1.0, true, 1); }
    if (S.marley) {
      const M = S.marley; M.t += dt; M.x += M.dir * 95 * dt;
      const bx = M.x + M.dir * 60 * scaleDog();
      S.debris = S.debris.filter(d => { if (Math.abs(d.x - bx) < 26) { if (Math.random() < 0.5) d.x += M.dir * 18; else return false; } return true; });
      if (Math.random() < dt * 4) nz(0, 0.12, 0.12, 'highpass', 3500, 0.7);
      if (M.x < -120 || M.x > W + 120) S.marley = null;
    }
    // Gorda goes for cake
    if (!S.gorda && S.cakes.length) { const fromLeft = S.cakes[0].x > W / 2 ? false : true; S.gorda = { x: fromLeft ? -90 : W + 90, dir: fromLeft ? 1 : -1, state: 'run', t: 0, eat: 0 }; }
    if (S.gorda) {
      const G = S.gorda; G.t += dt;
      if (G.state === 'run') {
        const c = S.cakes[0];
        if (!c) { G.state = 'leave'; }
        else {
          const dx = c.x - G.x; G.y = c.y + 6; G.dir = dx >= 0 ? 1 : -1;
          if (Math.abs(dx) <= 62 * scaleDog()) { G.state = 'eat'; G.eat = 0; } else G.x += G.dir * 170 * dt;
        }
      } else if (G.state === 'eat') {
        G.eat += dt; if (Math.random() < dt * 5) sfx.chomp();
        if (G.eat > 1.3) { S.cakes.shift(); addScore(5); G.state = S.cakes.length ? 'run' : 'leave'; if (G.state === 'leave') G.dir = G.x < W / 2 ? -1 : 1; }
      } else { G.x += G.dir * 190 * dt; if (G.x < -120 || G.x > W + 120) S.gorda = null; }
    }
    // HUD
    $('meterFill').style.width = (S.rage * 100).toFixed(1) + '%';
    $('meter').classList.toggle('rage', now < S.rageUntil); $('meter').classList.toggle('full', now < S.rageUntil);
    $('meterLabel').textContent = now < S.rageUntil ? 'RAGE MODE x2!' : 'RAGE METER';
    if (S.watch) $('watch').textContent = (S.watchStart && !S.won ? (now - S.watchStart) / 1000 : S.watchSecs || 0).toFixed(1) + 's';
  }
  const scaleDog = () => Math.max(0.42, Math.min(0.7, (floorBot - floorTop) / 200 * 0.9));

  // ---------------- draw ----------------
  function render() {
    const now = performance.now();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (S.shake > 0) ctx.translate(rnd(-1, 1) * S.shake * 14, rnd(-1, 1) * S.shake * 14);
    ctx.drawImage(bg, 0, 0, W, H);
    drawDoor(now);
    ctx.drawImage(art, 0, 0, W, wallH);
    S.wets.forEach(w => { ctx.globalAlpha = 0.45 * (1 - w.life / 2.5); SR.circle(ctx, w.x, w.y, w.r, '#2a1010'); ctx.globalAlpha = 1; });
    drawLogos(now);
    if (S.pinata) drawPinata();
    // floor junk
    S.debris.forEach(d => drawBit(d));
    S.cakes.forEach(c => { ctx.save(); ctx.translate(c.x, c.y); SR.item(ctx, 'dish', 40); ctx.translate(0, -6); SR.item(ctx, 'cake', 34); ctx.restore(); });
    if (S.wrap && S.tool === 'bubble') drawWrap();
    // dogs (back to front by y)
    if (S.gorda && S.imgs.gorda) drawRunner(S.imgs.gorda, S.gorda, S.gorda.state === 'eat' ? 'eat' : 'run');
    if (S.marley && S.imgs.marley) drawRunner(S.imgs.marley, S.marley, 'sweep');
    if (S.duck) { ctx.save(); ctx.translate(S.duck.x, S.duck.y + Math.sin(S.t * 10) * 2); ctx.scale(S.duck.vx < 0 ? -1 : 1, 1); SR.item(ctx, 'duck', 54); ctx.restore(); }
    // particles
    S.parts.forEach(p => drawBit(p));
    // projectiles
    S.proj.forEach(p => {
      const t = p.t, x = p.x0 + (p.x1 - p.x0) * t, y = p.y0 + (p.y1 - p.y0) * t - Math.sin(Math.PI * t) * (p.back ? 40 : 90);
      const sz = p.size0 + (p.size1 - p.size0) * t;
      ctx.save(); ctx.translate(x, y); ctx.rotate(p.kind === 'paint' ? 0 : p.rot);
      if (p.kind === 'paint') SR.circle(ctx, 0, 0, sz / 2, p.color, '#0006', 2); else SR.item(ctx, p.kind, sz, p);
      ctx.restore();
    });
    // bat / hammer swings
    S.swings.forEach(s => {
      ctx.save(); ctx.translate(s.x + 40, s.y + 40); ctx.rotate(-1.2 + s.t / 0.3 * 1.6); ctx.translate(-30, -40);
      SR.item(ctx, s.big ? 'hammer' : 'bat', s.big ? 110 : 100); ctx.restore();
    });
    // hose stream
    if (S.hose) {
      ctx.strokeStyle = 'rgba(190,235,255,.85)'; ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(W / 2, H - TB); ctx.quadraticCurveTo((W / 2 + S.hose.x) / 2, Math.min(S.hose.y, H - TB) - 60, S.hose.x, S.hose.y); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 4; ctx.stroke();
    }
    // disco party lights
    if (now < S.discoUntil) drawDisco(now);
    if (now < S.rageUntil) { ctx.fillStyle = 'rgba(255,0,40,' + (0.08 + 0.06 * Math.sin(now / 90)) + ')'; ctx.fillRect(-20, -20, W + 40, H + 40); }
    ctx.restore();
  }
  function drawBit(p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0);
    const s = p.size;
    switch (p.kind) {
      case 'shard': ctx.fillStyle = p.color; ctx.beginPath(); ctx.moveTo(-s, -s * 0.4); ctx.lineTo(s * 0.8, -s * 0.7); ctx.lineTo(s * 0.5, s * 0.6); if (p.sides === 4) ctx.lineTo(-s * 0.5, s * 0.5); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.stroke(); break;
      case 'chunk': ctx.fillStyle = p.color; ctx.fillRect(-s / 2, -s / 3, s, s * 0.66); break;
      case 'spark': ctx.globalAlpha = Math.max(0, 1 - p.life / p.max); SR.circle(ctx, 0, 0, 3, p.color); break;
      case 'water': ctx.globalAlpha = Math.max(0, 1 - p.life / p.max); SR.circle(ctx, 0, 0, s, p.color); break;
      case 'confetti': ctx.globalAlpha = Math.max(0, 1 - p.life / p.max); ctx.fillStyle = p.color; ctx.fillRect(-s / 2, -s / 4, s, s / 2); break;
      case 'candy': ctx.fillStyle = p.color; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.7, s * 0.45, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(-s * 0.6, 0); ctx.lineTo(-s * 1.2, -s * 0.4); ctx.lineTo(-s * 1.2, s * 0.4); ctx.moveTo(s * 0.6, 0); ctx.lineTo(s * 1.2, -s * 0.4); ctx.lineTo(s * 1.2, s * 0.4); ctx.fill(); break;
      case 'coin': SR.circle(ctx, 0, 0, s, '#ffd23f', '#b8860b', 2); break;
      case 'paper': ctx.fillStyle = '#fff'; ctx.fillRect(-s / 2, -s * 0.65, s, s * 1.3); ctx.fillStyle = '#9aa'; for (let i = 0; i < 4; i++) ctx.fillRect(-s * 0.35, -s * 0.45 + i * s * 0.25, s * 0.7, 1.5); break;
      case 'tin': ctx.fillStyle = '#c8ccd2'; ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.35, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#8f949c'; ctx.lineWidth = 2; ctx.stroke(); SR.circle(ctx, 0, -2, s * 0.4, '#fffdf2'); break;
      case 'ball': ctx.rotate(0); SR.item(ctx, 'bowling', s); break;
      case 'cakefall': ctx.rotate(-(p.rot || 0)); SR.item(ctx, 'cake', s); break;
      case 'duckfly': ctx.rotate(-(p.rot || 0)); ctx.scale(p.vx < 0 ? -1 : 1, 1); SR.item(ctx, 'duck', s); break;
    }
    ctx.restore();
  }
  function drawLogos(now) {
    S.logos.forEach((L, i) => {
      if (!L.on) return;
      let lit = L.hits === 0 ? true : L.hits === 1 ? (Math.sin(now / 37 + i * 7) + Math.sin(now / 91 + i)) > -0.4 : false;
      if (now < S.discoUntil && L.hits === 2) lit = Math.floor(now / 250 + i) % 2 === 0;      // disco brings them back for a dance!
      ctx.save();
      // hanging wires
      ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(L.x + L.w * 0.25, 0); ctx.lineTo(L.x + L.w * 0.25, L.y + 6); ctx.moveTo(L.x + L.w * 0.75, 0); ctx.lineTo(L.x + L.w * 0.75, L.y + 6); ctx.stroke();
      if (L.flash > 0) ctx.translate(rnd(-3, 3), rnd(-3, 3));
      ctx.drawImage(lit ? L.on : (L.off || L.on), L.x, L.y, L.w, L.h);
      if (L.hits === 2 && !lit) { ctx.globalAlpha = 0.25; ctx.fillStyle = '#000'; ctx.fillRect(L.x, L.y, L.w, L.h); }
      ctx.restore();
    });
  }
  function drawDoor(now) {
    const dw = Math.min(78, W * 0.17), dh = Math.min(wallH * 0.42, dw * 2.1), x = W - dw - 10, y = wallH - dh - 8;
    SR.rr(ctx, x - 6, y - 6, dw + 12, dh + 14, 6, '#4a2c1a');
    const open = now < S.bella.until;
    ctx.fillStyle = open ? '#f3d9a6' : '#1d1214'; ctx.fillRect(x, y, dw, dh + 8);
    if (open && S.imgs.bella) {
      const k = Math.min(1, (now - S.bella.start) / 250, (S.bella.until - now) / 250);
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, dw, dh + 8); ctx.clip();
      const sc = dh * 1.05 / 420; ctx.translate(x + dw / 2 - 200 * sc + (1 - k) * dw, y + dh + 8 - 410 * sc);
      ctx.scale(sc, sc); PTD.draw(ctx, 'bella', S.imgs.bella, PTD.pose('stand'), { face: 'miss', time: 0 }); ctx.restore();
      if (S.bella.china) { ctx.font = '900 13px Nunito, sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('\u{1F612} ...really?', x + dw / 2 - 18, y - 12); }
    } else {
      // closed door
      SR.rr(ctx, x, y, dw, dh + 8, 3, '#8a5a34', '#5c3a20', 2); SR.circle(ctx, x + dw * 0.8, y + dh * 0.55, 4, '#ffd23f');
    }
  }
  function drawRunner(imgs, D, mode) {
    const s = scaleDog(), t = D.t;
    const sw = mode === 'eat' ? 0 : Math.sin(t * (mode === 'sweep' ? 9 : 16)) * 0.55;
    const hop = performance.now() < S.discoUntil ? -Math.abs(Math.sin(t * 8)) * 18 : 0;
    ctx.save(); ctx.translate(D.x, D.y + hop); ctx.scale(D.dir * s, s); ctx.translate(-150, -196);
    FF.Runners.draw(ctx, imgs, { legs: [sw, -sw, -sw, sw], frontLen: 1, bodyDY: Math.abs(sw) * -4, bodyRot: 0, headRot: mode === 'eat' ? 0.35 + Math.sin(t * 14) * 0.08 : mode === 'sweep' ? 0.15 : 0, tail: Math.sin(t * 12) * 0.5, face: mode === 'eat' ? 'happy' : 'open' },
      mode === 'sweep' ? (c => {
        // broom in Marley's mouth
        const m = FF.Runners.MOUTH; c.save(); c.translate(m[0], m[1]); c.rotate(0.55 + Math.sin(t * 9) * 0.15);
        c.fillStyle = '#c98b4c'; c.fillRect(-6, -3, 110, 7); c.translate(108, 0);
        c.fillStyle = '#e8c35a'; c.beginPath(); c.moveTo(0, -10); c.lineTo(40, -26); c.lineTo(46, 24); c.lineTo(0, 10); c.closePath(); c.fill();
        c.strokeStyle = '#a8842a'; c.lineWidth = 2; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(4, -6 + i * 3); c.lineTo(44, -20 + i * 10); c.stroke(); } c.restore();
      }) : null);
    ctx.restore();
  }
  function drawPinata() {
    const P = S.pinata;
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(P.x, 0);
    const px = P.x + Math.sin(P.a) * P.y, py = Math.cos(P.a) * P.y;
    ctx.lineTo(px, py - 30); ctx.stroke();
    ctx.save(); ctx.translate(px, py); ctx.rotate(P.a * 0.6); SR.item(ctx, 'pinata', 110); ctx.restore();
    P.dx = px; P.dy = py;
  }
  function drawWrap() {
    const w = S.wrap; SR.rr(ctx, w.x, w.y, w.w, w.h, 10, 'rgba(220,245,255,.82)', '#8ccbe6', 3);
    w.b.forEach(b => {
      if (b.popped) { ctx.strokeStyle = 'rgba(120,170,200,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(b.x - 9, b.y - 3); ctx.lineTo(b.x + 9, b.y + 2); ctx.stroke(); }
      else { SR.circle(ctx, b.x, b.y, 13, 'rgba(255,255,255,.85)', '#9fd7ee', 2); SR.circle(ctx, b.x - 4, b.y - 4, 3.5, '#fff'); }
    });
    ctx.font = '900 14px Nunito, sans-serif'; ctx.fillStyle = '#2f5bb5'; ctx.textAlign = 'center'; ctx.fillText('Drag your finger to POP!', W / 2, w.y - 6);
  }
  function drawDisco(now) {
    const bx = W / 2, by = Math.min(150, 40 + (9000 - (S.discoUntil - now)) / 8);
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx, by - 30); ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const a = now / 600 + i * 0.7, x = W / 2 + Math.cos(a * 1.3 + i) * W * 0.45, y = H * 0.45 + Math.sin(a + i * 2) * H * 0.35;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 70); const col = SR.COLORS[i % 6];
      g.addColorStop(0, col + '88'); g.addColorStop(1, col + '00'); ctx.fillStyle = g; ctx.fillRect(x - 70, y - 70, 140, 140);
    }
    ctx.restore();
    const g = ctx.createRadialGradient(bx - 8, by - 8, 2, bx, by, 30); g.addColorStop(0, '#fff'); g.addColorStop(1, '#8a94a3');
    SR.circle(ctx, bx, by, 30, g);
    for (let r = -2; r <= 2; r++) for (let c = -3; c <= 3; c++) {
      if (r * r * 0.9 + c * c * 0.4 > 4.5) continue;
      ctx.fillStyle = Math.sin(now / 120 + r * 3 + c * 5) > 0.3 ? '#fff' : 'rgba(120,130,150,.6)'; ctx.fillRect(bx + c * 8 + ((now / 40) % 8) - 4, by + r * 10 - 4, 6, 8);
    }
    // the dogs dance: Bella peeks, everyone bounces
    if (now > S.bella.until) S.bella = { until: S.discoUntil, china: false, start: now };
    ctx.font = '900 22px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = SR.COLORS[Math.floor(now / 200) % 6]; ctx.fillText('\u266B DANCE PARTY \u266B', W / 2, wallH - 20);
  }

  // ---------------- loop ----------------
  let last = 0;
  function frame(ts) {
    const dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts;
    if (S.mode === 'play' || S.mode === 'prize') update(dt);
    render();
    requestAnimationFrame(frame);
  }

  // ---------------- tools bar ----------------
  function buildToolBar() {
    const bar = $('toolBar'); bar.innerHTML = '';
    SR.TOOLS.forEach(t => {
      const b = document.createElement('button'); b.className = 'tool' + (t.id === S.tool ? ' on' : ''); b.dataset.id = t.id;
      const cv = document.createElement('canvas'); cv.width = 76; cv.height = 76; const c = cv.getContext('2d'); c.translate(38, 38);
      SR.item(c, t.id === 'dish' ? 'dish' : t.id, 64, { color: S.color });
      const sp = document.createElement('span'); sp.textContent = t.name;
      b.appendChild(cv); b.appendChild(sp);
      b.addEventListener('click', () => selectTool(t.id));
      bar.appendChild(b);
    });
    const cb = $('colorBar'); cb.innerHTML = '';
    SR.COLORS.forEach(col => {
      const d = document.createElement('button'); d.className = 'dot' + (col === S.color ? ' on' : ''); d.style.background = col; d.setAttribute('aria-label', 'color');
      d.addEventListener('click', () => { S.color = col; sfx.click(); [...cb.children].forEach(x => x.classList.toggle('on', x === d)); }); cb.appendChild(d);
    });
  }
  function selectTool(id) {
    S.tool = id; sfx.click();
    [...$('toolBar').children].forEach(b => b.classList.toggle('on', b.dataset.id === id));
    $('colorBar').classList.toggle('hidden', !TOOL[id].colors);
    if (id === 'pinata' && !S.pinata) spawnPinata();
    if (id === 'bubble' && (!S.wrap || S.wrap.b.every(b => b.popped))) makeWrap();
  }

  // ---------------- screens ----------------
  function show(id) { ['screen-start', 'screen-prize', 'screen-fame'].forEach(s => $(s).classList.toggle('hidden', s !== id)); }
  function startPlay(watch) {
    S.mode = 'play'; S.watch = !!watch; S.watchStart = 0; S.won = false; S.score = 0; S.rage = 0; S.rageUntil = 0;
    S.logos.forEach(L => { L.hits = 0; }); $('score').textContent = '0';
    show(null); $('hud').classList.remove('hidden'); $('toolBar').classList.remove('hidden'); $('sideBtns').classList.remove('hidden');
    $('watch').classList.toggle('hidden', !S.watch); if (S.watch) toast('GO! Lights out, fast!');
    $('colorBar').classList.toggle('hidden', !TOOL[S.tool].colors);
    S.duckNext = S.t + 12;
  }
  function showPrize(secs) {
    const prize = (DEBUG && LA.prizes.get(Q.get('prize'))) || LA.prizes.random('smash') || pick(LA.prizes.list);
    let newBest = false, newFast = false;
    if (!DEBUG) {
      const before = LA.store.stats(GAME_ID);
      LA.store.addTrophy(prize.id, GAME_ID, { mode: S.watch ? 'stopwatch' : 'free' });
      LA.store.recordResult(GAME_ID, { score: S.score, seconds: secs || undefined });
      newBest = before.pops > 0 && S.score > before.best;
      newFast = secs && before.fastest != null && secs < before.fastest;
    }
    S.watchSecs = secs;
    S.mode = 'prize'; $('toolBar').classList.add('hidden'); $('sideBtns').classList.add('hidden'); $('colorBar').classList.add('hidden');
    $('prizeTitle').textContent = secs ? 'Lights out in ' + secs + 's!' : 'Lights out!';
    $('prizeArt').innerHTML = prize.svg; $('prizeName').textContent = prize.name; $('prizeMsg').innerHTML = '&nbsp;';
    $('card').classList.remove('flipped'); show('screen-prize');
    setTimeout(() => {
      $('card').classList.add('flipped'); sfx.fanfare();
      const a = /s$/.test(prize.name) ? 'some' : /^[aeiou]/i.test(prize.name) ? 'an' : 'a';
      $('prizeMsg').textContent = 'You won ' + a + ' ' + prize.name + '! It\u2019s on your Trophy Shelf.' + (newFast ? ' NEW FASTEST TIME!' : newBest ? ' NEW BEST SCORE: ' + S.score + '!' : '');
    }, DEBUG ? 50 : 700);
    window.__lastPrize = prize.id;
  }

  // ---------------- Wall of Fame ----------------
  function fameList() { const d = LA.store.getData(GAME_ID) || {}; return d.fame || (DEBUG ? (window.__fame = window.__fame || []) : []); }
  function saveFame(list) { const d = LA.store.getData(GAME_ID) || {}; d.fame = list; LA.store.setData(GAME_ID, d); if (DEBUG) window.__fame = list; }
  function saveArt() {
    const tw = 360, th = Math.round(tw * wallH / W);
    const c = document.createElement('canvas'); c.width = tw; c.height = th; const x = c.getContext('2d');
    x.drawImage(bg, 0, 0, bg.width, wallH * DPR, 0, 0, tw, th); x.drawImage(art, 0, 0, tw, th);
    x.save(); x.scale(tw / W, th / wallH); S.logos.forEach(L => L.on && x.drawImage(L.hits === 2 ? (L.off || L.on) : L.on, L.x, L.y, L.w, L.h)); x.restore();
    let img; try { img = c.toDataURL('image/jpeg', 0.72); } catch (e) { return; }
    const p = LA.players.current();
    const list = fameList().slice(0, 11); list.unshift({ img, at: Date.now(), by: p ? p.name : 'Guest' });
    try { saveFame(list); } catch (e) { toast('Phone is full!'); return; }
    toast('Saved to the Wall of Fame!'); sfx.win();
  }
  function showFame(from) {
    S.fameFrom = from; const g = $('fameGrid'); g.innerHTML = '';
    const list = fameList();
    if (!list.length) g.innerHTML = '<div id="fameEmpty">No art yet! Use the goo gun or paintballs, then tap "Save art".</div>';
    list.forEach((f, i) => {
      const fig = document.createElement('figure');
      fig.innerHTML = '<img alt="wall art"><figcaption><span></span><button>Remove</button></figcaption>';
      fig.querySelector('img').src = f.img; fig.querySelector('span').textContent = (f.by || '') + ' \u00b7 ' + new Date(f.at).toLocaleDateString();
      fig.querySelector('button').addEventListener('click', () => { const l = fameList().slice(); l.splice(i, 1); saveFame(l); showFame(from); });
      g.appendChild(fig);
    });
    show('screen-fame');
  }

  function init() {
    resize(); window.addEventListener('resize', resize);
    setMuteIcon(); $('muteBtn').addEventListener('click', () => { sfx.toggleMute(); setMuteIcon(); sfx.click(); });
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
    $('freeBtn').addEventListener('click', () => { sfx.click(); startPlay(false); });
    $('watchBtn').addEventListener('click', () => { sfx.click(); startPlay(true); });
    $('againBtn').addEventListener('click', () => { sfx.click(); startPlay(S.watch); });
    $('arcadeBtn').addEventListener('click', () => { location.href = '../../index.html'; });
    $('saveArtBtn').addEventListener('click', saveArt);
    $('cleanBtn').addEventListener('click', () => { actx.clearRect(0, 0, W, wallH); S.drips = []; snd.splash(); });
    $('fameBtn').addEventListener('click', () => showFame('play'));
    $('fameBtn2').addEventListener('click', () => showFame('start'));
    $('fameClose').addEventListener('click', () => { if (S.fameFrom === 'play') show(null); else show('screen-start'); });
    buildToolBar();
    const jobs = LOGOS.map((id, i) => Promise.all([loadImg('../../art/neon/' + id + '-on.webp'), loadImg('../../art/neon/' + id + '-off.webp')])
      .then(([on, off]) => { S.logos[i] = { id, on, off, hits: 0, x: 0, y: 0, w: 0, h: 0 }; }));
    jobs.push(PTD.load('bella').then(i => { S.imgs.bella = i; }));
    jobs.push(FF.Runners.load('marley').then(i => { S.imgs.marley = i; }));
    jobs.push(FF.Runners.load('gorda').then(i => { S.imgs.gorda = i; }));
    Promise.all(jobs).then(() => { layoutLogos(); window.__ready = true; debugSetup(); });
    requestAnimationFrame(frame);
  }
  function setMuteIcon() {
    $('muteBtn').innerHTML = sfx.isMuted()
      ? '<svg viewBox="0 0 24 24"><path d="M3 9 H7 L12 4 V20 L7 15 H3 Z" fill="#fff"/><path d="M16 9 L22 15 M22 9 L16 15" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M3 9 H7 L12 4 V20 L7 15 H3 Z" fill="#fff"/><path d="M15.5 8.5 Q18 12 15.5 15.5 M18.5 6 Q22.5 12 18.5 18" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>';
  }

  // test hooks (only with ?debug=...)
  function debugSetup() {
    if (!DEBUG) return;
    window.__S = S; window.__api = { onTap, selectTool, gooStroke, startPlay, showPrize, saveArt, showFame, disco, bella, land, throwAt, splat, W: () => W, H: () => H, wallH: () => wallH };
  }

  if (!DEBUG && !LA.players.current()) { location.replace('../../index.html'); return; }
  init();
})();
