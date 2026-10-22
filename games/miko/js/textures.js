// MIKO - procedural canvas textures (no image files): wood floor, cream wall, leather grain, curtains, quatrefoil blanket...
import * as THREE from 'three';

function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, srgb = true, rep) {
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (rep) t.repeat.set(rep[0], rep[1]); return t;
}
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

export function woodFloor() {      // grey-brown wash planks like the photo
  const [c, g] = cv(1024, 1024), rows = 8, ph = 1024 / rows;
  for (let r = 0; r < rows; r++) {
    let x = -rnd() * 600;
    while (x < 1024) {
      const len = 380 + rnd() * 420, base = 92 + rnd() * 40;
      const hue = 26 + rnd() * 8, sat = 12 + rnd() * 10;
      g.fillStyle = `hsl(${hue},${sat}%,${base / 2.9}%)`; g.fillRect(x, r * ph, len, ph);
      // grain
      for (let i = 0; i < 26; i++) {
        const y = r * ph + rnd() * ph, l = 40 + rnd() * len;
        g.strokeStyle = `rgba(${rnd() < 0.5 ? '40,30,22' : '200,190,175'},${0.05 + rnd() * 0.12})`;
        g.lineWidth = 0.6 + rnd() * 2.4; g.beginPath(); g.moveTo(x + rnd() * len, y);
        g.bezierCurveTo(x + l * 0.3, y + (rnd() - 0.5) * 8, x + l * 0.6, y + (rnd() - 0.5) * 8, x + l, y + (rnd() - 0.5) * 6); g.stroke();
      }
      if (rnd() < 0.35) { const kx = x + rnd() * len, ky = r * ph + 20 + rnd() * (ph - 40); g.fillStyle = 'rgba(50,38,28,.35)'; g.beginPath(); g.ellipse(kx, ky, 12 + rnd() * 10, 5, 0, 0, 7); g.fill(); }
      g.fillStyle = 'rgba(25,18,12,.55)'; g.fillRect(x, r * ph, 2, ph);      // end joint
      x += len;
    }
    g.fillStyle = 'rgba(25,18,12,.6)'; g.fillRect(0, r * ph, 1024, 2);      // long seam
  }
  return tex(c, true);
}

export function noiseTex(size, base, amt, srgb = true) {
  const [c, g] = cv(size, size); g.fillStyle = base; g.fillRect(0, 0, size, size);
  const id = g.getImageData(0, 0, size, size), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const n = (rnd() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(id, 0, 0); return tex(c, srgb);
}

export function leatherBump() {
  const [c, g] = cv(256, 256); g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${0.05 + rnd() * 0.12})`; g.beginPath(); g.arc(rnd() * 256, rnd() * 256, 1 + rnd() * 2.5, 0, 7); g.fill(); }
  return tex(c, false, [6, 6]);
}

export function curtainTex() {
  const [c, g] = cv(256, 256); g.fillStyle = '#7f8f77'; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 2) { g.fillStyle = `rgba(${rnd() < 0.5 ? '40,50,38' : '200,210,190'},${rnd() * 0.08})`; g.fillRect(x, 0, 1, 256); }
  for (let y = 0; y < 256; y += 3) { g.fillStyle = `rgba(255,255,255,${rnd() * 0.04})`; g.fillRect(0, y, 256, 1); }
  return tex(c, true, [3, 3]);
}

export function quatrefoil() {     // navy + white quatrefoil lattice (the throw blanket)
  const [c, g] = cv(512, 512); g.fillStyle = '#26365e'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '10,20,45' : '80,100,150'},${rnd() * 0.25})`; g.fillRect(rnd() * 512, rnd() * 512, 2, 2); }
  g.strokeStyle = '#eef0f4'; g.lineWidth = 7; g.lineJoin = 'round';
  const s = 128;
  for (let y = -1; y < 5; y++) for (let x = -1; x < 5; x++) {
    const cx = x * s + (y % 2 ? s / 2 : 0), cy = y * s * 0.5 + s / 2;
    g.beginPath();
    // a quatrefoil "Moroccan" tile: 4 arcs
    const r = s * 0.25;
    g.moveTo(cx, cy - s / 2);
    g.quadraticCurveTo(cx + r, cy - s / 2 + r * 0.2, cx + r * 0.6, cy - r * 0.8);
    g.quadraticCurveTo(cx + s / 2 - r * 0.2, cy - r * 0.6, cx + s / 2, cy);
    g.quadraticCurveTo(cx + s / 2 - r * 0.2, cy + r * 0.6, cx + r * 0.6, cy + r * 0.8);
    g.quadraticCurveTo(cx + r, cy + s / 2 - r * 0.2, cx, cy + s / 2);
    g.quadraticCurveTo(cx - r, cy + s / 2 - r * 0.2, cx - r * 0.6, cy + r * 0.8);
    g.quadraticCurveTo(cx - s / 2 + r * 0.2, cy + r * 0.6, cx - s / 2, cy);
    g.quadraticCurveTo(cx - s / 2 + r * 0.2, cy - r * 0.6, cx - r * 0.6, cy - r * 0.8);
    g.quadraticCurveTo(cx - r, cy - s / 2 + r * 0.2, cx, cy - s / 2);
    g.stroke();
  }
  return tex(c, true, [2, 2]);
}

export function rugTex() {
  const [c, g] = cv(256, 256); g.fillStyle = '#9a958f'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) { const v = 120 + rnd() * 110; g.fillStyle = `rgba(${v},${v - 4},${v - 8},.35)`; g.fillRect(rnd() * 256, rnd() * 256, 1.5, 3); }
  return tex(c, true, [3, 3]);
}

export function quartz() {
  const [c, g] = cv(256, 256); g.fillStyle = '#ecebe7'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { const v = 120 + rnd() * 100; g.fillStyle = `rgba(${v},${v},${v},${0.2 + rnd() * 0.4})`; g.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 2, 1 + rnd() * 2); }
  return tex(c, true, [2, 2]);
}

export function subway() {
  const [c, g] = cv(256, 256); g.fillStyle = '#c9c4ba'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 8; y++) for (let x = -1; x < 5; x++) {
    const ox = x * 64 + (y % 2 ? 32 : 0); g.fillStyle = `hsl(40,12%,${90 + rnd() * 4}%)`; g.fillRect(ox + 2, y * 32 + 2, 60, 28);
  }
  return tex(c, true, [3, 2]);
}

export function textCanvas(w, h, draw) { const [c, g] = cv(w, h); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

export function radial(inner = 'rgba(0,0,0,.6)', outer = 'rgba(0,0,0,0)') {
  const [c, g] = cv(128, 128); const r = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  r.addColorStop(0, inner); r.addColorStop(1, outer); g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
export function vgrad(top, bottom) {
  const [c, g] = cv(4, 128); const r = g.createLinearGradient(0, 0, 0, 128);
  r.addColorStop(0, top); r.addColorStop(1, bottom); g.fillStyle = r; g.fillRect(0, 0, 4, 128);
  return new THREE.CanvasTexture(c);
}
