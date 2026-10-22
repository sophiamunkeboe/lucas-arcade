// MIKO - cannon-es physics for the stuff Miko knocks off tables (cups, remote, phone, bowl, oranges...)
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export function buildPhysics(scene, house, onImpact) {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = true;
  world.defaultContactMaterial.friction = 0.45; world.defaultContactMaterial.restitution = 0.22;
  world.solver.iterations = 8;
  const floorBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); floorBody.isFloor = true; world.addBody(floorBody);
  house.colliders.forEach(c => {
    if (!c.phys || c.type === 'climb') return;
    const h = c.max.clone().sub(c.min).multiplyScalar(0.5), ctr = c.max.clone().add(c.min).multiplyScalar(0.5);
    const b = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(h.x, h.y, h.z)) });
    b.position.set(ctr.x, ctr.y, ctr.z); b.collider = c; world.addBody(b);
  });

  const M = o => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.5 }, o));
  const items = [];
  const mk = (p) => {
    let mesh, shape, mass = 0.3, h = 0, sound = 'plastic';
    const g = new THREE.Group();
    switch (p.kind) {
      case 'tumbler': {  // Stanley-style cup with lid, straw and handle
        h = 0.24; shape = new CANNON.Cylinder(0.045, 0.04, h, 12); mass = 0.4; sound = 'metal';
        const mat = p.mat;
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.036, h, 24), mat); g.add(body);
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.03, 24), M({ color: 0xe9eef2, roughness: 0.4 })); lid.position.y = h / 2 + 0.01; g.add(lid);
        const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.12, 8), M({ color: 0xe9eef2 })); straw.position.set(0.01, h / 2 + 0.07, 0); g.add(straw);
        const hd = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.009, 8, 16, Math.PI), mat); hd.rotation.z = -Math.PI / 2; hd.position.set(0.05, 0.02, 0); g.add(hd);
        break;
      }
      case 'bowl': {
        h = 0.055; shape = new CANNON.Cylinder(0.075, 0.04, h, 12); mass = 0.25; sound = 'ceramic';
        const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.04 + Math.sin(t * Math.PI / 2) * 0.036, -h / 2 + t * h)); }
        pts.push(new THREE.Vector2(0.07, h / 2), new THREE.Vector2(0.034, -h / 2 + 0.008));
        const bm = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), M({ color: 0xf4f4f6, roughness: 0.2, side: THREE.DoubleSide })); g.add(bm);
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.004, 6, 28), M({ color: 0x2c4f9e })); band.rotation.x = Math.PI / 2; band.position.y = h / 2 - 0.01; g.add(band);
        // popcorn leftovers
        for (let i = 0; i < 7; i++) { const pc = new THREE.Mesh(new THREE.IcosahedronGeometry(0.012, 0), M({ color: 0xfff1c9, roughness: 0.9 })); pc.position.set((Math.random() - 0.5) * 0.06, h / 2 - 0.008, (Math.random() - 0.5) * 0.06); g.add(pc); }
        break;
      }
      case 'phone': {
        h = 0.012; shape = new CANNON.Box(new CANNON.Vec3(0.037, h / 2, 0.076)); mass = 0.2; sound = 'glass';
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.074, h, 0.152), M({ color: 0x1b1d22, metalness: 0.5, roughness: 0.3 })));
        p.screenMat = new THREE.MeshBasicMaterial({ color: 0x7fb6ff, toneMapped: false });
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.14), p.screenMat); scr.rotation.x = -Math.PI / 2; scr.position.y = h / 2 + 0.0008; g.add(scr);
        break;
      }
      case 'remote': {
        h = 0.022; shape = new CANNON.Box(new CANNON.Vec3(0.024, h / 2, 0.09)); mass = 0.15;
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.048, h, 0.18), M({ color: 0x151515, roughness: 0.6 })));
        for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.004, 0.01), M({ color: i === 0 ? 0xc0392b : 0x555555 })); b.position.set((i % 2 - 0.5) * 0.016, h / 2, 0.06 - Math.floor(i / 2) * 0.025); g.add(b); }
        break;
      }
      case 'mug': {
        h = 0.095; shape = new CANNON.Cylinder(0.04, 0.04, h, 12); mass = 0.3; sound = 'ceramic';
        const mm = M({ color: p.color, roughness: 0.3 });
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, h, 20, 1, true), mm));
        const bot = new THREE.Mesh(new THREE.CircleGeometry(0.04, 20), mm); bot.rotation.x = -Math.PI / 2; bot.position.y = -h / 2 + 0.005; g.add(bot);
        const hd = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.007, 8, 16), mm); hd.position.set(0.045, 0, 0); g.add(hd);
        g.children[0].material.side = THREE.DoubleSide;
        break;
      }
      case 'glass': {
        h = 0.12; shape = new CANNON.Cylinder(0.035, 0.03, h, 12); mass = 0.2; sound = 'glass';
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, h, 20), new THREE.MeshPhysicalMaterial({ color: 0xdff2ff, roughness: 0.05, transparent: true, opacity: 0.35, metalness: 0 })));
        break;
      }
      case 'orange': {
        h = 0.08; shape = new CANNON.Sphere(0.04); mass = 0.2; sound = 'soft';
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), M({ color: 0xf08a1c, roughness: 0.7 })));
        break;
      }
      case 'candle': {
        h = 0.09; shape = new CANNON.Cylinder(0.045, 0.045, h, 12); mass = 0.35; sound = 'glass';
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, h, 20), M({ color: 0xd9c2a0, roughness: 0.2, transparent: true, opacity: 0.9 })));
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.012, 20), M({ color: 0x222222, metalness: 0.6 })); lid.position.y = h / 2; g.add(lid);
        break;
      }
      case 'book': {
        h = 0.035; shape = new CANNON.Box(new CANNON.Vec3(0.075, h / 2, 0.11)); mass = 0.4; sound = 'book';
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.15, h, 0.22), M({ color: 0x7a2f3a, roughness: 0.8 })));
        const pg = new THREE.Mesh(new THREE.BoxGeometry(0.14, h * 0.8, 0.205), M({ color: 0xf2ecdc })); pg.position.x = 0.006; g.add(pg);
        break;
      }
      case 'keys': {
        h = 0.02; shape = new CANNON.Box(new CANNON.Vec3(0.03, 0.01, 0.03)); mass = 0.1; sound = 'metal';
        const r = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.003, 6, 16), M({ color: 0xc9c9c9, metalness: 1, roughness: 0.3 })); r.rotation.x = Math.PI / 2; g.add(r);
        [0, 1].forEach(i => { const k = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, 0.05), M({ color: i ? 0xd4af37 : 0xb0b0b0, metalness: 1, roughness: 0.3 })); k.position.set(i ? 0.02 : -0.015, 0, 0.025); k.rotation.y = i ? -0.5 : 0.4; g.add(k); });
        break;
      }
      case 'vase': {
        h = 0.2; shape = new CANNON.Cylinder(0.04, 0.05, h, 12); mass = 0.4; sound = 'ceramic';
        const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(0.03 + Math.sin(t * Math.PI) * 0.025 + (1 - t) * 0.01, -h / 2 + t * h)); }
        g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 24), M({ color: 0x6f8f8a, roughness: 0.25 })));
        [0, 1, 2].forEach(i => { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.16, 4), M({ color: 0x5b6b3a })); st.position.set((i - 1) * 0.01, h / 2 + 0.07, 0); st.rotation.z = (i - 1) * 0.2; g.add(st); });
        break;
      }
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(g);
    const b = new CANNON.Body({ mass, shape, linearDamping: 0.05, angularDamping: 0.15, sleepSpeedLimit: 0.15, sleepTimeLimit: 0.6 });
    const start = new THREE.Vector3(p.pos[0], p.pos[1] + h / 2 + 0.002, p.pos[2]);
    b.position.set(start.x, start.y, start.z); b.sleep();
    world.addBody(b);
    const it = { kind: p.kind, mesh: g, body: b, start, startY: start.y, h, sound, knocked: false, lastHit: 0, def: p, r: Math.max(0.05, (shape.radiusTop || shape.radius || (shape.halfExtents ? Math.max(shape.halfExtents.x, shape.halfExtents.z) : 0.05))) };
    b.addEventListener('collide', e => {
      const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
      const now = performance.now();
      if (v < 0.9 || now - it.lastHit < 120) return;
      it.lastHit = now;
      const other = e.body === b ? e.target : e.body;
      onImpact && onImpact(it, v, !!(other && other.isFloor));
    });
    items.push(it);
  };
  house.props.forEach(mk);

  function reset() {
    items.forEach(it => {
      it.body.position.set(it.start.x, it.start.y, it.start.z); it.body.velocity.setZero(); it.body.angularVelocity.setZero();
      it.body.quaternion.set(0, 0, 0, 1); it.body.sleep(); it.knocked = false; it.offTable = false;
    });
  }
  let acc = 0;
  function step(dt) {
    world.step(1 / 60, Math.min(dt, 0.05), 3);
    for (const it of items) {
      it.mesh.position.copy(it.body.position); it.mesh.quaternion.copy(it.body.quaternion);
      if (!it.offTable && it.body.position.y < it.startY - 0.25) it.offTable = true;
    }
  }
  // push props near a point (Miko running through / swatting)
  function push(center, vel, radius, power, up = 1.2) {
    let hit = [];
    for (const it of items) {
      const p = it.body.position, dx = p.x - center.x, dy = p.y - center.y, dz = p.z - center.z;
      const d = Math.hypot(dx, dz);
      if (d < radius + it.r && Math.abs(dy) < 0.32) {
        const nx = (dx / (d || 1)) * 0.4 + vel.x * 0.6, nz = (dz / (d || 1)) * 0.4 + vel.z * 0.6, l = Math.hypot(nx, nz) || 1;
        it.body.wakeUp();
        it.body.velocity.set(nx / l * power, up + Math.random() * 0.6, nz / l * power);
        it.body.angularVelocity.set((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 18);
        hit.push(it);
      }
    }
    return hit;
  }
  return { world, items, step, reset, push };
}
