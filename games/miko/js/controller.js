// MIKO - cat movement: momentum, jumps + double jump, wall kicks, curtain climbing (wall-run), drift-skids,
// power slides, swats, wipe-outs, loaf. Kinematic, against the house's collision boxes (cannon handles the props).
import * as THREE from 'three';
import { H } from './house.js';

const G = 14, R = 0.15, STEP = 0.2;
const V = new THREE.Vector3();

export class CatController {
  constructor(colliders, emit) {
    this.cols = colliders; this.emit = emit || (() => {});
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3(); this.heading = 0;
    this.reset(new THREE.Vector3(-0.8, 0, 0.3), Math.PI);
  }
  reset(p, h) {
    this.pos.copy(p); this.vel.set(0, 0, 0); this.heading = h; this.grounded = true; this.groundY = p.y; this.ground = null;
    this.mode = 'ground'; this.modeT = 0; this.jumps = 0; this.momentum = 0; this.speed = 0; this.wallT = 9; this.wall = null;
    this.drift = false; this.driftT = 0; this.slideT = 0; this.swatT = 0; this.flip = 0; this.flipping = false; this.climbCd = 0;
    this.fallFrom = p.y; this.lastSurface = null; this.idleT = 0; this.skidT = 0; this.darting = false; this.wasSteering = false; this.steerD = 0; this.stepPh = 0; this.turn = 0; this.lean = 0; this.boost = 1; this.sit = false; this.sneak = false;
  }
  fwd(out = new THREE.Vector3()) { return out.set(Math.sin(this.heading), 0, Math.cos(this.heading)); }
  height() { return this.mode === 'slide' ? 0.16 : this.mode === 'loaf' ? 0.2 : 0.33; }

