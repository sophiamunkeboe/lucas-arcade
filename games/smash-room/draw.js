/* Smash Room - drawings for every throwable / tool (plain canvas paths, all in a box about 100 x 100 centered on 0,0)
   SR.item(ctx, kind, size, opts)   size = pixels across        SR.TOOLS = the list for the bottom bar */
(function () {
  const TOOLS = [
    { id: 'dish', name: 'Dishes', pts: 10, glass: true },
    { id: 'pie', name: 'Cream pie', pts: 8, splat: '#fffdf2' },
    { id: 'balloon', name: 'Water balloon', pts: 8, splash: true },
    { id: 'golden', name: 'Golden plate', pts: 100, glass: true },
    { id: 'tv', name: 'TV', pts: 40, heavy: true },
    { id: 'printer', name: 'Printer', pts: 50, heavy: true },
    { id: 'bottle', name: 'Bottles', pts: 15, glass: true },
    { id: 'bowling', name: 'Bowling ball', pts: 30, heavy: true },
    { id: 'pinata', name: 'Pi\u00f1ata', pts: 60, hang: true },
    { id: 'bubble', name: 'Bubble wrap', pts: 1, wrap: true },
    { id: 'bat', name: 'Bat', pts: 5, melee: true },
    { id: 'hammer', name: 'Sledge', pts: 8, melee: true },
    { id: 'hose', name: 'Fire hose', pts: 0, spray: true },
    { id: 'paint', name: 'Paintball', pts: 2, colors: true },
    { id: 'goo', name: 'Goo gun', pts: 0, colors: true, draw: true },
  ];
  const COLORS = ['#7dff3a', '#ff3d7f', '#3dc8ff', '#ffd23f', '#a259ff', '#ff8a3d', '#ffffff'];

  function circle(c, x, y, r, fill, stroke, lw) { c.beginPath(); c.arc(x, y, r, 0, 7); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.lineWidth = lw || 3; c.strokeStyle = stroke; c.stroke(); } }
  function rr(c, x, y, w, h, r, fill, stroke, lw) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.lineWidth = lw || 3; c.strokeStyle = stroke; c.stroke(); }
  }

  const DRAW = {
    dish(c) { circle(c, 0, 0, 46, '#fff', '#b9c3d0', 4); circle(c, 0, 0, 30, '#f3f6fa', '#d5dce6', 3); },
    china(c) {
      circle(c, 0, 0, 46, '#fff', '#2f5bb5', 4); circle(c, 0, 0, 38, null, '#d4a628', 3); circle(c, 0, 0, 26, '#fbfdff', '#2f5bb5', 2);
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; circle(c, Math.cos(a) * 33, Math.sin(a) * 33, 4, '#2f5bb5'); }
      circle(c, 0, 0, 8, '#4f7fe0'); [0, 1.6, 3.2, 4.8].forEach(a => circle(c, Math.cos(a) * 12, Math.sin(a) * 12, 5, '#7fa6f5'));
    },
    rubber(c) { circle(c, 0, 0, 46, '#ffe8f2', '#ff7fb0', 4); circle(c, 0, 0, 30, '#fff4f9', '#ffb0d0', 3); },
    golden(c) {
      const g = c.createRadialGradient(-14, -14, 4, 0, 0, 48); g.addColorStop(0, '#fff6c4'); g.addColorStop(0.5, '#ffd23f'); g.addColorStop(1, '#b8860b');
      circle(c, 0, 0, 46, g, '#8a6a10', 4); circle(c, 0, 0, 30, null, '#fff3a0', 3);
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-22, -26); c.lineTo(-18, -18); c.lineTo(-10, -16); c.lineTo(-18, -12); c.lineTo(-22, -4); c.lineTo(-24, -12); c.lineTo(-32, -16); c.lineTo(-24, -18); c.fill();
    },
    pie(c) {
      c.fillStyle = '#c8ccd2'; c.beginPath(); c.moveTo(-46, 4); c.lineTo(46, 4); c.lineTo(38, 26); c.lineTo(-38, 26); c.closePath(); c.fill();
      c.strokeStyle = '#8f949c'; c.lineWidth = 3; c.stroke();
      c.fillStyle = '#d99a4e'; c.fillRect(-44, -4, 88, 10);
      c.fillStyle = '#fffdf2'; c.beginPath(); for (let i = -4; i <= 4; i++) c.arc(i * 10, -8 - (i % 2 ? 6 : 12), 10, 0, 7); c.fill();
      circle(c, 0, -26, 7, '#e0223a');
    },
    balloon(c, o) {
      const col = (o && o.color) || '#3dc8ff';
      c.fillStyle = col; c.beginPath(); c.ellipse(0, -6, 34, 40, 0, 0, 7); c.fill(); c.strokeStyle = '#0003'; c.lineWidth = 3; c.stroke();
      c.fillStyle = col; c.beginPath(); c.moveTo(-6, 36); c.lineTo(6, 36); c.lineTo(0, 30); c.fill();
      c.fillStyle = '#ffffff99'; c.beginPath(); c.ellipse(-12, -22, 8, 13, -0.5, 0, 7); c.fill();
    },
    tv(c) {
      rr(c, -48, -34, 96, 68, 8, '#3a3a44', '#15151c', 4); rr(c, -40, -27, 70, 54, 6, '#6fd3ff'); 
      c.fillStyle = '#ffffff88'; c.beginPath(); c.moveTo(-36, -22); c.lineTo(-10, -22); c.lineTo(-30, 10); c.closePath(); c.fill();
      circle(c, 40, -14, 4, '#ffd23f'); circle(c, 40, 0, 4, '#ff3d7f');
      c.strokeStyle = '#15151c'; c.lineWidth = 4; c.beginPath(); c.moveTo(-14, -34); c.lineTo(-28, -50); c.moveTo(4, -34); c.lineTo(20, -52); c.stroke();
    },
    printer(c) {
      rr(c, -30, -46, 60, 26, 3, '#fff', '#bbb', 2);
      rr(c, -48, -26, 96, 46, 8, '#e9edf2', '#8a94a3', 4); rr(c, -38, 14, 76, 18, 4, '#cfd6df', '#8a94a3', 3);
      c.fillStyle = '#3a3a44'; c.fillRect(-36, -16, 40, 8); circle(c, 34, -12, 4, '#31c46c');
    },
    bottle(c, o) {
      const col = (o && o.color) || '#2fa04f';
      c.fillStyle = col; c.globalAlpha = 0.9; c.beginPath(); c.moveTo(-8, -48); c.lineTo(8, -48); c.lineTo(8, -24); c.quadraticCurveTo(22, -16, 22, 0); c.lineTo(22, 44); c.lineTo(-22, 44); c.lineTo(-22, 0); c.quadraticCurveTo(-22, -16, -8, -24); c.closePath(); c.fill(); c.globalAlpha = 1;
      c.strokeStyle = '#0004'; c.lineWidth = 3; c.stroke(); c.fillStyle = '#fff7'; c.fillRect(-15, -6, 6, 40);
      rr(c, -16, 4, 32, 22, 3, '#fff3d4');
    },
    bowling(c) { circle(c, 0, 0, 44, '#2d1f6b', '#120a33', 4); circle(c, -10, -18, 6, '#120a33'); circle(c, 8, -20, 6, '#120a33'); circle(c, -1, -4, 6, '#120a33'); c.fillStyle = '#ffffff44'; c.beginPath(); c.ellipse(16, 14, 10, 18, 0.6, 0, 7); c.fill(); },
    pinata(c) {
      const cols = ['#ff3d7f', '#ffd23f', '#3dc8ff', '#7dff3a', '#a259ff'];
      for (let i = 0; i < 5; i++) { c.fillStyle = cols[i]; c.fillRect(-36, -14 + i * 7, 60, 7); }
      for (let i = 0; i < 5; i++) { c.fillStyle = cols[(i + 2) % 5]; c.fillRect(-36 + i * 4, 21, 5, 22); c.fillRect(10 - i * 0 + i * 3, 21, 5, 22); }
      for (let i = 0; i < 4; i++) { c.fillStyle = cols[(i + 1) % 5]; c.fillRect(18, -40 + i * 7, 16, 7); }
      c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(34, -40); c.lineTo(48, -34); c.lineTo(34, -26); c.fill();
      circle(c, 28, -34, 3, '#222');
      c.fillStyle = '#ff3d7f'; c.beginPath(); c.moveTo(20, -40); c.lineTo(22, -54); c.lineTo(28, -40); c.fill();
      c.strokeStyle = '#ff3d7f'; c.lineWidth = 3; c.beginPath(); c.moveTo(-36, -8); c.quadraticCurveTo(-48, -10, -46, 6); c.stroke();
    },
    bubble(c) {
      rr(c, -46, -40, 92, 80, 8, '#d9f3ffcc', '#8ccbe6', 3);
      for (let y = -28; y <= 28; y += 19) for (let x = -34; x <= 34; x += 17) { circle(c, x, y, 7, '#ffffffcc', '#9fd7ee', 2); }
    },
    bat(c) { c.save(); c.rotate(-0.8); rr(c, -8, -50, 16, 100, 8, '#c98b4c', '#7a4a1c', 3); rr(c, -5, 26, 10, 26, 3, '#3a3a44'); circle(c, 0, 52, 8, '#7a4a1c'); c.restore(); },
    hammer(c) { c.save(); c.rotate(-0.6); rr(c, -6, -20, 12, 72, 5, '#c98b4c', '#7a4a1c', 3); rr(c, -34, -48, 68, 32, 6, '#7a8494', '#3f4652', 4); c.restore(); },
    hose(c) {
      c.strokeStyle = '#e0223a'; c.lineWidth = 14; c.lineCap = 'round'; c.beginPath(); c.moveTo(-40, 40); c.quadraticCurveTo(-46, -6, -4, -6); c.lineTo(20, -6); c.stroke();
      rr(c, 14, -18, 34, 24, 5, '#d4a628', '#8a6a10', 3); c.fillStyle = '#6fd3ff'; c.beginPath(); c.moveTo(48, -10); c.lineTo(62, -24); c.lineTo(62, 4); c.fill();
    },
    paint(c, o) {
      rr(c, -44, -14, 76, 22, 8, '#3a3a44', '#15151c', 3); rr(c, -24, 4, 16, 34, 5, '#3a3a44', '#15151c', 3);
      circle(c, -20, -26, 16, (o && o.color) || '#ff3d7f', '#15151c', 3); rr(c, 32, -8, 16, 10, 3, '#15151c');
    },
    goo(c, o) {
      const col = (o && o.color) || '#7dff3a';
      rr(c, -40, -16, 66, 28, 12, '#ff8a3d', '#a8461a', 3); rr(c, -22, 8, 16, 30, 6, '#ff8a3d', '#a8461a', 3);
      c.fillStyle = col; c.beginPath(); c.ellipse(-20, -30, 16, 20, 0, 0, 7); c.fill(); c.strokeStyle = '#0005'; c.lineWidth = 3; c.stroke();
      rr(c, 26, -8, 18, 12, 4, '#3dc8ff', '#15151c', 2);
      circle(c, 52, 0, 5, col); circle(c, 54, 12, 3, col);
    },
    duck(c) {
      c.fillStyle = '#ffd23f'; c.beginPath(); c.ellipse(0, 12, 40, 26, 0, 0, 7); c.fill(); c.beginPath(); c.arc(22, -18, 20, 0, 7); c.fill();
      c.strokeStyle = '#d4a628'; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 12, 40, 26, 0, 0, 7); c.stroke();
      c.fillStyle = '#ff8a3d'; c.beginPath(); c.moveTo(38, -18); c.lineTo(56, -12); c.lineTo(38, -8); c.fill();
      circle(c, 26, -24, 4, '#222'); c.fillStyle = '#f2b800'; c.beginPath(); c.ellipse(-6, 8, 18, 10, -0.3, 0, 7); c.fill();
    },
    cake(c) {
      c.fillStyle = '#ffe9c4'; c.beginPath(); c.moveTo(-30, 20); c.lineTo(30, 20); c.lineTo(30, -6); c.lineTo(-30, 8); c.closePath(); c.fill();
      c.fillStyle = '#ff7fb0'; c.beginPath(); c.moveTo(-32, 8); c.lineTo(32, -8); c.lineTo(32, -16); c.lineTo(-32, 0); c.closePath(); c.fill();
      c.fillStyle = '#7a3b1c'; c.fillRect(-30, 10, 60, 4); circle(c, 20, -18, 6, '#e0223a');
    },
  };

  function item(c, kind, size, opts) {
    const f = DRAW[kind]; if (!f) return;
    c.save(); c.scale(size / 100, size / 100); f(c, opts); c.restore();
  }

  // the brick wall + floor, drawn once per screen size
  function room(c, W, wallH, H) {
    c.fillStyle = '#7a2e22'; c.fillRect(0, 0, W, wallH);
    const bh = Math.max(16, Math.round(W / 20)), bw = bh * 2.3;
    let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let y = 0, row = 0; y < wallH; y += bh, row++) {
      for (let x = row % 2 ? -bw / 2 : 0; x < W; x += bw) {
        const l = 30 + r() * 14, h = 8 + r() * 6;
        c.fillStyle = 'hsl(' + h + ',52%,' + l + '%)'; c.fillRect(x + 2, y + 2, bw - 4, bh - 4);
        c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(x + 2, y + 2, bw - 4, 3);
      }
    }
    // dark at the top (dim room) so the neon pops
    const g = c.createLinearGradient(0, 0, 0, wallH); g.addColorStop(0, 'rgba(10,0,20,.62)'); g.addColorStop(0.45, 'rgba(10,0,20,.25)'); g.addColorStop(1, 'rgba(0,0,0,.1)');
    c.fillStyle = g; c.fillRect(0, 0, W, wallH);
    // baseboard + floor (concrete)
    c.fillStyle = '#2a1d1d'; c.fillRect(0, wallH - 8, W, 8);
    const f = c.createLinearGradient(0, wallH, 0, H); f.addColorStop(0, '#6e6a66'); f.addColorStop(1, '#a29d96');
    c.fillStyle = f; c.fillRect(0, wallH, W, H - wallH);
    c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = 2;
    for (let i = -6; i <= 6; i++) { c.beginPath(); c.moveTo(W / 2 + i * W * 0.09, wallH); c.lineTo(W / 2 + i * W * 0.3, H); c.stroke(); }
    // hazard stripe "SMASH ZONE"
    c.fillStyle = 'rgba(255,210,63,.35)'; c.fillRect(0, wallH + 4, W, 6);
  }

  window.SR = { TOOLS, COLORS, item, room, rr, circle };
})();
