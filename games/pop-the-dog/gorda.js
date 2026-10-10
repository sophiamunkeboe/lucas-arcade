/* Pop the Dog - GORDA, Marley's sister, lounging on the couch in the background.
   Not playable (yet!). Dark brindle bulldog, white blaze, white chest + paws, droopy ears,
   pink/red collar. Drawn from parts in a 300 x 230 art space (paws on the couch at y = 225).
   game.js moves her: sleeping, ear twitches, blinks, lifting her head to watch popcorn,
   and perking up when the dog POPS. */
(function () {
  const BRINDLE = '<defs><pattern id="br" width="16" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">' +
    '<rect width="16" height="60" fill="#4a3426"/><rect x="2" width="4" height="60" fill="#34241a"/>' +
    '<rect x="10" width="2" height="60" fill="#5f4532"/></pattern></defs>';
  const OUT = 'stroke="#20150e" stroke-width="3"';

  const BODY = BRINDLE +
    '<ellipse cx="236" cy="170" rx="46" ry="42" fill="url(#br)" ' + OUT + '/>' +            // hip
    '<path d="M276 178 q16 -4 14 -18" stroke="#2b1c13" stroke-width="8" fill="none" stroke-linecap="round"/>' +  // tail nub
    '<ellipse cx="150" cy="182" rx="118" ry="44" fill="url(#br)" ' + OUT + '/>' +           // body loaf
    '<ellipse cx="150" cy="186" rx="44" ry="32" fill="#fbf6ee"/>' +                           // white chest
    '<g fill="#fbf6ee" stroke="#cdbfae" stroke-width="2.5">' +
    '<ellipse cx="116" cy="214" rx="24" ry="12"/><ellipse cx="184" cy="214" rx="24" ry="12"/></g>' +
    '<path d="M106 210 v8 M116 209 v9 M126 210 v8 M174 210 v8 M184 209 v9 M194 210 v8" stroke="#cdbfae" stroke-width="2"/>';

  const EAR = '<path d="M112 70 Q80 60 76 96 Q78 104 86 100 Q100 86 118 82 Z" fill="#2b1c13" stroke="#20150e" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M108 76 Q90 74 86 92" stroke="#5a4030" stroke-width="3" fill="none" stroke-linecap="round"/>';

  function head(face) {
    let eyes;
    if (face === 'sleep') {
      eyes = '<path d="M114 108 Q124 116 134 108 M166 108 Q176 116 186 108" stroke="#1a110b" stroke-width="4" fill="none" stroke-linecap="round"/>';
    } else {
      const r = face === 'wide' ? 11 : 8;
      eyes = '<circle cx="124" cy="106" r="' + (r + 3) + '" fill="#fff"/><circle cx="176" cy="106" r="' + (r + 3) + '" fill="#fff"/>' +
        '<circle cx="125" cy="107" r="' + r + '" fill="#1a110b"/><circle cx="175" cy="107" r="' + r + '" fill="#1a110b"/>' +
        '<circle cx="128" cy="103" r="3" fill="#fff"/><circle cx="178" cy="103" r="3" fill="#fff"/>' +
        (face === 'wide'
          ? '<path d="M110 86 Q124 76 138 86 M162 86 Q176 76 190 86" stroke="#d9c7b0" stroke-width="4" fill="none" stroke-linecap="round"/>'
          : '<path d="M112 92 Q124 88 136 94 M164 94 Q176 88 188 92" stroke="#d9c7b0" stroke-width="4" fill="none" stroke-linecap="round"/>');
    }
    return BRINDLE +
      '<rect x="104" y="150" width="92" height="16" rx="8" fill="#e0436b" stroke="#a82a4a" stroke-width="2"/>' +   // pink/red collar
      '<circle cx="150" cy="168" r="6" fill="#e2b33c" stroke="#a37a1c" stroke-width="1.5"/>' +
      '<ellipse cx="150" cy="112" rx="62" ry="52" fill="url(#br)" ' + OUT + '/>' +
      '<path d="M142 62 Q150 58 158 62 L162 104 Q190 118 184 142 Q150 162 116 142 Q110 118 138 104 Z" fill="#fbf6ee"/>' +  // white blaze + muzzle
      eyes +
      '<ellipse cx="150" cy="122" rx="14" ry="9" fill="#1d130d"/><ellipse cx="146" cy="119" rx="4" ry="2" fill="#6b5a52"/>' +
      '<path d="M150 131 v8 M130 140 Q150 152 170 140" stroke="#5b4636" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M122 136 Q128 150 140 146 M178 136 Q172 150 160 146" stroke="#cdbfae" stroke-width="2" fill="none"/>';
  }

  const P = {
    body: { box: [26, 120, 270, 110] },
    ear: { box: [70, 54, 54, 54], pivot: [112, 74] },
    head: { box: [84, 56, 132, 120], pivot: [150, 160] },
  };
  let loading = null;
  function load() {
    if (loading) return loading;
    const out = {}, mk = PTD.svgImage;
    loading = Promise.all([
      mk(P.body.box, BODY).then(c => { out.body = c; }),
      mk(P.ear.box, EAR).then(c => { out.ear = c; }),
      ...['sleep', 'open', 'wide'].map(f => mk(P.head.box, head(f)).then(c => { out[f] = c; })),
    ]).then(() => out);
    return loading;
  }

  // st: { breathe (0..1), headDY, headRot, face, earL, earR }
  function draw(ctx, imgs, st) {
    const put = (img, b) => ctx.drawImage(img, b[0], b[1], b[2], b[3]);
    ctx.save();
    // body (breathing)
    ctx.save(); ctx.translate(150, 225); ctx.scale(1 + st.breathe * 0.015, 1 + st.breathe * 0.04); ctx.translate(-150, -225);
    put(imgs.body, P.body.box); ctx.restore();
    // head + ears
    ctx.save(); ctx.translate(0, st.headDY);
    ctx.translate(P.head.pivot[0], P.head.pivot[1]); ctx.rotate(st.headRot); ctx.translate(-P.head.pivot[0], -P.head.pivot[1]);
    const ear = (side, r) => {
      ctx.save(); if (side > 0) { ctx.translate(300, 0); ctx.scale(-1, 1); }
      ctx.translate(P.ear.pivot[0], P.ear.pivot[1]); ctx.rotate(-r); ctx.translate(-P.ear.pivot[0], -P.ear.pivot[1]);
      put(imgs.ear, P.ear.box); ctx.restore();
    };
    put(imgs[st.face] || imgs.sleep, P.head.box);
    ear(-1, st.earL); ear(1, st.earR);
    ctx.restore();
    ctx.restore();
  }

  window.PTD = window.PTD || {};
  window.PTD.Gorda = { load, draw, ART_W: 300, BASE_Y: 225 };
})();