  // inp: { x, y, jump, trick, auto }, opts: { boost, hasSwatTarget(fn) }
  update(dt, inp, opts = {}) {
    this.modeT += dt; this.wallT += dt; this.climbCd -= dt; this.swatT = Math.max(0, this.swatT - dt);
    const auto = inp.auto, f = this.fwd(V);
    const hs = Math.hypot(this.vel.x, this.vel.z);
    this.boost = opts.boost || 1;

    if (this.mode === 'tumble') {
      this.vel.x *= Math.exp(-3 * dt); this.vel.z *= Math.exp(-3 * dt);
      if (this.modeT > 0.95) { this.mode = this.grounded ? 'ground' : 'air'; this.emit('tumbleEnd'); }
    } else if (this.mode === 'loaf') {
      this.vel.x *= Math.exp(-10 * dt); this.vel.z *= Math.exp(-10 * dt);
    } else if (this.mode === 'climb') {
      this.vel.set(0, 3.3, 0);
      const n = this.climbN; this.heading = Math.atan2(-n.x, -n.z);
      if (inp.jump || this.modeT > 0.85 || this.pos.y > 1.85) this._kickOff(inp.jump ? 1 : 0.8, true);
    } else {
      // ----- steering -----
      let turnRate = this.grounded ? (this.drift ? 4.2 : 2.7) : 1.9;
      if (auto) {
        // Zoomies: NO auto-run. Camera-relative stick; push a little = stroll, all the way = DART; let go = stop.
        const mag = Math.min(1, Math.hypot(inp.x, inp.y));
        const steering = mag > 0.15;
        if (steering) {
          const want = (opts.camYaw || 0) - Math.atan2(inp.x, inp.y);
          let d = want - this.heading; d = Math.atan2(Math.sin(d), Math.cos(d));
          if (Math.abs(d) > 2.7 && this.turnSign) d = Math.abs(d) * this.turnSign;   // U-turns: keep turning the same way
          this.turnSign = Math.sign(d) || 1; this.steerD = d;
          const rate = this.grounded ? (this.drift ? 7.5 : 6) : 2.6;
          this.turn = THREE.MathUtils.clamp(d * 9, -rate, rate); this.heading += this.turn * dt;
          const dart = mag > 0.85;
          let target = mag < 0.6 ? 0.45 + (mag - 0.15) / 0.45 * 0.75          // stroll 0.45 .. 1.2
            : !dart ? 1.2 + (mag - 0.6) / 0.25 * 1.9                           // trot 1.2 .. 3.1
            : 4.3 + this.momentum;                                             // DART 4.3 .. 6.5
          if (dart && !this.darting && this.grounded && this.mode === 'ground') { this.speed = Math.max(this.speed, 3.2); this.emit('dart'); }
          this.darting = dart;
          target *= this.boost;                                                // MAX ZOOM only propels while steering
          if (this.mode === 'slide') target = hs;
          if (this.swatT > 0 && this.grounded) target *= 0.6;
          if (Math.abs(d) > 1.4 && this.grounded && !this.drift) target *= 0.6;  // tight turn-around
          this.speed += (target - this.speed) * Math.min(1, dt * (target > this.speed ? (dart ? 3.2 : 4) : 5));
          if (dart && this.grounded && this.mode === 'ground') this.momentum = Math.min(2.2, this.momentum + dt * 0.35 * (1 - Math.min(1, Math.abs(d)) * 0.6));
          else if (!dart) this.momentum = Math.max(0, this.momentum - dt * 0.8);
        } else {
          this.turn = 0; this.steerD = 0; this.darting = false;
          if (this.wasSteering && this.grounded && this.mode === 'ground' && hs > 2.2) { this.skidT = 0.32; this.emit('stopSkid', { speed: hs }); }
          if (this.mode !== 'slide') { this.speed += (0 - this.speed) * Math.min(1, dt * 12); if (this.speed < 0.05) this.speed = 0; }
          this.momentum = Math.max(0, this.momentum - dt * 2);
        }
        this.wasSteering = steering; this.skidT = Math.max(0, (this.skidT || 0) - dt);
      } else {
        // sandbox: camera-relative stick, walk / trot by how far you push
        const mag = Math.min(1, Math.hypot(inp.x, inp.y));
        if (mag > 0.12 && !this.sit) {
          const camYaw = opts.camYaw || 0;
          const want = camYaw - Math.atan2(inp.x, inp.y);
          let d = want - this.heading; d = Math.atan2(Math.sin(d), Math.cos(d));
          this.turn = THREE.MathUtils.clamp(d * 8, -7, 7); this.heading += this.turn * dt;
          const sp = this.sneak ? 0.55 * mag : mag < 0.65 ? 1.1 * mag / 0.65 : 1.1 + (mag - 0.65) / 0.35 * 2.6;
          this.speed += (sp - this.speed) * Math.min(1, dt * 6);
        } else { this.turn = 0; this.speed += (0 - this.speed) * Math.min(1, dt * 8); }
      }
      // ----- drift (wood floor skids) -----
      if (auto && this.grounded && this.mode === 'ground') {
        const sd = this.steerD || 0;
        if (!this.drift && this.wasSteering && Math.abs(sd) > 0.9 && hs > 4.0) { this.drift = true; this.driftT = 0; this.emit('driftStart'); }
        if (this.drift) { this.driftT += dt; this.lean = -Math.sign(sd) * Math.min(1, this.driftT * 4);
          if (Math.abs(sd) < 0.3 || hs < 2.4 || !this.wasSteering) { this.drift = false; this.emit('driftEnd', { t: this.driftT }); this.lean = 0; } }
      } else if (this.drift) { this.drift = false; this.emit('driftEnd', { t: this.driftT }); this.lean = 0; }
      // ----- velocity: grip pulls velocity toward heading -----
      const fw = this.fwd(V);
      const grip = this.mode === 'slide' ? 0.6 : !this.grounded ? 1.6 : this.drift ? 2.2 : (auto && !this.wasSteering) ? 15 : 13;
      const tx = fw.x * this.speed, tz = fw.z * this.speed, k = Math.min(1, dt * grip);
      if (this.mode === 'slide') { this.vel.x *= Math.exp(-1.1 * dt); this.vel.z *= Math.exp(-1.1 * dt); this.speed = Math.hypot(this.vel.x, this.vel.z); }
      else { this.vel.x += (tx - this.vel.x) * k; this.vel.z += (tz - this.vel.z) * k; }
      if (this.drift) { const l = Math.hypot(this.vel.x, this.vel.z); const want = Math.max(l, this.speed * 0.92); if (l > 0.01) { this.vel.x *= want / l; this.vel.z *= want / l; } }
      // ----- jump / double jump / wall kick -----
      if (inp.jump) {
        if (this.mode === 'slide') this._endSlide();
        if (this.grounded && this.sneak && !auto) { const d = this.fwd(new THREE.Vector3()); this.vel.set(d.x * 3.2, 4.2, d.z * 3.2); this.speed = 3.2; this.grounded = false; this.jumps = 1; this.mode = 'air'; this.fallFrom = this.pos.y; this.emit('jump', { pounce: true }); }
        else if (this.grounded) { this.vel.y = 5.3; this.grounded = false; this.jumps = 1; this.mode = 'air'; this.fallFrom = this.pos.y; this.emit('jump'); }
        else if (this.wallT < 0.2 && this.wall && this.wall.type !== 'climb') {
          const n = this.wallN, d = this.fwd(new THREE.Vector3()); const dot = d.x * n.x + d.z * n.z;
          d.x -= 2 * dot * n.x; d.z -= 2 * dot * n.z; this.heading = Math.atan2(d.x, d.z);
          const sp = Math.max(3.6, this.speed); this.vel.set(d.x * sp, 5.4, d.z * sp); this.jumps = 1; this.wallT = 9;
          this.emit('wallkick', { wall: this.wall });
        } else if (this.jumps < 2) { this.vel.y = 5.0; this.jumps = 2; this.emit('dbl'); }
      }
      // ----- trick button: swat / power slide / air flip -----
      if (inp.trick) {
        if (opts.swatTarget && opts.swatTarget()) { this.swatT = 0.34; this.swatSide = Math.random() < 0.5 ? -1 : 1; this.emit('swat'); }
        else if (this.grounded && auto && hs > 2.8 && this.mode === 'ground') { this.mode = 'slide'; this.modeT = 0; this.slideFrom = this.pos.clone(); this.vel.multiplyScalar(1.15); this.emit('slideStart'); }
        else if (!this.grounded && !this.flipping) { this.flipping = true; this.flip = 0; this.emit('flipStart'); }
        else if (!auto) { this.swatT = 0.34; this.swatSide = Math.random() < 0.5 ? -1 : 1; this.emit('swat'); }
      }
      if (this.mode === 'slide' && (this.modeT > 0.9 || hs < 1.2)) this._endSlide();
    }
    if (this.flipping) { this.flip += dt / 0.42; if (this.flip >= 1) { this.flip = 1; } }

    // ----- integrate with collision (substeps) -----
    if (this.mode !== 'climb') this.vel.y = Math.max(-12, this.vel.y - G * dt);
    const prevY = this.pos.y;
    const dist = Math.hypot(this.vel.x, this.vel.y, this.vel.z) * dt, n = Math.max(1, Math.ceil(dist / 0.05));
    const sdt = dt / n; let landed = false, hitWall = null;
    for (let i = 0; i < n; i++) {
      const py = this.pos.y;
      this.pos.x += this.vel.x * sdt; this.pos.z += this.vel.z * sdt; this.pos.y += this.vel.y * sdt;
      const w = this._collideXZ(); if (w) hitWall = w;
      const r = this._collideY(py); if (r) landed = true;
    }
    // step / ground follow
    if (this.grounded && !landed) {
      const gy = this._groundAt(this.pos.y + STEP);
      if (gy < this.pos.y - 0.02) { this.grounded = false; if (this.mode === 'ground' || this.mode === 'slide') { if (this.mode === 'slide') this._endSlide(); this.mode = 'air'; } this.jumps = Math.max(this.jumps, 1); this.fallFrom = this.pos.y; }
      else this.pos.y = gy;
    }
    if (hitWall) this._wallHit(hitWall);
    // idle timer (sit after a few seconds standing still)
    if (this.grounded && this.mode === 'ground' && hs < 0.15 && this.swatT <= 0) this.idleT += dt; else this.idleT = 0;
    // footsteps
    if (this.grounded && (this.mode === 'ground') && hs > 0.3) {
      this.stepPh += dt * (hs > 3 ? 2.6 + hs * 0.3 : 1.6 + hs * 1.5) * 2;
      if (this.stepPh > 1) { this.stepPh -= 1; this.emit('step', { speed: hs }); }
    }
  }

