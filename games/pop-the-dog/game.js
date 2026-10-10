/* Pop the Dog - game logic.
   Screens: select -> howto -> play -> (pop!) -> prize
   Debug URL flags (for testing/screenshots):
     ?debug=howto|play|mid|pop|prize|rbf|ask|trick   &dog=bella|marley
     &trick=shake|sit|stay|rollover|sitpretty  &tt=<seconds into trick>
     &freeze=<seconds>  stops the action at that moment
     ?debug=fast  makes the POP METER fill quickly                          */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const Q = new URLSearchParams(location.search);
  const DEBUG = Q.get('debug');
  const FREEZE = Q.has('freeze') ? parseFloat(Q.get('freeze')) : null;
  const sfx = LA.sfx;
  const GAME_ID = 'pop-the-dog';

  // ---- tuning ----
  const GOAL = DEBUG === 'fast' ? 60 : 400;     // points to POP (about 45-90 s of play)
  const CATCH_PTS = 10, COMBO_PTS = 5, SLOBBER_PTS = 10, GOOD_DOG_PTS = 30, ASKED_PTS = 20;
  const FLIGHT = 0.55, COOLDOWN = 0.3, MAX_FLYING = 4, REWARD_TIME = 5;
  const FONT = 'Nunito, "Arial Rounded MT Bold", ui-rounded, system-ui, sans-serif';

  const canvas = $('c'), ctx = canvas.getContext('2d');
  let W = 390, H = 844, DPR = 1, L = {}, bg = null, fg = null, cornSprites = [];

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  // ---------------- state ----------------
  const S = {
    mode: 'select', dogId: Q.get('dog') === 'marley' ? 'marley' : 'bella', imgs: {},
    time: 0, score: 0, streak: 0,
    x: 0, phase: 0, tilt: 0, wob: 0, face: 'normal', faceT: 0,
    pose: PTD.pose('stand'), trick: null, trickT: 0, trickAsked: false, reward: 0, rewardAsked: false,
    request: null, requestT: 0, nextRequest: 10, lastThrow: 0, nextWhimper: 0, begT: 0, begDir: 1, nextBark: 8,
    flying: [], floor: [], falling: [], parts: [], texts: [], tufts: [], drips: [], puddles: [], stuck: [],
    bubble: null, popState: null, popT: 0, shake: 0, handT: 0, handAim: 0, cooldown: 0, drag: null,
    nextTuft: 0, nextDrip: 1, mouth: { x: 0, y: 0 }, headTop: { x: 0, y: 0 }, bodyMat: null, headMat: null, k: 1,
    lastPrize: null,
  };
  const dog = () => PTD.DOGS[S.dogId];

  // ---------------- layout + static art ----------------
  function resize() {
    const r = $('app').getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    L.wallY = H * 0.46;
    L.feetY = H * 0.635;
    L.dogW = Math.min(W * 0.44, H * 0.22, 230);
    L.bowlW = Math.min(W * 0.64, 300); L.bowlH = L.bowlW * 0.42;
    L.bowlX = W / 2; L.rimY = H - L.bowlH * 0.95;
    L.launch = { x: L.bowlX, y: L.rimY - 6 };
    // Gorda sits on the left of the couch seat (must match the couch drawn in renderBackground)
    L.gorda = { x: W * 0.215, y: L.wallY - H * 0.035 + 4, k: Math.min(W * 0.27, 150) / 270 };
    if (!S.x) S.x = W / 2;
    bg = renderBackground(); fg = renderForeground();
  }

  function offscreen(w, h) {
    const c = document.createElement('canvas'); c.width = Math.round(w * DPR); c.height = Math.round(h * DPR);
    const x = c.getContext('2d'); x.scale(DPR, DPR); return [c, x];
  }

  function makeCornSprites() {
    for (let v = 0; v < 4; v++) {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d');
      x.translate(32, 32);
      const blobs = [];
      for (let i = 0; i < 5; i++) blobs.push([rand(-10, 10), rand(-10, 10), rand(9, 14)]);
      x.fillStyle = '#e2c98e';
      blobs.forEach(([bx, by, r]) => { x.beginPath(); x.arc(bx, by, r + 2, 0, 7); x.fill(); });
      blobs.forEach(([bx, by, r]) => {
        const g = x.createRadialGradient(bx - 3, by - 3, 1, bx, by, r);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#fff1c7');
        x.fillStyle = g; x.beginPath(); x.arc(bx, by, r, 0, 7); x.fill();
      });
      x.fillStyle = '#e7a93f';
      x.beginPath(); x.ellipse(rand(-3, 3), rand(2, 7), 4, 3, rand(0, 3), 0, 7); x.fill();
      cornSprites.push(c);
    }
  }
  function drawCorn(c, x, y, size, rot, v) {
    c.save(); c.translate(x, y); c.rotate(rot || 0);
    c.drawImage(cornSprites[(v || 0) % cornSprites.length], -size / 2, -size / 2, size, size);
    c.restore();
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  function renderBackground() {
    const [cv, c] = offscreen(W, H);
    const wy = L.wallY;
    // wall
    let g = c.createLinearGradient(0, 0, 0, wy);
    g.addColorStop(0, '#f8ead2'); g.addColorStop(1, '#ead2ab');
    c.fillStyle = g; c.fillRect(0, 0, W, wy);
    // window
    const wx = W * 0.6, wt = H * 0.165, ww = W * 0.3, wh = H * 0.15;
    g = c.createLinearGradient(0, wt, 0, wt + wh); g.addColorStop(0, '#7cc6ff'); g.addColorStop(1, '#cdeeff');
    c.fillStyle = '#fff'; roundRect(c, wx - 6, wt - 6, ww + 12, wh + 12, 6); c.fill();
    c.fillStyle = g; c.fillRect(wx, wt, ww, wh);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(wx + ww * 0.3, wt + wh * 0.35, 9, 0, 7); c.arc(wx + ww * 0.3 + 12, wt + wh * 0.32, 12, 0, 7); c.arc(wx + ww * 0.3 + 26, wt + wh * 0.36, 8, 0, 7); c.fill();
    c.fillStyle = '#7bc96f'; c.beginPath(); c.ellipse(wx + ww / 2, wt + wh, ww * 0.7, wh * 0.25, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#fff'; c.fillRect(wx + ww / 2 - 3, wt, 6, wh); c.fillRect(wx, wt + wh / 2 - 3, ww, 6);
    c.fillStyle = '#e46a8c';
    c.beginPath(); c.moveTo(wx - 14, wt - 12); c.quadraticCurveTo(wx + 14, wt + wh * 0.5, wx - 6, wt + wh + 16); c.lineTo(wx - 22, wt + wh + 16); c.lineTo(wx - 22, wt - 12); c.fill();
    c.beginPath(); c.moveTo(wx + ww + 14, wt - 12); c.quadraticCurveTo(wx + ww - 14, wt + wh * 0.5, wx + ww + 6, wt + wh + 16); c.lineTo(wx + ww + 22, wt + wh + 16); c.lineTo(wx + ww + 22, wt - 12); c.fill();
    c.fillStyle = '#9c6b3f'; c.fillRect(wx - 26, wt - 16, ww + 52, 5);
    // picture frame
    const px = W * 0.1, pt = H * 0.19, pw = W * 0.2, ph = H * 0.075;
    c.fillStyle = '#8a5a34'; c.fillRect(px - 5, pt - 5, pw + 10, ph + 10);
    c.fillStyle = '#bfe3ff'; c.fillRect(px, pt, pw, ph);
    c.fillStyle = '#6aa86a'; c.beginPath(); c.moveTo(px, pt + ph); c.lineTo(px + pw * 0.35, pt + ph * 0.35); c.lineTo(px + pw * 0.6, pt + ph * 0.7); c.lineTo(px + pw * 0.8, pt + ph * 0.45); c.lineTo(px + pw, pt + ph); c.fill();
    c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(px + pw * 0.8, pt + ph * 0.25, 5, 0, 7); c.fill();
    // floor (wood)
    g = c.createLinearGradient(0, wy, 0, H); g.addColorStop(0, '#c48a55'); g.addColorStop(1, '#9a643a');
    c.fillStyle = g; c.fillRect(0, wy, W, H - wy);
    c.save(); c.beginPath(); c.rect(0, wy, W, H - wy); c.clip();
    const vx = W / 2, vy = wy - H * 0.55;
    c.strokeStyle = 'rgba(90,50,20,.35)'; c.lineWidth = 1.5;
    for (let i = -12; i <= 12; i++) {
      const bx = W / 2 + i * W * 0.14;
      c.beginPath(); c.moveTo(vx + (bx - vx) * ((wy - vy) / (H - vy)), wy); c.lineTo(bx, H); c.stroke();
    }
    c.strokeStyle = 'rgba(90,50,20,.22)';
    for (let r = 0; r < 9; r++) {
      const y = wy + (H - wy) * Math.pow((r + 1) / 9, 1.6);
      for (let i = -12; i <= 12; i += 2) {
        const t = (y - vy) / (H - vy), off = (r % 2) ? 1 : 0;
        const x1 = vx + (W / 2 + (i + off) * W * 0.14 - vx) * t, x2 = vx + (W / 2 + (i + off + 1) * W * 0.14 - vx) * t;
        c.beginPath(); c.moveTo(x1, y); c.lineTo(x2, y); c.stroke();
      }
    }
    c.restore();
    // baseboard
    c.fillStyle = '#fffaf2'; c.fillRect(0, wy - 7, W, 9);
    c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(0, wy + 2, W, 3);
    // side table + lamp (right)
    const tx = W * 0.83, tt = wy - H * 0.045;
    c.fillStyle = '#7a4a2b'; c.fillRect(tx - 26, tt, 52, 7); c.fillRect(tx - 22, tt + 7, 5, H * 0.05); c.fillRect(tx + 17, tt + 7, 5, H * 0.05);
    c.fillStyle = '#d9c4a0'; c.fillRect(tx - 3, tt - H * 0.05, 6, H * 0.05);
    c.fillStyle = '#ffe8a8'; c.beginPath(); c.moveTo(tx - 12, tt - H * 0.09); c.lineTo(tx + 12, tt - H * 0.09); c.lineTo(tx + 22, tt - H * 0.045); c.lineTo(tx - 22, tt - H * 0.045); c.closePath(); c.fill();
    c.strokeStyle = '#d6b66a'; c.lineWidth = 2; c.stroke();
    // couch (behind the dog)
    const cx0 = W * 0.03, cx1 = W * 0.7, cTop = wy - H * 0.115, cSeat = wy - H * 0.035, cBot = wy + H * 0.03;
    c.fillStyle = '#4f6f8a'; roundRect(c, cx0 + 14, cTop, cx1 - cx0 - 28, cSeat - cTop + 10, 18); c.fill();
    c.fillStyle = '#5f84a3';
    const n = 3, cw = (cx1 - cx0 - 60) / n;
    for (let i = 0; i < n; i++) { roundRect(c, cx0 + 30 + i * cw + 2, cTop + 8, cw - 4, cSeat - cTop - 8, 12); c.fill(); }
    c.fillStyle = '#6d93b3'; roundRect(c, cx0 + 18, cSeat - 6, cx1 - cx0 - 36, cBot - cSeat - 4, 12); c.fill();
    c.fillStyle = '#4a6882'; roundRect(c, cx0, cSeat - H * 0.045, 30, cBot - cSeat + H * 0.045, 14); c.fill();
    roundRect(c, cx1 - 30, cSeat - H * 0.045, 30, cBot - cSeat + H * 0.045, 14); c.fill();
    c.fillStyle = '#3d2a1e'; c.fillRect(cx0 + 10, cBot - 4, 8, 8); c.fillRect(cx1 - 18, cBot - 4, 8, 8);
    c.fillStyle = '#ffcf5a'; c.save(); c.translate(cx0 + 52, cSeat - 16); c.rotate(-0.2); roundRect(c, -18, -16, 36, 32, 9); c.fill(); c.restore();
    // rug under the dog
    c.fillStyle = '#3fa8a0'; c.beginPath(); c.ellipse(W / 2, L.feetY + H * 0.01, W * 0.42, H * 0.05, 0, 0, 7); c.fill();
    c.strokeStyle = '#f2f0e6'; c.lineWidth = 3; c.setLineDash([6, 6]);
    c.beginPath(); c.ellipse(W / 2, L.feetY + H * 0.01, W * 0.38, H * 0.04, 0, 0, 7); c.stroke(); c.setLineDash([]);
    // pink dog toy (bone) + tennis ball
    c.save(); c.translate(W * 0.16, L.feetY + H * 0.07); c.rotate(-0.35);
    c.fillStyle = '#ff6fae'; c.strokeStyle = '#d43f86'; c.lineWidth = 2;
    c.beginPath(); c.rect(-20, -6, 40, 12);
    [[-20, -6], [-20, 6], [20, -6], [20, 6]].forEach(([bx, by]) => { c.moveTo(bx + 8, by); c.arc(bx, by, 8, 0, 7); });
    c.fill(); c.stroke(); c.restore();
    c.fillStyle = '#d7f24a'; c.beginPath(); c.arc(W * 0.86, L.feetY + H * 0.045, 9, 0, 7); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(W * 0.86 - 7, L.feetY + H * 0.045, 7, -1, 1); c.stroke();
    return cv;
  }

  function bowlPath(c) {
    const bw = L.bowlW, x = L.bowlX, y = L.rimY, bh = L.bowlH;
    c.beginPath();
    c.moveTo(x - bw / 2, y);
    c.bezierCurveTo(x - bw / 2, y + bh * 0.75, x - bw * 0.3, y + bh, x, y + bh);
    c.bezierCurveTo(x + bw * 0.3, y + bh, x + bw / 2, y + bh * 0.75, x + bw / 2, y);
    c.ellipse(x, y, bw / 2, bw * 0.11, 0, 0, Math.PI, false);
    c.closePath();
  }
  function renderForeground() {
    const [cv, c] = offscreen(W, H);
    const bw = L.bowlW, x = L.bowlX, y = L.rimY, rimRy = bw * 0.11;
    // lap blanket
    c.fillStyle = '#7d73a8'; c.beginPath(); c.ellipse(W / 2, H + H * 0.03, W * 0.62, H * 0.12, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 3;
    for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(W / 2, H + H * 0.03, W * (0.62 - i * 0.1), H * (0.12 - i * 0.02), 0, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    // recliner arms
    function arm(side) {
      c.save(); if (side > 0) { c.translate(W, 0); c.scale(-1, 1); }
      const g = c.createLinearGradient(0, H * 0.78, W * 0.2, H);
      g.addColorStop(0, '#9a6440'); g.addColorStop(1, '#5e3a22');
      c.fillStyle = g;
      c.beginPath(); c.moveTo(-10, H * 0.79); c.quadraticCurveTo(W * 0.12, H * 0.76, W * 0.19, H * 0.83);
      c.lineTo(W * 0.23, H + 10); c.lineTo(-10, H + 10); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,220,180,.35)'; c.lineWidth = 2; c.setLineDash([5, 5]);
      c.beginPath(); c.moveTo(0, H * 0.81); c.quadraticCurveTo(W * 0.11, H * 0.785, W * 0.17, H * 0.84); c.stroke(); c.setLineDash([]);
      c.restore();
    }
    arm(-1); arm(1);
    // bowl back rim
    c.strokeStyle = 'rgba(140,180,210,.9)'; c.lineWidth = 3;
    c.beginPath(); c.ellipse(x, y, bw / 2, rimRy, 0, Math.PI, Math.PI * 2); c.stroke();
    // popcorn inside (seen through glass) + heap on top
    c.save(); bowlPath(c); c.clip();
    for (let i = 0; i < 70; i++) drawCorn(c, x + rand(-bw / 2, bw / 2), y + rand(-4, L.bowlH), rand(24, 32), rand(0, 6), i);
    c.restore();
    for (let i = 0; i < 40; i++) {
      const a = rand(-1, 1), hgt = (1 - a * a) * L.bowlH * 0.32;
      drawCorn(c, x + a * bw * 0.44, y - rand(0, hgt) + 2, rand(24, 32), rand(0, 6), i);
    }
    // glass
    c.save(); bowlPath(c);
    const g = c.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0);
    g.addColorStop(0, 'rgba(190,225,255,.45)'); g.addColorStop(0.5, 'rgba(230,245,255,.12)'); g.addColorStop(1, 'rgba(170,210,245,.45)');
    c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(120,165,200,.9)'; c.lineWidth = 3; c.stroke(); c.restore();
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - bw * 0.4, y + L.bowlH * 0.2); c.quadraticCurveTo(x - bw * 0.38, y + L.bowlH * 0.6, x - bw * 0.22, y + L.bowlH * 0.8); c.stroke();
    c.strokeStyle = 'rgba(160,200,230,.95)'; c.lineWidth = 3;
    c.beginPath(); c.ellipse(x, y, bw / 2, rimRy, 0, 0, Math.PI); c.stroke();
    return cv;
  }

  function drawHand(c) {
    // the player's hand coming in from the bottom right, pinching popcorn
    const lift = S.handT > 0 ? Math.sin((S.handT / 0.2) * Math.PI) : 0;
    const hx = L.bowlX + L.bowlW * 0.3 + S.handAim * 14 * lift, hy = L.rimY - 4 - lift * 34;
    c.save();
    c.translate(hx, hy); c.rotate(-0.5 + S.handAim * 0.25 * lift);
    // sleeve
    c.fillStyle = '#4e7fd1'; roundRect(c, 18, 26, 60, 140, 24); c.fill();
    c.fillStyle = '#3d68b3'; roundRect(c, 14, 22, 68, 22, 10); c.fill();
    // palm
    c.fillStyle = '#f2c48d'; c.strokeStyle = '#c8925e'; c.lineWidth = 2.5;
    c.beginPath(); c.ellipse(46, 8, 30, 26, 0, 0, 7); c.fill(); c.stroke();
    // fingers
    [[22, -26, 8, 20], [36, -32, 8, 22], [50, -30, 8, 21], [63, -20, 7, 17]].forEach(([fx, fy, rx, ry]) => {
      c.beginPath(); c.ellipse(fx, fy, rx, ry, -0.15, 0, 7); c.fill(); c.stroke();
    });
    // thumb
    c.beginPath(); c.ellipse(12, -2, 9, 20, -0.9, 0, 7); c.fill(); c.stroke();
    if (lift < 0.3) drawCorn(c, 14, -28, 22, 0.5, 1);
    c.restore();
  }

  // ---------------- dog math ----------------
  function progress() { return clamp(S.score / GOAL, 0, 1); }
  function dogTransform() {
    const p = progress();
    let g = 1 + 0.7 * p, sxb = 1 + 0.12 * p;
    if (S.popState === 'swell') g *= 1 + 0.3 * easeOut(clamp(S.popT / 1.1, 0, 1));
    if (S.popState === 'back') { const t = clamp(S.popT / 0.6, 0, 1); g = 0.2 + 0.8 * elastic(t); sxb = 1; }
    const wobS = 1 + 0.09 * Math.sin(S.wob * 30) * S.wob / 0.4;
    const k = (L.dogW / 400) * g;
    let x = S.x;
    if (S.popState === 'swell') x += rand(-1, 1) * (2 + 7 * S.popT);
    const m = new PTD.Mat(1, 0, 0, 1, x, L.feetY)
      .mul(rot(S.tilt))
      .mul(new PTD.Mat(k * sxb * wobS, 0, 0, k / wobS, 0, 0))
      .mul(new PTD.Mat(1, 0, 0, 1, -200, -PTD.GROUND));
    S.k = k;
    return m;
  }
  function rot(r) { const c = Math.cos(r), s = Math.sin(r); return new PTD.Mat(c, s, -s, c, 0, 0); }
  const easeOut = t => 1 - (1 - t) * (1 - t);
  const elastic = t => t === 1 ? 1 : 1 - Math.pow(2, -9 * t) * Math.cos(t * 9);

  // ---------------- game flow ----------------
  function show(id) {
    ['screen-select', 'screen-howto', 'screen-prize'].forEach(s => $(s).classList.toggle('hidden', s !== id));
  }
  function setMode(m) {
    S.mode = m;
    $('hud').classList.toggle('hidden', !(m === 'play' || m === 'prize'));
    $('tricks').classList.toggle('hidden', m !== 'play');
    if (m === 'play') show(null);
  }

  function chooseDog(id) {
    S.dogId = id;
    $('howtoDog').src = previews[id] || '';
    document.querySelectorAll('.dogname').forEach(e => { e.textContent = dog().name; });
    $('howtoPower').innerHTML = '<b>' + dog().name + '</b> &ndash; ' + dog().power;
    PTD.load(id).then(imgs => { S.imgs[id] = imgs; });
    setMode('howto'); show('screen-howto');
  }

  function resetRound() {
    Object.assign(S, {
      score: 0, streak: 0, flying: [], floor: [], falling: [], stuck: [], drips: [], puddles: [], bubble: null,
      trick: null, trickT: 0, reward: 0, request: null, popState: null, popT: 0, face: 'normal', faceT: 0,
      pose: PTD.pose('stand'), x: W / 2, phase: 0, tilt: 0, lastThrow: S.time, nextWhimper: S.time + 3,
      nextRequest: S.time + 9, nextBark: S.time + rand(6, 10), roundStart: S.time,
    });
    updateHud(); updateTrickButtons();
  }
  function startPlay() {
    resetRound(); setMode('play');
    setTimeout(() => sfx.bark(dog().voice.pitch, dog().voice.gruff, 2), 250);
  }

  function updateHud() {
    $('score').textContent = S.score;
    const p = progress();
    $('meterFill').style.width = (p * 100).toFixed(1) + '%';
    $('meter').classList.toggle('full', p > 0.8);
  }

  // ---------------- throwing ----------------
  function throwCorn(tx) {
    if (S.mode !== 'play' || S.popState || S.cooldown > 0 || S.flying.length >= MAX_FLYING) return;
    S.cooldown = COOLDOWN; S.lastThrow = S.time; S.begT = 0;
    tx = clamp(tx, -W * 0.2, W * 1.2);
    S.flying.push({ x0: L.launch.x + rand(-L.bowlW * 0.15, L.bowlW * 0.15), y0: L.launch.y, tx, ty: S.mouth.y,
      t: 0, spin: rand(-8, 8), v: Math.floor(rand(0, 4)), x: 0, y: 0, size: 30 });
    if (G.state === 'sleep' && Math.random() < 0.18) gordaWake('watch', rand(3, 5));
    S.handT = 0.2; S.handAim = clamp((tx - L.launch.x) / (W * 0.5), -1, 1);
    sfx.whoosh();
  }

  function onDown(e) {
    if (S.mode !== 'play') return;
    const r = canvas.getBoundingClientRect();
    S.drag = { x: e.clientX - r.left, y: e.clientY - r.top, cx: e.clientX - r.left, cy: e.clientY - r.top, id: e.pointerId };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    e.preventDefault();
  }
  function onMove(e) {
    if (!S.drag) return;
    const r = canvas.getBoundingClientRect();
    S.drag.cx = e.clientX - r.left; S.drag.cy = e.clientY - r.top;
  }
  function onUp(e) {
    const d = S.drag; S.drag = null;
    if (!d || S.mode !== 'play') return;
    const r = canvas.getBoundingClientRect();
    const ux = e.clientX - r.left, uy = e.clientY - r.top;
    const dx = ux - d.x, dy = uy - d.y;
    if (dy < -18 && Math.hypot(dx, dy) > 24) {
      const k = (L.launch.y - S.mouth.y) / -dy;      // swipe: aim by direction
      throwCorn(L.launch.x + dx * k);
    } else {
      throwCorn(ux);                                  // tap: throw where you tapped
    }
  }

  // ---------------- tricks ----------------
  const TRICK_ICONS = {
    paw: '<svg viewBox="0 0 32 32"><g fill="#fff"><ellipse cx="16" cy="21" rx="8" ry="7"/><circle cx="7" cy="13" r="3.5"/><circle cx="12.5" cy="7.5" r="3.5"/><circle cx="19.5" cy="7.5" r="3.5"/><circle cx="25" cy="13" r="3.5"/></g></svg>',
    sit: '<svg viewBox="0 0 32 32"><path d="M9 28 V20 Q9 12 15 11 L15 6 Q15 3 18 3 L22 4 L25 7 L21 9 L21 13 Q25 17 24 28 Z" fill="#fff"/></svg>',
    hand: '<svg viewBox="0 0 32 32"><path d="M10 29 Q6 22 6 16 L6 10 Q6 8 8 8 Q10 8 10 10 L10 15 L10 5 Q10 3 12 3 Q14 3 14 5 L14 14 L14 3.5 Q14 1.5 16 1.5 Q18 1.5 18 3.5 L18 14 L18 5 Q18 3 20 3 Q22 3 22 5 L22 17 L24 13 Q25.5 11 27 12 Q28.5 13 27.5 15 L23 25 Q21 29 17 29 Z" fill="#fff"/></svg>',
    roll: '<svg viewBox="0 0 32 32"><path d="M16 4 A12 12 0 1 1 5 11" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M1 6 L6 13 L11 7 Z" fill="#fff"/></svg>',
    speak: '<svg viewBox="0 0 32 32"><path d="M4 6 Q4 3 7 3 L25 3 Q28 3 28 6 L28 18 Q28 21 25 21 L13 21 L7 28 L8 21 L7 21 Q4 21 4 18 Z" fill="#fff"/><text x="16" y="16" text-anchor="middle" font-size="9" font-weight="900" fill="#7c5cff" font-family="Arial">WOOF</text></svg>',
    pretty: '<svg viewBox="0 0 32 32"><g fill="#fff"><ellipse cx="10" cy="16" rx="5" ry="6"/><ellipse cx="22" cy="16" rx="5" ry="6"/><circle cx="7" cy="9" r="2"/><circle cx="11" cy="8" r="2"/><circle cx="21" cy="8" r="2"/><circle cx="25" cy="9" r="2"/></g><path d="M8 27 Q16 23 24 27" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
  };
  function buildTrickBar() {
    const bar = $('tricks'); bar.innerHTML = '';
    PTD.TRICK_ORDER.forEach(id => {
      const t = PTD.TRICKS[id];
      const b = document.createElement('button');
      b.className = 'trick'; b.dataset.trick = id;
      b.innerHTML = TRICK_ICONS[t.icon] + '<span>' + t.name + '</span>';
      b.addEventListener('click', () => doTrick(id));
      bar.appendChild(b);
    });
  }
  function updateTrickButtons() {
    document.querySelectorAll('.trick').forEach(b => {
      b.disabled = !!(S.trick || S.popState);
      b.classList.toggle('asked', S.request === b.dataset.trick);
    });
  }
  function doTrick(id) {
    if (S.mode !== 'play' || S.trick || S.popState) return;
    sfx.click();
    S.trickAsked = S.request === id;
    S.request = null; S.reward = 0; S.trick = id; S.trickT = 0; S.begT = 0;
    S.nextRequest = S.time + rand(12, 18);
    addText(dog().name + ', ' + PTD.TRICKS[id].name.toUpperCase() + '!', W / 2, H * 0.26, '#7c5cff', 24, 1.3, 0);
    updateTrickButtons();
  }
  function finishTrick() {
    const id = S.trick;
    S.pose = Object.assign({}, S.pose, { roll: 0, rollX: 0 });
    S.trick = null;
    S.reward = REWARD_TIME; S.rewardAsked = S.trickAsked;
    setFace('happy', 0.8);
    sfx.bark(dog().voice.pitch, dog().voice.gruff, 2);
    addText(id === 'stay' ? 'Good stay!' : 'Good girl!', W / 2, S.headTop.y - 10, '#31c46c', 28, 1.2, -30);
    addText('Toss a treat!', W / 2, S.headTop.y + 22, '#ff5a1f', 20, 1.6, -20);
    updateTrickButtons();
  }

  // ---------------- catching / missing ----------------
  function setFace(f, t) { S.face = f; S.faceT = t; }
  function addText(text, x, y, color, size, life, vy) {
    S.texts.push({ text, x, y, color, size: size || 22, life: life || 1, max: life || 1, vy: vy === undefined ? -40 : vy });
  }

  function onCatch(f) {
    let pts = CATCH_PTS;
    S.streak++;
    sfx.crunch();
    setTimeout(() => sfx.squeak(progress()), 120);
    setFace('happy', 0.45); S.wob = 0.4;
    addText('+' + CATCH_PTS, S.mouth.x + rand(-20, 20), S.mouth.y - 20, '#ff5a1f', 24, 0.9);
    if (S.streak >= 3) { pts += COMBO_PTS; addText('Combo x' + S.streak + '!', S.mouth.x, S.mouth.y - 52, '#7c5cff', 20, 1); }
    if (S.dogId === 'marley' && Math.random() < 0.3) {
      pts += SLOBBER_PTS; sfx.bonus();
      addText('SLOBBER BONUS +' + SLOBBER_PTS + '!', W / 2, S.mouth.y - 84, '#2aa3d9', 22, 1.3);
      if (S.stuck.length < 7) S.stuck.push({ x: rand(140, 260), y: rand(222, 278), r: rand(0, 6), v: f.v });
      for (let i = 0; i < 6; i++) spawnSpit();
    }
    if (S.reward > 0) {
      const extra = GOOD_DOG_PTS + (S.rewardAsked ? ASKED_PTS : 0);
      pts += extra; S.reward = 0;
      addText('GOOD DOG! +' + extra, W / 2, S.headTop.y - 20, '#31c46c', 32, 1.6, -30);
      setTimeout(() => sfx.bark(dog().voice.pitch, dog().voice.gruff, 2), 250);
      for (let i = 0; i < 8; i++) S.parts.push({ type: 'heart', x: S.mouth.x, y: S.mouth.y - 30, vx: rand(-90, 90), vy: rand(-200, -80), life: 1.4, max: 1.4, r: 0 });
    } else if (Math.random() < 0.22) {
      setTimeout(() => sfx.bark(dog().voice.pitch, dog().voice.gruff, 1), 380);
    }
    if (S.dogId === 'marley') for (let i = 0; i < 2; i++) spawnTuft();
    S.score += pts; updateHud();
    if (S.score >= GOAL) startPop();
  }

  function onMiss(f) {
    S.streak = 0;
    const floorY = Math.max(f.y + 4, L.feetY + rand(-H * 0.02, H * 0.09));
    S.falling.push({ x: f.x, y: f.y, vx: (f.tx - f.x0) / FLIGHT * 0.25, vy: -60, floorY, spin: f.spin, r: 0, v: f.v, size: f.size, bounced: false });
  }
  function landed(c) {
    sfx.boing();
    S.floor.push({ x: c.x, y: c.floorY, r: c.r, v: c.v, size: c.size });
    if (S.floor.length > 40) S.floor.shift();
    if (S.popState || S.trick) return;
    if (S.dogId === 'bella') {
      setFace('miss', 1.5);
      S.bubble = { text: pick(['...really?', '*RBF*', 'Seriously?', 'Ugh.']), t: 1.5 };
    } else {
      setFace('miss', 1.0);
      if (Math.random() < 0.5) setTimeout(() => sfx.whimper(dog().voice.pitch), 200);
    }
  }

  // ---------------- Gorda (background couch dog) ----------------
  const G = { imgs: null, state: 'sleep', t: 0, until: 6, headDY: 22, headRot: -0.12, face: 'sleep', blink: 0, nextBlink: 2,
    earL: 0, earR: 0, earT: 0, earSide: 1, nextEar: 3, nextSnore: 5, breathe: 0 };
  function gordaWake(state, dur) {
    if (state === 'watch' && G.state === 'perk') return;
    if (G.state === 'sleep') G.earT = 0.35;
    G.state = state; G.until = S.time + dur;
  }
  function updateGorda(dt) {
    G.t += dt;
    G.breathe = Math.sin(G.t * (G.state === 'sleep' ? 1.6 : 2.4));
    if (S.popState === 'boom' || S.popState === 'swell') gordaWake('perk', 4.5);
    if (G.state !== 'sleep' && S.time > G.until) {
      G.state = 'sleep'; G.nextSnore = S.time + rand(4, 8);
      if (S.mode === 'play') sfx.sigh();
    }
    if (G.state === 'sleep' && S.time > G.until + 8 && Math.random() < dt / 9) gordaWake('watch', rand(3, 5));  // just looking around
    // targets
    let tDY = 22, tRot = -0.12, face = 'sleep';
    if (G.state === 'watch') {
      tDY = 2; face = 'open';
      const f = S.flying[0] || S.falling[0];
      tRot = f ? clamp((f.x - L.gorda.x) / W * 0.9, -0.35, 0.35) : 0.12 * Math.sin(G.t * 0.8);
    } else if (G.state === 'perk') {
      tDY = -8; face = 'wide'; tRot = clamp(((S.boomAt ? S.boomAt.x : S.x) - L.gorda.x) / W * 0.6, -0.25, 0.25);
    }
    G.headDY = lerp(G.headDY, tDY, 1 - Math.exp(-6 * dt));
    G.headRot = lerp(G.headRot, tRot, 1 - Math.exp(-6 * dt));
    // blinking (awake only)
    if (face !== 'sleep' && S.time > G.nextBlink) { G.blink = 0.14; G.nextBlink = S.time + rand(2, 5); }
    if (G.blink > 0) { G.blink -= dt; if (face !== 'wide') face = 'sleep'; }
    G.face = face;
    // ear twitches
    if (S.time > G.nextEar) { G.earT = 0.35; G.earSide = Math.random() < 0.5 ? -1 : 1; G.nextEar = S.time + rand(3, 7); }
    if (G.earT > 0) G.earT -= dt;
    const tw = G.earT > 0 ? Math.sin((0.35 - G.earT) / 0.35 * Math.PI * 3) * 0.35 : 0;
    const up = G.state === 'perk' ? 0.35 : G.state === 'watch' ? 0.12 : 0;
    G.earL = up + (G.earSide < 0 ? tw : 0); G.earR = up + (G.earSide > 0 ? tw : 0);
    // snores while asleep
    if (G.state === 'sleep' && S.mode === 'play' && S.time > G.nextSnore) { sfx.snore(); G.nextSnore = S.time + rand(9, 16); G.zz = 2.2; }
    if (G.zz > 0) G.zz -= dt;
  }
  function drawGorda() {
    if (!G.imgs) return;
    const g = L.gorda;
    ctx.save(); ctx.translate(g.x, g.y); ctx.scale(g.k, g.k); ctx.translate(-150, -PTD.Gorda.BASE_Y);
    PTD.Gorda.draw(ctx, G.imgs, G);
    ctx.restore();
    if (G.state === 'sleep') {       // little floating Zzz
      const a = 0.35 + 0.35 * Math.sin(G.t * 1.5) + (G.zz > 0 ? 0.3 : 0);
      ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#4f6f8a'; ctx.lineWidth = 3;
      ctx.font = '900 ' + Math.round(14 * g.k / 0.39) + 'px ' + FONT; ctx.textAlign = 'center';
      const zx = g.x + 40 * g.k / 0.39, zy = g.y - 70 * g.k / 0.39 - (G.t * 6 % 12);
      ctx.strokeText('z', zx, zy); ctx.fillText('z', zx, zy);
      ctx.strokeText('Z', zx + 10, zy - 12); ctx.fillText('Z', zx + 10, zy - 12);
      ctx.restore();
    }
  }

  // ---------------- particles ----------------
  function bodyPoint() {
    const a = rand(0, Math.PI * 2), r = Math.sqrt(Math.random());
    const p = S.bodyMat ? S.bodyMat.apply(200 + Math.cos(a) * 110 * r, 320 + Math.sin(a) * 65 * r) : { x: S.x, y: L.feetY - 40 };
    return p;
  }
  function spawnTuft(x, y, burst) {
    const p = x === undefined ? bodyPoint() : { x, y };
    S.tufts.push({ x: p.x, y: p.y, vx: burst ? rand(-220, 220) : rand(-25, 25), vy: burst ? rand(-260, -40) : rand(-30, -8),
      r: rand(0, 6), vr: rand(-2, 2), life: rand(2, 3.2), max: 3.2, s: rand(0.7, 1.2) });
  }
  function spawnSpit() {
    S.parts.push({ type: 'drop', x: S.mouth.x + rand(-15, 15), y: S.mouth.y, vx: rand(-120, 120), vy: rand(-180, -40), life: 0.8, max: 0.8, r: 0 });
  }

  function startPop() {
    S.popScore = S.score; S.popSeconds = Math.max(1, Math.round(S.time - (S.roundStart || 0)));
    S.popState = 'swell'; S.popT = 0; S.trick = null; S.request = null; S.reward = 0; S.bubble = null;
    S.pose = PTD.pose('stand'); setFace('normal', 0);
    sfx.stretch(1.1);
    updateTrickButtons();
  }
  function boom() {
    S.popState = 'boom'; S.popT = 0; S.shake = 0.5;
    sfx.pop();
    const c = S.bodyMat ? S.bodyMat.apply(200, 250) : { x: S.x, y: L.feetY - 100 };
    S.boomAt = c;
    const colors = ['#ff3d7f', '#ffd23f', '#31c46c', '#5b8def', '#7c5cff', '#ff8a3d'];
    for (let i = 0; i < 120; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(150, 650);
      S.parts.push({ type: 'confetti', x: c.x, y: c.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 150, life: rand(1.6, 2.8), max: 2.8,
        r: rand(0, 6), vr: rand(-10, 10), color: pick(colors), w: rand(5, 9), h: rand(8, 14) });
    }
    for (let i = 0; i < 55; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(120, 520);
      S.parts.push({ type: 'corn', x: c.x, y: c.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 200, life: rand(1.4, 2.4), max: 2.4,
        r: rand(0, 6), vr: rand(-8, 8), v: i % 4, size: rand(18, 30) });
    }
    if (S.dogId === 'marley') for (let i = 0; i < 25; i++) spawnTuft(c.x, c.y, true);
    S.stuck = [];
  }
  function comeBack() {
    S.popState = 'back'; S.popT = 0;
    S.score = 0; S.streak = 0; updateHud();
    sfx.poof(); setFace('happy', 2);
    const c = { x: S.x, y: L.feetY - L.dogW * 0.25 };
    for (let i = 0; i < 16; i++) {
      const a = rand(0, Math.PI * 2);
      S.parts.push({ type: 'puff', x: c.x + Math.cos(a) * 20, y: c.y + Math.sin(a) * 20, vx: Math.cos(a) * rand(120, 260), vy: Math.sin(a) * rand(40, 120),
        life: 0.9, max: 0.9, r: 0, size: rand(18, 34) });
    }
    setTimeout(() => sfx.bark(dog().voice.pitch, dog().voice.gruff, 2), 350);
  }

  // ---------------- prize ----------------
  function showPrize(debugNoSave) {
    let prize = LA.prizes.random();
    if (S.lastPrize && prize.id === S.lastPrize) prize = LA.prizes.random();
    S.lastPrize = prize.id;
    let newBest = false;
    if (!debugNoSave) {
      const before = LA.store.stats(GAME_ID);
      LA.store.addTrophy(prize.id, GAME_ID, { dog: S.dogId });
      LA.store.recordResult(GAME_ID, { score: S.popScore || 0, seconds: S.popSeconds });
      newBest = before.pops > 0 && (S.popScore || 0) > before.best;
    }
    setMode('prize');
    $('prizeTitle').textContent = dog().name + ' POPPED!';
    $('prizeArt').innerHTML = prize.svg;
    $('prizeName').textContent = prize.name;
    $('prizeMsg').innerHTML = '&nbsp;';
    $('card').classList.remove('flipped');
    show('screen-prize');
    setTimeout(() => {
      $('card').classList.add('flipped');
      sfx.fanfare();
      const a = /^[aeiou]/i.test(prize.name) ? 'an' : 'a';
      $('prizeMsg').textContent = 'You won ' + a + ' ' + prize.name + '! It\u2019s on your Trophy Shelf.' + (newBest ? ' NEW BEST SCORE: ' + S.popScore + '!' : '');
    }, DEBUG === 'prize' ? 50 : 700);
  }

  // ---------------- update ----------------
  function update(dt) {
    S.time += dt;
    updateGorda(dt);
    const p = progress();
    S.cooldown = Math.max(0, S.cooldown - dt);
    S.handT = Math.max(0, S.handT - dt);
    S.wob = Math.max(0, S.wob - dt);
    if (S.faceT > 0) { S.faceT -= dt; if (S.faceT <= 0) S.face = 'normal'; }
    if (S.bubble) { S.bubble.t -= dt; if (S.bubble.t <= 0) S.bubble = null; }
    S.shake = Math.max(0, S.shake - dt);
    const playing = S.mode === 'play' && !S.popState;

    // movement: she wiggles more as she gets bigger (but holds still for tricks & treats)
    let targetX = S.x, targetTilt = 0;
    if (playing && !S.trick && S.reward <= 0) {
      S.phase += dt * (0.8 + 1.4 * p);
      const amp = W * 0.27 * (0.1 + 0.9 * p);
      targetX = W / 2 + amp * (0.7 * Math.sin(S.phase) + 0.3 * Math.sin(2.3 * S.phase + 1));
      targetTilt = (0.02 + 0.16 * p) * Math.sin(1.7 * S.phase + 0.5);
    } else if (S.mode !== 'play') {
      targetX = W / 2;
    }
    S.x = lerp(S.x, targetX, 1 - Math.exp(-6 * dt));
    S.tilt = lerp(S.tilt, targetTilt, 1 - Math.exp(-6 * dt));

    // pose
    if (S.trick) {
      S.trickT += dt;
      S.pose = PTD.trickPose(S.trick, S.trickT);
      const tk = PTD.TRICKS[S.trick];
      if (tk.barks) tk.barks.forEach(bt => {
        if (S.trickT >= bt && S.trickT - dt < bt) {
          sfx.bark(dog().voice.pitch, dog().voice.gruff, 1);
          setFace('bark', 0.28);
          S.bubble = { text: S.dogId === 'marley' ? 'WOOF!' : 'YIP! YIP!', t: 0.45 };
        }
      });
      if (S.trick === 'stay' && Math.floor(S.trickT - 0.6) !== Math.floor(S.trickT - 0.6 - dt) && S.trickT > 0.6 && S.trickT < 3.6) sfx.click();
      if (S.trickT >= PTD.TRICKS[S.trick].dur) finishTrick();
    } else {
      let target = 'stand';
      if (S.reward > 0) target = 'sit';
      else if (S.begT > 0) target = 'beg';
      const tp = PTD.pose(target, target === 'beg' ? { headRot: 0.22 * S.begDir } : null);
      S.pose = PTD.lerpPose(S.pose, tp, 1 - Math.exp(-10 * dt));
    }
    if (S.reward > 0) { S.reward -= dt; if (S.reward <= 0) S.reward = 0; }
    if (S.begT > 0) S.begT -= dt;

    if (playing) {
      // begging when you stop tossing popcorn
      if (!S.trick && S.reward <= 0 && S.time - S.lastThrow > 2.5 && S.time > S.nextWhimper) {
        sfx.whimper(dog().voice.pitch);
        S.begT = 1.3; S.begDir = -S.begDir;
        S.nextWhimper = S.time + rand(1.8, 2.8);
        if (!S.bubble) S.bubble = { text: pick(['please?', '*whimper*', 'popcorn pleeease', 'hungry...']), t: 1.4 };
      }
      // random happy barks
      if (S.time > S.nextBark) {
        S.nextBark = S.time + rand(7, 13);
        if (!S.trick && S.begT <= 0) {
          sfx.bark(dog().voice.pitch, dog().voice.gruff, Math.random() < 0.5 ? 1 : 2);
          addText(S.dogId === 'marley' ? 'RUFF!' : 'Yip!', S.headTop.x + rand(-60, 60), S.headTop.y, '#6b3f1d', 22, 0.9);
        }
      }
      // she asks for a trick
      if (!S.trick && !S.request && S.reward <= 0 && S.time > S.nextRequest) {
        S.request = pick(PTD.TRICK_ORDER); S.requestT = 7;
        sfx.bark(dog().voice.pitch, dog().voice.gruff, 1);
        updateTrickButtons();
      }
      if (S.request) {
        S.requestT -= dt;
        if (S.requestT <= 0) { S.request = null; S.nextRequest = S.time + rand(10, 16); updateTrickButtons(); }
      }
      // Marley: fur + drool
      if (S.dogId === 'marley') {
        if (S.time > S.nextTuft) { spawnTuft(); S.nextTuft = S.time + rand(0.35, 0.8); }
        if (S.time > S.nextDrip && S.headMat) {
          const d = S.headMat.apply(PTD.DROOL.x, PTD.DROOL.y);
          S.drips.push({ x: d.x, y: d.y, vy: 0, floorY: L.feetY + rand(0, H * 0.04) });
          S.nextDrip = S.time + rand(1.2, 2.6);
        }
      }
    }

    // flying popcorn
    for (let i = S.flying.length - 1; i >= 0; i--) {
      const f = S.flying[i];
      f.t += dt / FLIGHT;
      const t = Math.min(1, f.t);
      f.x = lerp(f.x0, f.tx, t);
      f.y = lerp(f.y0, f.ty, t) - 80 * 4 * t * (1 - t);
      f.size = lerp(34, 18, t);
      f.r = (f.r || 0) + f.spin * dt;
      if (f.t >= 1) {
        S.flying.splice(i, 1);
        const R = 62 * S.k * dog().catchBonus + 16;
        const dx = f.x - S.mouth.x, dy = f.y - S.mouth.y;
        if (!S.popState && (dx * dx) / (R * R) + (dy * dy) / (R * R * 1.7) <= 1) onCatch(f); else onMiss(f);
      }
    }
    for (let i = S.falling.length - 1; i >= 0; i--) {
      const c = S.falling[i];
      c.vy += 1500 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.r += c.spin * dt;
      if (c.y >= c.floorY) {
        if (!c.bounced) { c.bounced = true; c.y = c.floorY; c.vy = -c.vy * 0.3; c.vx *= 0.5; landed(c); }
        else { c.y = c.floorY; S.falling.splice(i, 1); S.floor[S.floor.length - 1] && Object.assign(S.floor[S.floor.length - 1], { x: c.x }); }
      }
    }
    for (let i = S.drips.length - 1; i >= 0; i--) {
      const d = S.drips[i]; d.vy += 900 * dt; d.y += d.vy * dt;
      if (d.y >= d.floorY) { S.drips.splice(i, 1); S.puddles.push({ x: d.x, y: d.floorY, life: 4, max: 4 }); }
    }
    for (let i = S.puddles.length - 1; i >= 0; i--) { S.puddles[i].life -= dt; if (S.puddles[i].life <= 0) S.puddles.splice(i, 1); }
    for (let i = S.tufts.length - 1; i >= 0; i--) {
      const t = S.tufts[i]; t.life -= dt;
      t.vx *= 1 - 1.2 * dt; t.vy = t.vy * (1 - 1.5 * dt) + 12 * dt;
      t.x += (t.vx + Math.sin(S.time * 3 + t.r) * 14) * dt; t.y += t.vy * dt; t.r += t.vr * dt;
      if (t.life <= 0) S.tufts.splice(i, 1);
    }
    for (let i = S.parts.length - 1; i >= 0; i--) {
      const q = S.parts[i]; q.life -= dt;
      if (q.type === 'confetti') { q.vx *= 1 - 1.6 * dt; q.vy = q.vy * (1 - 1.6 * dt) + 420 * dt; }
      else if (q.type === 'puff') { q.vx *= 1 - 3 * dt; q.vy *= 1 - 3 * dt; }
      else if (q.type === 'heart') { q.vy += 150 * dt; }
      else { q.vy += 900 * dt; }
      q.x += q.vx * dt; q.y += q.vy * dt; q.r += (q.vr || 0) * dt;
      if (q.life <= 0) S.parts.splice(i, 1);
    }
    for (let i = S.texts.length - 1; i >= 0; i--) {
      const t = S.texts[i]; t.life -= dt; t.y += t.vy * dt;
      if (t.life <= 0) S.texts.splice(i, 1);
    }

    // pop sequence
    if (S.popState) {
      S.popT += dt;
      if (S.popState === 'swell' && S.popT >= 1.1) boom();
      else if (S.popState === 'boom' && S.popT >= 1.4) comeBack();
      else if (S.popState === 'back' && S.popT >= 1.1) { S.popState = null; if (S.mode === 'play') showPrize(!!DEBUG && DEBUG !== 'fast'); }
    }
  }

  // ---------------- draw ----------------
  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (S.shake > 0) ctx.translate(rand(-1, 1) * S.shake * 22, rand(-1, 1) * S.shake * 22);
    if (bg) ctx.drawImage(bg, 0, 0, W, H);
    drawGorda();

    // drool puddles + popcorn on the floor
    S.puddles.forEach(pd => {
      ctx.globalAlpha = Math.min(1, pd.life / 1.5) * 0.7; ctx.fillStyle = '#bfe8ff';
      ctx.beginPath(); ctx.ellipse(pd.x, pd.y, 10, 4, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    });
    S.floor.forEach(c => drawCorn(ctx, c.x, c.y, c.size * 0.7, c.r, c.v));

    // dog
    const imgs = S.imgs[S.dogId];
    const m = dogTransform();
    const visible = imgs && S.popState !== 'boom';
    if (visible) {
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,.16)';
      ctx.beginPath(); ctx.ellipse(S.x, L.feetY - 2, L.dogW * 0.5 * (S.k / (L.dogW / 400)), 10, 0, 0, 7); ctx.fill();
    }
    if (visible) {
      ctx.save();
      ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
      const info = PTD.draw(ctx, S.dogId, imgs, S.pose, {
        face: S.popState === 'swell' ? 'normal' : S.face, time: S.time,
        headExtra: S.stuck.length ? (c) => S.stuck.forEach(s => {
          c.save(); c.translate(s.x, s.y); c.rotate(s.r); c.drawImage(cornSprites[s.v % 4], -22, -22, 44, 44); c.restore();
          c.fillStyle = 'rgba(200,235,255,.8)'; c.beginPath(); c.ellipse(s.x + 8, s.y + 14, 4, 9, 0, 0, 7); c.fill();
        }) : null,
      });
      ctx.restore();
      S.headMat = m.mul(info.head); S.bodyMat = m.mul(info.body);
      S.mouth = S.headMat.apply(PTD.MOUTH.x, PTD.MOUTH.y);
      S.headTop = S.headMat.apply(200, 55);
    }

    // stay countdown / reward ring / bubbles
    if (S.trick === 'stay' && S.trickT > 0.6) {
      const n = 3 - Math.floor(S.trickT - 0.6);
      if (n >= 1) bigText(String(n), S.headTop.x, S.headTop.y - 30, 56, '#7c5cff', 1 + 0.3 * (1 - ((S.trickT - 0.6) % 1)));
      bigText('STAY...', S.headTop.x, S.headTop.y - 78, 22, '#6b3f1d', 1);
    }
    if (S.reward > 0 && S.mode === 'play') {
      ctx.save(); ctx.strokeStyle = '#31c46c'; ctx.lineWidth = 4; ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -S.time * 40; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(S.time * 8);
      ctx.beginPath(); ctx.arc(S.mouth.x, S.mouth.y, 62 * S.k * dog().catchBonus + 16, 0, 7); ctx.stroke(); ctx.restore();
    }
    if (S.request && S.mode === 'play') bubble('Can I do ' + PTD.TRICKS[S.request].name + '?', true);
    else if (S.bubble && visible) bubble(S.bubble.text, false);

    // fur, drool, flying popcorn
    S.drips.forEach(d => { ctx.fillStyle = '#cfefff'; ctx.strokeStyle = '#8fc7e6'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(d.x, d.y, 3.5, 5.5, 0, 0, 7); ctx.fill(); ctx.stroke(); });
    S.tufts.forEach(drawTuft);
    S.falling.forEach(c => drawCorn(ctx, c.x, c.y, c.size * 0.8, c.r, c.v));

    // foreground: recliner, lap, bowl, hand
    if (fg) ctx.drawImage(fg, 0, 0, W, H);
    S.flying.forEach(f => drawCorn(ctx, f.x, f.y, f.size, f.r, f.v));
    if (S.mode === 'play' || S.mode === 'prize') drawHand(ctx);

    // aiming line while swiping
    if (S.drag && S.mode === 'play') {
      const dx = S.drag.cx - S.drag.x, dy = S.drag.cy - S.drag.y;
      if (dy < -18) {
        const len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
        ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 5; ctx.setLineDash([2, 12]); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(L.launch.x, L.launch.y); ctx.lineTo(L.launch.x + ux * 220, L.launch.y + uy * 220); ctx.stroke(); ctx.restore();
      }
    }

    // particles & text
    S.parts.forEach(drawPart);
    if (S.popState === 'boom' && S.popT < 1.0) {
      const t = S.popT, c = S.boomAt;
      drawStar(c.x, c.y, (70 + 90 * easeOut(Math.min(1, t * 4))) * (1 - Math.max(0, t - 0.7) * 3), t);
    }
    S.texts.forEach(t => {
      ctx.globalAlpha = Math.min(1, t.life / (t.max * 0.4));
      bigText(t.text, t.x, t.y, t.size, t.color, 1);
      ctx.globalAlpha = 1;
    });

    // first-play hint
    if (S.mode === 'play' && S.score === 0 && S.flying.length === 0 && S.floor.length === 0 && !S.trick && !S.popState) {
      const a = 0.6 + 0.4 * Math.sin(S.time * 5);
      ctx.globalAlpha = a;
      bigText('Swipe up to toss popcorn!', W / 2, L.rimY - L.bowlH * 0.55, 20, '#ffffff', 1, '#6b3f1d');
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function bigText(text, x, y, size, color, scale, stroke) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale || 1, scale || 1);
    ctx.font = '900 ' + size + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(4, size / 5); ctx.strokeStyle = stroke || '#fff';
    ctx.strokeText(text, 0, 0); ctx.fillStyle = color; ctx.fillText(text, 0, 0); ctx.restore();
  }
  function bubble(text, isAsk) {
    ctx.save();
    ctx.font = '800 17px ' + FONT;
    const w = ctx.measureText(text).width + 26, h = 36;
    let x = clamp(S.headTop.x + 30, w / 2 + 6, W - w / 2 - 6), y = Math.max(S.headTop.y - 40, 168);
    ctx.fillStyle = isAsk ? '#ffb800' : '#fff'; ctx.strokeStyle = isAsk ? '#b37f00' : '#6b3f1d'; ctx.lineWidth = 3;
    roundRect(ctx, x - w / 2, y - h / 2, w, h, 16); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 18, y + h / 2 - 2); ctx.lineTo(x - 30, y + h / 2 + 14); ctx.lineTo(x - 4, y + h / 2 - 2); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillRect(x - 19, y + h / 2 - 5, 17, 5);
    ctx.fillStyle = isAsk ? '#fff' : '#3a2a1a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 1);
    ctx.restore();
  }
  function drawTuft(t) {
    ctx.save(); ctx.globalAlpha = Math.min(1, t.life / 1.2); ctx.translate(t.x, t.y); ctx.rotate(t.r); ctx.scale(t.s, t.s);
    ctx.strokeStyle = '#f3e3c6'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(0, -6, 6, 0); ctx.moveTo(-4, 3); ctx.quadraticCurveTo(1, -2, 7, 4);
    ctx.moveTo(-7, -3); ctx.quadraticCurveTo(-2, -8, 3, -4); ctx.stroke();
    ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-3, 1); ctx.quadraticCurveTo(1, -3, 5, 1); ctx.stroke();
    ctx.restore();
  }
  function drawPart(q) {
    const a = Math.min(1, q.life / (q.max * 0.35));
    ctx.save(); ctx.globalAlpha = a; ctx.translate(q.x, q.y); ctx.rotate(q.r);
    if (q.type === 'confetti') { ctx.fillStyle = q.color; ctx.scale(1, Math.abs(Math.cos(q.life * 6)) + 0.2); ctx.fillRect(-q.w / 2, -q.h / 2, q.w, q.h); }
    else if (q.type === 'corn') { ctx.restore(); ctx.save(); ctx.globalAlpha = a; drawCorn(ctx, q.x, q.y, q.size, q.r, q.v); }
    else if (q.type === 'puff') { ctx.globalAlpha = a * 0.75; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, q.size * (1.4 - q.life / q.max * 0.6), 0, 7); ctx.fill(); }
    else if (q.type === 'heart') { ctx.fillStyle = '#ff3d7f'; ctx.beginPath(); ctx.moveTo(0, 6); ctx.bezierCurveTo(-14, -4, -6, -14, 0, -6); ctx.bezierCurveTo(6, -14, 14, -4, 0, 6); ctx.fill(); }
    else if (q.type === 'drop') { ctx.fillStyle = '#cfefff'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  function drawStar(x, y, r, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.8);
    ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#ff5a1f'; ctx.lineWidth = 6;
    ctx.beginPath();
    for (let i = 0; i < 24; i++) { const rr = i % 2 ? r * 0.62 : r; const a = i / 24 * Math.PI * 2; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    bigText('POP!', x, y, Math.max(10, r * 0.55), '#ff3d7f', 1, '#fff');
  }

  // ---------------- loop ----------------
  let last = 0, freezeArmed = false;
  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    if (!(freezeArmed && FREEZE !== null && S.time >= FREEZE)) update(dt);
    draw();
    if (window.__S) document.title = 't=' + S.time.toFixed(2) + ' pop=' + S.popState + ' ' + (S.popT || 0).toFixed(2);
    requestAnimationFrame(frame);
  }

  // ---------------- UI wiring ----------------
  const previews = {};
  function setMuteIcon() {
    $('muteBtn').innerHTML = sfx.isMuted()
      ? '<svg viewBox="0 0 24 24"><path d="M3 9 H7 L12 4 V20 L7 15 H3 Z" fill="#fff"/><path d="M16 9 L22 15 M22 9 L16 15" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M3 9 H7 L12 4 V20 L7 15 H3 Z" fill="#fff"/><path d="M15.5 8.5 Q18 12 15.5 15.5 M18.5 6 Q22.5 12 18.5 18" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>';
  }
  function init() {
    makeCornSprites();
    resize();
    window.addEventListener('resize', resize);
    buildTrickBar();
    setMuteIcon();
    $('muteBtn').addEventListener('click', () => { sfx.toggleMute(); setMuteIcon(); sfx.click(); });
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', () => { S.drag = null; });
    document.addEventListener('gesturestart', e => e.preventDefault());

    const cards = $('dogCards');
    ['bella', 'marley'].forEach(id => {
      const d = PTD.DOGS[id];
      const b = document.createElement('button');
      b.className = 'dog-card ' + id;
      b.innerHTML = '<img alt="' + d.name + '"><div class="name">' + d.name + '</div><div class="blurb">' + d.blurb + '</div>';
      b.addEventListener('click', () => { sfx.click(); chooseDog(id); });
      cards.appendChild(b);
      PTD.svgPreview(id).then(c => { previews[id] = c.toDataURL(); b.querySelector('img').src = previews[id];
        if (S.dogId === id) $('howtoDog').src = previews[id]; });
    });
    $('goBtn').addEventListener('click', () => { sfx.click(); startPlay(); });
    $('againBtn').addEventListener('click', () => { sfx.click(); startPlay(); });
    $('arcadeBtn').addEventListener('click', () => { location.href = '../../index.html'; });
    $('switchBtn').addEventListener('click', () => { sfx.click(); setMode('select'); show('screen-select'); });

    PTD.Gorda.load().then(imgs => { G.imgs = imgs; });
    // preload both dogs so the game can start instantly
    Promise.all(['bella', 'marley'].map(id => PTD.load(id).then(imgs => { S.imgs[id] = imgs; }))).then(debugStart);
    requestAnimationFrame(frame);
  }

  function debugStart() {
    if (!DEBUG || DEBUG === 'fast') return;
    S.time = 0; freezeArmed = true; window.__S = S;
    if (DEBUG === 'howto') { chooseDog(S.dogId); return; }
    if (DEBUG === 'prize') { document.querySelector('.card-inner').style.transition = 'none'; setMode('prize'); updateHud(); showPrize(true); return; }
    startPlay();
    if (DEBUG === 'mid' || DEBUG === 'rbf' || DEBUG === 'ask' || DEBUG === 'trick') {
      S.score = Math.round(GOAL * (DEBUG === 'mid' ? 0.55 : 0.3)); S.phase = 1.3; S.x = W * 0.42;
      for (let i = 0; i < 7; i++) S.floor.push({ x: rand(W * 0.1, W * 0.9), y: L.feetY + rand(-10, H * 0.09), r: rand(0, 6), v: i, size: 22 });
      if (S.dogId === 'marley') S.stuck.push({ x: 175, y: 262, r: 1, v: 0 }, { x: 236, y: 250, r: 2, v: 2 });
      S.lastThrow = 1e9; updateHud();
    }
    if (DEBUG === 'mid') {
      S.flying.push({ x0: L.launch.x, y0: L.launch.y, tx: W * 0.45, ty: L.feetY - L.dogW * 0.85, t: 0.55, spin: 3, v: 1, x: 0, y: 0, size: 30 });
      S.flying.push({ x0: L.launch.x, y0: L.launch.y, tx: W * 0.6, ty: L.feetY - L.dogW * 0.85, t: 0.2, spin: -3, v: 2, x: 0, y: 0, size: 30 });
      S.flying.forEach(f => { f.t -= 0.001; });
      addText('+10', W * 0.4, L.feetY - L.dogW * 1.3, '#ff5a1f', 24, 5, 0);
      addText('Combo x3!', W * 0.42, L.feetY - L.dogW * 1.55, '#7c5cff', 20, 5, 0);
      S.handT = 0.1;
    }
    if (DEBUG === 'rbf') { setFace('miss', 99); S.bubble = { text: '...really?', t: 99 }; }
    if (DEBUG === 'ask') { S.request = Q.get('trick') || 'sitpretty'; S.requestT = 99; S.nextRequest = 1e9; updateTrickButtons(); }
    if (DEBUG === 'trick') {
      const id = Q.get('trick') || 'shake';
      doTrick(id); S.trickT = parseFloat(Q.get('tt') || '0.8');
      S.texts = [];
      addText(S.dogId[0].toUpperCase() + S.dogId.slice(1) + ', ' + PTD.TRICKS[id].name.toUpperCase() + '!', W / 2, H * 0.26, '#7c5cff', 24, 99, 0);
    }
    if (DEBUG === 'pop') { S.score = GOAL; updateHud(); startPop(); }
    if (Q.get('gorda') === 'watch') { gordaWake('watch', 99); S.flying.push({ x0: L.launch.x, y0: L.launch.y, tx: W * 0.3, ty: L.feetY - L.dogW, t: 0.3, spin: 2, v: 1, x: 0, y: 0, size: 30 }); }
    // fast-forward to the freeze moment (headless browsers barely run animation frames)
    if (FREEZE !== null) while (S.time < FREEZE) { update(1 / 60); draw(); }
  }

  // only logged-in players can play (debug links skip this for testing)
  if (!DEBUG && !LA.players.current()) { location.replace('../../index.html'); return; }
  init();
})();
