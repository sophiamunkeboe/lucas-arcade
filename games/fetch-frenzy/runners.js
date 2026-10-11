/* Fetch Frenzy - side-view RUNNING dogs (facing right), built from parts like Gorda's run rig in
   ../pop-the-dog/gorda.js (same 300 x 200 art space, ground at y = 196, same leg pivots), so all four
   dogs share one animation rig:
     bella   - fluffy cream Goldendoodle, black collar
     marley  - chubby tan + white goober in her Suns-style #4 jersey (she/her)
     gorda   - Marley's sister: dark brindle, white blaze/chest/paws, pink-red collar (reuses Gorda's art)
     biscuit - the neighbor's golden dog (the ball thief when Gorda is the one playing)
   FF.Runners.load(id) -> Promise<imgs>;  FF.Runners.draw(ctx, imgs, st, carry)
   st: { legs:[backFar, backNear, frontFar, frontNear], frontLen, bodyDY, bodyRot, headRot, tail, face, mud }
   carry(ctx) is called in head space so a toy can be drawn in the dog's mouth (mouth at FF.Runners.MOUTH). */
(function () {
  const HIP = [112, 116], SHOULDER = [196, 116];
  const RP = {
    body: { box: [40, 54, 210, 112] },
    tail: { box: [40, 50, 60, 70] },
    leg: { box: [0, 0, 40, 82], pivot: [20, 6] },
    head: { box: [180, 30, 116, 104], pivot: [214, 104] },
  };
  const MOUTH = [270, 108];

  const curls = (pts, r, fill, stroke) => pts.map(p =>
    '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (p[2] || r) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"/>').join('');
  const ring = (cx, cy, rx, ry, n, r, fill, stroke, from, to) => {
    const pts = [];
    for (let i = 0; i < n; i++) { const a = from + (to - from) * i / (n - 1); pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, r]); }
    return curls(pts, r, fill, stroke);
  };

  // ---- generic pieces ----
  function leg(c, paw, stroke, fluffy) {
    if (fluffy) return '<rect x="6" y="0" width="28" height="72" rx="13" fill="' + c + '" stroke="' + stroke + '" stroke-width="2.5"/>' +
      '<ellipse cx="22" cy="72" rx="15" ry="8" fill="' + paw + '" stroke="' + stroke + '" stroke-width="2"/>' +
      '<path d="M12 30 q5 4 0 8 M28 44 q-5 4 0 8" stroke="' + stroke + '" stroke-width="2" fill="none"/>';
    return '<rect x="9" y="0" width="22" height="70" rx="10" fill="' + c + '" stroke="' + stroke + '" stroke-width="2.5"/>' +
      '<rect x="10.5" y="48" width="19" height="21" rx="7" fill="' + paw + '"/>' +
      '<ellipse cx="22" cy="72" rx="13" ry="7" fill="' + paw + '" stroke="#b9a996" stroke-width="2"/>';
  }
  function eyes(face, cx, cy) {
    return face === 'happy'
      ? '<path d="M' + (cx - 7) + ' ' + (cy + 1) + ' Q' + cx + ' ' + (cy - 7) + ' ' + (cx + 7) + ' ' + (cy + 1) + '" stroke="#1a110b" stroke-width="4" fill="none" stroke-linecap="round"/>'
      : '<circle cx="' + cx + '" cy="' + cy + '" r="7" fill="#fff"/><circle cx="' + (cx + 1) + '" cy="' + (cy + 1) + '" r="5" fill="#1a110b"/><circle cx="' + (cx + 3) + '" cy="' + (cy - 1) + '" r="1.8" fill="#fff"/>';
  }
  const tongue = face => face === 'happy' ? '<path d="M258 104 Q266 124 276 104 Z" fill="#ff7f93" stroke="#e0607a" stroke-width="1.5"/>' : '';

  // ---- dogs ----
  const SPEC = {
    bella: {
      body: () => {
        const C = '#f9f4ea', S = '#c4b79e';
        return ring(152, 112, 76, 38, 15, 13, C, S, Math.PI * 0.95, Math.PI * 2.05) +
          ring(152, 116, 72, 34, 9, 12, C, S, Math.PI * 0.15, Math.PI * 0.85) +
          '<ellipse cx="152" cy="112" rx="76" ry="38" fill="' + C + '"/>' +
          '<g fill="none" stroke="#ddd2bf" stroke-width="2.5" stroke-linecap="round">' +
          '<path d="M110 100 q6 -6 12 0 M140 92 q6 -6 12 0 M170 98 q6 -6 12 0 M124 120 q6 -6 12 0 M158 124 q6 -6 12 0"/></g>';
      },
      tail: '<path d="M86 102 Q64 92 66 70" stroke="#c4b79e" stroke-width="20" fill="none" stroke-linecap="round"/>' +
        '<path d="M86 102 Q64 92 66 70" stroke="#f9f4ea" stroke-width="15" fill="none" stroke-linecap="round"/>' +
        curls([[66, 66, 10], [58, 76, 8], [74, 72, 8]], 8, '#f9f4ea', '#c4b79e'),
      leg: [ '#f9f4ea', '#f9f4ea', '#c4b79e', true ], legFar: [ '#e9e0cf', '#e9e0cf', '#b9ab90', true ],
      head: face => {
        const C = '#f9f4ea', S = '#c4b79e';
        return '<path d="M196 96 L222 118" stroke="#2b2b2b" stroke-width="12" stroke-linecap="round"/>' +     // black collar
          '<circle cx="217" cy="120" r="5" fill="#e2b33c" stroke="#a37a1c" stroke-width="1.5"/>' +
          ring(232, 76, 34, 32, 11, 12, C, S, Math.PI * 0.9, Math.PI * 2.1) +
          '<circle cx="232" cy="80" r="34" fill="' + C + '"/>' +
          '<ellipse cx="258" cy="96" rx="24" ry="17" fill="#fffaf0" stroke="#d8ccb6" stroke-width="2"/>' +
          '<ellipse cx="278" cy="89" rx="9" ry="7" fill="#1d130d"/>' + eyes(face, 246, 72) + tongue(face) +
          '<path d="M252 106 Q262 112 274 104" stroke="#5b4636" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
          // long fluffy ear
          '<path d="M216 56 Q192 56 196 92 Q198 110 210 108 Q222 104 222 84 Q224 66 230 60 Z" fill="#efe4d0" stroke="' + S + '" stroke-width="2.5"/>' +
          curls([[200, 100, 7], [212, 104, 7], [204, 88, 6]], 7, '#efe4d0', S);
      },
    },
    marley: {
      body: () => '<defs><clipPath id="mbody"><ellipse cx="152" cy="112" rx="78" ry="41"/></clipPath></defs>' +
        '<ellipse cx="152" cy="112" rx="78" ry="41" fill="#d9a066" stroke="#a9733f" stroke-width="3"/>' +
        '<g clip-path="url(#mbody)">' +
        '<path d="M118 60 L240 60 L240 170 L112 170 Q104 112 118 60 Z" fill="#5a2d91"/>' +                    // jersey
        '<path d="M118 60 L132 60 Q120 112 126 170 L112 170 Q104 112 118 60 Z" fill="#f47b20"/>' +           // orange side trim
        '<path d="M112 150 L240 150" stroke="#f47b20" stroke-width="8"/>' +
        '<path d="M112 145 L240 145" stroke="#fff" stroke-width="2.5"/></g>' +
        '<text x="176" y="128" text-anchor="middle" font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" font-size="38" fill="#f47b20" stroke="#fff" stroke-width="3" paint-order="stroke">4</text>' +
        '<ellipse cx="152" cy="112" rx="78" ry="41" fill="none" stroke="#a9733f" stroke-width="3"/>' +
        '<ellipse cx="214" cy="124" rx="16" ry="20" fill="#fff8ee" opacity=".0"/>',
      tail: '<path d="M84 104 Q62 98 60 78" stroke="#a9733f" stroke-width="12" fill="none" stroke-linecap="round"/>' +
        '<path d="M84 104 Q62 98 60 78" stroke="#d9a066" stroke-width="7" fill="none" stroke-linecap="round"/>',
      leg: [ '#d9a066', '#fff8ee', '#a9733f' ], legFar: [ '#c08a52', '#e9dcc6', '#8d5f33' ],
      head: face => '<path d="M200 94 L222 118" stroke="#5a2d91" stroke-width="13" stroke-linecap="round"/>' +   // jersey collar
        '<path d="M200 94 L222 118" stroke="#f47b20" stroke-width="4" stroke-linecap="round"/>' +
        '<circle cx="232" cy="80" r="37" fill="#d9a066" stroke="#a9733f" stroke-width="3"/>' +
        '<path d="M236 44 Q246 44 248 52 L254 84 L232 86 Z" fill="#fff8ee"/>' +                                     // white blaze
        '<ellipse cx="246" cy="72" rx="13" ry="12" fill="#3d2a22"/>' +                                              // eye patch
        '<ellipse cx="258" cy="96" rx="27" ry="19" fill="#fff8ee" stroke="#d6c3a6" stroke-width="2"/>' +          // big jowls
        '<ellipse cx="280" cy="88" rx="10" ry="7" fill="#2a1d18"/>' + eyes(face, 246, 72) + tongue(face) +
        '<path d="M250 108 Q262 114 276 106" stroke="#5b4636" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
        '<path d="M214 52 Q196 50 198 74 Q206 78 212 72 Q214 60 224 56 Z" fill="#4a2e22" stroke="#3a2418" stroke-width="2"/>',  // folded ear
    },
    biscuit: {
      body: () => '<ellipse cx="152" cy="112" rx="74" ry="36" fill="#e0a245" stroke="#a8701e" stroke-width="3"/>' +
        '<ellipse cx="206" cy="122" rx="22" ry="25" fill="#f3d08a"/>' +
        '<path d="M100 140 q10 10 20 0 q10 10 20 0 q10 10 20 0" stroke="#c98a2e" stroke-width="3" fill="none"/>',
      tail: '<path d="M84 104 Q60 100 52 80" stroke="#a8701e" stroke-width="16" fill="none" stroke-linecap="round"/>' +
        '<path d="M84 104 Q60 100 52 80" stroke="#e0a245" stroke-width="11" fill="none" stroke-linecap="round"/>' +
        '<path d="M72 102 l-6 10 M62 96 l-8 8 M56 88 l-9 4" stroke="#c98a2e" stroke-width="3"/>',
      leg: [ '#e0a245', '#f3d08a', '#a8701e' ], legFar: [ '#c98a2e', '#e2bd72', '#8d5c18' ],
      head: face => '<path d="M200 92 L222 116" stroke="#2f7de1" stroke-width="12" stroke-linecap="round"/>' +   // blue collar
        '<circle cx="216" cy="118" r="5" fill="#cfd8dc" stroke="#7a8a92" stroke-width="1.5"/>' +
        '<circle cx="232" cy="80" r="34" fill="#e0a245" stroke="#a8701e" stroke-width="3"/>' +
        '<ellipse cx="260" cy="95" rx="24" ry="16" fill="#f3d08a" stroke="#c98a2e" stroke-width="2"/>' +
        '<ellipse cx="280" cy="88" rx="9" ry="7" fill="#1d130d"/>' + eyes(face, 245, 71) + tongue(face) +
        '<path d="M252 104 Q262 110 274 102" stroke="#7a4b1a" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
        '<path d="M218 54 Q194 54 196 96 Q204 104 214 96 Q218 72 230 60 Z" fill="#c98a2e" stroke="#8d5c18" stroke-width="2.5"/>',
    },
  };

  const cache = {};
  function load(id) {
    if (cache[id]) return cache[id];
    if (id === 'gorda') return (cache[id] = PTD.Gorda.loadRun().then(g => Object.assign({ gorda: true }, g)));
    const sp = SPEC[id], mk = PTD.svgImage, out = {};
    const LB = [0, 0, 40, 82];
    cache[id] = Promise.all([
      mk(RP.body.box, sp.body()).then(c => { out.body = c; out.bodyBox = RP.body.box; }),
      mk(RP.tail.box, sp.tail).then(c => { out.tail = c; out.tailBox = RP.tail.box; }),
      mk(LB, leg.apply(null, sp.leg)).then(c => { out.leg = c; }),
      mk(LB, leg.apply(null, sp.legFar)).then(c => { out.legFar = c; }),
      mk(RP.head.box, sp.head('open')).then(c => { out.open = c; out.headBox = RP.head.box; }),
      mk(RP.head.box, sp.head('happy')).then(c => { out.happy = c; }),
    ]).then(() => out);
    return cache[id];
  }

  // Gorda's own parts use slightly smaller boxes (from gorda.js)
  const GBOX = { body: [72, 70, 164, 84], tail: [52, 66, 44, 46], head: [192, 40, 102, 90] };

  function draw(ctx, imgs, st, carry) {
    const put = (img, b) => { if (img) ctx.drawImage(img, b[0], b[1], b[2], b[3]); };
    const bodyBox = imgs.bodyBox || GBOX.body, tailBox = imgs.tailBox || GBOX.tail, headBox = imgs.headBox || GBOX.head;
    const legAt = (img, at, ang, len, dx) => {
      ctx.save(); ctx.translate(at[0] + dx, at[1]); ctx.rotate(ang); ctx.scale(1, len || 1);
      ctx.translate(-RP.leg.pivot[0], -RP.leg.pivot[1]); put(img, RP.leg.box); ctx.restore();
    };
    const mud = (alpha, spots) => {
      if (!alpha) return;
      ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#6b4a2b';
      spots.forEach(s => { ctx.beginPath(); ctx.ellipse(s[0], s[1], s[2], s[2] * 0.7, 0.3, 0, 7); ctx.fill(); });
      ctx.restore();
    };
    ctx.save();
    ctx.translate(0, st.bodyDY || 0);
    ctx.translate(HIP[0], HIP[1]); ctx.rotate(st.bodyRot || 0); ctx.translate(-HIP[0], -HIP[1]);
    legAt(imgs.legFar, HIP, st.legs[0], 1, 10);
    legAt(imgs.legFar, SHOULDER, st.legs[2], st.frontLen, -10);
    ctx.save(); ctx.translate(84, 104); ctx.rotate(st.tail || 0); ctx.translate(-84, -104); put(imgs.tail, tailBox); ctx.restore();
    put(imgs.body, bodyBox);
    mud(st.mud, [[110, 138, 9], [140, 146, 7], [176, 142, 8], [96, 124, 6]]);
    legAt(imgs.leg, HIP, st.legs[1], 1, -6);
    legAt(imgs.leg, SHOULDER, st.legs[3], st.frontLen, 6);
    if (st.mud) {   // muddy paws
      [[HIP, st.legs[1], -6], [SHOULDER, st.legs[3], 6]].forEach(([at, ang, dx]) => {
        ctx.save(); ctx.translate(at[0] + dx, at[1]); ctx.rotate(ang); ctx.translate(-20, -6);
        mud(st.mud, [[22, 72, 12], [16, 62, 7]]); ctx.restore();
      });
    }
    ctx.save(); ctx.translate(RP.head.pivot[0], RP.head.pivot[1]); ctx.rotate(st.headRot || 0); ctx.translate(-RP.head.pivot[0], -RP.head.pivot[1]);
    put(imgs[st.face] || imgs.open, headBox);
    if (carry) carry(ctx);
    ctx.restore();
    ctx.restore();
  }

  window.FF = window.FF || {};
  window.FF.Runners = { load, draw, MOUTH, GROUND: 196 };
})();
