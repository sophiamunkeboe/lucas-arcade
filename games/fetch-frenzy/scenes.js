/* Fetch Frenzy - scenery, toys and the squirrel (all canvas drawing, no image files).
   Locations: backyard, park, lake (cloudy sunset, calm water, grassy shore, big red/grey rocks -
   inspired by Bella's puppy photo), court (outdoor basketball court in purple + orange).
   The field is drawn in perspective with proj(wx, z) -> {x, y, s} from game.js. */
(function () {
  const PLACES = {
    backyard: { name: 'Backyard', sky: ['#7cc8ff', '#c9ecff'], grass: ['#7ccf5a', '#4fa83a'] },
    park:     { name: 'Park', sky: ['#8fd3ff', '#e2f5ff'], grass: ['#86d665', '#4b9e36'] },
    lake:     { name: 'The Lake', sky: ['#5b5a8e', '#f6a56b'], grass: ['#7cae4e', '#4a7d32'] },
    court:    { name: 'Court', sky: ['#4b2a7b', '#ff9c4a'], grass: ['#c0703a', '#a95a28'] },
  };

  function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; }

  function cloud(c, x, y, r, col) {
    c.fillStyle = col;
    [[0, 0, 1], [0.9, 0.15, 0.75], [-0.9, 0.2, 0.7], [0.4, -0.45, 0.75], [-0.4, -0.35, 0.65]].forEach(([dx, dy, k]) => {
      c.beginPath(); c.arc(x + dx * r, y + dy * r, r * k, 0, 7); c.fill();
    });
  }
  function tree(c, x, y, h, col, col2) {
    c.fillStyle = '#7a5230'; c.fillRect(x - h * 0.06, y - h * 0.45, h * 0.12, h * 0.45);
    c.fillStyle = col; c.beginPath(); c.arc(x, y - h * 0.62, h * 0.32, 0, 7); c.fill();
    c.fillStyle = col2; c.beginPath(); c.arc(x - h * 0.16, y - h * 0.55, h * 0.22, 0, 7); c.arc(x + h * 0.18, y - h * 0.52, h * 0.2, 0, 7); c.fill();
  }
  function rock(c, x, y, w, h, base, shade, hi) {
    c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(x, y, w * 0.6, h * 0.12, 0, 0, 7); c.fill();
    c.fillStyle = base; c.strokeStyle = 'rgba(40,20,20,.55)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x - w * 0.5, y); c.quadraticCurveTo(x - w * 0.55, y - h * 0.7, x - w * 0.15, y - h);
    c.quadraticCurveTo(x + w * 0.3, y - h * 1.05, x + w * 0.5, y - h * 0.45); c.quadraticCurveTo(x + w * 0.55, y - h * 0.1, x + w * 0.45, y); c.closePath();
    c.fill(); c.stroke();
    c.fillStyle = shade; c.beginPath(); c.moveTo(x + w * 0.05, y); c.quadraticCurveTo(x + w * 0.35, y - h * 0.5, x + w * 0.5, y - h * 0.45);
    c.quadraticCurveTo(x + w * 0.55, y - h * 0.1, x + w * 0.45, y); c.closePath(); c.fill();
    c.strokeStyle = hi; c.lineWidth = 3; c.beginPath(); c.moveTo(x - w * 0.35, y - h * 0.65); c.quadraticCurveTo(x - w * 0.2, y - h * 0.92, x + w * 0.05, y - h * 0.9); c.stroke();
  }

  // ground band with perspective stripes (mowed grass)
  function grass(c, W, H, L, proj, cols, stripes) {
    const g = c.createLinearGradient(0, L.hor, 0, H);
    g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]);
    c.fillStyle = g; c.fillRect(0, L.hor, W, H - L.hor);
    if (stripes) {
      c.fillStyle = 'rgba(255,255,255,.07)';
      for (let i = -12; i <= 12; i += 2) {
        const a = proj(i * 1.6, 0), b = proj((i + 1) * 1.6, 0), a2 = proj(i * 1.6, 200), b2 = proj((i + 1) * 1.6, 200);
        c.beginPath(); c.moveTo(a.x, a.y + 200); c.lineTo(b.x, b.y + 200); c.lineTo(b2.x, b2.y); c.lineTo(a2.x, a2.y); c.closePath(); c.fill();
      }
    }
    // little grass tufts / flowers
    const r = rng(11);
    for (let i = 0; i < 70; i++) {
      const z = 0.5 + r() * 32, p = proj((r() * 2 - 1) * (3.5 + z * 0.55), z), s = p.s;
      c.strokeStyle = 'rgba(30,90,20,.45)'; c.lineWidth = Math.max(1, 2 * s);
      c.beginPath(); c.moveTo(p.x - 5 * s, p.y); c.lineTo(p.x - 7 * s, p.y - 9 * s); c.moveTo(p.x, p.y); c.lineTo(p.x, p.y - 12 * s);
      c.moveTo(p.x + 5 * s, p.y); c.lineTo(p.x + 7 * s, p.y - 9 * s); c.stroke();
    }
  }

  const DRAW = {
    backyard(c, W, H, L, proj) {
      const sky = c.createLinearGradient(0, 0, 0, L.hor); sky.addColorStop(0, '#6cbcff'); sky.addColorStop(1, '#d4f0ff');
      c.fillStyle = sky; c.fillRect(0, 0, W, L.hor + 2);
      c.fillStyle = '#fff6b0'; c.beginPath(); c.arc(W * 0.82, H * 0.12, 28, 0, 7); c.fill();
      cloud(c, W * 0.25, H * 0.14, 22, '#fff'); cloud(c, W * 0.62, H * 0.2, 16, '#fff');
      // house corner (left) + tree (right)
      c.fillStyle = '#f2d7a6'; c.fillRect(-10, L.hor - H * 0.17, W * 0.3, H * 0.17);
      c.fillStyle = '#c0533a'; c.beginPath(); c.moveTo(-20, L.hor - H * 0.165); c.lineTo(W * 0.15, L.hor - H * 0.25); c.lineTo(W * 0.33, L.hor - H * 0.165); c.closePath(); c.fill();
      c.fillStyle = '#9fd8ff'; c.strokeStyle = '#fff'; c.lineWidth = 4; c.fillRect(W * 0.06, L.hor - H * 0.13, W * 0.12, H * 0.06); c.strokeRect(W * 0.06, L.hor - H * 0.13, W * 0.12, H * 0.06);
      tree(c, W * 0.86, L.hor + 4, H * 0.24, '#3f9a3a', '#56b84c');
      grass(c, W, H, L, proj, ['#86d665', '#4fa83a'], true);
      // wooden fence along the back
      const f0 = proj(-40, 34), f1 = proj(40, 34), fh = H * 0.07;
      // the neighbors' hedge behind the fence
      c.fillStyle = '#3f8f3a'; c.beginPath(); c.moveTo(0, f0.y);
      for (let x = 0; x <= W + 20; x += 20) c.lineTo(x, Math.min(L.hor, f0.y - fh) - 10 - 8 * Math.abs(Math.sin(x * 0.09)));
      c.lineTo(W, f0.y); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.08)'; for (let x = 10; x < W; x += 26) { c.beginPath(); c.arc(x, f0.y - fh - 2, 8, 0, 7); c.fill(); }
      c.fillStyle = '#c99a63'; c.fillRect(0, f0.y - fh, W, fh);
      c.strokeStyle = '#9c7040'; c.lineWidth = 2;
      for (let x = 0; x < W; x += 14) { c.beginPath(); c.moveTo(x, f0.y - fh); c.lineTo(x, f0.y); c.stroke(); c.fillStyle = '#c99a63'; c.beginPath(); c.moveTo(x, f0.y - fh); c.lineTo(x + 7, f0.y - fh - 6); c.lineTo(x + 14, f0.y - fh); c.fill(); }
      c.fillStyle = '#b5874f'; c.fillRect(0, f0.y - fh * 0.75, W, 4); c.fillRect(0, f0.y - fh * 0.25, W, 4);
      // flower bed + doghouse
      const r = rng(5);
      for (let i = 0; i < 26; i++) { c.fillStyle = ['#ff6b8b', '#ffd23f', '#ffffff', '#b07cff'][i % 4]; c.beginPath(); c.arc(r() * W, f0.y + 2 + r() * 6, 3, 0, 7); c.fill(); }
      const d = proj(-9.5, 13); const ds = d.s * 80;
      c.fillStyle = '#e25b45'; c.beginPath(); c.moveTo(d.x - ds, d.y - ds * 0.9); c.lineTo(d.x, d.y - ds * 1.6); c.lineTo(d.x + ds, d.y - ds * 0.9); c.fill();
      c.fillStyle = '#f0c27a'; c.fillRect(d.x - ds * 0.85, d.y - ds * 0.9, ds * 1.7, ds * 0.9);
      c.fillStyle = '#4a3020'; c.beginPath(); c.arc(d.x, d.y - ds * 0.35, ds * 0.32, Math.PI, 0); c.lineTo(d.x + ds * 0.32, d.y); c.lineTo(d.x - ds * 0.32, d.y); c.fill();
    },
    park(c, W, H, L, proj) {
      const sky = c.createLinearGradient(0, 0, 0, L.hor); sky.addColorStop(0, '#7cc6ff'); sky.addColorStop(1, '#e6f7ff');
      c.fillStyle = sky; c.fillRect(0, 0, W, L.hor + 2);
      cloud(c, W * 0.2, H * 0.1, 18, '#fff'); cloud(c, W * 0.72, H * 0.15, 24, '#fff');
      // distant tree line
      for (let i = 0; i < 14; i++) tree(c, i * W / 12 - 10, L.hor + 2, H * (0.11 + (i % 3) * 0.025), i % 2 ? '#3d8f45' : '#2f7a3a', '#4fa857');
      // little playground slide far away
      const p = proj(9, 30), s = p.s * 60;
      c.strokeStyle = '#ff5a5a'; c.lineWidth = 3; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x, p.y - s); c.lineTo(p.x + s * 1.2, p.y); c.stroke();
      c.strokeStyle = '#ffd23f'; c.beginPath(); c.moveTo(p.x - s * 0.3, p.y); c.lineTo(p.x - s * 0.3, p.y - s); c.stroke();
      grass(c, W, H, L, proj, ['#8edb6a', '#4b9e36'], false);
      // curvy path
      c.fillStyle = '#e8d3a2';
      c.beginPath();
      for (let z = 40; z >= -2; z -= 1) { const q = proj(-6 + Math.sin(z * 0.15) * 3 - 1.2, z); z === 40 ? c.moveTo(q.x, q.y) : c.lineTo(q.x, q.y); }
      for (let z = -2; z <= 40; z += 1) { const q = proj(-6 + Math.sin(z * 0.15) * 3 + 1.2, z); c.lineTo(q.x, q.y); }
      c.fill();
      // bench + lamp post
      const b = proj(8, 12), bs = b.s * 70;
      c.fillStyle = '#8b5a33'; c.fillRect(b.x - bs, b.y - bs * 0.55, bs * 2, bs * 0.14); c.fillRect(b.x - bs, b.y - bs * 0.85, bs * 2, bs * 0.12);
      c.fillStyle = '#444'; c.fillRect(b.x - bs * 0.9, b.y - bs * 0.45, bs * 0.1, bs * 0.45); c.fillRect(b.x + bs * 0.8, b.y - bs * 0.45, bs * 0.1, bs * 0.45);
      const lp = proj(-11, 18), ls = lp.s * 120;
      c.fillStyle = '#3b3f4a'; c.fillRect(lp.x - 2, lp.y - ls, 4, ls); c.fillStyle = '#fff2a8'; c.beginPath(); c.arc(lp.x, lp.y - ls, 7 * lp.s + 3, 0, 7); c.fill();
    },
    lake(c, W, H, L, proj) {
      // cloudy sunset sky
      const sky = c.createLinearGradient(0, 0, 0, L.hor);
      sky.addColorStop(0, '#4d4f86'); sky.addColorStop(0.45, '#b46a8d'); sky.addColorStop(0.8, '#f59a6a'); sky.addColorStop(1, '#ffd08a');
      c.fillStyle = sky; c.fillRect(0, 0, W, L.hor + 2);
      c.fillStyle = '#ffe6a0'; c.beginPath(); c.arc(W * 0.62, L.hor - H * 0.065, 26, 0, 7); c.fill();
      [[0.15, 0.08, 30, 'rgba(120,110,160,.85)'], [0.55, 0.12, 36, 'rgba(150,120,170,.8)'], [0.88, 0.07, 26, 'rgba(110,100,150,.85)'],
       [0.3, 0.2, 24, 'rgba(240,150,140,.75)'], [0.8, 0.22, 22, 'rgba(250,170,130,.7)']].forEach(([x, y, r, col]) => cloud(c, W * x, H * y, r, col));
      c.strokeStyle = 'rgba(255,210,160,.7)'; c.lineWidth = 3;
      [[0.5, 0.135, 50], [0.24, 0.215, 34]].forEach(([x, y, w]) => { c.beginPath(); c.moveTo(W * x - w, H * y + 18); c.lineTo(W * x + w, H * y + 18); c.stroke(); });
      // far shore hills
      c.fillStyle = '#4f4a6e'; c.beginPath(); c.moveTo(0, L.hor - 10);
      for (let x = 0; x <= W; x += 20) c.lineTo(x, L.hor - 12 - Math.sin(x * 0.02) * 10 - Math.sin(x * 0.051) * 6);
      c.lineTo(W, L.hor + 2); c.lineTo(0, L.hor + 2); c.fill();
      // calm water with sunset reflections
      const shoreY = proj(0, 26).y;
      const wg = c.createLinearGradient(0, L.hor, 0, shoreY); wg.addColorStop(0, '#d98a7a'); wg.addColorStop(1, '#6f7fb0');
      c.fillStyle = wg; c.fillRect(0, L.hor, W, shoreY - L.hor + 2);
      c.strokeStyle = 'rgba(255,220,160,.6)'; c.lineWidth = 2;
      for (let i = 0; i < 10; i++) { const y = L.hor + 4 + i * (shoreY - L.hor) / 10, w = 14 + i * 4; c.beginPath(); c.moveTo(W * 0.62 - w, y); c.lineTo(W * 0.62 + w, y); c.stroke(); }
      c.strokeStyle = 'rgba(255,255,255,.25)';
      for (let i = 0; i < 8; i++) { const y = L.hor + 8 + i * 9; c.beginPath(); c.moveTo(W * (0.08 + (i * 37 % 60) / 100), y); c.lineTo(W * (0.16 + (i * 37 % 60) / 100), y); c.stroke(); }
      // grassy shore
      c.fillStyle = '#b9a27a'; c.fillRect(0, shoreY - 3, W, 6);
      const g = c.createLinearGradient(0, shoreY, 0, H); g.addColorStop(0, '#7aa84d'); g.addColorStop(1, '#3f7330');
      c.fillStyle = g; c.fillRect(0, shoreY + 2, W, H - shoreY);
      const r = rng(3);
      for (let i = 0; i < 60; i++) {
        const z = 0.5 + r() * 24, p = proj((r() * 2 - 1) * (3.5 + z * 0.55), z), s = p.s;
        c.strokeStyle = 'rgba(30,70,20,.5)'; c.lineWidth = Math.max(1, 2 * s);
        c.beginPath(); c.moveTo(p.x - 5 * s, p.y); c.lineTo(p.x - 8 * s, p.y - 11 * s); c.moveTo(p.x, p.y); c.lineTo(p.x, p.y - 14 * s); c.moveTo(p.x + 5 * s, p.y); c.lineTo(p.x + 8 * s, p.y - 11 * s); c.stroke();
      }
      // big red and grey rocks along the shore
      [[-10, 25, 5, 3, '#a5503f', '#7d3a2e', '#d27a62'], [-5, 26, 2.6, 1.6, '#8d8d94', '#6b6b73', '#b7b7be'],
       [9.5, 24, 5.5, 3.4, '#8f8f97', '#6a6a72', '#bcbcc4'], [12, 18, 3.4, 2.2, '#b0573f', '#843d2c', '#d9876c'],
       [-9, 11, 3, 2, '#9b4a3a', '#73352a', '#c76b56'], [7.5, 6, 2.2, 1.5, '#909098', '#6d6d75', '#c0c0c8']]
        .forEach(([wx, z, w, h, a, b, hi]) => { const p = proj(wx, z); rock(c, p.x, p.y, w * L.pxm * p.s, h * L.pxm * p.s, a, b, hi); });
    },
    court(c, W, H, L, proj) {
      // dusky purple/orange sky + city
      const sky = c.createLinearGradient(0, 0, 0, L.hor); sky.addColorStop(0, '#3d2266'); sky.addColorStop(0.6, '#b54d7a'); sky.addColorStop(1, '#ff9c4a');
      c.fillStyle = sky; c.fillRect(0, 0, W, L.hor + 2);
      c.fillStyle = '#ffd36b'; c.beginPath(); c.arc(W * 0.2, L.hor - H * 0.05, 24, 0, 7); c.fill();
      c.fillStyle = '#2b1a44';
      [[0.05, 0.1, 0.08], [0.16, 0.16, 0.07], [0.3, 0.08, 0.1], [0.45, 0.2, 0.06], [0.58, 0.13, 0.09], [0.72, 0.18, 0.07], [0.84, 0.1, 0.1], [0.95, 0.15, 0.08]]
        .forEach(([x, h, w]) => c.fillRect(W * x, L.hor - H * h * 0.6, W * w, H * h * 0.6 + 2));
      c.fillStyle = 'rgba(255,220,120,.7)';
      for (let i = 0; i < 40; i++) c.fillRect((i * 53) % W, L.hor - 6 - (i * 29) % (H * 0.09), 3, 3);
      // court surface
      c.fillStyle = '#3a2a55'; c.fillRect(0, L.hor, W, H - L.hor);
      const quad = (x0, z0, x1, z1, col) => {
        const a = proj(x0, z0), b = proj(x1, z0), d = proj(x1, z1), e = proj(x0, z1);
        c.fillStyle = col; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(d.x, d.y); c.lineTo(e.x, e.y); c.closePath(); c.fill();
      };
      quad(-8, -3, 8, 36, '#e8873a');                 // orange court
      quad(-2.5, 26, 2.5, 36, '#5a2d91');              // purple key at the far end
      const line = (pts, w) => { c.strokeStyle = '#fff'; c.lineWidth = w; c.beginPath(); pts.forEach((q, i) => { const p = proj(q[0], q[1]); i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); }); c.stroke(); };
      line([[-8, -3], [-8, 36], [8, 36], [8, -3]], 3);
      line([[-2.5, 36], [-2.5, 26], [2.5, 26], [2.5, 36]], 2.5);
      line([[-8, 16], [8, 16]], 2.5);
      // 3-point arc + center circle with a sunburst (generic, no logo)
      const arc = []; for (let a = 0; a <= Math.PI; a += 0.1) arc.push([Math.cos(a) * 6.5, 36 - Math.sin(a) * 6.5]); line(arc, 2.5);
      const cc = []; for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.1) cc.push([Math.cos(a) * 2.4, 16 + Math.sin(a) * 2.4]);
      const ctr = proj(0, 16);
      c.fillStyle = '#5a2d91'; c.beginPath(); cc.forEach((q, i) => { const p = proj(q[0], q[1]); i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); }); c.fill();
      c.fillStyle = '#ffb02e';
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const p1 = proj(Math.cos(a) * 0.7, 16 + Math.sin(a) * 0.7), p2 = proj(Math.cos(a + 0.12) * 2.0, 16 + Math.sin(a + 0.12) * 2.0), p3 = proj(Math.cos(a - 0.12) * 2.0, 16 + Math.sin(a - 0.12) * 2.0); c.beginPath(); c.moveTo(p1.x, p1.y); c.lineTo(p2.x, p2.y); c.lineTo(p3.x, p3.y); c.fill(); }
      c.beginPath(); c.ellipse(ctr.x, ctr.y, 0.8 * L.pxm * ctr.s, 0.8 * L.pxm * ctr.s * 0.3, 0, 0, 7); c.fill();
      line(cc, 2.5);
      // hoop at the far end
      const h = proj(0, 37.5), s = h.s * L.pxm;
      c.fillStyle = '#555'; c.fillRect(h.x - s * 0.12, h.y - s * 3.4, s * 0.24, s * 3.4);
      c.fillStyle = '#fff'; c.strokeStyle = '#5a2d91'; c.lineWidth = 2; c.fillRect(h.x - s * 0.9, h.y - s * 4.2, s * 1.8, s * 1.1); c.strokeRect(h.x - s * 0.9, h.y - s * 4.2, s * 1.8, s * 1.1);
      c.strokeStyle = '#f47b20'; c.strokeRect(h.x - s * 0.35, h.y - s * 3.85, s * 0.7, s * 0.5);
      c.strokeStyle = '#f47b20'; c.lineWidth = 2.5; c.beginPath(); c.ellipse(h.x, h.y - s * 3.15, s * 0.4, s * 0.1, 0, 0, 7); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1;
      for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(h.x + i * s * 0.18, h.y - s * 3.12); c.lineTo(h.x + i * s * 0.1, h.y - s * 2.6); c.stroke(); }
      // fence posts on the sides
      c.strokeStyle = 'rgba(200,200,220,.35)'; c.lineWidth = 1.5;
      for (let i = 0; i < 30; i++) { c.beginPath(); c.moveTo(i * W / 29, L.hor - H * 0.05); c.lineTo(i * W / 29, L.hor); c.stroke(); }
      c.beginPath(); c.moveTo(0, L.hor - H * 0.05); c.lineTo(W, L.hor - H * 0.05); c.stroke();
      // purple + orange banners
      [[0.08, '#5a2d91'], [0.92, '#f47b20']].forEach(([x, col]) => { c.fillStyle = col; c.fillRect(W * x - 10, L.hor - H * 0.11, 20, H * 0.06); c.fillStyle = '#fff'; c.font = '900 12px Arial'; c.textAlign = 'center'; c.fillText('4', W * x, L.hor - H * 0.07); });
    },
  };

  function render(place, W, H, DPR, L, proj) {
    const cv = document.createElement('canvas'); cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    const c = cv.getContext('2d'); c.scale(DPR, DPR);
    DRAW[place](c, W, H, L, proj);
    return cv;
  }

  // ---------------- toys ----------------
  // size = diameter-ish in px; tilt 0..1 squashes the frisbee when seen from the side
  function drawToy(c, id, x, y, size, rot, tilt) {
    c.save(); c.translate(x, y); c.rotate(rot || 0);
    const r = size / 2;
    c.lineWidth = Math.max(1, size * 0.07);
    if (id === 'ball') {
      c.fillStyle = '#d8f03c'; c.strokeStyle = '#8fa51c';
      c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill(); c.stroke();
      c.strokeStyle = '#fff'; c.lineWidth = Math.max(1, size * 0.08);
      c.beginPath(); c.arc(-r * 0.9, 0, r * 0.75, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(r * 0.9, 0, r * 0.75, Math.PI - 0.9, Math.PI + 0.9); c.stroke();
    } else if (id === 'frisbee') {
      const ry = r * (0.35 + 0.65 * (tilt == null ? 0.35 : tilt));
      c.fillStyle = '#ff3d5a'; c.strokeStyle = '#b3122c';
      c.beginPath(); c.ellipse(0, 0, r * 1.15, ry, 0, 0, 7); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.ellipse(0, -ry * 0.1, r * 0.7, ry * 0.55, 0, 0, 7); c.stroke();
    } else if (id === 'stick') {
      c.fillStyle = '#9b6a3c'; c.strokeStyle = '#5e3c1e';
      c.beginPath(); c.roundRect ? c.roundRect(-r * 1.6, -r * 0.28, r * 3.2, r * 0.56, r * 0.28) : c.rect(-r * 1.6, -r * 0.28, r * 3.2, r * 0.56); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(r * 0.5, -r * 0.2); c.lineTo(r * 0.9, -r * 0.75); c.stroke();
      c.fillStyle = '#5e3c1e'; c.beginPath(); c.arc(-r * 0.6, 0, r * 0.1, 0, 7); c.fill();
    } else if (id === 'burger') {
      c.strokeStyle = '#8a531a';
      c.fillStyle = '#e9a23b'; c.beginPath(); c.moveTo(-r, -r * 0.05); c.quadraticCurveTo(-r, -r * 0.95, 0, -r * 0.95); c.quadraticCurveTo(r, -r * 0.95, r, -r * 0.05); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#fff6d8'; [[-0.4, -0.6], [0.1, -0.75], [0.5, -0.5]].forEach(([a, b]) => { c.beginPath(); c.ellipse(a * r, b * r, r * 0.09, r * 0.05, 0, 0, 7); c.fill(); });
      c.fillStyle = '#5cb85c'; c.fillRect(-r * 1.05, -r * 0.08, r * 2.1, r * 0.18);
      c.fillStyle = '#ffcc33'; c.beginPath(); c.moveTo(-r, r * 0.08); c.lineTo(r, r * 0.08); c.lineTo(r * 0.6, r * 0.38); c.lineTo(0, r * 0.12); c.lineTo(-r * 0.6, r * 0.38); c.closePath(); c.fill();
      c.fillStyle = '#6b3a1e'; c.fillRect(-r, r * 0.12, r * 2, r * 0.3);
      c.fillStyle = '#e9a23b'; c.beginPath(); c.moveTo(-r, r * 0.42); c.lineTo(r, r * 0.42); c.quadraticCurveTo(r, r * 0.8, 0, r * 0.8); c.quadraticCurveTo(-r, r * 0.8, -r, r * 0.42); c.fill(); c.stroke();
    }
    c.restore();
  }

  // ---------------- squirrel (side view, facing right when face = 1) ----------------
  function drawSquirrel(c, x, y, size, face, t, moving) {
    c.save(); c.translate(x, y); c.scale(face * size / 60, size / 60);
    const hop = moving ? Math.abs(Math.sin(t * 14)) * 6 : 0;
    c.translate(0, -hop);
    // tail
    c.fillStyle = '#a0643a'; c.strokeStyle = '#6b3f1f'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(-14, -6); c.bezierCurveTo(-46, -10, -44, -56, -20, -58); c.bezierCurveTo(-4, -60, -6, -40, -16, -38);
    c.bezierCurveTo(-26, -36, -26, -22, -8, -14); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#c98d5c'; c.beginPath(); c.moveTo(-22, -16); c.bezierCurveTo(-36, -26, -34, -46, -22, -50); c.stroke();
    // body + head
    c.fillStyle = '#b8743f'; c.strokeStyle = '#6b3f1f';
    c.beginPath(); c.ellipse(0, -14, 16, 13, -0.3, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#f1d3ad'; c.beginPath(); c.ellipse(7, -11, 7, 8, -0.3, 0, 7); c.fill();
    c.fillStyle = '#b8743f'; c.beginPath(); c.arc(14, -28, 10, 0, 7); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(9, -36); c.lineTo(10, -44); c.lineTo(15, -37); c.fill(); c.stroke();
    c.fillStyle = '#1a110b'; c.beginPath(); c.arc(17, -30, 2.4, 0, 7); c.fill(); c.beginPath(); c.arc(24, -27, 1.8, 0, 7); c.fill();
    // little legs + acorn
    c.strokeStyle = '#6b3f1f'; c.lineWidth = 3; c.lineCap = 'round';
    const a = moving ? Math.sin(t * 14) * 5 : 0;
    c.beginPath(); c.moveTo(-6, -4); c.lineTo(-8 - a, 0); c.moveTo(8, -6); c.lineTo(10 + a, 0); c.stroke();
    c.fillStyle = '#8b5a2b'; c.beginPath(); c.ellipse(20, -16, 4, 5, 0, 0, 7); c.fill(); c.fillStyle = '#5e3c1e'; c.fillRect(16, -22, 8, 3);
    c.restore();
  }

  window.FF = window.FF || {};
  Object.assign(window.FF, { PLACES, renderScene: render, drawToy, drawSquirrel });
})();
