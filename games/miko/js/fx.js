// MIKO - particles (dust, fur, sparkles, debris) + a glowing motion-streak ribbon for MAXIMUM ZOOM
import * as THREE from 'three';

const VS = `attribute float aSize; attribute float aAlpha; attribute vec3 aColor; varying float vA; varying vec3 vC; uniform float uScale;
void main(){ vA = aAlpha; vC = aColor; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = aSize * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`;
const FS = `varying float vA; varying vec3 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard;
  float a = smoothstep(0.5, 0.0, r) * vA; gl_FragColor = vec4(vC, a); }`;

class Pool {
  constructor(scene, n, additive) {
    this.n = n; this.i = 0;
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.size = new Float32Array(n); this.alpha = new Float32Array(n);
    this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n); this.grav = new Float32Array(n); this.s0 = new Float32Array(n); this.drag = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: { uScale: { value: 400 } }, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = 5; scene.add(this.pts); this.g = g;
  }
  emit(p, v, color, size, life, grav = 9.8, drag = 1) {
    const i = this.i; this.i = (this.i + 1) % this.n;
    this.pos.set([p.x, p.y, p.z], i * 3); this.vel.set([v.x, v.y, v.z], i * 3); this.col.set([color.r, color.g, color.b], i * 3);
    this.s0[i] = size; this.size[i] = size; this.life[i] = life; this.max[i] = life; this.grav[i] = grav; this.alpha[i] = 1; this.drag[i] = drag;
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
      this.life[i] -= dt; const k = Math.max(0, this.life[i] / this.max[i]);
      const j = i * 3, dr = Math.exp(-this.drag[i] * dt);
      this.vel[j] *= dr; this.vel[j + 2] *= dr; this.vel[j + 1] = this.vel[j + 1] * dr - this.grav[i] * dt;
      this.pos[j] += this.vel[j] * dt; this.pos[j + 1] += this.vel[j + 1] * dt; this.pos[j + 2] += this.vel[j + 2] * dt;
      if (this.pos[j + 1] < 0.01) { this.pos[j + 1] = 0.01; this.vel[j + 1] *= -0.3; this.vel[j] *= 0.6; this.vel[j + 2] *= 0.6; }
      this.alpha[i] = Math.min(1, k * 2.2); this.size[i] = this.s0[i] * (0.6 + 0.4 * k);
    }
    ['position', 'aColor', 'aSize', 'aAlpha'].forEach(a => { this.g.attributes[a].needsUpdate = true; });
  }
}

export class FX {
  constructor(scene, quality) {
    const n = quality === 'low' ? 250 : 700;
    this.soft = new Pool(scene, n, false); this.glow = new Pool(scene, Math.round(n * 0.7), true);
    this.c = new THREE.Color(); this.v = new THREE.Vector3(); this.p = new THREE.Vector3();
    // motion streak ribbon
    this.trailN = 12; this.trail = [];
    const g = new THREE.BufferGeometry(); this.tPos = new Float32Array(this.trailN * 2 * 3); this.tA = new Float32Array(this.trailN * 2);
    const idx = []; for (let i = 0; i < this.trailN - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx); g.setAttribute('position', new THREE.BufferAttribute(this.tPos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('aA', new THREE.BufferAttribute(this.tA, 1).setUsage(THREE.DynamicDrawUsage));
    this.trailMat = new THREE.ShaderMaterial({
      vertexShader: 'attribute float aA; varying float vA; void main(){ vA=aA; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 uC; uniform float uO; varying float vA; void main(){ gl_FragColor = vec4(uC, vA*uO); }',
      uniforms: { uC: { value: new THREE.Color(0xff8ae0) }, uO: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.ribbon = new THREE.Mesh(g, this.trailMat); this.ribbon.frustumCulled = false; this.ribbon.renderOrder = 6; scene.add(this.ribbon);
    this.ribbons = [];
  }
  setScale(h, pr) { this.soft.mat.uniforms.uScale.value = this.glow.mat.uniforms.uScale.value = h * pr * 0.5; }
  burst(pos, n, o = {}) {
    const col = this.c.set(o.color ?? 0xd8cbb8), pool = o.glow ? this.glow : this.soft;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = (o.speed ?? 1.5) * (0.4 + Math.random() * 0.8);
      this.v.set(Math.cos(a) * sp, (o.up ?? 1.5) * (0.5 + Math.random()), Math.sin(a) * sp);
      if (o.dir) this.v.addScaledVector(o.dir, o.dirAmt ?? 1);
      this.p.copy(pos); this.p.x += (Math.random() - 0.5) * (o.spread ?? 0.05); this.p.z += (Math.random() - 0.5) * (o.spread ?? 0.05);
      if (o.vary) { const cc = col.clone().offsetHSL(0, 0, (Math.random() - 0.5) * o.vary); pool.emit(this.p, this.v, cc, (o.size ?? 0.04) * (0.6 + Math.random() * 0.8), (o.life ?? 0.8) * (0.6 + Math.random() * 0.6), o.grav ?? 6, o.drag ?? 1.5); }
      else pool.emit(this.p, this.v, col, (o.size ?? 0.04) * (0.6 + Math.random() * 0.8), (o.life ?? 0.8) * (0.6 + Math.random() * 0.6), o.grav ?? 6, o.drag ?? 1.5);
    }
  }
  update(dt, cam, trailPoint, trailOn) {
    this.soft.update(dt); this.glow.update(dt);
    // ribbon behind the cat
    const tr = this.trail;
    if (trailPoint) { tr.unshift(trailPoint.clone()); if (tr.length > this.trailN) tr.pop(); }
    const o = this.trailMat.uniforms.uO; o.value += ((trailOn ? 0.35 : 0) - o.value) * Math.min(1, dt * 6);
    this.ribbon.visible = o.value > 0.01 && tr.length > 2;
    if (!this.ribbon.visible) return;
    const up = new THREE.Vector3(), dir = new THREE.Vector3(), toCam = new THREE.Vector3();
    for (let i = 0; i < this.trailN; i++) {
      const p = tr[Math.min(i, tr.length - 1)], q = tr[Math.min(i + 1, tr.length - 1)];
      dir.subVectors(p, q); if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
      toCam.subVectors(cam.position, p); up.crossVectors(dir, toCam).normalize();
      const w = 0.03 * (1 - i / this.trailN);
      this.tPos.set([p.x + up.x * w, p.y + up.y * w, p.z + up.z * w, p.x - up.x * w, p.y - up.y * w, p.z - up.z * w], i * 6);
      const a = (1 - i / this.trailN) * (i < tr.length ? 1 : 0); this.tA[i * 2] = a; this.tA[i * 2 + 1] = a;
    }
    this.ribbon.geometry.attributes.position.needsUpdate = true; this.ribbon.geometry.attributes.aA.needsUpdate = true;
  }
}
