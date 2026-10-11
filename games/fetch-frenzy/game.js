/* Fetch Frenzy - Lucas's Arcade game #2.
   Swipe up to throw (longer + faster swipe = farther, swipe direction = aim). Your dog runs out,
   catches it (mid-air catches score big, frisbee most of all) or picks it up, and races it back.
   As the FETCH METER fills: squirrels distract your dog (tap to shoo), muddy puddles slow her down,
   and a toy thief tries to steal it (tap the thief: "Leave it!"). Fill the meter -> prize card.
   Dogs: Bella, Marley (she/her, Suns-style #4 jersey), Gorda (she/her, Marley's sister).
   Thief: Gorda, or Biscuit (the neighbor's dog) when Gorda is the one playing.

   Debug URL flags (screenshots/testing; they skip the login check):
     ?debug=select | play | air | thief | puddle | squirrel | prize | fast | thumb
     &dog=bella|marley|gorda  &place=backyard|park|lake|court  &toy=ball|frisbee|stick|burger
     &p=<0..1> start the FETCH METER part-full     &prize=<id> pick the prize card (debug=prize)     &after=<s> extra seconds after the event before freezing
     ?debug=fast  tiny FETCH METER for a quick full round (still saves the trophy for the player)
     ?debug=real  normal real-time game with the state exposed for automated tests                     */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const Q = new URLSearchParams(location.search);
  const DEBUG = Q.get('debug');
  const sfx = LA.sfx;
  const GAME_ID = 'fetch-frenzy';
  const FONT = 'Nunito, "Arial Rounded MT Bold", ui-rounded, system-ui, sans-serif';

  // ---- tuning ----
  const GOAL = DEBUG === 'fast' ? 120 : 1000;  // about 60-90 s of fetching
  const Z0 = 11;                                 // perspective: screen scale = Z0 / (Z0 + z)
  const HOME = { wx: -1.5, z: 2.6 };            // where the dog sits next to you
  const HAND = { wx: 0.9, z: 0.6, h: 1.1 };   // where throws start
  const GRAV = 18;

  const DOGS = {
    bella:  { name: 'Bella',  voice: { pitch: 1.35, gruff: 0 },    speed: 13.5, reach: 1.9, size: 0.86, focus: 1,   blurb: 'Super speedy!' },
    marley: { name: 'Marley', voice: { pitch: 0.72, gruff: 0.8 },  speed: 11.5, reach: 2.6, size: 1.0,  focus: 1,   blurb: 'Jersey #4. Huge jumps!' },
    gorda:  { name: 'Gorda',  voice: { pitch: 1.05, gruff: 0.35 }, speed: 12.5, reach: 2.1, size: 0.95, focus: 0.5, blurb: 'Zoomie queen. Squirrels? Meh.' },
  };
  const THIEVES = { gorda: { name: 'Gorda', voice: 1.05 }, biscuit: { name: 'Biscuit', voice: 0.9 } };
  const TOYS = {
    ball:    { name: 'Ball',    dist: 1,    tf: 1,    apex: 1,   air: 1.6, bounce: true },
    frisbee: { name: 'Frisbee', dist: 1.05, tf: 1.6,  apex: 0.4, air: 2.5, glide: true },
    stick:   { name: 'Stick',   dist: 0.85, tf: 0.95, apex: 0.9, air: 1.6, bonus: 5 },
    burger:  { name: 'Cheeseburger', short: 'Burger', dist: 0.8, tf: 1.1, apex: 0.9, air: 2, bonus: 5, yum: true },
  };
  const PLACE_IDS = ['backyard', 'park', 'lake', 'court'];

  const canvas = $('c'), ctx = canvas.getContext('2d');
  let W = 390, H = 844, DPR = 1, L = {}, bg = null, bgKey = '';
  let seed = 12345;
  const rnd = () => { if (!DEBUG || DEBUG === 'fast') return Math.random(); seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const rand = (a, b) => a + rnd() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const dist2 = (a, b) => Math.hypot(a.wx - b.wx, a.z - b.z);

  const pickParam = (k, list, def) => list.indexOf(Q.get(k)) >= 0 ? Q.get(k) : def;
  const S = {
    mode: 'select', dogId: pickParam('dog', Object.keys(DOGS), 'bella'), place: pickParam('place', PLACE_IDS, 'backyard'),
    toy: pickParam('toy', Object.keys(TOYS), 'ball'), imgs: {},
    time: 0, score: 0, combo: 0, throws: 0, roundStart: 0, lastThiefThrow: -9, nextSquirrel: 12,
    dog: null, item: null, thief: null, squirrel: null, puddles: [], parts: [], texts: [],
    drag: null, handT: 0, hintT: 0, frozen: false, events: {}, shake: 0, done: false, doneT: 0,
    told: {},
  };
  const dog = () => DOGS[S.dogId];
  const progress = () => clamp(S.score / GOAL, 0, 1);

  // ---------------- layout + projection ----------------
  function resize() {
    const r = $('app').getBoundingClientRect();
    const oW = W, oH = H;
    W = Math.round(r.width); H = Math.round(r.height);
    if (oW !== W || oH !== H) S.texts.concat(S.parts).forEach(t => { t.x *= W / oW; t.y *= H / oH; });   // keep floating text on screen
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    L.hor = H * 0.34; L.base = H * 1.0; L.pxm = W / 7;
    L.dogK = (W * 0.62) / 300;
    bgKey = '';
  }
  function proj(wx, z, h) {
    const s = Z0 / (Z0 + Math.max(z, -3));
    return { x: W / 2 + wx * L.pxm * s, y: L.hor + (L.base - L.hor) * s - (h || 0) * L.pxm * s, s };
  }
  const halfWidth = z => (W / 2) / (L.pxm * Z0 / (Z0 + z));     // metres visible each side at depth z
  function background() {
    const key = S.place + W + 'x' + H + '@' + DPR;
    if (bgKey !== key) { bg = FF.renderScene(S.place, W, H, DPR, L, proj); bgKey = key; }
    return bg;
  }

  // ---------------- round setup ----------------
  function newDog() {
    return { state: 'home', t: 0, wx: HOME.wx, z: HOME.z, h: 0, vh: 0, face: 1, phi: 0, mud: 0, slow: 0,
      inPuddle: null, resume: null, distractT: 0, sniffed: false, look: 0 };
  }
  function newItem() { return { state: 'hand', wx: HAND.wx, z: HAND.z, h: HAND.h, t: 0, rot: 0 }; }
  function resetRound() {
    Object.assign(S, { score: 0, combo: 0, throws: 0, roundStart: S.time, lastThiefThrow: -9, nextSquirrel: S.time + rand(9, 13),
      dog: newDog(), item: newItem(), thief: null, squirrel: null, puddles: [], parts: [], texts: [], done: false, doneT: 0,
      hintT: 0, told: {}, events: {} });
    updateHud();
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
  function addText(text, x, y, color, size, life, vy) {
    S.texts.push({ text, x, y, color, size: size || 22, life: life || 1.2, max: life || 1.2, vy: vy === undefined ? -40 : vy });
  }
  function event(name) { S.events[name] = S.time; }

  // ---------------- throwing ----------------
  function throwFromSwipe(dx, dy, dt) {
    if (S.mode !== 'play' || S.done || S.item.state !== 'hand' || S.dog.state !== 'home') return false;
    const len = Math.hypot(dx, dy);
    if (dy > -20 || len < 30) return false;
    const speed = len / Math.max(0.05, dt);
    const power = clamp(0.65 * clamp(-dy / (H * 0.42), 0, 1) + 0.35 * clamp(speed / 2200, 0, 1), 0.12, 1);
    const aim = clamp(Math.atan2(dx, -dy), -0.75, 0.75);
    throwToy(power, aim);
    return true;
  }
  function throwToy(power, aim) {
    const toy = TOYS[S.toy], it = S.item;
    const z = (4 + power * 24) * toy.dist;
    const hw = halfWidth(z) * 0.78;
    const wx = clamp(HAND.wx + Math.tan(aim) * z * 0.8, -hw, hw);
    Object.assign(it, { state: 'air', t: 0, T: (0.8 + 0.9 * power) * toy.tf, from: { wx: HAND.wx, z: HAND.z, h: HAND.h }, to: { wx, z },
      apex: (1.6 + 4.2 * power) * toy.apex + (toy.glide ? 0.9 : 0), rot: 0, bounce: 0 });
    S.throwAt = S.time; S.throws++; S.dist = z; S.airCatch = false; S.stolen = false;
    S.handT = 0.3; S.hintT = 0;
    const d = S.dog; d.state = 'wait'; d.t = 0; d.sniffed = false;
    sfx.whoosh();
    maybeThief();
  }
  // where the toy will end up (landing spot, or where a bouncing ball rolls to)
  function itemRest() {
    const it = S.item;
    if (it.state === 'air') return TOYS[S.toy].bounce ? rollEnd(it.to) : it.to;
    if (it.state === 'bounce') return it.end;
    return { wx: it.wx, z: it.z };
  }
  function rollEnd(to) {
    const dx = to.wx - HAND.wx, dz = to.z - HAND.z, d = Math.hypot(dx, dz) || 1;
    return { wx: to.wx + dx / d * 0.12 * d, z: to.z + dz / d * 0.12 * d };
  }

  // ---------------- obstacles ----------------
  function maybeThief() {
    const p = progress();
    const force = DEBUG === 'thief' && S.throws === 1;
    if (S.thief || (!force && (p < 0.2 || S.throws - S.lastThiefThrow < 2 || rnd() > 0.3 + 0.35 * p))) return;
    const to = S.item.to, side = to.wx >= 0 ? 1 : -1;
    const z = force ? to.z : clamp(to.z * rand(0.85, 1.15), 5, 28);
    S.thief = { id: S.dogId === 'gorda' ? 'biscuit' : 'gorda', state: 'run', t: 0, wx: force ? to.wx + side * 4 : side * (halfWidth(z) + 1.5), z, h: 0, face: -side, phi: 0, sitT: 0 };
    S.lastThiefThrow = S.throws;
    const p0 = proj(side * halfWidth(z) * 0.8, z);
    addText(THIEVES[S.thief.id].name + '!', clamp(p0.x, 60, W - 60), p0.y - 70, '#e0436b', 20, 1.2);
    setTimeout(() => sfx.bark(THIEVES[S.thief ? S.thief.id : 'gorda'].voice * 1.4, 0, 2), 120);
  }
  function spawnPuddles() {
    const p = progress(), want = DEBUG === 'puddle' ? 1 : p > 0.75 ? 3 : p > 0.5 ? 2 : p > 0.25 ? 1 : 0;
    while (S.puddles.length < want) {
      let pd, tries = 0;
      do {
        const z = rand(7, 22);
        pd = { wx: rand(-0.55, 0.55) * halfWidth(z), z, rx: rand(1.2, 1.7), rz: rand(0.7, 1.0), seed: Math.floor(rand(1, 9999)) };
        tries++;
      } while (tries < 20 && S.puddles.some(q => Math.hypot(q.wx - pd.wx, q.z - pd.z) < 4));
      S.puddles.push(pd);
      if (S.mode === 'play' && !S.told.puddle) { S.told.puddle = true; const q = proj(pd.wx, pd.z); addText('Uh oh, a puddle!', clamp(q.x, 90, W - 90), q.y - 30, '#2f5bb5', 18, 1.6); }
    }
  }
  function spawnSquirrel(force) {
    const p = progress();
    if (S.squirrel || (!force && (p < 0.12 || S.time < S.nextSquirrel))) return;
    const dir = rnd() < 0.5 ? 1 : -1, z = rand(6, 18);
    S.squirrel = { wx: -dir * (halfWidth(z) + 0.5), z, h: 0, dir, state: 'run', t: 0, pauseT: rand(0.6, 1.4), scared: false };
    S.nextSquirrel = S.time + rand(9, 14) - 4 * p;
    sfx.chatter();
  }
  function scareSquirrel() {
    const q = S.squirrel; if (!q || q.state === 'flee') return;
    q.state = 'flee'; q.t = 0; q.dir = q.wx > 0 ? 1 : -1;
    const p = proj(q.wx, q.z); addText('Shoo!', p.x, p.y - 40, '#7c5cff', 24, 1);
    sfx.boop(); sfx.chatter();
    const d = S.dog; if (d.state === 'squirrel') resumeDog();
  }
  function resumeDog() {
    const d = S.dog;
    d.state = d.resume || 'chase'; d.resume = null; d.t = 0;
  }
  function tapThief() {
    const th = S.thief; if (!th) return;
    const name = THIEVES[th.id].name;
    const p = proj(th.wx, th.z);
    if (th.state === 'run') { th.state = 'sit'; th.t = 0; addText('Leave it, ' + name + '!', clamp(p.x, 90, W - 90), p.y - 70, '#7c5cff', 20, 1.3); sfx.boop(); }
    else if (th.state === 'carry') {          // "Drop it!" - the thief lets go of the toy
      th.state = 'leave'; th.t = 0;
      Object.assign(S.item, { state: 'ground', wx: th.wx + th.face * 0.6, z: th.z, h: 0 });
      S.stolen = false;
      addText('Drop it, ' + name + '!', clamp(p.x, 90, W - 90), p.y - 70, '#7c5cff', 20, 1.3); sfx.boop();
      const d = S.dog; if (d.state === 'sad') { d.state = 'chase'; d.t = 0; }
    }
  }

  // ---------------- dog brain ----------------
  function moveToward(o, target, speed, dt) {
    const dx = target.wx - o.wx, dz = target.z - o.z, d = Math.hypot(dx, dz), step = speed * dt;
    if (d <= step || d < 0.01) { o.wx = target.wx; o.z = target.z; return true; }
    o.wx += dx / d * step; o.z += dz / d * step;
    const sx = proj(o.wx, o.z).x - proj(o.wx - dx / d * step, o.z - dz / d * step).x;
    if (Math.abs(sx) > 0.15) o.face = sx > 0 ? 1 : -1;
    else if (Math.abs(dx) > 0.05) o.face = dx > 0 ? 1 : -1;
    return false;
  }
  function dogSpeed() {
    const d = S.dog;
    return dog().speed * (d.slow > 0 ? 0.42 : 1) * (d.state === 'sad' ? 0.6 : 1);
  }
  function updateDog(dt) {
    const d = S.dog, it = S.item;
    d.t += dt; d.mud = Math.max(0, d.mud - dt / 7); d.slow = Math.max(0, d.slow - dt);
    let running = false;
    // puddles
    const inside = S.puddles.find(pd => ((d.wx - pd.wx) / pd.rx) ** 2 + ((d.z - pd.z) / pd.rz) ** 2 < 1);
    if (inside && d.h < 0.2) {
      d.slow = 0.35;
      if (d.inPuddle !== inside) {
        d.inPuddle = inside; d.mud = 1; sfx.splash(); event('splash');
        const p = proj(d.wx, d.z);
        for (let i = 0; i < 18; i++) S.parts.push({ type: 'drop', x: p.x + rand(-20, 20) * p.s, y: p.y, vx: rand(-160, 160) * p.s, vy: rand(-320, -120) * p.s,
          life: rand(0.5, 0.8), max: 0.8, size: rand(3, 6) * (0.5 + p.s), color: rnd() < 0.5 ? '#7a5634' : '#8fc7e6' });
        addText('Splash! Muddy paws!', p.x, p.y - 90 * p.s - 20, '#7a5634', 18, 1.3);
      }
    } else if (!inside) d.inPuddle = null;

    if (d.state === 'home') {
      d.wx = HOME.wx; d.z = HOME.z; d.face = 1;
    } else if (d.state === 'wait') {
      if (d.t > 0.15) { d.state = 'chase'; d.t = 0; }
    } else if (d.state === 'chase') {
      running = true;
      const target = itemRest();
      // a squirrel nearby? (once per throw)
      const q = S.squirrel;
      if (q && q.state !== 'flee' && !d.sniffed && Math.hypot(q.wx - d.wx, q.z - d.z) < 7) {
        d.sniffed = true;
        if (rnd() < dog().focus || DEBUG === 'squirrel') { d.resume = 'chase'; d.state = 'squirrel'; d.t = 0; d.distractT = 0; sfx.bark(dog().voice.pitch, dog().voice.gruff, 2); sfx.chatter(); event('distracted');
          if (!S.told.squirrel) { S.told.squirrel = true; const p = proj(q.wx, q.z); addText('Tap the squirrel!', clamp(p.x, 90, W - 90), p.y - 60, '#7c5cff', 20, 2); } }
      }
      if (d.state === 'chase') {
        if (it.state === 'air') {
          // mid-air catch: under the toy while it's low enough to jump for
          const under = Math.hypot(it.wx - d.wx, it.z - d.z);
          if (under < 1.2 && it.h <= dog().reach && it.h > 0.45 && it.t > 0.25) return catchInAir();
          moveToward(d, target, dogSpeed(), dt);
        } else if (it.state === 'ground' || it.state === 'bounce') {
          if (moveToward(d, { wx: it.wx, z: it.z }, dogSpeed(), dt) || dist2(d, it) < 0.45) { d.state = 'pickup'; d.t = 0; }
        } else if (it.state === 'thief') { d.state = 'sad'; d.t = 0; }
      }
    } else if (d.state === 'jump') {
      d.h += d.vh * dt; d.vh -= GRAV * dt;
      moveToward(d, S.jumpDrift, 3, dt);
      if (d.h <= 0) { d.h = 0; d.state = 'return'; d.t = 0; }
    } else if (d.state === 'pickup') {
      if (d.t > 0.28) {
        if (it.state === 'ground' || it.state === 'bounce') { it.state = 'dog'; sfx.chomp(); event('pickup'); }
        d.state = it.state === 'dog' ? 'return' : 'chase'; d.t = 0;
      }
    } else if (d.state === 'return' || d.state === 'sad') {
      running = true;
      if (moveToward(d, HOME, dogSpeed(), dt)) {
        if (d.state === 'sad') { d.state = 'home'; d.t = 0; newToy(); }
        else { d.state = 'drop'; d.t = 0; d.face = 1; }
      }
      const q = S.squirrel;
      if (d.state === 'return' && q && q.state !== 'flee' && !d.sniffed && Math.hypot(q.wx - d.wx, q.z - d.z) < 6) {
        d.sniffed = true;
        if (rnd() < dog().focus * 0.7) { d.resume = 'return'; d.state = 'squirrel'; d.t = 0; d.distractT = 0; sfx.bark(dog().voice.pitch, dog().voice.gruff, 2); event('distracted'); }
      }
    } else if (d.state === 'drop') {
      if (d.t > 0.12 && it.state === 'dog') { it.state = 'dropped'; it.wx = d.wx + 0.7; it.z = d.z - 0.2; it.h = 0; }
      if (d.t > 0.45) { scoreFetch(); d.state = 'home'; d.t = 0; }
    } else if (d.state === 'squirrel') {
      running = true;
      const q = S.squirrel;
      d.distractT += dt;
      if (!q || q.state === 'flee' || d.distractT > 2.6) {
        if (q && q.state !== 'flee') { q.state = 'flee'; q.t = 0; q.dir = q.wx > d.wx ? 1 : -1; }
        if (d.distractT > 2.6) sfx.whimper && sfx.whimper(dog().voice.pitch);
        resumeDog();
      } else moveToward(d, { wx: q.wx - q.dir * 1.2, z: q.z }, dogSpeed() * 0.75, dt);
    }
    if (running) d.phi += dt * (d.slow > 0 ? 10 : 17);
    if (running && Math.floor(d.phi / Math.PI) !== Math.floor((d.phi - dt * 17) / Math.PI)) sfx.patter();
  }
  function catchInAir() {
    const d = S.dog, it = S.item;
    it.state = 'dog'; S.airCatch = true;
    d.state = 'jump'; d.t = 0; d.h = Math.max(0.15, it.h - 1.05 * dog().size); d.vh = 3.2;
    const dx = it.to.wx - it.from.wx, dz = it.to.z - it.from.z, n = Math.hypot(dx, dz) || 1;
    S.jumpDrift = { wx: d.wx + dx / n * 0.8, z: d.z + dz / n * 0.8 };
    sfx.hop(); sfx.chomp(); event('aircatch');
    const p = proj(d.wx, d.z, d.h + 1.4);
    addText(S.toy === 'frisbee' ? 'FRISBEE CATCH!' : 'MID-AIR CATCH!', clamp(p.x, 100, W - 100), p.y - 30, '#ff3d7f', 24, 1.4);
    for (let i = 0; i < 16; i++) S.parts.push({ type: 'star', x: p.x, y: p.y + 20, vx: rand(-180, 180), vy: rand(-240, -40), life: 0.8, max: 0.8, size: rand(4, 8),
      color: pick(['#ffd23f', '#ff3d7f', '#31c46c', '#5b8def']) });
  }
  function newToy() {
    S.item = newItem(); S.thief = S.thief && S.thief.state === 'gone' ? null : S.thief;
    addText("Here's another one!", W * 0.62, H * 0.74, '#2f6b2f', 18, 1.4);
  }
  function scoreFetch() {
    const toy = TOYS[S.toy], d = S.dog;
    let pts = 5 + Math.round(S.dist * 1.5) + (toy.bonus || 0);
    const p = proj(d.wx, d.z);
    const notes = [];
    if (S.airCatch) { const b = Math.round(pts * (toy.air - 1)); pts += b; notes.push(['Air bonus +' + b, '#ff3d7f']); }
    const par = S.item.T + 2 * S.dist / dog().speed * 1.15 + 1.4;
    if (S.time - S.throwAt < par) { pts += 10; notes.push(['Speedy! +10', '#2f9e44']); }
    if (toy.yum) notes.push(['Yum!', '#e9a23b']);
    S.combo++;
    const mult = 1 + 0.25 * Math.min(S.combo - 1, 4);
    pts = Math.round(pts * mult);
    S.score += pts; updateHud();
    addText('+' + pts, p.x + 30, p.y - 110 * p.s, '#ff5a1f', 30, 1.3);
    notes.forEach((n, i) => addText(n[0], p.x + 40, p.y - 140 * p.s - i * 22, n[1], 17, 1.4));
    if (S.combo > 1) addText('Combo x' + mult.toFixed(2).replace(/\.?0+$/, '') + '!', W * 0.5, H * 0.3, '#7c5cff', 22, 1.3);
    sfx.bark(dog().voice.pitch, dog().voice.gruff, S.airCatch ? 3 : 2);
    if (S.airCatch) sfx.bonus();
    S.item = newItem();
    event('scored');
    if (S.score >= GOAL && !S.done) finishRound();
  }

  // ---------------- toy physics ----------------
  function updateItem(dt) {
    const it = S.item, toy = TOYS[S.toy];
    if (it.state === 'air') {
      it.t += dt;
      const u = clamp(it.t / it.T, 0, 1), hu = toy.glide ? 1 - Math.pow(1 - u, 1.7) : u;
      it.wx = lerp(it.from.wx, it.to.wx, hu); it.z = lerp(it.from.z, it.to.z, hu);
      it.h = lerp(it.from.h, 0, u) + it.apex * 4 * u * (1 - u);
      it.rot += dt * (S.toy === 'stick' ? 9 : S.toy === 'burger' ? 5 : S.toy === 'frisbee' ? 0 : 7);
      if (u >= 1) {
        it.h = 0;
        if (toy.bounce) { it.state = 'bounce'; it.bt = 0; it.start = { wx: it.wx, z: it.z }; it.end = rollEnd(it.to); sfx.boop(); }
        else { it.state = 'ground'; sfx.patter(); }
        const p = proj(it.wx, it.z);
        for (let i = 0; i < 6; i++) S.parts.push({ type: 'dust', x: p.x, y: p.y, vx: rand(-60, 60) * p.s, vy: rand(-60, -20) * p.s, life: 0.5, max: 0.5, size: 6 * p.s + 2 });
      }
    } else if (it.state === 'bounce') {
      it.bt += dt;
      const u = clamp(it.bt / 0.8, 0, 1);
      it.wx = lerp(it.start.wx, it.end.wx, 1 - (1 - u) * (1 - u)); it.z = lerp(it.start.z, it.end.z, 1 - (1 - u) * (1 - u));
      it.h = u < 0.5 ? Math.sin(u / 0.5 * Math.PI) * 0.7 : Math.sin((u - 0.5) / 0.5 * Math.PI) * 0.22;
      it.rot += dt * 8 * (1 - u);
      if (u >= 1) { it.state = 'ground'; it.h = 0; }
    }
  }

  // ---------------- thief + squirrel ----------------
  function updateThief(dt) {
    const th = S.thief; if (!th) return;
    th.t += dt;
    const it = S.item, sp = dog().speed * 0.82;
    if (th.state === 'run') {
      th.phi += dt * 17;
      if (it.state === 'dog' || it.state === 'hand' || it.state === 'dropped') { th.state = 'leave'; th.t = 0; const p = proj(th.wx, th.z); addText('Aww!', p.x, p.y - 60 * p.s - 20, '#e0436b', 18, 1); return; }
      const target = itemRest();
      moveToward(th, target, sp, dt);
      if ((it.state === 'ground' || it.state === 'bounce') && dist2(th, it) < 0.5) {
        th.state = 'carry'; th.t = 0; it.state = 'thief'; S.stolen = true; S.combo = 0;
        th.exit = { wx: (th.wx >= 0 ? 1 : -1) * (halfWidth(th.z) + 3), z: th.z + 2 };
        sfx.heyGrowl(THIEVES[th.id].voice); event('stolen');
        const p = proj(th.wx, th.z);
        addText('Hey! ' + THIEVES[th.id].name + ' stole it!', clamp(p.x, 125, W - 125), p.y - 80 * p.s - 30, '#e0436b', 20, 1.6);
      }
    } else if (th.state === 'carry') {
      th.phi += dt * 15;
      if (moveToward(th, th.exit, sp * 0.9, dt)) { th.state = 'gone'; }
    } else if (th.state === 'sit') {
      if (th.t > 2.0) { th.state = 'leave'; th.t = 0; }
    } else if (th.state === 'leave') {
      th.phi += dt * 12;
      if (!th.exit) th.exit = { wx: (th.wx >= 0 ? 1 : -1) * (halfWidth(th.z) + 3), z: th.z + 2 };
      if (moveToward(th, th.exit, sp * 0.6, dt)) th.state = 'gone';
    }
    if (th.state === 'gone') {
      if (it.state === 'thief') { /* the toy is gone with the thief: your dog comes home, new toy */ }
      S.thief = null;
    }
  }
  function updateSquirrel(dt) {
    const q = S.squirrel; if (!q) return;
    q.t += dt;
    if (q.state === 'run') {
      q.wx += q.dir * 3.2 * dt;
      if (q.t > q.pauseT) { q.state = 'pause'; q.t = 0; if (rnd() < 0.5) sfx.chatter(); }
    } else if (q.state === 'pause') {
      if (q.t > 0.9) { q.state = 'run'; q.t = 0; q.pauseT = rand(0.8, 1.6); }
    } else if (q.state === 'flee') {
      q.wx += q.dir * 11 * dt; q.z += 4 * dt;
    }
    if (Math.abs(q.wx) > halfWidth(q.z) + 2) S.squirrel = null;
  }

  // ---------------- particles ----------------
  function updateParts(dt) {
    for (let i = S.parts.length - 1; i >= 0; i--) {
      const q = S.parts[i]; q.life -= dt;
      q.vy += (q.type === 'dust' ? 60 : 700) * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.life <= 0) S.parts.splice(i, 1);
    }
    for (let i = S.texts.length - 1; i >= 0; i--) {
      const t = S.texts[i]; t.life -= dt; t.y += t.vy * dt;
      if (t.life <= 0) S.texts.splice(i, 1);
    }
  }

  // ---------------- update ----------------
  function update(dt) {
    S.time += dt;
    S.handT = Math.max(0, S.handT - dt);
    if (S.mode === 'play') {
      if (!S.done) { spawnPuddles(); spawnSquirrel(false); }
      updateItem(dt); updateDog(dt); updateThief(dt); updateSquirrel(dt);
      if (S.item.state === 'hand' && S.dog.state === 'home') S.hintT += dt;
      if (S.done) { S.doneT += dt; if (S.doneT > 1.6 && S.mode === 'play') showPrize(!!DEBUG && DEBUG !== 'fast'); }
    }
    updateParts(dt);
  }
  function finishRound() {
    S.done = true; S.doneT = 0; S.roundSeconds = Math.max(1, Math.round(S.time - S.roundStart));
    addText('FETCH FRENZY!', W / 2, H * 0.3, '#ff3d7f', 34, 1.8, -20);
    for (let i = 0; i < 80; i++) S.parts.push({ type: 'star', x: W / 2 + rand(-60, 60), y: H * 0.32, vx: rand(-320, 320), vy: rand(-520, -120), life: rand(1, 1.6), max: 1.6,
      size: rand(4, 8), color: pick(['#ffd23f', '#ff3d7f', '#31c46c', '#5b8def', '#7c5cff']) });
    sfx.bark(dog().voice.pitch, dog().voice.gruff, 3);
  }

  // ---------------- drawing ----------------
  function dogPose(d, running, carrying) {
    const st = { legs: [0, 0, 0, 0], frontLen: 1, bodyDY: 0, bodyRot: 0, headRot: 0, tail: Math.sin(S.time * 16) * 0.4, face: 'happy', mud: d.mud };
    if (running) {
      const a = 0.8;
      st.legs = [Math.sin(d.phi + 0.7) * a, Math.sin(d.phi) * a, Math.sin(d.phi + Math.PI + 0.7) * a, Math.sin(d.phi + Math.PI) * a];
      st.bodyDY = -Math.abs(Math.sin(d.phi)) * 10; st.bodyRot = Math.sin(d.phi) * 0.06;
    }
    return st;
  }
  function drawRunner(imgs, o, k, st, carry) {
    if (!imgs) return;
    const p = proj(o.wx, o.z), base = proj(o.wx, o.z, o.h || 0);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,' + (0.2 - Math.min(0.12, (o.h || 0) * 0.05)) + ')';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 95 * k * (1 - Math.min(0.4, (o.h || 0) * 0.15)), 14 * k, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(base.x, base.y); ctx.scale(k * o.face, k); ctx.translate(-160, -FF.Runners.GROUND);
    FF.Runners.draw(ctx, imgs, st, carry);
    ctx.restore();
  }
  const toySize = s => 26 * s + 7;
  function carryToy(k) {
    return c => {
      const m = FF.Runners.MOUTH;
      const size = S.toy === 'stick' ? 34 : S.toy === 'frisbee' ? 52 : S.toy === 'burger' ? 44 : 34;
      FF.drawToy(c, S.toy, m[0] + (S.toy === 'frisbee' ? 10 : 2), m[1] + 2, size, S.toy === 'stick' ? 0.1 : 0, S.toy === 'frisbee' ? 0.9 : null);
    };
  }
  function drawDog() {
    const d = S.dog, imgs = S.imgs[S.dogId];
    if (!imgs) return;
    const p = proj(d.wx, d.z), k = L.dogK * dog().size * p.s;
    const running = ['chase', 'return', 'sad', 'squirrel'].indexOf(d.state) >= 0;
    const st = dogPose(d, running);
    const it = S.item;
    if (d.state === 'home') {           // sitting, tail wagging, looking up at you
      const sit = 1;
      st.legs = [-1.25 * sit, -1.25 * sit, 0.3 * sit, 0.3 * sit]; st.bodyRot = -0.32 * sit; st.bodyDY = 16 * sit; st.frontLen = 1.08;
      st.headRot = -0.15 + Math.sin(S.time * 2) * 0.05; st.tail = Math.sin(S.time * 14) * 0.5;
      st.face = it.state === 'hand' ? 'open' : 'happy';
      if (S.done) { st.face = 'happy'; st.bodyDY += -Math.abs(Math.sin(S.time * 9)) * 14; }
    } else if (d.state === 'wait') { st.headRot = -0.35; st.face = 'open'; }
    else if (d.state === 'chase' && it.state === 'air') { st.headRot = -0.3; st.face = 'open'; }
    else if (d.state === 'jump') {
      st.legs = [0.7, 0.55, -0.9, -0.75]; st.bodyRot = -0.35; st.headRot = -0.2; st.face = 'happy';
    } else if (d.state === 'pickup') { st.bodyRot = 0.28; st.legs[2] = st.legs[3] = -0.9; st.frontLen = 0.75; st.headRot = 0.75; st.face = 'open'; }
    else if (d.state === 'sad') { st.headRot = 0.3; st.face = 'open'; st.tail = -0.6; }
    else if (d.state === 'squirrel') { st.face = 'open'; st.headRot = -0.1; }
    else if (d.state === 'drop') { st.headRot = 0.35; st.bodyRot = 0.1; }
    const carrying = it.state === 'dog';
    drawRunner(imgs, d, k, st, carrying ? carryToy(k) : null);
    if (d.state === 'squirrel') {       // "!" over her head
      const hp = proj(d.wx, d.z, d.h); const y = hp.y - 190 * k;
      ctx.font = '900 ' + Math.round(30 * Math.max(0.6, p.s)) + 'px ' + FONT; ctx.textAlign = 'center';
      ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.fillStyle = '#ff3d3d';
      ctx.strokeText('!', hp.x, y); ctx.fillText('!', hp.x, y);
    }
  }
  function drawThief() {
    const th = S.thief; if (!th) return;
    const imgs = S.imgs[th.id]; if (!imgs) return;
    const p = proj(th.wx, th.z), k = L.dogK * 0.92 * p.s;
    const running = th.state === 'run' || th.state === 'carry' || th.state === 'leave';
    const st = dogPose({ phi: th.phi, mud: 0 }, running);
    st.face = 'happy';
    if (th.state === 'sit') { st.legs = [-1.25, -1.25, 0.3, 0.3]; st.bodyRot = -0.32; st.bodyDY = 16; st.frontLen = 1.08; st.face = 'open'; st.headRot = 0.15; st.tail = -0.3; }
    drawRunner(imgs, th, k, st, th.state === 'carry' ? carryToy(k) : null);
    if (th.state === 'run' && S.thief.t < 4) {   // little tap hint ring
      const hp = proj(th.wx, th.z);
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 + 0.4 * Math.sin(S.time * 8)) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(hp.x, hp.y - 60 * k, 140 * k, 110 * k, 0, 0, 7); ctx.stroke();
    }
  }
  function drawItemOnField() {
    const it = S.item;
    if (it.state !== 'air' && it.state !== 'bounce' && it.state !== 'ground' && it.state !== 'dropped') return;
    const g = proj(it.wx, it.z), p = proj(it.wx, it.z, it.h);
    const size = toySize(g.s);
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.beginPath(); ctx.ellipse(g.x, g.y, size * 0.6 / (1 + it.h * 0.3), size * 0.18, 0, 0, 7); ctx.fill();
    const tilt = S.toy === 'frisbee' ? (it.state === 'air' ? 0.25 : 0.6) : null;
    FF.drawToy(ctx, S.toy, p.x, p.y - size * (S.toy === 'frisbee' && it.h === 0 ? 0.1 : 0.4), size, it.rot, tilt);
  }
  function drawSquirrelObj() {
    const q = S.squirrel; if (!q) return;
    const p = proj(q.wx, q.z);
    FF.drawSquirrel(ctx, p.x, p.y, 70 * p.s + 14, q.dir, S.time, q.state !== 'pause');
    if (q.state !== 'flee' && S.dog.state === 'squirrel') {
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 + 0.4 * Math.sin(S.time * 8)) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y - 25 * p.s - 6, 50 * p.s + 16, 0, 7); ctx.stroke();
    }
  }
  function drawPuddles() {
    S.puddles.forEach(pd => {
      ctx.save();
      const N = 18;
      const pts = [];
      for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, w = 1 + 0.12 * Math.sin(a * 3 + pd.seed); pts.push(proj(pd.wx + Math.cos(a) * pd.rx * w, pd.z + Math.sin(a) * pd.rz * w)); }
      ctx.fillStyle = '#7a5634'; ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.closePath(); ctx.fill();
      const c = proj(pd.wx, pd.z);
      ctx.fillStyle = 'rgba(143,199,230,.75)'; ctx.beginPath();
      pts.forEach((q, i) => { const x = c.x + (q.x - c.x) * 0.72, y = c.y + (q.y - c.y) * 0.65; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(c.x - 10 * c.s, c.y - 3 * c.s, 18 * c.s + 3, 4 * c.s + 1, 0, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
      ctx.restore();
    });
  }
  function drawHand() {
    // your arm from the bottom right; holds the toy until you throw
    const it = S.item;
    const lift = S.handT > 0 ? Math.sin((S.handT / 0.3) * Math.PI) : 0;
    const hp = proj(HAND.wx, HAND.z, HAND.h);
    const hx = hp.x + 20, hy = hp.y + 28 - lift * 60;
    ctx.save();
    ctx.translate(hx, hy); ctx.rotate(-0.45 - lift * 0.3);
    ctx.fillStyle = '#4e7fd1'; rr(18, 26, 60, 170, 24); ctx.fill();
    ctx.fillStyle = '#3d68b3'; rr(14, 22, 68, 22, 10); ctx.fill();
    ctx.fillStyle = '#f2c48d'; ctx.strokeStyle = '#c8925e'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(46, 8, 30, 26, 0, 0, 7); ctx.fill(); ctx.stroke();
    if (it.state === 'hand') FF.drawToy(ctx, S.toy, 36, -22, 44, 0.2, 0.7);
    [[22, -26, 8, 20], [36, -32, 8, 22], [50, -30, 8, 21], [63, -20, 7, 17]].forEach(([fx, fy, rx, ry], i) => {
      if (it.state === 'hand' && i < 3) return;   // fingers wrap behind the toy
      ctx.beginPath(); ctx.ellipse(fx, fy, rx, ry, -0.15, 0, 7); ctx.fill(); ctx.stroke();
    });
    ctx.beginPath(); ctx.ellipse(12, -2, 9, 20, -0.9, 0, 7); ctx.fill(); ctx.stroke();
    ctx.restore();
    // swipe hint
    if (S.mode === 'play' && it.state === 'hand' && S.dog.state === 'home' && (S.throws === 0 || S.hintT > 4) && !S.done) {
      const a = (S.time * 1.2) % 1;
      ctx.save(); ctx.globalAlpha = Math.sin(a * Math.PI);
      const x = W * 0.5, y = H * 0.82 - a * H * 0.2;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, y - 26); ctx.lineTo(x - 16, y - 6); ctx.lineTo(x - 6, y - 6); ctx.lineTo(x - 6, y + 22); ctx.lineTo(x + 6, y + 22); ctx.lineTo(x + 6, y - 6); ctx.lineTo(x + 16, y - 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.font = '900 18px ' + FONT; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.4)';
      ctx.strokeText('Swipe up to throw!', W / 2, H * 0.6); ctx.fillText('Swipe up to throw!', W / 2, H * 0.6);
      ctx.restore();
    }
  }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(background(), 0, 0, W, H);
    if (S.mode === 'play' || S.mode === 'prize') {
      drawPuddles();
      // depth sort: far things first
      const objs = [];
      if (S.dog) objs.push([S.dog.z, drawDog]);
      if (S.thief) objs.push([S.thief.z + 0.01, drawThief]);
      if (S.squirrel) objs.push([S.squirrel.z, drawSquirrelObj]);
      if (S.item) objs.push([S.item.z - 0.02, drawItemOnField]);
      objs.sort((a, b) => b[0] - a[0]).forEach(o => o[1]());
      S.parts.forEach(q => {
        ctx.globalAlpha = clamp(q.life / q.max, 0, 1);
        ctx.fillStyle = q.type === 'dust' ? 'rgba(160,130,90,.6)' : q.color || '#fff';
        if (q.type === 'star') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.life * 8); ctx.fillRect(-q.size / 2, -q.size / 2, q.size, q.size); ctx.restore(); }
        else { ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, 7); ctx.fill(); }
      });
      ctx.globalAlpha = 1;
      drawHand();
    }
    S.texts.forEach(t => {
      ctx.globalAlpha = clamp(t.life / t.max * 2, 0, 1);
      ctx.font = '900 ' + t.size + 'px ' + FONT; ctx.textAlign = 'center';
      const hw = ctx.measureText(t.text).width / 2 + 8, x = clamp(t.x, hw, W - hw);   // never run off the screen edge
      ctx.lineWidth = Math.max(4, t.size * 0.22); ctx.strokeStyle = '#fff'; ctx.strokeText(t.text, x, t.y);
      ctx.fillStyle = t.color; ctx.fillText(t.text, x, t.y);
    });
    ctx.globalAlpha = 1;
  }

  // ---------------- input ----------------
  function hit(o, k, w, h) {      // screen box around a runner/squirrel
    const p = proj(o.wx, o.z);
    return { x0: p.x - w * k - 24, x1: p.x + w * k + 24, y0: p.y - h * k - 24, y1: p.y + 24 };
  }
  function onDown(e) {
    if (S.mode !== 'play') return;
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const inside = b => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
    const q = S.squirrel;
    if (q && q.state !== 'flee') { const p = proj(q.wx, q.z); if (inside(hit(q, 1, 40 * p.s + 14, 70 * p.s + 14))) { scareSquirrel(); return; } }
    const th = S.thief;
    if (th && (th.state === 'run' || th.state === 'carry')) { const k = L.dogK * 0.92 * proj(th.wx, th.z).s; if (inside(hit(th, k, 140, 190))) { tapThief(); return; } }
    S.drag = { x, y, t: performance.now(), id: e.pointerId };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  }
  function onUp(e) {
    const d = S.drag; S.drag = null; if (!d) return;
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    throwFromSwipe(x - d.x, y - d.y, (performance.now() - d.t) / 1000);
  }

  // ---------------- screens ----------------
  function show(id) { ['screen-select', 'screen-prize'].forEach(s => $(s).classList.toggle('hidden', s !== id)); }
  function setMode(m) {
    S.mode = m;
    $('hud').classList.toggle('hidden', !(m === 'play' || m === 'prize'));
    $('toyBar').classList.toggle('hidden', m !== 'play');
    if (m === 'play') { show(null); buildToyBar(); }
  }
  function showPrize(debugNoSave) {
    const prize = (DEBUG && LA.prizes.get(Q.get('prize'))) || LA.prizes.random('fetch');
    let newBest = false;
    if (!debugNoSave) {
      const before = LA.store.stats(GAME_ID);
      LA.store.addTrophy(prize.id, GAME_ID, { dog: S.dogId, place: S.place });
      LA.store.recordResult(GAME_ID, { score: S.score, seconds: S.roundSeconds });
      newBest = before.pops > 0 && S.score > before.best;
    }
    setMode('prize');
    $('prizeTitle').textContent = 'Good dog, ' + dog().name + '!';
    $('prizeArt').innerHTML = prize.svg;
    $('prizeName').textContent = prize.name;
    $('prizeMsg').innerHTML = '&nbsp;';
    $('card').classList.remove('flipped');
    show('screen-prize');
    setTimeout(() => {
      $('card').classList.add('flipped');
      sfx.fanfare();
      const a = /s$/.test(prize.name) ? 'some' : /^([aeiou]|X )/i.test(prize.name) ? 'an' : 'a';
      const what = a + ' ' + prize.name + '!' + (prize.id === 'trash-bags' ? ' (Ha ha, gotcha!)' : '');
      $('prizeMsg').textContent = 'You won ' + what + ' It\u2019s on your Trophy Shelf.' + (newBest ? ' NEW BEST SCORE: ' + S.score + '!' : '');
    }, DEBUG === 'prize' ? 50 : 700);
    window.__lastPrize = prize.id;
  }

  // select-screen pictures (drawn once into images)
  function dogPicture(id) {
    const cv = document.createElement('canvas'); cv.width = 300; cv.height = 230;
    const c = cv.getContext('2d');
    c.fillStyle = '#bfe8a0'; c.fillRect(0, 0, 300, 230);
    c.fillStyle = 'rgba(0,0,0,.15)'; c.beginPath(); c.ellipse(150, 212, 105, 12, 0, 0, 7); c.fill();
    c.translate(-10, 16);
    FF.Runners.draw(c, S.imgs[id], { legs: [0.45, -0.4, -0.5, 0.45], frontLen: 1, bodyDY: -4, bodyRot: 0.04, headRot: -0.1, tail: 0.4, face: 'happy' },
      cx => FF.drawToy(cx, 'ball', FF.Runners.MOUTH[0] + 2, FF.Runners.MOUTH[1] + 2, 32, 0, null));
    return cv.toDataURL();
  }
  function placePicture(id) {
    const sw = 390, sh = 844, cv = document.createElement('canvas'); cv.width = 160; cv.height = 120;
    const saved = { W, H, L: Object.assign({}, L) };
    W = sw; H = sh; L.hor = H * 0.34; L.base = H * 1.0; L.pxm = W / 7;
    const big = FF.renderScene(id, W, H, 1, L, proj);
    W = saved.W; H = saved.H; Object.assign(L, saved.L);
    cv.getContext('2d').drawImage(big, 0, sh * 0.12, sw, sw * 0.75, 0, 0, 160, 120);
    return cv.toDataURL();
  }
  function toyPicture(id) {
    const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96;
    const c = cv.getContext('2d'); FF.drawToy(c, id, 48, 50, id === 'stick' ? 46 : 58, id === 'stick' ? -0.5 : 0, 0.6);
    return cv.toDataURL();
  }
  function buildSelect() {
    const mk = (box, items, cur, onPick) => {
      $(box).innerHTML = '';
      items.forEach(([id, img, name, blurb]) => {
        const b = document.createElement('button');
        b.className = 'pick' + (id === cur() ? ' on' : ''); b.dataset.id = id;
        b.innerHTML = '<img src="' + img + '" alt=""><span class="name">' + name + '</span>' + (blurb ? '<span class="blurb">' + blurb + '</span>' : '');
        b.addEventListener('click', () => { onPick(id); sfx.click(); [...$(box).children].forEach(x => x.classList.toggle('on', x.dataset.id === id)); });
        $(box).appendChild(b);
      });
    };
    mk('dogCards', Object.keys(DOGS).map(id => [id, dogPicture(id), DOGS[id].name, DOGS[id].blurb]), () => S.dogId, id => { S.dogId = id; sfx.bark(DOGS[id].voice.pitch, DOGS[id].voice.gruff, 1); });
    mk('placeCards', PLACE_IDS.map(id => [id, placePicture(id), FF.PLACES[id].name]), () => S.place, id => { S.place = id; });
    mk('toyCards', Object.keys(TOYS).map(id => [id, toyPicture(id), TOYS[id].short || TOYS[id].name]), () => S.toy, id => { S.toy = id; });
  }
  function buildToyBar() {
    const bar = $('toyBar'); bar.innerHTML = '';
    Object.keys(TOYS).forEach(id => {
      const b = document.createElement('button'); b.className = 'toy-btn' + (id === S.toy ? ' on' : ''); b.setAttribute('aria-label', TOYS[id].name);
      b.innerHTML = '<img src="' + toyPicture(id) + '" alt="">';
      b.addEventListener('click', () => {
        if (S.item.state !== 'hand') { sfx.boop(); return; }   // switch toys only while it's in your hand
        S.toy = id; sfx.click(); [...bar.children].forEach((x, i) => x.classList.toggle('on', Object.keys(TOYS)[i] === id));
      });
      bar.appendChild(b);
    });
  }

  // ---------------- main loop ----------------
  let last = 0;
  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    if (!S.frozen) update(dt);
    draw();
    if (window.__S) document.title = 'm=' + S.mode + ' t=' + S.time.toFixed(2) + ' score=' + S.score + ' dog=' + S.dog.state + ' item=' + S.item.state +
      ' thief=' + (S.thief ? S.thief.state : '-') + ' sq=' + (S.squirrel ? S.squirrel.state : '-') + ' ev=' + Object.keys(S.events).join(',');
    requestAnimationFrame(frame);
  }
  function setMuteIcon() {
    $('muteBtn').innerHTML = sfx.isMuted()
      ? '<svg viewBox="0 0 24 24"><path d="M3 9 H7 L12 4 V20 L7 15 H3 Z" fill="#fff"/><path d="M16 9 L22 15 M22 9 L16 15" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M3 9 H7 L12 4 V20 L7 15 H3 Z" fill="#fff"/><path d="M15.5 8.5 Q18 12 15.5 15.5 M18.5 6 Q22.5 12 18.5 18" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>';
  }
  function init() {
    resize();
    window.addEventListener('resize', resize);
    setMuteIcon();
    $('muteBtn').addEventListener('click', () => { sfx.toggleMute(); setMuteIcon(); sfx.click(); });
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', () => { S.drag = null; });
    $('goBtn').addEventListener('click', () => { sfx.click(); startPlay(); });
    $('againBtn').addEventListener('click', () => { sfx.click(); startPlay(); });
    $('arcadeBtn').addEventListener('click', () => { location.href = '../../index.html'; });
    $('switchBtn').addEventListener('click', () => { sfx.click(); setMode('select'); show('screen-select'); });
    S.dog = newDog(); S.item = newItem();
    Promise.all(['bella', 'marley', 'gorda', 'biscuit'].map(id => FF.Runners.load(id).then(imgs => { S.imgs[id] = imgs; })))
      .then(() => { buildSelect(); setTimeout(() => { resize(); debugStart(); }, DEBUG ? 250 : 0); });
    requestAnimationFrame(frame);
  }

  // ---------------- debug scenes (deterministic, then frozen) ----------------
  function runUntil(cond, maxT, after) {
    const end = S.time + maxT;
    while (S.time < end && !cond()) update(1 / 60);
    const stop = S.time + (after || 0);
    while (S.time < stop) update(1 / 60);
    S.frozen = true;
  }
  function debugStart() {
    if (DEBUG === 'real') { window.__S = S; window.__proj = proj; return; }   // real-time play, state visible to tests
    if (!DEBUG || DEBUG === 'fast') return;
    window.__S = S; S.time = 0;
    if (DEBUG === 'select') return;
    if (DEBUG === 'prize') { document.querySelector('.card-inner').style.transition = 'none'; startPlay(); S.score = GOAL; updateHud(); showPrize(true); return; }
    startPlay();
    S.score = Math.round(GOAL * parseFloat(Q.get('p') || (DEBUG === 'play' ? '0.35' : '0.45'))); updateHud();
    S.nextSquirrel = 1e9; S.texts = [];
    const after = parseFloat(Q.get('after') || '0');
    if (DEBUG === 'thumb') {        // arcade tile picture: a big frisbee catch, no text
      S.score = 0; updateHud(); S.puddles = []; S.told.puddle = true; S.toy = 'frisbee'; S.item = newItem();
      throwToy(0.32, -0.1);
      runUntil(() => S.events.aircatch, 6, 0.2);
      S.texts = []; S.parts = S.parts.filter(q => q.type !== 'star');
    } else if (DEBUG === 'play') {
      S.told.puddle = true; spawnPuddles();
      throwToy(0.62, 0.18);
      runUntil(() => false, parseFloat(Q.get('t') || '1.05'), 0);
    } else if (DEBUG === 'air') {
      S.toy = Q.get('toy') || 'frisbee'; S.item = newItem(); buildToyBar();
      throwToy(parseFloat(Q.get('power') || '0.32'), -0.1);
      runUntil(() => S.events.aircatch, 6, after || 0.1);
    } else if (DEBUG === 'thief') {
      S.puddles = [];
      throwToy(0.55, -0.2); S.dog.t = -0.9;   // your dog is a bit slow off the mark this time
      runUntil(() => S.events.stolen, 8, after || 0.3);
    } else if (DEBUG === 'puddle') {
      S.puddles = [];
      throwToy(0.6, 0.05);
      const to = S.item.to;
      S.puddles.push({ wx: lerp(HOME.wx, to.wx, 0.55), z: lerp(HOME.z, to.z, 0.55), rx: 1.6, rz: 0.95, seed: 3 });
      runUntil(() => S.events.splash, 6, after || 0.12);
    } else if (DEBUG === 'squirrel') {
      S.puddles = [];
      throwToy(0.75, -0.05);
      spawnSquirrel(true);
      const q = S.squirrel; q.z = 9; q.wx = -2.5; q.dir = 1;
      runUntil(() => S.events.distracted, 6, after || 0.5);
    }
  }

  // only logged-in players can play (debug links skip this for testing)
  if (!DEBUG && !LA.players.current()) { location.replace('../../index.html'); return; }
  init();
})();
