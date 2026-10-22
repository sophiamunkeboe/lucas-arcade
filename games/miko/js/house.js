// MIKO - the house: living room from the photos (tan leather power recliner couch, navy quatrefoil throw,
// burnt-orange pillow, olive tree, sage curtains, grey-brown plank floor, GRATEFUL sign), plus a hallway
// to the bedroom (the human sleeps there) and a kitchen. Also builds the collision boxes the cat runs on.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as TX from './textures.js';

export const H = 2.6;   // ceiling height
export const BOUNDS = { living: [-3, 3, -3, 3], kitchen: [-6.6, -3, -3, 3], hall: [-2.6, -1.4, 3, 8.6] };

export function buildHouse(scene, quality) {
  const G = new THREE.Group(); G.name = 'house'; scene.add(G);
  const colliders = [], walls = [], glow = {}, props = [];
  const box = (x0, x1, y0, y1, z0, z1, o = {}) => {
    const c = { min: new THREE.Vector3(x0, y0, z0), max: new THREE.Vector3(x1, y1, z1), name: o.name || '', type: o.type || 'solid', walk: o.walk !== false, phys: o.phys !== false };
    colliders.push(c); return c;
  };
  const M = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.8, metalness: 0 }, o));
  const add = (geo, mat, x, y, z, o = {}) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
    if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; if (o.rz) m.rotation.z = o.rz;
    m.castShadow = o.cast !== false; m.receiveShadow = o.recv !== false; (o.parent || G).add(m); return m;
  };
  const rbox = (w, h, d, r = 0.04, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
  const bx = (w, h, d) => new THREE.BoxGeometry(w, h, d);

  // ---------------- floor, walls, ceiling ----------------
  const floorMap = TX.woodFloor(); floorMap.repeat.set(9.6 / 1.6, 11.6 / 1.6); floorMap.rotation = Math.PI / 2;
  const floorMat = M({ map: floorMap, roughness: 0.5, metalness: 0.0, envMapIntensity: 0.6 });
  const floor = add(new THREE.PlaneGeometry(9.6, 11.6), floorMat, -1.8, 0, 2.8, { rx: -Math.PI / 2, cast: false });
  floor.name = 'floor';
  const wallMat = M({ color: 0xece4d5, map: TX.noiseTex(256, '#f4eee4', 10), roughness: 0.92 });
  const ceilMat = M({ color: 0xf0ebe2, roughness: 1 });
  const baseMat = M({ color: 0xf7f4ee, roughness: 0.5 });
  const wall = (x0, x1, z0, z1, y0 = 0, y1 = H, base = true) => {
    const w = x1 - x0, d = z1 - z0, h = y1 - y0;
    const m = add(bx(w, h, d), wallMat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    walls.push(m); box(x0, x1, y0, y1, z0, z1, { type: 'wall', walk: false });
    if (base && y0 === 0) { const bb = add(bx(w + 0.02, 0.09, d + 0.02), baseMat, (x0 + x1) / 2, 0.045, (z0 + z1) / 2, { cast: false }); }
    return m;
  };
  const T = 0.1;
  // living back wall with the window opening (x -2.4..-0.2, y 0.55..2.25)
  wall(-3, -2.4, -3 - T, -3); wall(-0.2, 3, -3 - T, -3);
  wall(-2.4, -0.2, -3 - T, -3, 0, 0.55); wall(-2.4, -0.2, -3 - T, -3, 2.25, H, false);
  wall(-6.6, -3, -3 - T, -3);                                 // kitchen back
  wall(3, 3 + T, -3, 3);                                      // living right (couch wall)
  wall(-3, -2.6, 3, 3 + T); wall(-1.4, 3, 3, 3 + T);          // living front, hall opening x -2.6..-1.4
  wall(-2.6, -1.4, 3, 3 + T, 2.2, H, false);                  // header over the hall opening
  wall(-6.6, -3, 3, 3 + T);                                   // kitchen front
  wall(-6.6 - T, -6.6, -3, 3);                                // kitchen far wall
  wall(-3 - T, -3, -3, -1.4); wall(-3 - T, -3, 1.4, 3);       // living/kitchen divider, opening z -1.4..1.4
  wall(-3 - T, -3, -1.4, 1.4, 2.2, H, false);
  wall(-2.6 - T, -2.6, 3, 8.6); wall(-1.4, -1.4 + T, 3, 8.6); // hallway
  wall(-2.6, -2.25, 8.6, 8.6 + T); wall(-1.75, -1.4, 8.6, 8.6 + T); wall(-2.25, -1.75, 8.6, 8.6 + T, 2.1, H, false);
  const ceil = add(new THREE.BoxGeometry(9.8, 0.1, 11.8), ceilMat, -1.8, H + 0.05, 2.8, { cast: true });   // casts, so moonlight only comes in the window
  // "baked" AO: dark gradient strips along the bottoms of the walls and ceiling corners
  const aoTex = TX.vgrad('rgba(0,0,0,0)', 'rgba(0,0,0,0.55)');
  const aoMat = new THREE.MeshBasicMaterial({ map: aoTex, transparent: true, depthWrite: false });
  const aoStrip = (x0, z0, x1, z1, nx, nz) => {
    const len = Math.hypot(x1 - x0, z1 - z0), m = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.35), aoMat);
    m.position.set((x0 + x1) / 2 + nx * 0.002, 0.175, (z0 + z1) / 2 + nz * 0.002); m.rotation.y = Math.atan2(nx, nz); m.renderOrder = 2; G.add(m);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.4), aoMat);   // on the floor too
    f.rotation.x = -Math.PI / 2; f.rotation.z = Math.atan2(nx, nz) + Math.PI; f.position.set((x0 + x1) / 2 + nx * 0.2, 0.003, (z0 + z1) / 2 + nz * 0.2); f.renderOrder = 2; G.add(f);
  };
  aoStrip(-3, -3, 3, -3, 0, 1); aoStrip(3, -3, 3, 3, -1, 0); aoStrip(-1.4, 3, 3, 3, 0, -1); aoStrip(-6.6, -3, -3, -3, 0, 1);
  aoStrip(-6.6, -3, -6.6, 3, 1, 0); aoStrip(-6.6, 3, -3, 3, 0, -1); aoStrip(-2.6, 3, -2.6, 8.6, 1, 0); aoStrip(-1.4, 3, -1.4, 8.6, -1, 0);
  const contact = TX.radial('rgba(0,0,0,.7)', 'rgba(0,0,0,0)');
  const blob = (x, z, w, d, op = 0.8) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: contact, transparent: true, depthWrite: false, opacity: op })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.004, z); m.renderOrder = 2; G.add(m); };

  // ---------------- window, moon sky, curtains ----------------
  const sky = TX.textCanvas(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0b1636'); gr.addColorStop(0.7, '#20345f'); gr.addColorStop(1, '#3b4d73');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.8})`; g.fillRect(Math.random() * w, Math.random() * h * 0.7, 1.5, 1.5); }
    const mg = g.createRadialGradient(330, 130, 10, 330, 130, 120); mg.addColorStop(0, 'rgba(230,238,255,1)'); mg.addColorStop(0.25, 'rgba(200,215,255,.9)'); mg.addColorStop(0.27, 'rgba(160,180,240,.35)'); mg.addColorStop(1, 'rgba(120,140,220,0)');
    g.fillStyle = mg; g.fillRect(0, 0, w, h);
    g.fillStyle = '#0a0f1c'; for (let x = 0; x < w; x += 24) { const hh = 60 + Math.sin(x * 0.05) * 20 + Math.random() * 30; g.fillRect(x, h - hh, 26, hh); }  // trees/rooftops
  });
  const skyMat = new THREE.MeshBasicMaterial({ map: sky, toneMapped: false });
  const skyM = add(new THREE.PlaneGeometry(4.5, 3.2), skyMat, -1.3, 1.4, -3.9, { cast: false, recv: false });
  glow.sky = skyMat;
  const frameMat = M({ color: 0xf4f1ea, roughness: 0.6 });
  add(bx(2.3, 0.06, 0.16), frameMat, -1.3, 0.55, -3.0); add(bx(2.3, 0.05, 0.12), frameMat, -1.3, 2.25, -3.02);
  add(bx(0.04, 1.7, 0.06), frameMat, -1.3, 1.4, -3.05);
  add(bx(2.2, 0.03, 0.04), frameMat, -1.3, 1.4, -3.05);
  // curtains: two sage panels with folds, a gap in the middle lets a moon shaft in
  const curMat = M({ color: 0xa3b498, map: TX.curtainTex(), roughness: 0.95, side: THREE.DoubleSide });
  const panel = (x0, x1) => {
    const w = x1 - x0, g = new THREE.PlaneGeometry(w, 2.4, Math.ceil(w * 40), 8), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.sin((x - x0) * 26) * 0.035 + Math.sin(x * 7 + y) * 0.01 + (y < -1.0 ? (-1.0 - y) * 0.05 : 0)); }
    g.computeVertexNormals();
    const m = add(g, curMat, (x0 + x1) / 2, 1.22, -2.9);
    return m;
  };
  panel(-2.9, -1.6); panel(-0.95, 0.35);
  const rodMat = M({ color: 0x2a2622, metalness: 0.7, roughness: 0.35 });
  add(new THREE.CylinderGeometry(0.012, 0.012, 3.5, 8), rodMat, -1.3, 2.43, -2.88, { rz: Math.PI / 2 });
  box(-2.95, 0.4, 0, 2.38, -2.99, -2.8, { name: 'curtains', type: 'climb', walk: false });

  // ---------------- couch: tan leather power recliner with cupholder console ----------------
  const leatherBump = TX.leatherBump();
  const leather = M({ color: 0x9e8b74, roughness: 0.48, bumpMap: leatherBump, bumpScale: 0.6, envMapIntensity: 0.8 });
  const leatherDk = M({ color: 0x4a3b2f, roughness: 0.5, bumpMap: leatherBump, bumpScale: 0.6 });
  const cx0 = 2.0, cx1 = 3.0;
  // plinth
  add(rbox(0.9, 0.22, 3.36, 0.05), leatherDk, 2.5, 0.13, -0.5);
  const seats = [{ z0: -1.95, z1: -1.15, name: 'recliner seat' }, { z0: -0.8, z1: 0.05, name: 'couch seat' }, { z0: 0.05, z1: 0.95, name: 'blanket' }];
  seats.forEach((s, i) => {
    const zc = (s.z0 + s.z1) / 2, w = s.z1 - s.z0;
    add(rbox(0.7, 0.22, w - 0.02, 0.08, 4), leather, 2.38, 0.37, zc);                      // seat cushion
    add(rbox(0.26, 0.62, w - 0.02, 0.1, 4), leather, 2.86, 0.72, zc);                     // back cushion
    add(rbox(0.28, 0.18, w - 0.12, 0.08, 4), leather, 2.8, 1.06, zc);                     // power headrest
    add(rbox(0.06, 0.2, w - 0.1, 0.03), leather, 2.04, 0.3, zc);                          // footrest edge
    box(2.02, 2.73, 0, 0.48, s.z0, s.z1, { name: s.name });
    box(2.73, 3.0, 0, 0.98, s.z0, s.z1, { name: 'couch back' });
    box(2.66, 2.94, 0.98, 1.15, s.z0 + 0.06, s.z1 - 0.06, { name: 'headrest' });
  });
  // console with two cupholders between seat 1 and 2
  add(rbox(0.95, 0.5, 0.35, 0.06), leather, 2.48, 0.41, -0.975);
  add(rbox(0.3, 0.42, 0.35, 0.06), leather, 2.86, 0.78, -0.975);
  const holeMat = M({ color: 0x15110e, roughness: 0.6 }), chrome = M({ color: 0xcfd2d6, metalness: 1, roughness: 0.2 });
  [2.2, 2.38].forEach(x => { add(new THREE.CylinderGeometry(0.045, 0.045, 0.01, 20), holeMat, x, 0.665, -0.975, { cast: false }); add(new THREE.TorusGeometry(0.046, 0.005, 6, 24), chrome, x, 0.665, -0.975, { rx: Math.PI / 2, cast: false }); });
  box(2.0, 2.95, 0, 0.66, -1.15, -0.8, { name: 'console' });
  // arms with the silver control panel from the photo
  [[-2.2, -1.95], [0.95, 1.2]].forEach(([z0, z1], i) => {
    const zc = (z0 + z1) / 2;
    add(rbox(1.0, 0.56, 0.25, 0.08, 4), leather, 2.5, 0.38, zc);
    add(rbox(0.95, 0.06, 0.27, 0.03), leather, 2.48, 0.66, zc);
    const pnl = add(rbox(0.18, 0.012, 0.09, 0.005), chrome, 2.2, 0.695, zc, { cast: false });
    add(bx(0.11, 0.01, 0.035), holeMat, 2.21, 0.701, zc, { cast: false });
    box(2.0, 3.0, 0, 0.69, z0, z1, { name: 'armrest' });
  });
  blob(2.5, -0.5, 1.6, 4.2, 0.9);
  // throw blanket draped over the back and seat of the 3rd seat
  {
    const bl = M({ map: TX.quatrefoil(), roughness: 0.95, side: THREE.DoubleSide });
    const w = 0.92, seg = 40, g = new THREE.PlaneGeometry(1, w, seg, 12), p = g.attributes.position, uv = g.attributes.uv;
    // profile: from the floor-side of the seat, across the seat, up the back, over the headrest, down behind
    const prof = [[2.06, 0.42], [2.1, 0.5], [2.72, 0.52], [2.76, 0.98], [2.8, 1.17], [2.95, 1.17], [3.0, 0.9]];
    const lens = [0]; for (let i = 1; i < prof.length; i++) lens.push(lens[i - 1] + Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]));
    const total = lens[lens.length - 1];
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) + 0.5, v = p.getY(i); const d = u * total;
      let k = 1; while (k < lens.length - 1 && lens[k] < d) k++;
      const f = (d - lens[k - 1]) / (lens[k] - lens[k - 1]);
      const x = prof[k - 1][0] + (prof[k][0] - prof[k - 1][0]) * f, y = prof[k - 1][1] + (prof[k][1] - prof[k - 1][1]) * f;
      const wr = Math.sin(v * 20 + u * 9) * 0.012 + Math.sin(u * 31) * 0.008;
      p.setXYZ(i, x + wr * 0.5, y + 0.015 + Math.abs(wr), 0.5 + v + Math.sin(u * 12) * 0.02);
      uv.setXY(i, u * total * 1.4, (v + 0.5) * w * 1.4);
    }
    g.computeVertexNormals();
    add(g, bl, 0, 0, 0);
    // white sherpa edge
    add(new THREE.CapsuleGeometry(0.02, 0.6, 4, 8), M({ color: 0xf2f0ea, roughness: 1 }), 2.07, 0.43, 0.5, { rx: Math.PI / 2 });
  }
  // burnt-orange pillow tucked in the corner of seat 1
  add(rbox(0.16, 0.42, 0.44, 0.08, 5), M({ color: 0xb4532a, roughness: 0.97, map: TX.noiseTex(128, '#ffffff', 40) }), 2.55, 0.68, -1.7, { rz: 0.22, ry: 0.4 });

  // ---------------- side table, olive tree ----------------
  const metalDk = M({ color: 0x1d1b19, metalness: 0.6, roughness: 0.45 }), woodDk = M({ color: 0x3a2a1f, roughness: 0.55 });
  add(rbox(0.52, 0.035, 0.46, 0.012), woodDk, 1.58, 0.585, -2.52);
  [[1.36, -2.73], [1.8, -2.73], [1.36, -2.31], [1.8, -2.31]].forEach(([x, z]) => add(bx(0.022, 0.57, 0.022), metalDk, x, 0.285, z));
  add(rbox(0.46, 0.02, 0.4, 0.008), woodDk, 1.58, 0.16, -2.52);
  box(1.32, 1.84, 0.565, 0.6, -2.75, -2.29, { name: 'side table' });
  blob(1.58, -2.52, 0.8, 0.75, 0.6);
  // olive tree in a dark pot
  const potMat = M({ color: 0x2c2b2a, roughness: 0.35, metalness: 0.1 });
  const pot = add(new THREE.CylinderGeometry(0.21, 0.16, 0.46, 28), potMat, 0.75, 0.23, -2.55);
  add(new THREE.TorusGeometry(0.205, 0.015, 8, 28), potMat, 0.75, 0.46, -2.55, { rx: Math.PI / 2 });
  add(new THREE.CylinderGeometry(0.19, 0.19, 0.01, 24), M({ color: 0x3b2c20, roughness: 1 }), 0.75, 0.43, -2.55, { cast: false });
  box(0.54, 0.96, 0, 0.46, -2.76, -2.34, { name: 'olive pot' });
  blob(0.75, -2.55, 0.8, 0.8);
  {
    const barkMat = M({ color: 0x5b4a3a, roughness: 0.9 });
    const leafMat = M({ color: 0x4b5a35, roughness: 0.7, side: THREE.DoubleSide });
    const tips = [];
    const branch = (from, dir, len, r, depth) => {
      const to = from.clone().addScaledVector(dir, len);
      const g = new THREE.CylinderGeometry(r * 0.7, r, len, 6); g.translate(0, len / 2, 0);
      const m = new THREE.Mesh(g, barkMat); m.position.copy(from); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); m.castShadow = true; G.add(m);
      if (depth === 0) { tips.push(to); return; }
      for (let i = 0; i < 3; i++) {
        const d = dir.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 0.3 + Math.random() * 0.4, (Math.random() - 0.5) * 1.2)).normalize();
        branch(to, d, len * (0.55 + Math.random() * 0.2), r * 0.6, depth - 1);
      }
      if (depth < 3) tips.push(to);
    };
    [[0.05, 0], [-0.04, 0.03], [0.0, -0.05]].forEach(([dx, dz]) => branch(new THREE.Vector3(0.75 + dx, 0.43, -2.55 + dz), new THREE.Vector3(dx * 2, 1, dz * 2).normalize(), 0.75, 0.018, 3));
    const leaf = new THREE.PlaneGeometry(0.032, 0.1); leaf.translate(0, 0.04, 0);
    const N = quality === 'low' ? 500 : 1300;
    const inst = new THREE.InstancedMesh(leaf, leafMat, N); inst.castShadow = true; inst.receiveShadow = true;
    const o = new THREE.Object3D(), col = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const t = tips[i % tips.length]; o.position.set(t.x + (Math.random() - 0.5) * 0.32, Math.min(2.45, t.y + (Math.random() - 0.4) * 0.3), t.z + (Math.random() - 0.5) * 0.32);
      o.rotation.set(Math.random() * 3, Math.random() * 6, Math.random() * 3); o.updateMatrix(); inst.setMatrixAt(i, o.matrix);
      col.setHSL(0.22 + Math.random() * 0.06, 0.28, 0.3 + Math.random() * 0.14); inst.setColorAt(i, col);
    }
    G.add(inst);
  }

  // ---------------- ottoman, rug, TV, lamp, bookshelf ----------------
  add(rbox(0.75, 0.38, 0.55, 0.07, 4), M({ color: 0x3e2a1e, roughness: 0.45, bumpMap: leatherBump, bumpScale: 0.6 }), 0.38, 0.23, 1.48);
  [[0.06, 1.25], [0.7, 1.25], [0.06, 1.71], [0.7, 1.71]].forEach(([x, z]) => add(new THREE.CylinderGeometry(0.02, 0.015, 0.05, 8), woodDk, x, 0.025, z));
  box(0.0, 0.76, 0, 0.42, 1.2, 1.76, { name: 'ottoman' });
  blob(0.38, 1.48, 1.1, 0.85);
  add(rbox(2.2, 0.015, 1.6, 0.007), M({ map: TX.rugTex(), color: 0x8a857e, roughness: 1 }), -0.9, 0.008, 0.2, { cast: false });
  // TV stand + TV (with the standby light)
  add(rbox(2.2, 0.5, 0.4, 0.02), M({ color: 0x2b2420, roughness: 0.55 }), 0, 0.27, 2.77);
  [-0.55, 0.55].forEach(x => add(bx(1.0, 0.36, 0.01), M({ color: 0x3a312a, roughness: 0.5 }), x, 0.28, 2.565, { cast: false }));
  box(-1.1, 1.1, 0, 0.55, 2.57, 2.97, { name: 'TV stand' });
  add(bx(1.5, 0.86, 0.05), M({ color: 0x0b0b0c, roughness: 0.25, metalness: 0.4 }), 0, 1.35, 2.94);
  const screen = add(new THREE.PlaneGeometry(1.44, 0.8), M({ color: 0x050608, roughness: 0.08, metalness: 0.2, envMapIntensity: 1.2 }), 0, 1.35, 2.914, { ry: Math.PI, cast: false });
  box(-0.75, 0.75, 0.92, 1.78, 2.9, 2.97, { name: 'tv', walk: false });
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xff2a1a, toneMapped: false });
  add(new THREE.SphereGeometry(0.008, 8, 6), ledMat, 0.68, 0.93, 2.91, { cast: false }); glow.led = ledMat;
  blob(0, 2.75, 2.6, 0.8);
  // candle jar on the stand (prop), soundbar
  add(rbox(0.9, 0.08, 0.1, 0.03), M({ color: 0x151515, roughness: 0.4 }), 0, 0.56, 2.72);
  // floor lamp (dim, warm)
  add(new THREE.CylinderGeometry(0.16, 0.18, 0.025, 24), metalDk, 2.62, 0.013, 2.6);
  add(new THREE.CylinderGeometry(0.012, 0.012, 1.55, 8), metalDk, 2.62, 0.8, 2.6);
  const shadeMat = M({ color: 0xf2e6cf, roughness: 1, side: THREE.DoubleSide, emissive: 0xffb36b, emissiveIntensity: 0.5, transparent: true, opacity: 0.96 });
  add(new THREE.CylinderGeometry(0.2, 0.26, 0.3, 28, 1, true), shadeMat, 2.62, 1.6, 2.6, { cast: false }); glow.shade = shadeMat;
  box(2.56, 2.68, 0, 1.45, 2.54, 2.66, { name: 'lamp', walk: false });
  // bookshelf
  const shelfMat = M({ color: 0xf2efe8, roughness: 0.6 });
  add(bx(0.34, 1.8, 1.05), shelfMat, -2.79, 0.9, 2.2);
  const bookColors = [0x6c2f2a, 0x2e4a6b, 0xd9b45a, 0x3e5d43, 0x8a6b8f, 0xc77b4d, 0x24313d, 0xe7dccb];
  for (let s = 0; s < 4; s++) {
    let z = 1.72; const y = 0.1 + s * 0.43;
    add(bx(0.32, 0.02, 1.0), shelfMat, -2.77, y, 2.2, { cast: false });
    while (z < 2.62) {
      const w = 0.025 + Math.random() * 0.03, h = 0.22 + Math.random() * 0.12;
      if (Math.random() < 0.12) { z += 0.08; continue; }
      add(bx(0.22, h, w), M({ color: bookColors[(Math.random() * bookColors.length) | 0], roughness: 0.8 }), -2.73, y + 0.01 + h / 2, z + w / 2, { cast: false });
      z += w + 0.004;
    }
  }
  box(-2.97, -2.62, 0, 1.8, 1.67, 2.73, { name: 'bookshelf top' });
  blob(-2.75, 2.2, 0.7, 1.4);

  // ---------------- wall art: GRATEFUL, HOME, photo frames ----------------
  const grateful = TX.textCanvas(512, 384, (g, w, h) => {
    g.fillStyle = '#4b6b4a'; const r = 40;
    g.beginPath(); for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; const rr = 1 + Math.sin(i * Math.PI) * 0; g.lineTo(w / 2 + Math.cos(a) * (w / 2 - 8) * (1 - 0.04 * (i % 2)), h / 2 + Math.sin(a) * (h / 2 - 8) * (1 - 0.04 * (i % 2))); } g.closePath(); g.fill();
    g.fillStyle = '#f4efe2'; g.fillRect(70, 70, w - 140, h - 140);
    g.strokeStyle = '#4b6b4a'; g.lineWidth = 4; g.strokeRect(84, 84, w - 168, h - 168);
    g.fillStyle = '#3c4f3b'; g.font = 'italic 700 74px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Grateful', w / 2, h / 2 + 4);
  });
  const artMat = (t) => M({ map: t, roughness: 0.7, transparent: true, alphaTest: 0.5 });
  add(new THREE.PlaneGeometry(0.62, 0.46), artMat(grateful), 2.985, 1.72, -0.5, { ry: -Math.PI / 2, cast: false });
  const home = TX.textCanvas(512, 200, (g, w, h) => { g.fillStyle = '#f8f6f1'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d9d2c4'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); g.fillStyle = '#2b2b2b'; g.font = '900 120px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('HOME', w / 2, h / 2 + 6); });
  add(bx(0.03, 0.22, 0.55), M({ color: 0xf8f6f1 }), 2.98, 1.86, 0.35, { cast: false });
  add(new THREE.PlaneGeometry(0.55, 0.22), artMat(home), 2.962, 1.86, 0.35, { ry: -Math.PI / 2, cast: false });
  const photo = (seedHue) => TX.textCanvas(256, 320, (g, w, h) => {
    g.fillStyle = '#1e1a17'; g.fillRect(0, 0, w, h); g.fillStyle = '#f3efe7'; g.fillRect(22, 22, w - 44, h - 44);
    const gr = g.createLinearGradient(0, 40, 0, h - 40); gr.addColorStop(0, `hsl(${seedHue},35%,70%)`); gr.addColorStop(1, `hsl(${seedHue + 30},30%,40%)`);
    g.fillStyle = gr; g.fillRect(44, 44, w - 88, h - 88);
    g.fillStyle = 'rgba(40,30,25,.55)'; g.beginPath(); g.arc(w / 2 - 20, h / 2 + 10, 26, 0, 7); g.fill(); g.beginPath(); g.arc(w / 2 + 26, h / 2 + 20, 22, 0, 7); g.fill();
    g.fillRect(w / 2 - 50, h / 2 + 30, 100, 80);
  });
  [[2.985, 1.75, -1.55, 200], [2.985, 1.62, 0.95, 30]].forEach(([x, y, z, hu]) => {
    add(bx(0.03, 0.4, 0.32), M({ color: 0x1e1a17 }), x - 0.01, y, z, { cast: false });
    add(new THREE.PlaneGeometry(0.32, 0.4), artMat(photo(hu)), x - 0.027, y, z, { ry: -Math.PI / 2, cast: false });
  });
  [[0.3, 1.7, -2.985, 120], [1.25, 1.85, -2.985, 300]].forEach(([x, y, z, hu]) => add(new THREE.PlaneGeometry(0.3, 0.38), artMat(photo(hu)), x, y, z + 0.01, { cast: false }));
  [[-2.585, 1.5, 4.6, 60], [-1.415, 1.55, 6.2, 260], [-2.585, 1.5, 7.4, 180]].forEach(([x, y, z, hu]) => add(new THREE.PlaneGeometry(0.34, 0.42), artMat(photo(hu)), x + (x < -2 ? 0.01 : -0.01), y, z, { ry: x < -2 ? Math.PI / 2 : -Math.PI / 2, cast: false }));

  // ---------------- hallway + bedroom door ----------------
  add(rbox(1.0, 0.012, 4.2, 0.006), M({ color: 0x5c4a5e, roughness: 1, map: TX.rugTex() }), -2.0, 0.006, 5.9, { cast: false });
  add(rbox(0.36, 0.08, 1.2, 0.02), woodDk, -2.37, 0.44, 5.1);
  [[-2.5, 4.6], [-2.24, 4.6], [-2.5, 5.6], [-2.24, 5.6]].forEach(([x, z]) => add(bx(0.03, 0.4, 0.03), metalDk, x, 0.2, z));
  box(-2.56, -2.18, 0.4, 0.48, 4.5, 5.7, { name: 'hall bench' });
  add(rbox(0.32, 0.8, 1.0, 0.02), M({ color: 0xe8e2d6, roughness: 0.6 }), -1.6, 0.4, 6.8);
  box(-1.77, -1.43, 0, 0.8, 6.3, 7.3, { name: 'hall console' });
  blob(-1.6, 6.8, 0.6, 1.3);
  // bedroom door (opens when the human wakes up)
  const doorPivot = new THREE.Group(); doorPivot.position.set(-2.24, 0, 8.6); G.add(doorPivot);
  const door = add(bx(0.48, 2.06, 0.04), M({ color: 0xf3efe7, roughness: 0.5 }), 0.24, 1.03, 0, { parent: doorPivot });
  add(new THREE.SphereGeometry(0.022, 10, 8), chrome, 0.42, 1.0, -0.04, { parent: doorPivot });
  add(bx(0.58, 0.05, 0.06), frameMat, -2.0, 2.1, 8.58);
  const roomLight = new THREE.MeshBasicMaterial({ color: 0xffc27a, toneMapped: false });
  const roomGlow = add(new THREE.PlaneGeometry(0.5, 2.08), roomLight, -2.0, 1.04, 8.75, { ry: Math.PI, cast: false, recv: false });
  roomGlow.visible = false;
  const crack = new THREE.MeshBasicMaterial({ color: 0xffc27a, toneMapped: false, transparent: true, opacity: 0 });
  add(new THREE.PlaneGeometry(0.5, 0.025), crack, -2.0, 0.012, 8.57, { rx: -Math.PI / 2 + 0.0, cast: false, recv: false });
  // the human's silhouette (only appears in the doorway when it's awake)
  const humanTex = TX.textCanvas(256, 512, (g, w, h) => {
    g.fillStyle = '#120d0b';
    g.beginPath(); g.ellipse(128, 70, 42, 50, 0, 0, 7); g.fill();                     // head
    g.beginPath(); g.ellipse(110, 30, 34, 22, -0.5, 0, 7); g.fill(); g.beginPath(); g.ellipse(160, 34, 30, 20, 0.6, 0, 7); g.fill(); // messy bun
    g.beginPath(); g.moveTo(60, 140); g.quadraticCurveTo(128, 110, 196, 140); g.lineTo(220, 512); g.lineTo(36, 512); g.closePath(); g.fill(); // robe
  });
  const human = add(new THREE.PlaneGeometry(0.48, 1.7), new THREE.MeshBasicMaterial({ map: humanTex, transparent: true, depthWrite: false }), -2.0, 0.85, 8.66, { ry: Math.PI, cast: false, recv: false });
  human.visible = false; human.renderOrder = 3;
  glow.door = { pivot: doorPivot, roomGlow, crack, human };
  box(-2.25, -1.75, 0, 2.1, 8.5, 8.62, { name: 'door', type: 'wall', walk: false });

  // ---------------- kitchen ----------------
  const cabMat = M({ color: 0xefe9de, roughness: 0.55 }), topMat = M({ map: TX.quartz(), roughness: 0.25, envMapIntensity: 1.0 });
  const handle = M({ color: 0x1e1e1e, metalness: 0.7, roughness: 0.3 });
  add(bx(0.62, 0.86, 4.85), cabMat, -6.29, 0.43, -0.525);
  add(rbox(0.66, 0.05, 4.87, 0.01), topMat, -6.27, 0.895, -0.525);
  for (let z = -2.7; z < 1.8; z += 0.6) { add(bx(0.01, 0.7, 0.56), M({ color: 0xf6f1e8, roughness: 0.5 }), -5.975, 0.43, z + 0.28, { cast: false }); add(bx(0.02, 0.12, 0.012), handle, -5.96, 0.7, z + 0.5, { cast: false }); }
  box(-6.6, -5.94, 0, 0.92, -2.95, 1.9, { name: 'kitchen counter' });
  add(new THREE.PlaneGeometry(4.85, 0.55), M({ map: TX.subway(), roughness: 0.3 }), -6.595, 1.2, -0.525, { ry: Math.PI / 2, cast: false });
  add(bx(0.35, 0.7, 4.85), cabMat, -6.42, 1.8, -0.525);
  for (let z = -2.9; z < 1.8; z += 0.6) add(bx(0.012, 0.66, 0.56), M({ color: 0xf6f1e8, roughness: 0.5 }), -6.24, 1.8, z + 0.3, { cast: false });
  box(-6.6, -6.24, 1.45, 2.15, -2.95, 1.9, { name: 'cabinet top' });
  // sink + faucet
  add(bx(0.4, 0.02, 0.6), M({ color: 0x9aa0a6, metalness: 0.9, roughness: 0.25 }), -6.27, 0.915, -0.6, { cast: false });
  const fau = add(new THREE.TorusGeometry(0.1, 0.012, 8, 16, Math.PI), chrome, -6.5, 1.02, -0.6, { ry: Math.PI / 2 });
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8), chrome, -6.5, 0.97, -0.5);
  // microwave with a green clock glow
  add(rbox(0.38, 0.28, 0.55, 0.02), M({ color: 0x1b1c1e, roughness: 0.3, metalness: 0.4 }), -6.4, 1.06, -2.3);
  const clockMat = new THREE.MeshBasicMaterial({ color: 0x3dff7a, toneMapped: false });
  add(new THREE.PlaneGeometry(0.08, 0.025), clockMat, -6.205, 1.12, -2.1, { ry: Math.PI / 2, cast: false }); glow.clock = clockMat;
  // fridge
  add(rbox(0.75, 1.85, 0.9, 0.03), M({ color: 0xc9ccd0, metalness: 0.7, roughness: 0.3 }), -6.22, 0.925, 2.47);
  add(bx(0.03, 0.9, 0.03), chrome, -5.83, 1.0, 2.15);
  box(-6.6, -5.84, 0, 1.85, 2.02, 2.92, { name: 'fridge top' });
  // island
  add(bx(0.86, 0.86, 1.76), cabMat, -4.55, 0.43, 0);
  add(rbox(0.98, 0.05, 1.9, 0.01), topMat, -4.55, 0.895, 0);
  box(-5.04, -4.06, 0, 0.92, -0.95, 0.95, { name: 'kitchen island' });
  blob(-4.55, 0, 1.4, 2.3); blob(-6.25, -0.5, 1.0, 5.2);
  // pendant lights over the island (off at night)
  [-0.5, 0.5].forEach(z => { add(new THREE.CylinderGeometry(0.004, 0.004, 0.8, 4), metalDk, -4.55, 2.2, z, { cast: false }); add(new THREE.ConeGeometry(0.13, 0.16, 20, 1, true), M({ color: 0x1b1b1b, metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide }), -4.55, 1.75, z, { cast: false }); });

  // ---------------- props that can be knocked over (physics) ----------------
  const tumblerMat = M({ color: 0x8fb3cc, metalness: 0.3, roughness: 0.35 });
  props.push({ kind: 'tumbler', pos: [1.46, 0.6, -2.62], mat: tumblerMat });
  props.push({ kind: 'bowl', pos: [1.7, 0.6, -2.4] });
  props.push({ kind: 'phone', pos: [1.52, 0.6, -2.38] });
  props.push({ kind: 'remote', pos: [2.48, 0.66, -0.98] });
  props.push({ kind: 'mug', pos: [-6.2, 0.92, -1.6], color: 0xd85a3c });
  props.push({ kind: 'mug', pos: [-4.4, 0.92, 0.45], color: 0x2e5a87 });
  props.push({ kind: 'glass', pos: [-4.6, 0.92, -0.4] });
  props.push({ kind: 'orange', pos: [-6.18, 0.95, 0.6] }, { kind: 'orange', pos: [-6.12, 0.95, 0.72] }, { kind: 'orange', pos: [-6.25, 0.95, 0.75] });
  props.push({ kind: 'candle', pos: [0.75, 0.55, 2.74] });
  props.push({ kind: 'book', pos: [-2.78, 1.8, 2.3] });
  props.push({ kind: 'keys', pos: [-1.6, 0.8, 6.6] });
  props.push({ kind: 'vase', pos: [-1.6, 0.8, 7.05] });
  props.push({ kind: 'tumbler', pos: [-6.2, 0.92, 1.3], mat: M({ color: 0xe7a0b6, metalness: 0.3, roughness: 0.35 }) });

  // ---------------- lights ----------------
  const L = {};
  L.hemi = new THREE.HemisphereLight(0x4a5c90, 0x2a2018, 1.4); scene.add(L.hemi);
  L.moon = new THREE.DirectionalLight(0xa9c0ff, 2.4);
  L.moon.position.set(-2.2, 5.2, -9.5); L.moon.target.position.set(-1.0, 0, 0.5); scene.add(L.moon); scene.add(L.moon.target);
  L.moon.castShadow = true; L.moon.shadow.bias = -0.0004; L.moon.shadow.normalBias = 0.02; L.moon.shadow.radius = 4; L.moon.shadow.blurSamples = 12;
  const sc = L.moon.shadow.camera; sc.left = -6; sc.right = 6; sc.top = 7; sc.bottom = -7; sc.near = 1; sc.far = 25;
  L.lamp = new THREE.PointLight(0xffa860, 1.3, 4.5, 1.8); L.lamp.position.set(2.62, 1.55, 2.6); scene.add(L.lamp);
  L.tv = new THREE.PointLight(0xff3020, 0.9, 2.2, 2); L.tv.position.set(0.68, 0.9, 2.8); scene.add(L.tv);
  L.phone = new THREE.PointLight(0x9cc8ff, 0.0, 1.6, 2); L.phone.position.set(1.52, 0.72, -2.38); scene.add(L.phone);
  L.clock = new THREE.PointLight(0x3dff7a, 0.35, 1.5, 2); L.clock.position.set(-6.0, 1.15, -2.1); scene.add(L.clock);
  L.night = new THREE.PointLight(0xffc98a, 0.45, 2.6, 2); L.night.position.set(-1.8, 0.35, 4.4); scene.add(L.night);    // hallway plug-in nightlight
  add(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshBasicMaterial({ color: 0xb89a70, toneMapped: false }), -1.44, 0.3, 4.4, { cast: false });
  L.door = new THREE.SpotLight(0xffc27a, 0, 12, 0.7, 0.6, 1.2); L.door.position.set(-2.0, 1.9, 8.5); L.door.target.position.set(-2.0, 0, 3.0); scene.add(L.door); scene.add(L.door.target);
  L.sun = new THREE.HemisphereLight(0xfff4e0, 0x8a7560, 0);
  L.sun.intensity = 0; scene.add(L.sun);
  if (quality === 'low') { L.clock.visible = false; L.night.intensity = 0.4; }

  function setNight(night) {
    L.hemi.intensity = night ? 0.5 : 0.55; L.hemi.color.set(night ? 0x4a5c90 : 0xdfe8ff); L.hemi.groundColor.set(night ? 0x2a2018 : 0x6b5a48);
    L.sun.intensity = night ? 0 : 0.6;
    L.moon.color.set(night ? 0xa9c0ff : 0xffe2b8); L.moon.intensity = night ? 4.0 : 3.2;
    L.lamp.intensity = night ? 1.3 : 0; glow.shade.emissiveIntensity = night ? 0.6 : 0.05;
    L.tv.intensity = night ? 0.9 : 0; L.clock.intensity = night && quality !== 'low' ? 0.8 : 0; L.night.intensity = night ? 0.3 : 0;
    L.phone.intensity = 0;
    skyMat.color.set(night ? 0xffffff : 0xffffff);
    skyMat.map = night ? sky : daySky(); skyMat.needsUpdate = true;
  }
  let _day = null;
  function daySky() { return _day || (_day = TX.textCanvas(256, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9cc9f5'); gr.addColorStop(1, '#f6f0dc'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#5f7a4a'; for (let x = 0; x < w; x += 12) { const hh = 30 + Math.sin(x * 0.09) * 12; g.fillRect(x, h - hh, 13, hh); } })); }

  return { group: G, colliders, walls, glow, lights: L, props, setNight, floor };
}

// parkour lines of floating paw prints (feet height + 0.3)
export const PAW_LINES = [
  // couch line: rug -> ottoman -> couch seat -> headrests
  [[-0.6, 0.3, 0.6], [0.0, 0.5, 1.1], [0.38, 0.75, 1.48], [1.2, 0.95, 0.9], [2.35, 0.8, 0.5], [2.8, 1.45, 0.5], [2.8, 1.45, -0.4], [2.8, 1.45, -1.55]],
  // side table + olive pot hop
  [[1.9, 0.5, -1.9], [1.58, 0.9, -2.52], [1.15, 1.0, -2.6], [0.75, 0.8, -2.55]],
  // curtain climb
  [[-2.2, 0.6, -2.6], [-2.2, 1.1, -2.62], [-2.2, 1.6, -2.62], [-2.2, 2.05, -2.62]],
  // TV stand run
  [[-0.9, 0.85, 2.77], [-0.3, 0.85, 2.77], [0.3, 0.85, 2.77], [0.9, 0.85, 2.77]],
  // bookshelf top
  [[-2.3, 1.2, 2.2], [-2.78, 2.1, 2.2]],
  // hallway sprint + bench
  [[-2.0, 0.3, 3.6], [-2.0, 0.3, 4.2], [-2.37, 0.78, 4.8], [-2.37, 0.78, 5.4], [-2.0, 0.3, 6.1], [-1.6, 1.1, 6.8], [-2.0, 0.3, 7.7]],
  // kitchen counter run to the fridge
  [[-4.55, 1.25, -0.6], [-4.55, 1.25, 0.6], [-5.5, 1.4, 0.0], [-6.27, 1.22, -1.2], [-6.27, 1.22, -0.2], [-6.27, 1.22, 0.8], [-6.27, 1.22, 1.6], [-6.22, 2.15, 2.47]],
];