  _endSlide() { if (this.mode !== 'slide') return; const d = this.slideFrom ? this.pos.distanceTo(this.slideFrom) : 0; this.mode = this.grounded ? 'ground' : 'air'; this.emit('slideEnd', { dist: d }); }
  _kickOff(power, fromClimb) {
    const n = this.climbN; this.heading = Math.atan2(n.x, n.z);
    this.vel.set(n.x * 3.4 * power, 3.6 + power * 1.2, n.z * 3.4 * power);
    this.mode = 'air'; this.modeT = 0; this.jumps = 1; this.climbCd = 0.6; this.speed = 3.5;
    this.emit('climbEnd', { height: this.pos.y - this.climbFrom, jump: power > 0.9 });
  }
  _rectHit(c) {
    const x = THREE.MathUtils.clamp(this.pos.x, c.min.x, c.max.x), z = THREE.MathUtils.clamp(this.pos.z, c.min.z, c.max.z);
    return [this.pos.x - x, this.pos.z - z];
  }
  _collideXZ() {
    const h = this.height(); let hit = null;
    for (const c of this.cols) {
      if (c.max.y <= this.pos.y + STEP && c.walk) continue;
      if (c.max.y <= this.pos.y + 0.02) continue;
      if (c.min.y >= this.pos.y + h) continue;
      let [dx, dz] = this._rectHit(c); let d2 = dx * dx + dz * dz;
      if (d2 >= R * R) continue;
      let nx, nz, pen;
      if (d2 < 1e-9) {     // center inside: push out the shortest way
        const l = this.pos.x - c.min.x, r = c.max.x - this.pos.x, b = this.pos.z - c.min.z, t = c.max.z - this.pos.z, m = Math.min(l, r, b, t);
        if (m === l) { nx = -1; nz = 0; pen = l + R; } else if (m === r) { nx = 1; nz = 0; pen = r + R; } else if (m === b) { nx = 0; nz = -1; pen = b + R; } else { nx = 0; nz = 1; pen = t + R; }
      } else { const d = Math.sqrt(d2); nx = dx / d; nz = dz / d; pen = R - d; }
      this.pos.x += nx * pen; this.pos.z += nz * pen;
      const into = -(this.vel.x * nx + this.vel.z * nz);
      if (into > 0) { this.vel.x += nx * into; this.vel.z += nz * into; }
      if (!hit || into > hit.into) hit = { c, nx, nz, into };
    }
    return hit;
  }
  _groundAt(maxTop) {
    let gy = 0, g = null; const rr = R * 0.55;
    for (const c of this.cols) {
      if (!c.walk || c.max.y > maxTop) continue;
      if (this.pos.x < c.min.x - rr || this.pos.x > c.max.x + rr || this.pos.z < c.min.z - rr || this.pos.z > c.max.z + rr) continue;
      if (c.max.y > gy) { gy = c.max.y; g = c; }
    }
    this._g = g; return gy;
  }
  _collideY(prevY) {
    const h = this.height();
    if (this.vel.y > 0) {       // ceilings / undersides
      if (this.pos.y + h > H - 0.02) { this.pos.y = H - 0.02 - h; this.vel.y = 0; }
      for (const c of this.cols) {
        if (c.min.y < prevY + h - 0.01 || c.min.y > this.pos.y + h) continue;
        if (this.pos.x < c.min.x || this.pos.x > c.max.x || this.pos.z < c.min.z || this.pos.z > c.max.z) continue;
        this.pos.y = c.min.y - h; this.vel.y = 0;
      }
      return false;
    }
    const gy = this._groundAt(Math.max(prevY, this.pos.y) + STEP);
    if (this.pos.y <= gy) {
      const was = this.grounded, vy = this.vel.y;
      this.pos.y = gy; this.vel.y = 0; this.groundY = gy; this.ground = this._g;
      if (!was) {
        this.grounded = true; this.jumps = 0;
        const flipOk = this.flipping && this.flip >= 0.85; const flipped = this.flipping; this.flipping = false; this.flip = 0;
        if (this.mode === 'air') this.mode = 'ground';
        this.emit('land', { vy, surface: this._g, drop: this.fallFrom - gy, flip: flipOk, flipFail: flipped && !flipOk });
        this.fallFrom = gy;
      }
      return true;
    }
    if (this.grounded && this.pos.y > gy + 0.001 && this.vel.y <= 0 && this.pos.y - gy > STEP) this.grounded = false;
    return false;
  }
  _wallHit(h) {
    this.wallT = 0; this.wall = h.c; this.wallN = new THREE.Vector3(h.nx, 0, h.nz);
    if (this.mode === 'tumble' || this.mode === 'loaf') return;
    // curtains: climb them (wall-run straight up)
    if (h.c.type === 'climb' && this.mode !== 'climb' && this.climbCd <= 0 && (h.into > 1.2 || !this.grounded) && this.pos.y < 1.6) {
      this.mode = 'climb'; this.modeT = 0; this.climbN = new THREE.Vector3(h.nx, 0, h.nz); this.climbFrom = this.pos.y; this.grounded = false;
      if (this.drift) { this.drift = false; this.lean = 0; }
      this.emit('climbStart'); return;
    }
    if (!this._auto) return;
    if (h.into > 5.2) {             // too fast: comedic wipe-out
      this.mode = 'tumble'; this.modeT = 0; this.speed = 0.5; this.momentum = 0; this.drift = false; this.lean = 0; this.spinDir = Math.random() < 0.5 ? -1 : 1;
      this.vel.x = h.nx * 2.2; this.vel.z = h.nz * 2.2; if (this.grounded) { this.vel.y = 2.5; this.grounded = false; }
      this.emit('wipe', { into: h.into, wall: h.c });
    } else if (h.into > 2.0 && this.grounded) {
      // bonk: lose momentum and turn along the wall (or turn around if head-on)
      this.momentum *= 0.4; this.speed *= 0.55;
      const t1 = new THREE.Vector3(-h.nz, 0, h.nx), f = this.fwd(new THREE.Vector3());
      const dot = f.dot(t1);
      if (Math.abs(dot) < 0.25) this.heading = Math.atan2(h.nx, h.nz) + (Math.random() - 0.5) * 0.8;
      else { const t = dot > 0 ? t1 : t1.negate(); this.heading = Math.atan2(t.x * 0.85 + h.nx * 0.5, t.z * 0.85 + h.nz * 0.5); }
      this.emit('bonk', { into: h.into });
    } else if (this.grounded) {     // gently steer along walls when running auto
      const t1 = new THREE.Vector3(-h.nz, 0, h.nx), f = this.fwd(new THREE.Vector3()), dot = f.dot(t1);
      const t = dot >= 0 ? t1 : t1.negate(); const want = Math.atan2(t.x + h.nx * 0.3, t.z + h.nz * 0.3);
      let d = want - this.heading; d = Math.atan2(Math.sin(d), Math.cos(d)); this.heading += d * 0.25;
    }
  }
  setAuto(a) { this._auto = a; }
  loaf(on) { if (on) { this.mode = 'loaf'; this.modeT = 0; this.drift = false; this.lean = 0; this.speed = 0; this.momentum = 0; } else if (this.mode === 'loaf') { this.mode = 'ground'; } }

