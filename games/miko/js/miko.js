// MIKO - the cat. A stylized lion-cut lynx-point built from code: shaved cream body, big fluffy cream mane,
// shaved legs with fluffy "boots", shaved tail with a grey puff on the end, tabby mask, grey ears, judgy stare.
// Local space: +z is forward, feet at y=0. Everything is procedurally animated (no clips).
import * as THREE from 'three';
import { furMesh, skinMaterial } from './fur.js';

const C = {
  body: 0xe9e0d3, belly: 0xf0e9de, leg: 0xe2d8ca, mane: 0xf4ede3, maneRoot: 0xd9d0c4, maneTip: 0xfbf7f0,
  ear: 0x6e645b, earIn: 0xcfa69c, nose: 0xa87a72, puffRoot: 0x7d766f, puffTip: 0xc4beb6, tail: 0xd9d0c4,
};

function faceTexture() {
  const W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#ece3d6'; g.fillRect(0, 0, W, H);
  // back of head a touch greyer (lynx point shading)
  const back = g.createLinearGradient(0, 0, W, 0);
  back.addColorStop(0, 'rgba(150,140,128,0.35)'); back.addColorStop(0.18, 'rgba(150,140,128,0)');
  back.addColorStop(0.34, 'rgba(150,140,128,0)'); back.addColorStop(0.6, 'rgba(150,140,128,0.4)');
  back.addColorStop(1, 'rgba(150,140,128,0.35)');
  g.fillStyle = back; g.fillRect(0, 0, W, H);
  const cx = 128;
  // mask: soft grey-brown over forehead, eyes and nose bridge (inverted triangle)
  g.save(); g.filter = 'blur(9px)';
  g.fillStyle = 'rgba(122,106,92,0.88)';
  g.beginPath(); g.moveTo(cx - 62, 70); g.quadraticCurveTo(cx, 40, cx + 62, 70); g.lineTo(cx + 46, 128);
  g.quadraticCurveTo(cx + 12, 140, cx + 6, 160); g.lineTo(cx - 6, 160); g.quadraticCurveTo(cx - 12, 140, cx - 46, 128); g.closePath(); g.fill();
  // eye patches
  g.fillStyle = 'rgba(98,86,74,0.85)';
  g.beginPath(); g.ellipse(cx - 30, 118, 26, 17, -0.25, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(cx + 30, 118, 26, 17, 0.25, 0, Math.PI * 2); g.fill();
  g.restore();
  // tabby forehead stripes (the "M")
  g.save(); g.filter = 'blur(2px)'; g.strokeStyle = 'rgba(72,62,52,0.85)'; g.lineCap = 'round';
  [[-16, 4], [-6, 4.5], [6, 4.5], [16, 4]].forEach(([dx, w], i) => {
    g.lineWidth = w; g.beginPath(); g.moveTo(cx + dx * 1.4, 52 + Math.abs(dx) * 0.6); g.quadraticCurveTo(cx + dx * 1.1, 80, cx + dx * 0.6, 102); g.stroke();
  });
  g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 34, 70); g.quadraticCurveTo(cx - 24, 82, cx - 18, 96); g.stroke();
  g.beginPath(); g.moveTo(cx + 34, 70); g.quadraticCurveTo(cx + 24, 82, cx + 18, 96); g.stroke();
  // "mascara" lines from the outer eye corners
  g.lineWidth = 3.5; g.beginPath(); g.moveTo(cx - 50, 118); g.quadraticCurveTo(cx - 64, 124, cx - 74, 134); g.stroke();
  g.beginPath(); g.moveTo(cx + 50, 118); g.quadraticCurveTo(cx + 64, 124, cx + 74, 134); g.stroke();
  g.restore();
  // darker nose bridge + cheek shading under the eyes
  g.save(); g.filter = 'blur(6px)'; g.fillStyle = 'rgba(96,82,70,0.8)';
  g.beginPath(); g.ellipse(cx, 135, 11, 26, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(120,106,94,0.55)';
  g.beginPath(); g.ellipse(cx - 44, 140, 22, 16, 0.4, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(cx + 44, 140, 22, 16, -0.4, 0, Math.PI * 2); g.fill();
  g.restore();
  // white muzzle and chin
  g.save(); g.filter = 'blur(7px)'; g.fillStyle = 'rgba(250,246,240,0.95)';
  g.beginPath(); g.ellipse(cx - 18, 170, 26, 20, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(cx + 18, 170, 26, 20, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(cx, 196, 30, 22, 0, 0, Math.PI * 2); g.fill();
  g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

function eyeTextures() {
  const mk = () => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; return c; };
  const a = mk(), g = a.getContext('2d');
  g.fillStyle = '#f2ece2'; g.fillRect(0, 0, 256, 128);
  const x = 64, y = 64;
  const ir = g.createRadialGradient(x, y, 6, x, y, 40);
  ir.addColorStop(0, '#d8c873'); ir.addColorStop(0.55, '#b7a656'); ir.addColorStop(0.9, '#7f7a3c'); ir.addColorStop(1, '#3c3a22');
  g.fillStyle = ir; g.beginPath(); g.arc(x, y, 40, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(80,70,30,.35)'; g.lineWidth = 1;
  for (let i = 0; i < 40; i++) { const an = i / 40 * Math.PI * 2; g.beginPath(); g.moveTo(x + Math.cos(an) * 18, y + Math.sin(an) * 18); g.lineTo(x + Math.cos(an) * 38, y + Math.sin(an) * 38); g.stroke(); }
  g.fillStyle = '#0b0a08'; g.beginPath(); g.ellipse(x, y, 17, 25, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.ellipse(x - 11, y - 14, 7, 6, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(x + 10, y + 12, 3, 0, Math.PI * 2); g.fill();
  const map = new THREE.CanvasTexture(a); map.colorSpace = THREE.SRGBColorSpace;
  // eyeshine comes out of the pupil (tapetum): emissive map = bright pupil, faint iris
  const b = mk(), h = b.getContext('2d');
  h.fillStyle = '#000'; h.fillRect(0, 0, 256, 128);
  h.fillStyle = '#2a2a10'; h.beginPath(); h.arc(x, y, 40, 0, Math.PI * 2); h.fill();
  const p = h.createRadialGradient(x, y, 2, x, y, 26); p.addColorStop(0, '#ffffff'); p.addColorStop(0.7, '#d8ff9a'); p.addColorStop(1, '#40501a');
  h.fillStyle = p; h.beginPath(); h.ellipse(x, y, 17, 25, 0, 0, Math.PI * 2); h.fill();
  const em = new THREE.CanvasTexture(b); em.colorSpace = THREE.SRGBColorSpace;
  return { map, em };
}

function puffTexture() {   // grey tail puff with darker tabby rings
  const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#d8d2ca'); gr.addColorStop(0.25, '#bfb8ae'); gr.addColorStop(1, '#a29b92');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  g.fillStyle = 'rgba(70,64,58,.55)';
  [70, 120, 165, 205].forEach(y => g.fillRect(0, y, 64, 14));
  g.fillStyle = '#8a837b'; g.fillRect(0, 236, 64, 20);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const smooth = x => x * x * (3 - 2 * x);

export class Miko {
  constructor({ shells = 12 } = {}) {
    this.root = new THREE.Group(); this.root.name = 'Miko';
    this.shellCount = shells;
    this.furs = []; this.t = 0; this.phase = 0;
    this.blink = 0; this.nextBlink = 2; this.slowBlink = 0;
    this.earTw = [0, 0]; this.nextEar = 1.5;
    this.look = { yaw: 0, pitch: 0 }; this.lookTarget = null;
    this.eyeGlow = 0; this.puff = 1; this.squash = 0; this.squashV = 0;
    this.P = {};                          // smoothed pose
    this.state = { mode: 'idle', speed: 0, vy: 0, turn: 0, grounded: true, t: 0 };
    this._build();
  }

  _build() {
    const R = this.root, S = this.shellCount;
    const vel = document.createElement('canvas'); vel.width = vel.height = 128; const vg = vel.getContext('2d');
    vg.fillStyle = '#fff'; vg.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 2500; i++) { const v = 215 + Math.random() * 40; vg.fillStyle = `rgba(${v},${v - 3},${v - 8},.5)`; vg.fillRect(Math.random() * 128, Math.random() * 128, 1, 2 + Math.random() * 2); }
    const dorsal = vg.createLinearGradient(0, 0, 0, 128); dorsal.addColorStop(0, 'rgba(150,138,124,.28)'); dorsal.addColorStop(0.35, 'rgba(150,138,124,0)'); vg.fillStyle = dorsal; vg.fillRect(0, 0, 128, 128);
    const velTex = new THREE.CanvasTexture(vel); velTex.colorSpace = THREE.SRGBColorSpace; velTex.wrapS = velTex.wrapT = THREE.RepeatWrapping;
    const bodyM = skinMaterial(C.body, { rim: 0.5, map: velTex });
    const bellyM = skinMaterial(C.belly, { rim: 0.5 });
    const legM = skinMaterial(C.leg, { rim: 0.5 });
    const shadowOnly = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    const mesh = (geo, mat, parent, pos, scl, shadow = true) => {
      const m = new THREE.Mesh(geo, mat); if (pos) m.position.set(...pos); if (scl) m.scale.set(...scl);
      m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m;
    };
    const sph = (r, w = 28, h = 20) => new THREE.SphereGeometry(r, w, h);

    // pivot at the hips: sitting rotates the chest up around them
    this.body = new THREE.Group(); this.body.position.set(0, 0.25, -0.1); R.add(this.body);
    this.squashG = new THREE.Group(); this.body.add(this.squashG);
    this.hips = new THREE.Group(); this.squashG.add(this.hips);
    mesh(sph(0.1), bodyM, this.hips, [0, 0.01, -0.01], [1.05, 1.0, 1.15]);
    this.spine = new THREE.Group(); this.spine.position.set(0, 0.02, 0.0); this.squashG.add(this.spine);
    const torso = new THREE.CapsuleGeometry(0.095, 0.16, 8, 20); torso.rotateX(Math.PI / 2);
    mesh(torso, bodyM, this.spine, [0, 0, 0.11], [1.0, 1.0, 1.0]);
    mesh(sph(0.085), bellyM, this.spine, [0, -0.035, 0.11], [1.0, 0.85, 1.6]);
    // back/spine: a slightly greyer saddle ridge so the shaved back reads from the chase camera
    const saddleM = skinMaterial(0xd2c6b6, { rim: 0.6, map: velTex });
    mesh(sph(0.06, 24, 16), saddleM, this.spine, [0, 0.062, 0.1], [1.05, 0.5, 2.9]);
    mesh(sph(0.05, 20, 14), saddleM, this.hips, [0, 0.07, -0.02], [1.3, 0.55, 1.4]);
    this.chest = new THREE.Group(); this.chest.position.set(0, 0.0, 0.22); this.spine.add(this.chest);
    mesh(sph(0.1), bodyM, this.chest, [0, 0.0, 0.0], [1.0, 1.05, 1.0]);

    // neck + MANE (the lion cut's big fluffy ruff)
    this.neck = new THREE.Group(); this.neck.position.set(0, 0.075, 0.05); this.chest.add(this.neck);
    const maneGeo = sph(0.125, 40, 28);
    this.mane = furMesh(maneGeo, { shells: S, len: 0.03, density: new THREE.Vector2(340, 170), root: C.maneRoot, tip: C.maneTip, gravity: 0.6, rim: 1.0, cell: 0.0034 });
    this.mane.position.set(0, 0.0, -0.015); this.mane.scale.set(1.12, 0.92, 0.82); this.neck.add(this.mane); this.furs.push(this.mane);
    mesh(sph(0.12, 16, 12), shadowOnly, this.neck, [0, 0.0, -0.015], [1.12, 0.92, 0.82]);
    if (S === 0) this.mane.material.userData.fur.uLen.value = 0;
    // chest bib fluff
    const bib = furMesh(sph(0.075, 24, 16), { shells: Math.ceil(S * 0.6), len: 0.024, density: new THREE.Vector2(220, 110), root: C.maneRoot, tip: C.maneTip, gravity: 0.8 });
    bib.position.set(0, -0.06, 0.09); bib.scale.set(1.1, 1.2, 0.8); this.neck.add(bib); this.furs.push(bib);

    // head
    this.head = new THREE.Group(); this.head.position.set(0, 0.08, 0.12); this.head.scale.setScalar(1.14); this.neck.add(this.head);
    const headM = skinMaterial(0xffffff, { map: faceTexture(), rim: 0.45, roughness: 0.9 });
    mesh(sph(0.088, 40, 28), headM, this.head, [0, 0, 0], [1.08, 0.94, 0.95]);
    // fluffy cheeks
    const cheekGeo = sph(0.05, 20, 14);
    [-1, 1].forEach(s => {
      const ck = furMesh(cheekGeo, { shells: Math.ceil(S * 0.6), len: 0.02, density: new THREE.Vector2(200, 100), root: 0xe0d7cb, tip: C.maneTip, gravity: 0.6, cell: 0.0026 });
      ck.position.set(s * 0.058, -0.03, 0.025); ck.scale.set(1.0, 0.85, 0.9); this.head.add(ck); this.furs.push(ck);
    });
    const muzzleM = skinMaterial(0xe6ded3, { rim: 0.3 });
    [-1, 1].forEach(s => mesh(sph(0.024, 16, 12), muzzleM, this.head, [s * 0.019, -0.03, 0.07], [1.0, 0.78, 0.75]));
    mesh(sph(0.02, 16, 12), muzzleM, this.head, [0, -0.05, 0.058], [1.1, 0.7, 0.9]);
    const noseM = new THREE.MeshStandardMaterial({ color: C.nose, roughness: 0.45 });
    const noseGeo = new THREE.SphereGeometry(0.0115, 16, 10);
    mesh(noseGeo, noseM, this.head, [0, -0.01, 0.087], [1.3, 0.8, 0.8]);
    // whiskers
    const wm = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
    const wp = [];
    [-1, 1].forEach(s => { for (let i = 0; i < 3; i++) { wp.push(s * 0.04, -0.03 - i * 0.006, 0.07, s * 0.15, -0.02 - i * 0.022, 0.05 - i * 0.01); } });
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
    this.head.add(new THREE.LineSegments(wg, wm));
    // eyes (big, round, a little judgmental: upper lid sits low)
    const et = eyeTextures();
    this.eyeMat = new THREE.MeshStandardMaterial({ map: et.map, roughness: 0.08, metalness: 0, emissive: 0xc8ff70, emissiveMap: et.em, emissiveIntensity: 0, envMapIntensity: 1.5 });
    const lidM = skinMaterial(0x8a7c6e, { rim: 0.2 });
    this.eyes = []; this.lids = [];
    [-1, 1].forEach(s => {
      const eg = new THREE.Group(); eg.position.set(s * 0.04, 0.012, 0.066); eg.rotation.y = s * 0.32; this.head.add(eg);
      const e = mesh(new THREE.SphereGeometry(0.025, 24, 16), this.eyeMat, eg, [0, 0, 0], [1, 1, 0.75], false);
      // upper lid: a shell slightly bigger than the eye that rotates down to blink
      const lid = new THREE.Mesh(new THREE.SphereGeometry(0.0272, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), lidM);
      lid.scale.set(1, 1, 0.8); eg.add(lid); lid.rotation.x = -0.3;
      const lowLid = new THREE.Mesh(new THREE.SphereGeometry(0.0268, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), lidM);
      lowLid.scale.set(1, 1, 0.8); lowLid.rotation.x = Math.PI + 0.62; eg.add(lowLid);
      this.eyes.push(e); this.lids.push(lid);
    });
    // ears: grey, with pink insides and a little tuft
    const earGeo = new THREE.ConeGeometry(0.038, 0.075, 4, 1); earGeo.translate(0, 0.0375, 0);
    const earInGeo = new THREE.ConeGeometry(0.026, 0.058, 4, 1); earInGeo.translate(0, 0.029, 0);
    const earM = skinMaterial(C.ear, { rim: 0.8 }), earInM = skinMaterial(C.earIn, { rim: 0.2 }), earTipM = skinMaterial(0x4a423b, { rim: 0.6 });
    this.ears = [];
    [-1, 1].forEach(s => {
      const eg = new THREE.Group(); eg.position.set(s * 0.05, 0.06, -0.005); eg.rotation.set(-0.12, 0, s * -0.35); this.head.add(eg);
      const e = mesh(earGeo, earM, eg, [0, 0, 0], [1, 1, 0.45]); e.rotation.y = Math.PI / 4;
      const ei = mesh(earInGeo, earInM, eg, [0, 0.004, 0.009], [0.85, 0.9, 0.3], false); ei.rotation.y = Math.PI / 4;
      const tipGeo = new THREE.ConeGeometry(0.016, 0.03, 4, 1); tipGeo.translate(0, 0.061, 0);
      const tip = mesh(tipGeo, earTipM, eg, [0, 0.0, -0.0005], [1.05, 1, 0.5]); tip.rotation.y = Math.PI / 4;
      const tuft = furMesh(new THREE.SphereGeometry(0.007, 10, 8), { shells: Math.ceil(S * 0.5), len: 0.014, density: new THREE.Vector2(60, 30), root: 0xe6dfd6, tip: 0xffffff, gravity: -0.5, cell: 0.0018 });
      tuft.position.set(0, 0.02, 0.012); eg.add(tuft); this.furs.push(tuft);
      this.ears.push(eg);
    });

    // legs: shaved upper + lower, fluffy paw "boots"
    const pawGeo = sph(0.034, 20, 14);
    const mkLeg = (parent, x, y, z, front) => {
      const hip = new THREE.Group(); hip.position.set(x, y, z); parent.add(hip);
      const upLen = front ? 0.105 : 0.1, loLen = front ? 0.105 : 0.11;
      const up = new THREE.CapsuleGeometry(front ? 0.03 : 0.042, upLen, 6, 14); up.translate(0, -upLen / 2, 0);
      mesh(up, front ? legM : bodyM, hip);
      const knee = new THREE.Group(); knee.position.set(0, -upLen, 0); hip.add(knee);
      const lo = new THREE.CapsuleGeometry(front ? 0.024 : 0.026, loLen, 6, 12); lo.translate(0, -loLen / 2, 0);
      mesh(lo, legM, knee);
      const ankle = new THREE.Group(); ankle.position.set(0, -loLen, 0); knee.add(ankle);
      const paw = furMesh(pawGeo, { shells: Math.ceil(S * 0.6), len: 0.012, density: new THREE.Vector2(140, 70), root: 0xd8cfc3, tip: 0xfaf6ef, gravity: 0.4, rim: 0.8, cell: 0.0024 });
      paw.position.set(0, -0.01, 0.014); paw.scale.set(1.0, 0.8, 1.25); ankle.add(paw); this.furs.push(paw);
      mesh(pawGeo, shadowOnly, ankle, [0, -0.01, 0.014], [1, 0.8, 1.25]);
      return { hip, knee, ankle, front };
    };
    this.legs = {
      FL: mkLeg(this.chest, -0.055, -0.045, 0.03, true), FR: mkLeg(this.chest, 0.055, -0.045, 0.03, true),
      RL: mkLeg(this.hips, -0.06, -0.01, -0.01, false), RR: mkLeg(this.hips, 0.06, -0.01, -0.01, false),
    };

    // tail: shaved segments + big grey puff on the tip
    this.tailSegs = [];
    const tailM = skinMaterial(C.tail, { rim: 0.6 });
    let parent = this.hips; const segLen = 0.05;
    const tailBase = new THREE.Group(); tailBase.position.set(0, 0.04, -0.11); this.hips.add(tailBase); parent = tailBase;
    for (let i = 0; i < 6; i++) {
      const seg = new THREE.Group(); if (i > 0) seg.position.set(0, 0, -segLen); parent.add(seg);
      const r = 0.017 - i * 0.0012;
      const g = new THREE.CylinderGeometry(r * 0.9, r, segLen + 0.01, 10); g.rotateX(Math.PI / 2); g.translate(0, 0, -segLen / 2);
      mesh(g, tailM, seg);
      this.tailSegs.push(seg); parent = seg;
    }
    this.puffG = new THREE.Group(); this.puffG.position.set(0, 0, -segLen); parent.add(this.puffG);
    const puffGeo = sph(0.05, 28, 20); puffGeo.rotateX(Math.PI / 2); puffGeo.translate(0, 0, -0.07);
    this.tailPuff = furMesh(puffGeo, { shells: S, len: 0.034, density: new THREE.Vector2(220, 160), root: C.puffRoot, tip: C.puffTip, gravity: 0.2, rim: 1.1, map: puffTexture(), cell: 0.0034 });
    this.tailPuff.scale.set(1, 1, 1.25); this.puffG.add(this.tailPuff); this.furs.push(this.tailPuff);
    mesh(puffGeo, shadowOnly, this.puffG, [0, 0, 0], [1, 1, 1.25]);

    // soft blob shadow (always on, helps on low quality / no shadow maps)
    const bc = document.createElement('canvas'); bc.width = bc.height = 64; const bg = bc.getContext('2d');
    const rg = bg.createRadialGradient(32, 32, 2, 32, 32, 32); rg.addColorStop(0, 'rgba(0,0,0,.55)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    bg.fillStyle = rg; bg.fillRect(0, 0, 64, 64);
    this.blob = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.62), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc), transparent: true, depthWrite: false }));
    this.blob.rotation.x = -Math.PI / 2; this.blob.renderOrder = 1;
    this.root.traverse(o => { if (o.isMesh && !o.isInstancedMesh) o.userData.miko = true; });
  }

  setShells(n) {   // adaptive quality: fewer fur layers on slower phones
    this.furs.forEach(f => { const base = f.userData.baseCount || (f.userData.baseCount = f.count); f.count = Math.max(1, Math.round((base - 1) * n / Math.max(1, this.shellCount)) + 1); });
  }
  setNight(on) { this.night = on; }

  // state: { mode, speed (m/s), vy, turn (rad/s), grounded, t (seconds in mode), lookAt (THREE.Vector3 world), lean }
  update(dt, st, camPos) {
    this.t += dt; const t = this.t, P = this.P, s = st || this.state; this.state = s;
    const mode = s.mode, sp = s.speed || 0;
    // gait phase
    const gallop = mode === 'run' || mode === 'drift';
    const freq = mode === 'walk' || mode === 'sneak' ? 0.9 + sp * 1.6 : gallop ? 2.4 + sp * 0.32 : 0;
    this.phase = (this.phase + dt * freq) % 1;
    const ph = this.phase * Math.PI * 2;

    // ---- target pose ----
    const T = { bodyY: 0.25, bodyP: 0, bodyR: 0, spineP: 0, chestP: 0, neckP: 0, headP: 0, headY: 0, headR: 0,
      tailP: -0.25, tailY: 0, tailCurl: 0.18, tailWave: 0.15, earsBack: 0, rollSpin: 0, eyeOpen: 1, puff: 1 };
    const legs = { FL: [0, 0, 0], FR: [0, 0, 0], RL: [0, 0, 0], RR: [0, 0, 0] };
    const L = (k, a, b, c) => { legs[k][0] = a; legs[k][1] = b; legs[k][2] = c; };
    const breath = Math.sin(t * 2.2) * 0.004;
    const walkLeg = (k, off, aU, aL, front) => {
      const p = ph + off * Math.PI * 2, sw = Math.sin(p), lift = Math.max(0, Math.cos(p));
      if (front) L(k, -sw * aU, lift * aL, -lift * aL * 0.4); else L(k, -sw * aU - 0.15, -lift * aL - 0.1, lift * aL * 0.6 + 0.25);
    };
    switch (mode) {
      case 'walk': case 'sneak': {
        const sn = mode === 'sneak';
        T.bodyY = sn ? 0.17 : 0.25 + Math.abs(Math.sin(ph * 2)) * 0.008; T.bodyR = Math.sin(ph) * 0.03;
        T.neckP = sn ? 0.45 : 0.05; T.headP = sn ? -0.35 : 0;
        T.tailP = sn ? 0.05 : -0.55; T.tailCurl = sn ? 0.02 : 0.22; T.tailWave = 0.2; T.earsBack = sn ? 0.5 : 0;
        const aU = sn ? 0.35 : 0.45, aL = sn ? 0.5 : 0.6;
        walkLeg('RL', 0, aU, aL, false); walkLeg('FL', 0.25, aU, aL, true); walkLeg('RR', 0.5, aU, aL, false); walkLeg('FR', 0.75, aU, aL, true);
        if (sn) ['FL', 'FR', 'RL', 'RR'].forEach(k => { legs[k][1] += legs[k][0] > -9 ? (k[0] === 'F' ? 0.6 : -0.7) : 0; legs[k][2] += k[0] === 'F' ? -0.3 : 0.5; });
        break;
      }
      case 'run': case 'drift': {
        // rotary gallop: fronts together, rears together, spine flexes
        const k = Math.min(1, sp / 6), flex = Math.sin(ph);
        T.bodyY = 0.24 + Math.max(0, Math.sin(ph + 0.6)) * 0.05 * k; T.bodyP = -flex * 0.12 * k;
        T.spineP = flex * 0.14 * k; T.chestP = -flex * 0.1 * k;
        T.neckP = 0.15 + flex * 0.05; T.headP = -0.15 - flex * 0.05;
        T.tailP = 0.75 + k * 0.25; T.tailCurl = 0.16; T.tailWave = 0.4; T.earsBack = 0.25 + k * 0.4;
        const aF = 0.8 + k * 0.35, aR = 0.75 + k * 0.4;
        ['FL', 'FR'].forEach((key, i) => { const p = ph + i * 0.5; const sw = Math.sin(p); L(key, -sw * aF, Math.max(0, Math.cos(p)) * 1.1, -0.2); });
        ['RL', 'RR'].forEach((key, i) => { const p = ph + Math.PI + i * 0.5; const sw = Math.sin(p); L(key, -sw * aR - 0.2, -Math.max(0, Math.cos(p)) * 0.9 - 0.2, 0.5); });
        if (mode === 'drift') { T.bodyR = -(s.lean || 0) * 0.35; T.headY = (s.lean || 0) * 0.4; }
        else T.bodyR = -(s.turn || 0) * 0.06;
        break;
      }
      case 'air': {
        const up = THREE.MathUtils.clamp(s.vy / 5, -1, 1);
        T.bodyY = 0.25; T.bodyP = -up * 0.35; T.neckP = 0.1 - up * 0.2; T.headP = up * 0.2;
        T.tailP = 1.05; T.tailCurl = 0.12; T.tailWave = 0.12; T.earsBack = 0.35;
        const st2 = up > 0 ? 1 : 0.4 + (1 - Math.min(1, -up)) * 0.3;    // stretched on the way up, reach for landing
        L('FL', -1.2 * st2 + (up < 0 ? -0.2 : 0), 0.25, -0.2); L('FR', -1.1 * st2, 0.3, -0.2);
        L('RL', 1.0 * st2, -0.2, 0.2); L('RR', 1.1 * st2, -0.25, 0.2);
        if (s.flip) T.rollSpin = s.flip;                 // air trick spin
        break;
      }
      case 'climb': {
        const cp = Math.sin(t * 14);
        T.bodyY = 0.26; T.bodyP = -1.35; T.neckP = 0.9; T.headP = 0.3; T.tailP = -0.6; T.tailWave = 0.4; T.earsBack = 0.4;
        L('FL', -1.4 - cp * 0.5, 0.5, 0); L('FR', -1.4 + cp * 0.5, 0.5, 0);
        L('RL', 0.3 + cp * 0.5, -0.6, 0.4); L('RR', 0.3 - cp * 0.5, -0.6, 0.4);
        break;
      }
      case 'slide': {
        T.bodyY = 0.13; T.bodyP = 0.08; T.neckP = -0.1; T.headP = 0.1; T.tailP = 0.1; T.tailWave = 0.2; T.earsBack = 0.7;
        L('FL', -1.45, 0, 0); L('FR', -1.45, 0, 0); L('RL', 1.4, 0, 0); L('RR', 1.4, 0, 0);
        break;
      }
      case 'tumble': {
        const k = s.t || 0;
        T.rollSpin = Math.min(1, k / 0.7) * Math.PI * 2 * (s.spinDir || 1); T.bodyY = 0.2 + Math.sin(Math.min(1, k / 0.7) * Math.PI) * 0.15;
        T.earsBack = 1; T.tailWave = 0.8; T.eyeOpen = 0.15;
        ['FL', 'FR', 'RL', 'RR'].forEach((key, i) => L(key, Math.sin(t * 20 + i * 1.7) * 1.2, 0.4, 0));
        break;
      }
      case 'swat': {
        const k = Math.min(1, (s.t || 0) / 0.32), raise = Math.sin(k * Math.PI);
        T.bodyY = 0.2; T.bodyP = -0.12 * raise; T.neckP = 0.2; T.headP = -0.1; T.earsBack = 0.3; T.tailWave = 0.5;
        const side = s.swatSide || 1, kk = side > 0 ? 'FR' : 'FL', other = side > 0 ? 'FL' : 'FR';
        L(kk, -2.0 * raise, 0.6 * raise, -0.6 * raise); legs[kk].sideZ = side * (k < 0.5 ? -0.3 : 0.7) * raise;
        L(other, 0.1, 0, 0); L('RL', 0.2, -0.5, 0.4); L('RR', 0.2, -0.5, 0.4);
        break;
      }
      case 'sit': case 'stare': {
        T.bodyY = 0.1; T.bodyP = -0.95; T.neckP = 0.7; T.headP = 0.22; T.tailP = 0.85; T.tailY = 0.9; T.tailCurl = 0.25; T.tailWave = 0.04;
        L('FL', 0.95, 0, 0.02); L('FR', 0.95, 0, 0.02);
        L('RL', -0.32, 2.64, -1.37); L('RR', -0.32, 2.64, -1.37);
        T.bodyY += breath;
        break;
      }
      case 'loaf': {
        T.bodyY = 0.11; T.neckP = 0.15; T.headP = 0.05; T.tailP = 0.25; T.tailY = 1.2; T.tailCurl = 0.3; T.tailWave = 0.0; T.eyeOpen = 0.45; T.earsBack = 0.15;
        L('FL', -1.55, 2.6, 0); L('FR', -1.55, 2.6, 0); L('RL', -1.2, 2.2, 0.2); L('RR', -1.2, 2.2, 0.2);
        T.bodyY += breath * 0.5;
        break;
      }
      case 'freeze': {      // caught mid-sneak: one paw up, eyes huge
        T.bodyY = 0.19; T.neckP = 0.35; T.headP = -0.2; T.earsBack = 0.1; T.tailP = 0.1; T.tailWave = 0; T.eyeOpen = 1.15;
        L('FL', -0.6, 1.2, -0.6); L('FR', 0.15, 0.1, 0); L('RL', -0.2, -0.6, 0.5); L('RR', 0.15, -0.45, 0.35);
        break;
      }
      case 'crouch': {     // pre-pounce wiggle
        T.bodyY = 0.15; T.bodyP = 0.1; T.neckP = 0.35; T.headP = -0.3; T.tailP = 0.1; T.tailWave = 0.6; T.earsBack = 0.2;
        T.bodyR = Math.sin(t * 18) * 0.05;
        L('FL', 0.3, 0.9, -0.5); L('FR', 0.3, 0.9, -0.5); L('RL', -0.6, -1.2, 1.0); L('RR', -0.6, -1.2, 1.0);
        break;
      }
      default: { // idle stand
        T.bodyY = 0.25 + breath; T.neckP = 0.05; T.tailP = -0.45; T.tailCurl = 0.3; T.tailWave = 0.12;
        L('FL', 0, 0, 0); L('FR', 0, 0, 0); L('RL', -0.15, -0.15, 0.3); L('RR', -0.15, -0.15, 0.3);
      }
    }
    T.puff = this.puff;

    // look at the camera / a target when calm
    if ((mode === 'idle' || mode === 'sit' || mode === 'stare' || mode === 'loaf' || mode === 'freeze') && s.lookAt) {
      const lp = this.head.worldToLocal ? null : null;
      const inv = new THREE.Vector3().copy(s.lookAt); this.root.worldToLocal(inv);
      const yaw = Math.atan2(inv.x, inv.z), dist = Math.hypot(inv.x, inv.z);
      T.headY = THREE.MathUtils.clamp(yaw, -1.0, 1.0);
      T.headP += THREE.MathUtils.clamp(-Math.atan2(inv.y - 0.45, dist) * 0.5, -0.4, 0.4);
    }
    if (s.headTilt) T.headR = s.headTilt;

    // ---- smooth toward target ----
    const kf = mode === 'run' || mode === 'drift' ? 26 : mode === 'tumble' ? 40 : 14;
    for (const k in T) P[k] = P[k] === undefined ? T[k] : damp(P[k], T[k], k === 'rollSpin' ? 30 : kf, dt);
    if (mode !== 'tumble' && mode !== 'air') P.rollSpin = T.rollSpin;      // no unwind after a flip
    for (const key in legs) {
      const tg = legs[key], cur = P['leg' + key] || (P['leg' + key] = [tg[0], tg[1], tg[2], 0]);
      for (let i = 0; i < 3; i++) cur[i] = damp(cur[i], tg[i], kf, dt);
      cur[3] = damp(cur[3], tg.sideZ || 0, kf, dt);
    }

    // ---- squash and stretch spring (set by game: landing, jump) ----
    this.squashV += (-this.squash * 260 - this.squashV * 16) * dt; this.squash += this.squashV * dt;
    const sq = THREE.MathUtils.clamp(this.squash, -0.5, 0.5);
    this.squashG.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.3);

    // ---- apply ----
    this.body.position.y = P.bodyY; this.body.rotation.set(P.bodyP, 0, P.bodyR);
    if (mode === 'tumble' || P.rollSpin) { this.body.rotation.z += P.rollSpin * (mode === 'tumble' ? 1 : 0); this.body.rotation.x += mode === 'air' ? -P.rollSpin : 0; }
    this.spine.rotation.x = P.spineP; this.chest.rotation.x = P.chestP;
    this.neck.rotation.x = P.neckP;
    this.head.rotation.set(P.headP + this.look.pitch, P.headY + this.look.yaw, P.headR);
    // ears: twitch now and then
    this.nextEar -= dt;
    if (this.nextEar < 0) { this.earTw[Math.random() < 0.5 ? 0 : 1] = 1; this.nextEar = 1.5 + Math.random() * 3.5; }
    this.ears.forEach((e, i) => {
      this.earTw[i] = Math.max(0, this.earTw[i] - dt * 6);
      const tw = Math.sin(this.earTw[i] * Math.PI * 3) * 0.35 * this.earTw[i];
      const s2 = i ? 1 : -1;
      e.rotation.set(-0.12 - P.earsBack * 0.9, s2 * (P.earsBack * 0.5), s2 * (-0.35 - P.earsBack * 0.4) + tw * s2);
    });
    // blink (and the famous slow blink)
    this.nextBlink -= dt;
    if (this.nextBlink < 0 && this.blink <= 0) { this.blink = 1; this.nextBlink = 2.5 + Math.random() * 3.5; }
    let lidOpen = 1;
    if (this.blink > 0) { this.blink -= dt * 7; lidOpen = Math.abs(this.blink * 2 - 1); }
    if (this.slowBlink > 0) { this.slowBlink -= dt / 1.6; const x = this.slowBlink; lidOpen = Math.min(lidOpen, x > 0.6 ? (x - 0.6) / 0.4 : x < 0.3 ? 1 - x / 0.3 : 0); lidOpen = Math.max(0, Math.min(1, lidOpen)); }
    const open = Math.min(P.eyeOpen, 1.15) * lidOpen;
    // lid angle: 0.25 rad = wide open (a touch hooded = judgy), 1.75 = closed
    this.lids.forEach(l => { l.rotation.x = 1.6 - Math.min(1.1, open) * 1.92; });
    this.eyes.forEach(e => e.scale.set(1, Math.max(0.85, Math.min(1.15, P.eyeOpen)), 0.75));
    this.eyeMat.emissiveIntensity = this.eyeGlow * lidOpen;
    // legs
    for (const key in this.legs) {
      const lg = this.legs[key], v = P['leg' + key];
      lg.hip.rotation.set(v[0], 0, v[3]); lg.knee.rotation.x = v[1]; lg.ankle.rotation.x = v[2];
    }
    // tail
    const wave = P.tailWave, flick = mode === 'idle' || mode === 'sit' || mode === 'stare' ? Math.max(0, Math.sin(t * 0.9)) ** 8 * 0.5 : 0;
    this.tailSegs.forEach((sg, i) => {
      const f = i / this.tailSegs.length;
      sg.rotation.x = (i === 0 ? P.tailP : 0) + P.tailCurl * (i > 1 ? 1 : 0.3);
      sg.rotation.y = (i === 0 ? P.tailY * 0.6 : P.tailY * 0.12) + Math.sin(t * (mode === 'run' ? 9 : 2.5) - i * 0.7) * wave * (0.3 + f) + (i > 2 ? flick * Math.sin(t * 12) : 0);
    });
    const puffT = P.puff * (1 + Math.sin(t * 2.2) * 0.02);
    this.puffG.scale.setScalar(puffT);
    this.furs.forEach(f => { f.userData.fur.uWind.value = t * 3; });
    this.tailPuff.userData.fur.uPuff.value = Math.min(1.8, P.puff);
    this.mane.userData.fur.uPuff.value = 1 + (P.puff - 1) * 0.35;
    // blob shadow follows
    if (this.blob.parent) {
      const wp = this.root.position; this.blob.position.set(wp.x, (s.groundY ?? 0) + 0.004, wp.z);
      this.blob.rotation.z = -this.root.rotation.y;
      const h = Math.max(0, wp.y - (s.groundY ?? 0));
      const k = 1 / (1 + h * 2.5); this.blob.scale.setScalar(k); this.blob.material.opacity = k;
    }
  }
  land(power) { this.squashV -= 6 * power; }
  hop(power) { this.squashV += 5 * power; }
}
