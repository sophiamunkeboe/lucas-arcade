/* Pop the Dog - the dog characters.
   Based on art/bella.svg and art/marley.svg, now built from separate parts
   (tail, back legs, body, front legs, paws, head) so they can move and do tricks.

   Everything is drawn in a 400 x 420 "art space" (ground is at y = 410).
   Each part is a small SVG that gets turned into a picture once, then the
   game moves/rotates the parts every frame using a POSE.

   Faces:  normal | happy | miss   (Bella's "miss" face is her famous RBF)

   HOW TO ADD AN OUTFIT (example: a Suns jersey for Marley)
     1. Add an entry to OUTFITS below, e.g.
          'suns-jersey': { name: 'Suns Jersey',
                           box: [95, 240, 210, 150],          // x, y, w, h in art space
                           svg: dogId => '<path .../>' }       // drawn over the body
     2. Set  outfit: 'suns-jersey'  on the dog in DOGS below.             */
(function () {
  const OUTFITS = {
    // none yet - Lucas is still deciding!
  };

  const GROUND = 410;
  const SHOULDER_Y = 300, LEG_LEN = 104;   // front leg: shoulder to paw centre

  const BELLA_GRAD = '<defs><radialGradient id="fb" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#fffdf7"/><stop offset="1" stop-color="#ece3d3"/></radialGradient></defs>';
  const BF = 'fill="url(#fb)" stroke="#cbbfa8" stroke-width="3"';
  const BO = 'fill="#f9f4ea"';               // overlay fill (hides inner outlines)
  const MF = 'fill="#fff8ee" stroke="#c9b79c" stroke-width="3"';
  const MO = 'fill="#fff8ee"';
  // back legs are a little darker so they read as being behind
  const BFB = 'fill="#ebe2d2" stroke="#c4b79e" stroke-width="3"', BOB = 'fill="#ebe2d2"';
  const MFB = 'fill="#f0e4d0" stroke="#c2ae90" stroke-width="3"', MOB = 'fill="#f0e4d0"';

  // ---------------- BELLA parts ----------------
  const bellaParts = {
    tail: { box: [250, 150, 100, 170], pivot: [282, 300], svg:
      BELLA_GRAD + '<g ' + BF + '><circle cx="285" cy="292" r="22"/><circle cx="300" cy="266" r="24"/><circle cx="312" cy="240" r="25"/><circle cx="320" cy="212" r="24"/><circle cx="322" cy="186" r="20"/></g>' +
      '<g fill="url(#fb)"><circle cx="285" cy="292" r="19"/><circle cx="300" cy="266" r="21"/><circle cx="312" cy="240" r="22"/><circle cx="320" cy="212" r="21"/></g>' },
    backStand: { box: [70, 270, 95, 150], svg: BELLA_GRAD +
      '<g ' + BFB + '><ellipse cx="120" cy="330" rx="40" ry="50"/><rect x="98" y="340" width="40" height="66" rx="18"/><ellipse cx="114" cy="406" rx="28" ry="12"/></g>' +
      '<g ' + BOB + '><ellipse cx="120" cy="330" rx="37" ry="47"/><rect x="101" y="343" width="34" height="60" rx="15"/></g>' +
      '<path d="M106 402 v8 M116 401 v9 M126 402 v8" stroke="#cbbfa8" stroke-width="2"/>' },
    backSit: { box: [50, 300, 125, 120], svg: BELLA_GRAD +
      '<g ' + BFB + '><ellipse cx="112" cy="358" rx="56" ry="48"/><ellipse cx="100" cy="404" rx="32" ry="12"/></g>' +
      '<ellipse cx="112" cy="356" rx="53" ry="44" ' + BOB + '/>' +
      '<path d="M88 400 v8 M100 399 v10 M112 400 v8" stroke="#cbbfa8" stroke-width="2"/>' },
    body: { box: [90, 225, 220, 175], svg: BELLA_GRAD +
      '<g ' + BF + '><ellipse cx="200" cy="318" rx="100" ry="72"/><circle cx="158" cy="268" r="30"/><circle cx="242" cy="268" r="30"/><circle cx="200" cy="260" r="32"/></g>' +
      '<g ' + BO + '><ellipse cx="200" cy="320" rx="97" ry="69"/><circle cx="200" cy="278" r="42"/></g>' +
      '<path d="M170 330 q8 6 16 0 M214 345 q8 6 16 0 M180 365 q8 6 16 0" stroke="#e2d7c3" stroke-width="3" fill="none"/>' },
    leg: { box: [138, 285, 54, 125], pivot: [165, 300], svg: BELLA_GRAD +
      '<g ' + BF + '><rect x="145" y="290" width="40" height="112" rx="18"/><circle cx="147" cy="330" r="9"/><circle cx="183" cy="352" r="9"/><circle cx="147" cy="374" r="9"/></g>' +
      '<rect x="148" y="293" width="34" height="108" rx="15" ' + BO + '/>' },
    paw: { box: [134, 390, 62, 32], center: [165, 404], svg: BELLA_GRAD +
      '<ellipse cx="165" cy="404" rx="27" ry="13" ' + BF + '/>' +
      '<path d="M156 400 v9 M165 399 v10 M174 400 v9" stroke="#cbbfa8" stroke-width="2"/>' },
    head: { box: [38, 28, 324, 268], pivot: [200, 262] },
  };
  function bellaHead() {
    return BELLA_GRAD +
      '<g ' + BF + '>' +
      '<path d="M95 140 C40 160 45 270 90 285 C125 290 130 200 120 160 Z"/>' +
      '<path d="M305 140 C360 160 355 270 310 285 C275 290 270 200 280 160 Z"/></g>' +
      '<rect x="125" y="258" width="150" height="24" rx="12" fill="#2b2b2b"/>' +
      '<rect x="182" y="262" width="36" height="16" rx="3" fill="#555"/>' +
      '<g ' + BF + '>' +
      '<circle cx="200" cy="170" r="105"/>' +
      '<circle cx="140" cy="85" r="35"/><circle cx="200" cy="70" r="38"/><circle cx="260" cy="85" r="35"/>' +
      '<circle cx="110" cy="120" r="28"/><circle cx="290" cy="120" r="28"/></g>' +
      '<circle cx="200" cy="175" r="98" fill="url(#fb)"/>';
  }

  // ---------------- MARLEY parts ----------------
  const marleyParts = {
    tail: { box: [272, 210, 80, 100], pivot: [290, 296], svg:
      '<path d="M286 300 Q330 284 336 236 Q338 222 328 226 Q324 268 282 286 Z" fill="#d9a066" stroke="#a9733f" stroke-width="3" stroke-linejoin="round"/>' },
    backStand: { box: [58, 275, 104, 145], svg:
      '<g ' + MFB + '><ellipse cx="110" cy="332" rx="46" ry="55"/><rect x="86" y="345" width="46" height="60" rx="20"/><ellipse cx="108" cy="405" rx="31" ry="13"/></g>' +
      '<g ' + MOB + '><ellipse cx="110" cy="332" rx="43" ry="52"/><rect x="89" y="348" width="40" height="54" rx="17"/></g>' +
      '<path d="M98 401 v9 M108 400 v10 M118 401 v9" stroke="#c9b79c" stroke-width="2"/>' },
    backSit: { box: [36, 305, 135, 115], svg:
      '<g ' + MFB + '><ellipse cx="102" cy="360" rx="62" ry="48"/><ellipse cx="92" cy="404" rx="35" ry="13"/></g>' +
      '<ellipse cx="102" cy="358" rx="59" ry="44" ' + MOB + '/>' +
      '<path d="M80 400 v9 M92 399 v10 M104 400 v9" stroke="#c9b79c" stroke-width="2"/>' },
    body: { box: [72, 236, 256, 172], svg:
      '<defs><clipPath id="mb"><ellipse cx="200" cy="322" rx="122" ry="80"/></clipPath></defs>' +
      '<ellipse cx="200" cy="322" rx="122" ry="80" ' + MF + '/>' +
      '<g clip-path="url(#mb)"><ellipse cx="290" cy="305" rx="80" ry="70" fill="#d9a066"/></g>' +
      '<path d="M150 360 q10 8 20 0 M226 372 q10 8 20 0" stroke="#e8d8c0" stroke-width="3" fill="none"/>' },
    leg: { box: [130, 285, 70, 122], pivot: [165, 300], svg:
      '<rect x="141" y="290" width="48" height="112" rx="22" ' + MF + '/>' +
      '<rect x="144" y="293" width="42" height="108" rx="19" ' + MO + '/>' },
    paw: { box: [128, 388, 74, 34], center: [165, 404], svg:
      '<ellipse cx="165" cy="404" rx="32" ry="15" ' + MF + '/>' +
      '<path d="M154 399 v10 M165 398 v11 M176 399 v10" stroke="#c9b79c" stroke-width="2"/>' },
    head: { box: [58, 52, 286, 266], pivot: [200, 262] },
  };
  function marleyHead() {
    return '<path d="M95 105 C70 70 120 60 140 95 Z" fill="#4a2e22"/>' +
      '<path d="M305 105 C330 70 280 60 260 95 Z" fill="#4a2e22"/>' +
      '<rect x="110" y="254" width="180" height="24" rx="12" fill="#7a1f6a"/>' +
      '<circle cx="200" cy="292" r="12" fill="#e2b33c" stroke="#a37a1c" stroke-width="2"/>' +
      '<ellipse cx="200" cy="170" rx="118" ry="105" fill="#d9a066" stroke="#a9733f" stroke-width="3"/>' +
      '<path d="M185 70 C190 120 175 160 140 195 C130 250 270 250 260 195 C225 160 210 120 215 70 Z" fill="#fff8ee"/>' +
      '<ellipse cx="148" cy="160" rx="34" ry="30" fill="#3d2a22"/>';
  }

  function bellaFace(face) {
    const snout = '<ellipse cx="200" cy="225" rx="50" ry="38" fill="#fffaf0" stroke="#d8ccb6" stroke-width="2"/>' +
      '<ellipse cx="200" cy="208" rx="20" ry="14" fill="#2a1d18"/><ellipse cx="194" cy="203" rx="6" ry="3" fill="#6b5a52"/>';
    if (face === 'happy') {
      return '<path d="M142 168 Q160 148 178 168" stroke="#2a1a10" stroke-width="7" fill="none" stroke-linecap="round"/>' +
        '<path d="M222 168 Q240 148 258 168" stroke="#2a1a10" stroke-width="7" fill="none" stroke-linecap="round"/>' +
        '<ellipse cx="138" cy="195" rx="14" ry="8" fill="#ffc9c9" opacity="0.7"/><ellipse cx="262" cy="195" rx="14" ry="8" fill="#ffc9c9" opacity="0.7"/>' +
        snout +
        '<path d="M172 234 Q200 275 228 234 Z" fill="#5a2c24"/>' +
        '<path d="M186 248 Q200 272 214 248 Z" fill="#ff7f93"/>';
    }
    if (face === 'miss') { // the famous RBF
      return '<circle cx="160" cy="168" r="16" fill="#2a1a10"/><circle cx="240" cy="168" r="16" fill="#2a1a10"/>' +
        '<circle cx="165" cy="171" r="4" fill="#fff"/><circle cx="245" cy="171" r="4" fill="#fff"/>' +
        '<rect x="138" y="140" width="44" height="26" fill="#f8f2e6"/><rect x="218" y="140" width="44" height="26" fill="#f8f2e6"/>' +
        '<path d="M138 158 L184 164" stroke="#7a6a55" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M216 164 L262 156" stroke="#7a6a55" stroke-width="6" stroke-linecap="round"/>' +
        snout +
        '<path d="M182 242 L222 239" stroke="#5a4636" stroke-width="4" stroke-linecap="round"/>';
    }
    // normal: wide-eyed popcorn stare
    return '<circle cx="160" cy="165" r="18" fill="#2a1a10"/><circle cx="240" cy="165" r="18" fill="#2a1a10"/>' +
      '<circle cx="166" cy="159" r="6" fill="#fff"/><circle cx="246" cy="159" r="6" fill="#fff"/>' +
      '<circle cx="156" cy="171" r="2.5" fill="#fff"/><circle cx="236" cy="171" r="2.5" fill="#fff"/>' +
      snout +
      '<path d="M184 240 Q200 248 216 240" stroke="#5a4636" stroke-width="4" fill="none" stroke-linecap="round"/>';
  }


  const marleyDrool =
    '<path d="M150 248 q-4 30 4 40 q8 -10 2 -40 Z" fill="#cfefff" stroke="#8fc7e6" stroke-width="2"/>' +
    '<circle cx="152" cy="298" r="7" fill="#cfefff" stroke="#8fc7e6" stroke-width="2"/>' +
    '<g fill="#e9f8ff" stroke="#8fc7e6" stroke-width="2"><circle cx="240" cy="258" r="7"/><circle cx="252" cy="250" r="5"/><circle cx="232" cy="266" r="4"/></g>';
  function marleyFace(face) {
    const jowls = '<ellipse cx="200" cy="232" rx="72" ry="40" fill="#fff8ee" stroke="#d6c3a6" stroke-width="2"/>';
    const nose = '<ellipse cx="200" cy="205" rx="28" ry="18" fill="#2a1d18"/><ellipse cx="192" cy="199" rx="8" ry="4" fill="#6b5a52"/>';
    if (face === 'happy') {
      return '<path d="M128 165 Q150 140 172 165" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round"/>' +
        '<path d="M228 165 Q250 140 272 165" stroke="#3a2414" stroke-width="8" fill="none" stroke-linecap="round"/>' +
        jowls +
        '<path d="M130 222 Q200 300 270 222" fill="#3d2a22"/>' + nose +
        '<path d="M178 250 Q200 300 222 250 Z" fill="#ff7f93" stroke="#e0607a" stroke-width="2"/>' +
        marleyDrool;
    }
    const sad = face === 'miss';
    return '<circle cx="150" cy="160" r="' + (sad ? 21 : 19) + '" fill="#fff"/><circle cx="250" cy="160" r="' + (sad ? 21 : 19) + '" fill="#fff"/>' +
      '<circle cx="152" cy="164" r="14" fill="#3a2414"/><circle cx="248" cy="164" r="14" fill="#3a2414"/>' +
      '<circle cx="157" cy="157" r="5.5" fill="#fff"/><circle cx="253" cy="157" r="5.5" fill="#fff"/>' +
      '<circle cx="147" cy="170" r="2.5" fill="#fff"/><circle cx="243" cy="170" r="2.5" fill="#fff"/>' +
      (sad
        ? '<path d="M126 140 Q150 132 172 122" stroke="#2a1a14" stroke-width="5" fill="none" stroke-linecap="round"/>' +
          '<path d="M228 122 Q250 132 274 140" stroke="#6b4a32" stroke-width="5" fill="none" stroke-linecap="round"/>'
        : '<path d="M130 135 Q150 125 168 140" stroke="#2a1a14" stroke-width="5" fill="none" stroke-linecap="round"/>' +
          '<path d="M232 140 Q250 125 270 135" stroke="#6b4a32" stroke-width="5" fill="none" stroke-linecap="round"/>') +
      jowls +
      (sad ? '<path d="M165 252 Q200 232 235 252" stroke="#3d2a22" stroke-width="6" fill="none" stroke-linecap="round"/>'
           : '<path d="M135 225 Q200 285 265 225" fill="#3d2a22" opacity="0.85"/>') +
      nose +
      (sad ? '' : '<path d="M185 248 Q200 280 215 248 Z" fill="#ff7f93"/>') +
      marleyDrool;
  }


  const DOGS = {
    bella: {
      id: 'bella', name: 'Bella',
      blurb: 'Fluffy Goldendoodle. Famous for her RBF stare.',
      power: 'Miss and you get the RBF!',
      color: '#f4efe6',
      outfit: null,
      catchBonus: 1.0,                     // catch zone size multiplier
      voice: { pitch: 1.35, gruff: 0 },    // higher, yappier bark
      parts: bellaParts, headSvg: bellaHead, face: bellaFace,
    },
    marley: {
      id: 'marley', name: 'Marley',
      blurb: 'Chubby, slobbery, lovable goober.',
      power: 'Slobber bonus: drool makes popcorn stick!',
      color: '#e8b27a',
      outfit: null,
      catchBonus: 1.15,
      voice: { pitch: 0.72, gruff: 0.8 },  // lower, gruffer bark
      parts: marleyParts, headSvg: marleyHead, face: marleyFace,
    },
  };
  const FACES = ['normal', 'happy', 'miss'];

  // ---------- turn part SVGs into pictures (offscreen canvases) ----------
  const RES = 2;   // pixels per art unit (sharp enough for phones)
  function svgImage(box, inner) {
    const [x, y, w, h] = box;
    const s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + x + ' ' + y + ' ' + w + ' ' + h +
      '" width="' + (w * RES) + '" height="' + (h * RES) + '">' + inner + '</svg>';
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = w * RES; c.height = h * RES;
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c);
      };
      img.onerror = () => { console.error('dog part failed to load'); resolve(null); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
    });
  }
  const cache = {};
  function load(dogId) {
    if (cache[dogId]) return cache[dogId];
    const d = DOGS[dogId], P = d.parts, out = { faces: {} };
    const jobs = [];
    ['tail', 'backStand', 'backSit', 'body', 'leg', 'paw'].forEach(k =>
      jobs.push(svgImage(P[k].box, P[k].svg).then(c => { out[k] = c; })));
    FACES.forEach(f => jobs.push(svgImage(P.head.box, d.headSvg() + d.face(f)).then(c => { out.faces[f] = c; })));
    if (d.outfit && OUTFITS[d.outfit]) {
      const o = OUTFITS[d.outfit];
      jobs.push(svgImage(o.box, o.svg(dogId)).then(c => { out.outfit = c; out.outfitBox = o.box; }));
    }
    cache[dogId] = Promise.all(jobs).then(() => out);
    return cache[dogId];
  }

  // ---------- tiny 2D matrix so we know where the mouth ends up ----------
  class Mat {
    constructor(a = 1, b = 0, c = 0, d = 1, e = 0, f = 0) { Object.assign(this, { a, b, c, d, e, f }); }
    mul(m) { const t = this; return new Mat(t.a * m.a + t.c * m.b, t.b * m.a + t.d * m.b, t.a * m.c + t.c * m.d, t.b * m.c + t.d * m.d, t.a * m.e + t.c * m.f + t.e, t.b * m.e + t.d * m.f + t.f); }
    apply(x, y) { return { x: this.a * x + this.c * y + this.e, y: this.b * x + this.d * y + this.f }; }
  }
  // does each transform on both the canvas and our matrix
  function T(ctx) {
    const stack = []; let m = new Mat();
    const t = {
      m: () => m,
      save() { stack.push(m); ctx.save(); },
      restore() { m = stack.pop(); ctx.restore(); },
      translate(x, y) { m = m.mul(new Mat(1, 0, 0, 1, x, y)); ctx.translate(x, y); },
      rotate(r) { const c = Math.cos(r), s = Math.sin(r); m = m.mul(new Mat(c, s, -s, c, 0, 0)); ctx.rotate(r); },
      scale(x, y) { m = m.mul(new Mat(x, 0, 0, y, 0, 0)); ctx.scale(x, y); },
      about(px, py, fn) { t.translate(px, py); fn(); t.translate(-px, -py); },
    };
    return t;
  }

  // ---------- POSES ----------
  const BASE = { dy: 0, lean: 0, headRot: 0, headDY: 0, back: 'stand', fl: 0, fls: 0, fr: 0, frs: 0,
    tail: 0, wag: 1, roll: 0, rollX: 0, sx: 1, sy: 1 };
  // fl/fr = front-left/right leg rotation (radians, + = swings outward),
  // fls/frs = leg length (0 = "reach the floor automatically")
  const POSES = {
    stand: {},
    sit: { dy: 30, back: 'sit', tail: 0.5, wag: 0.6 },
    shake: { dy: 30, back: 'sit', fl: 2.3, fls: 0.9, headRot: -0.12, tail: 0.5 },
    shake2: { dy: 30, back: 'sit', fl: 2.65, fls: 0.9, headRot: -0.08, tail: 0.5 },
    stay: { dy: 30, back: 'sit', tail: 0.5, wag: 0 },
    lie: { dy: 55, back: 'sit', fl: 1.15, fls: 0.7, fr: 1.15, frs: 0.7, headDY: 8, wag: 0.3, sy: 0.95 },
    pretty: { dy: -8, back: 'sit', fl: -2.1, fls: 0.42, fr: -2.1, frs: 0.42, headDY: -6, sy: 1.04, tail: 0.4 },
    pretty2: { dy: -14, back: 'sit', fl: -1.85, fls: 0.45, fr: -1.85, frs: 0.45, headDY: -8, headRot: 0.1, sy: 1.05, tail: 0.4 },
    beg: { dy: 0, headRot: 0.22, wag: 0.4 },
  };
  function pose(name, extra) { return Object.assign({}, BASE, POSES[name] || {}, extra || {}); }
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  function lerpPose(a, b, t) {
    const o = {};
    for (const k in BASE) {
      if (k === 'back') o.back = t < 0.5 ? a.back : b.back;
      else o[k] = a[k] + (b[k] - a[k]) * t;
    }
    return o;
  }

  // ---------- TRICKS (keyframes: [seconds, pose]) ----------
  const TRICKS = {
    shake: { name: 'Shake', icon: 'paw', dur: 2.4, keys: [
      [0, pose('stand')], [0.35, pose('sit')], [0.7, pose('shake')], [0.9, pose('shake2')], [1.1, pose('shake')],
      [1.3, pose('shake2')], [1.5, pose('shake')], [1.7, pose('shake2')], [2.05, pose('sit')], [2.4, pose('sit')]] },
    sit: { name: 'Sit', icon: 'sit', dur: 1.4, keys: [[0, pose('stand')], [0.45, pose('sit')], [1.4, pose('sit')]] },
    stay: { name: 'Stay', icon: 'hand', dur: 3.6, keys: [[0, pose('stand')], [0.4, pose('stay')], [3.6, pose('stay')]] },
    rollover: { name: 'Roll Over', icon: 'roll', dur: 2.6, keys: [
      [0, pose('stand')], [0.4, pose('lie')], [0.55, pose('lie')],
      [1.15, pose('lie', { roll: Math.PI, rollX: 40 })], [1.75, pose('lie', { roll: Math.PI * 2, rollX: 0 })],
      [2.2, pose('sit', { roll: Math.PI * 2 })], [2.6, pose('sit', { roll: Math.PI * 2 })]] },
    sitpretty: { name: 'Sit Pretty', icon: 'pretty', dur: 2.8, keys: [
      [0, pose('stand')], [0.35, pose('sit')], [0.8, pose('pretty')], [1.1, pose('pretty2')], [1.4, pose('pretty')],
      [1.7, pose('pretty2')], [2.0, pose('pretty')], [2.4, pose('sit')], [2.8, pose('sit')]] },
  };
  const TRICK_ORDER = ['shake', 'sit', 'stay', 'rollover', 'sitpretty'];
  function trickPose(id, time) {
    const k = TRICKS[id].keys;
    if (time <= k[0][0]) return k[0][1];
    for (let i = 1; i < k.length; i++) {
      if (time <= k[i][0]) {
        const t = (time - k[i - 1][0]) / (k[i][0] - k[i - 1][0]);
        return lerpPose(k[i - 1][1], k[i][1], ease(t));
      }
    }
    return k[k.length - 1][1];
  }

  // ---------- DRAW ----------
  // Draws the dog in art space on ctx (caller sets the transform).
  // Returns where useful points ended up, as matrices relative to the caller's transform.
  // opts: { face, time (seconds, for tail wag), headExtra(ctx) drawn in head space }
  function draw(ctx, dogId, imgs, p, opts) {
    opts = opts || {};
    const d = DOGS[dogId], P = d.parts;
    const t = T(ctx);
    const put = (img, box) => { if (img) ctx.drawImage(img, box[0], box[1], box[2], box[3]); };
    const time = opts.time || 0;
    const info = {};

    t.save();
    // squash & stretch from the feet, then roll around the dog's middle
    t.about(200, GROUND, () => t.scale(p.sx, p.sy));
    t.translate(p.rollX, 0);
    if (p.roll) t.about(200, 250 + p.dy, () => t.rotate(p.roll));

    // tail (behind)
    t.save(); t.translate(0, p.dy);
    const wag = Math.sin(time * 13) * 0.35 * p.wag;
    t.about(P.tail.pivot[0], P.tail.pivot[1], () => t.rotate(p.tail * -0.6 + wag));
    put(imgs.tail, P.tail.box); t.restore();

    // back legs (left, then mirrored right)
    const back = p.back === 'sit' ? imgs.backSit : imgs.backStand;
    const backBox = p.back === 'sit' ? P.backSit.box : P.backStand.box;
    put(back, backBox);
    t.save(); t.translate(400, 0); t.scale(-1, 1); put(back, backBox); t.restore();

    // body
    t.save(); t.translate(0, p.dy);
    t.about(200, 330, () => t.rotate(p.lean));
    put(imgs.body, P.body.box);
    if (imgs.outfit) put(imgs.outfit, imgs.outfitBox);
    info.body = t.m();
    t.restore();

    function leg(side, rot, len) {
      t.save();
      if (side > 0) { t.translate(400, 0); t.scale(-1, 1); }
      t.translate(0, p.dy);
      t.about(200, 330, () => t.rotate(p.lean * side));
      const [px, py] = P.leg.pivot;
      t.translate(px, py); t.rotate(rot);
      const auto = (GROUND - 6 - (py + p.dy)) / LEG_LEN;
      const L = len > 0 ? len : Math.max(0.25, auto / Math.cos(Math.min(1.2, Math.abs(rot))));
      t.save(); t.scale(1, L); t.translate(-px, -py);
      put(imgs.leg, P.leg.box); t.restore();
      t.translate(0, LEG_LEN * L);
      const pb = P.paw.box, pc = P.paw.center;
      ctx.drawImage(imgs.paw, pb[0] - pc[0], pb[1] - pc[1], pb[2], pb[3]);
      t.restore();
    }
    const raised = Math.abs(p.fl) > 1.6 || Math.abs(p.fr) > 1.6;
    const legs = () => { leg(-1, p.fl, p.fls); leg(1, p.fr, p.frs); };
    if (!raised) legs();

    // head
    t.save(); t.translate(0, p.dy + p.headDY);
    t.about(P.head.pivot[0], P.head.pivot[1], () => t.rotate(p.headRot + p.lean));
    put(imgs.faces[opts.face || 'normal'], P.head.box);
    if (opts.headExtra) opts.headExtra(ctx);
    info.head = t.m();
    t.restore();

    if (raised) legs();   // paws up in front of the chest
    t.restore();
    return info;
  }

  function svgPreview(dogId) {   // simple standing picture for menus / icons
    return new Promise(res => load(dogId).then(imgs => {
      const c = document.createElement('canvas'); c.width = 400 * RES; c.height = 420 * RES;
      const x = c.getContext('2d'); x.scale(RES, RES); draw(x, dogId, imgs, pose('stand'), { time: 0.3 }); res(c);
    }));
  }

  window.PTD = window.PTD || {};
  Object.assign(window.PTD, {
    DOGS, OUTFITS, TRICKS, TRICK_ORDER, POSES, BASE,
    load, draw, pose, lerpPose, trickPose, svgPreview, Mat,
    MOUTH: { x: 200, y: 238 },     // mouth, in head space
    DROOL: { x: 152, y: 302 },     // Marley's drool drip point, head space
    ART_W: 400, ART_H: 420, GROUND,
  });
})();