  // what the Miko rig should look like right now
  animState(auto) {
    const hs = Math.hypot(this.vel.x, this.vel.z);
    let mode;
    if (this.mode === 'tumble') mode = 'tumble';
    else if (this.mode === 'loaf') mode = 'loaf';
    else if (this.mode === 'climb') mode = 'climb';
    else if (this.mode === 'slide') mode = 'slide';
    else if (!this.grounded) mode = 'air';
    else if (this.swatT > 0) mode = 'swat';
    else if (this.drift || this.skidT > 0) mode = 'drift';
    else if ((this.sit || (this._auto && this.idleT > 4.5)) && hs < 0.2) mode = 'sit';
    else if (hs > 2.2) mode = 'run';
    else if (hs > 0.15) mode = this.sneak ? 'sneak' : 'walk';
    else mode = this.sneak ? 'crouch' : 'idle';
    return { mode, speed: hs, vy: this.vel.y, turn: this.turn, grounded: this.grounded, t: this.mode === 'tumble' ? this.modeT : this.swatT > 0 ? 0.34 - this.swatT : this.modeT,
      lean: this.skidT > 0 && !this.drift ? 0.35 * (this.turnSign || 1) : this.lean, flip: this.flipping ? -this.flip * Math.PI * 2 : 0, swatSide: this.swatSide, spinDir: this.spinDir, groundY: this.groundY };
  }
}
