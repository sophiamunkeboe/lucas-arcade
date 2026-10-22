// MIKO: ZOOMIES - it's 3 AM and Miko has the zoomies. 60-second parkour runs through the dark house.
// Chain moves for combos, grab paw prints, knock stuff off, fill MAXIMUM ZOOM... but too much noise wakes
// the human: LOAF! (freeze) before the bedroom door opens. Ends with "Who, me?"
import * as THREE from 'three';
import { PAW_LINES } from './house.js';

const RUN_TIME = 60, COMBO_TIME = 2.6, ZOOM_TIME = 7;
const SURF = {
  'recliner seat': 'RECLINER', 'couch seat': 'COUCH', blanket: 'BLANKET', 'couch back': 'COUCH BACK', headrest: 'RECLINER HEADREST',
  console: 'CUPHOLDER CONSOLE', armrest: 'ARMREST', 'side table': 'SIDE TABLE', 'olive pot': 'OLIVE TREE POT', ottoman: 'OTTOMAN',
  'TV stand': 'TV STAND', 'bookshelf top': 'BOOKSHELF TOP', 'hall bench': 'HALL BENCH', 'hall console': 'HALL TABLE',
  'kitchen counter': 'KITCHEN COUNTER', 'entry landing': 'ENTRY LANDING', stairs: 'STAIRS', 'upper landing': 'TOP OF THE STAIRS!', 'banister rail': 'BANISTER RAIL!', 'plant pot': 'PLANT POT', speaker: 'SPEAKER', 'cabinet top': 'TOP OF THE CABINETS!', 'fridge top': 'FRIDGE TOP!', 'kitchen island': 'KITCHEN ISLAND',
};
const PROP_NAME = { tumbler: 'TUMBLER', bowl: 'BOWL', phone: 'PHONE', remote: 'REMOTE', mug: 'MUG', glass: 'GLASS', orange: 'ORANGE', candle: 'CANDLE', book: 'BOOK', keys: 'KEYS', vase: 'VASE' };
const KEY = 'lucasArcade.miko.zoomies.v1';

function pawTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, 'rgba(255,190,240,.55)'); gr.addColorStop(1, 'rgba(255,120,220,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#fff';
  g.beginPath(); g.ellipse(64, 78, 22, 18, 0, 0, 7); g.fill();
  [[38, 50, -0.3], [54, 38, -0.1], [74, 38, 0.1], [90, 50, 0.3]].forEach(([x, y, r]) => { g.beginPath(); g.ellipse(x, y, 9, 12, r, 0, 7); g.fill(); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createZoomies(env) {
  const { scene, ctrl, miko, phys, fx, house, ui, snd, buzz } = env;
  const S = {
    phase: 'menu', t: 0, time: RUN_TIME, score: 0, combo: 0, comboT: 0, bestCombo: 0, zoom: 0, zoomT: 0, noise: 0,
    lastSurface: null, surfCount: {}, alertT: 0, loafed: false, alertCd: 6, tricks: 0, paws: 0, knocked: 0, caught: 0, wipes: 0, sneaky: 0,
  };
  const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || { best: 0, bestCombo: 0 }; } catch (e) { return { best: 0, bestCombo: 0 }; } })();

  // ---------- paw print collectibles ----------
  const pawMat = new THREE.MeshBasicMaterial({ map: pawTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, color: new THREE.Color(1.25, 0.95, 1.35) });
  const pawGeo = new THREE.PlaneGeometry(0.2, 0.2);
  const paws = [];
  PAW_LINES.forEach((line, li) => line.forEach((p, i) => {
    const m = new THREE.Mesh(pawGeo, pawMat); m.position.set(p[0], p[1], p[2]); m.renderOrder = 4; m.visible = false; scene.add(m);
    paws.push({ m, base: new THREE.Vector3(p[0], p[1], p[2]), taken: false, line: li, ph: i * 0.6 + li });
  }));

  function popup(text, cls = '', sub = '') { ui.popup(text, cls, sub); }
  function trick(name, pts, opts = {}) {
    if (S.phase !== 'run') return;
    S.combo++; S.comboT = COMBO_TIME; S.tricks++;
    if (S.combo > S.bestCombo) S.bestCombo = S.combo;
    const mult = Math.min(4, 1 + Math.floor((S.combo - 1) / 3) * 0.5) * (S.zoomT > 0 ? 2 : 1);
    const gain = Math.round(pts * mult);
    S.score += gain;
    if (S.zoomT <= 0) S.zoom = Math.min(100, S.zoom + pts / 9);
    popup(name, opts.cls || '', '+' + gain);
    snd.trick(S.combo); ui.comboPop(S.combo, mult);
    buzz(12);
  }
  function breakCombo(reason) {
    if (S.combo >= 3) popup(reason || 'COMBO LOST', 'bad');
    S.combo = 0; S.comboT = 0; S.surfCount = {}; ui.comboPop(0, 1);
  }
  function addNoise(n) { if (S.phase === 'run') S.noise = Math.min(100, S.noise + n); }

  // ---------- events from the controller ----------
  function onCat(type, d = {}) {
    const p = ctrl.pos;
    switch (type) {
      case 'jump': snd.jump(); miko.hop(1); fx.burst(p.clone().setY(p.y + 0.02), 6, { color: 0x9a8b78, size: 0.035, up: 0.6, speed: 0.6, life: 0.5 }); break;
      case 'dbl': snd.dbl(); miko.hop(0.8); fx.burst(p.clone().setY(p.y + 0.15), 10, { glow: true, color: 0xbfe6ff, size: 0.03, up: 0.2, speed: 1.2, grav: 0, life: 0.35 }); break;
      case 'land': {
        const hard = Math.min(1.4, -d.vy / 6); miko.land(hard); snd.land(hard);
        if (-d.vy > 3) fx.burst(p.clone().setY(p.y + 0.02), Math.round(6 + hard * 10), { color: 0xa89884, size: 0.04, up: 0.7, speed: 1.4 * hard, life: 0.6, vary: 0.15 });
        if (d.drop > 1.3) { addNoise(4); env.shake(0.05 * hard); }
        if (d.flip) trick('FLIP!', 100);
        if (d.flipFail) { popup('SPLAT', 'bad'); }
        const s = d.surface;
        if (s && s.name && SURF[s.name]) {
          if (s.name === 'blanket' && d.drop > 0.45) {
            trick('BELLY FLOP!', 260, { cls: 'big' }); fx.burst(p.clone().setY(p.y + 0.1), 30, { color: 0xf3ece2, size: 0.03, up: 1.2, speed: 1.4, life: 1.2, grav: 1.2, drag: 3 });
            fx.burst(p.clone().setY(p.y + 0.1), 18, { color: 0x2c3e6b, size: 0.035, up: 0.8, speed: 1.0, life: 0.8, grav: 3 });
          } else if (s !== S.lastSurface) {
            const n = S.surfCount[s.name] || 0; S.surfCount[s.name] = n + 1;
            trick(SURF[s.name], Math.round((50 + s.max.y * 120) / (1 + n)), { cls: s.max.y > 1.4 ? 'big' : '' });
          }
          S.lastSurface = s;
        } else S.lastSurface = null;
        break;
      }
      case 'wallkick': snd.dbl(); trick('WALL KICK!', 150); env.shake(0.03); fx.burst(p.clone().setY(p.y + 0.2), 10, { color: 0xd8cbb8, size: 0.03, up: 0.3, speed: 1.2, life: 0.5 }); break;
      case 'climbStart': snd.mrrp(); popup('CURTAIN CLIMB', 'mint'); buzz(15); break;
      case 'climbEnd': trick(d.jump ? 'CURTAIN BACKFLIP!' : 'CURTAIN CLIMB', Math.round(110 + d.height * 90 + (d.jump ? 80 : 0)), { cls: 'big' }); addNoise(3);
        fx.burst(p.clone().setY(p.y + 0.2), 12, { color: 0x8a9a80, size: 0.025, up: 0.4, speed: 1, life: 0.9, grav: 2 }); break;
      case 'driftStart': snd.skid(true, 0.6); break;
      case 'driftEnd': snd.skid(false); if (d.t > 0.35) trick(d.t > 1.1 ? 'MEGA DRIFT!' : 'DRIFT', Math.round(40 + d.t * 140)); break;
      case 'slideStart': snd.skid(true, 1); buzz(10); break;
      case 'slideEnd': snd.skid(false); if (d.dist > 0.9) trick('POWER SLIDE', Math.round(60 + d.dist * 30)); break;
      case 'flipStart': snd.swipe(); break;
      case 'swat': snd.swipe(); S.swatPending = 0.11; break;
      case 'bonk': snd.bonk(); addNoise(6); env.shake(0.05); buzz(25); S.momentumLoss = true; break;
      case 'wipe': snd.wipe(); addNoise(26); env.shake(0.16); buzz([40, 30, 60]); S.wipes++;
        fx.burst(p.clone().setY(p.y + 0.2), 28, { color: 0xf1e9de, size: 0.03, up: 1.2, speed: 1.6, life: 1.4, grav: 1.0, drag: 2.5 });  // fur everywhere
        popup('WIPEOUT!', 'bad'); breakCombo(''); break;
      case 'step': snd.step(Math.min(1.4, 0.4 + d.speed * 0.15)); if (ctrl.drift || d.speed > 5) fx.burst(p.clone().setY(0.02), 1, { color: 0x8c7d6b, size: 0.03, up: 0.3, speed: 0.4, life: 0.4 }); break;
    }
  }

  // props hitting things
  function onImpact(it, v, floor) {
    snd.clatter(it.sound, v);
    if (floor) {
      const p = it.body.position, pos = new THREE.Vector3(p.x, 0.03, p.z);
      const col = { tumbler: 0x8fb3cc, bowl: 0xffffff, phone: 0x7fb6ff, remote: 0x444444, mug: 0xffffff, glass: 0xdff2ff, orange: 0xf08a1c, candle: 0xd9c2a0, book: 0xf2ecdc, keys: 0xffe08a, vase: 0x9fc9c2 }[it.kind] || 0xffffff;
      fx.burst(pos, Math.round(8 + Math.min(v, 6) * 3), { color: 0xa89884, size: 0.035, up: 0.8, speed: 1.2, life: 0.6, vary: 0.2 });
      fx.burst(pos, Math.round(6 + Math.min(v, 6) * 2), { glow: it.sound === 'glass' || it.sound === 'ceramic' || it.sound === 'metal', color: col, size: 0.025, up: 1.6, speed: 1.6, life: 0.7 });
      addNoise(Math.min(14, 4 + v * 2.5));
      if (ctrl.pos.distanceTo(pos) < 3) env.shake(Math.min(0.06, v * 0.01));
      if (it.offTable && !it.knocked && S.phase === 'run') { it.knocked = true; S.knocked++; trick('KNOCKED OFF THE ' + PROP_NAME[it.kind] + '!', it.kind === 'tumbler' || it.kind === 'remote' ? 160 : 110, { cls: 'big' }); }
    }
  }

  // ---------- phases ----------
  function resetRun() {
    Object.assign(S, { t: 0, time: RUN_TIME, score: 0, combo: 0, comboT: 0, bestCombo: 0, zoom: 0, zoomT: 0, noise: 0, lastSurface: null, surfCount: {}, alertT: 0, loafed: false, alertCd: 8, tricks: 0, paws: 0, knocked: 0, caught: 0, wipes: 0, sneaky: 0 });
    paws.forEach(p => { p.taken = false; p.m.visible = true; p.m.scale.setScalar(1); });
    phys.reset(); env.door(0);
    ctrl.reset(new THREE.Vector3(-0.6, 0, 0.9), Math.PI * 0.85); ctrl.setAuto(true);
  }
  function startCountdown() { resetRun(); S.phase = 'countdown'; S.t = 0; ui.show('run'); snd.mrrp(); }
  function goRun() { S.phase = 'run'; S.t = 0; ui.big('ZOOMIES!', 'go'); snd.meow(); buzz(30); }
  function startAlert() {
    S.phase = 'alert'; S.t = 0; S.loafed = false; snd.hmm(); ui.alert(true); buzz([20, 40, 20]);
    snd.skid(false); if (ctrl.drift) ctrl.drift = false;
  }
  function endRun() {
    S.phase = 'ending'; S.t = 0; snd.skid(false); ui.big('THE HUMAN WAKES UP!', 'warn'); snd.door(); breakComboSilently(); ui.alert(false);
  }
  function breakComboSilently() { S.combo = 0; ui.comboPop(0, 1); }
  function showEnd() {
    S.phase = 'end'; S.t = 0;
    const isBest = S.score > saved.best;
    if (isBest) saved.best = S.score; if (S.bestCombo > saved.bestCombo) saved.bestCombo = S.bestCombo;
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {}
    try { if (window.LA && LA.store && LA.players && LA.players.current()) LA.store.recordResult('miko-zoomies', { score: S.score }); } catch (e) {}
    ui.end({ score: S.score, bestCombo: S.bestCombo, best: saved.best, isBest, paws: S.paws, pawsTotal: paws.length, knocked: S.knocked, tricks: S.tricks, sneaky: S.sneaky, caught: S.caught });
    snd.end(); setTimeout(() => snd.purr(true), 600);
    // Miko sits in the moonlight like nothing happened
    ctrl.reset(new THREE.Vector3(-1.05, 0, -0.65), 0.15); ctrl.sit = true; ctrl.setAuto(false);
  }
  function toMenu() { S.phase = 'menu'; snd.purr(false); ui.show('menu'); env.door(0); ctrl.reset(new THREE.Vector3(-1.05, 0, -0.65), 0.15); ctrl.sit = true; ctrl.setAuto(false); phys.reset(); }

  // ---------- per-frame ----------
  function update(dt, inp) {
    S.t += dt;
    const P = S.phase;
    let ctrlInp = { x: 0, y: 0, jump: false, trick: false, auto: true };
    if (P === 'run') ctrlInp = { x: inp.x, y: inp.y, jump: inp.jump, trick: inp.trick, auto: true };
    else if (P === 'countdown') ctrlInp.auto = false;
    else if (P === 'alert') { ctrlInp = { x: inp.x, y: inp.y, jump: false, trick: false, auto: true }; }
    else if (P === 'watch' || P === 'caught' || P === 'ending') ctrlInp = { x: 0, y: -1, jump: false, trick: false, auto: true };
    else ctrlInp = { x: 0, y: 0, jump: false, trick: false, auto: false };

    if (P === 'countdown') {
      const n = 3 - Math.floor(S.t / 0.75);
      if (n !== S.cd && n > 0) { S.cd = n; ui.big(String(n), 'count'); snd.tick(); }
      if (S.t > 2.25) goRun();
    }
    if (P === 'run') {
      S.time -= dt;
      if (S.comboT > 0) { S.comboT -= dt; if (S.comboT <= 0) breakCombo(S.combo >= 3 ? 'COMBO x' + S.combo + ' BANKED' : ''); }
      if (S.zoomT > 0) { S.zoomT -= dt; S.zoom = Math.max(0, S.zoomT / ZOOM_TIME * 100); if (S.zoomT <= 0) { ui.zoomMode(false); } }
      else if (S.zoom >= 100) { S.zoomT = ZOOM_TIME; snd.zoom(); ui.big('MAXIMUM ZOOM!', 'zoom'); ui.zoomMode(true); buzz([30, 30, 60]); env.shake(0.08); }
      S.noise = Math.max(0, S.noise - dt * 3.2); S.alertCd -= dt;
      if (S.noise >= 99.5 && S.alertCd <= 0) startAlert();
      if (S.time <= 0) { S.time = 0; endRun(); }
      // paws
      const c = ctrl.pos;
      for (const pw of paws) {
        if (pw.taken) continue;
        const dx = pw.base.x - c.x, dy = pw.base.y - (c.y + 0.2), dz = pw.base.z - c.z;
        if (dx * dx + dy * dy + dz * dz < 0.36 * 0.36) {
          pw.taken = true; S.paws++; S.score += 25 * (S.zoomT > 0 ? 2 : 1); S.comboT = Math.max(S.comboT, COMBO_TIME * 0.8);
          if (S.zoomT <= 0) S.zoom = Math.min(100, S.zoom + 5);
          snd.paw(S.paws % 13); fx.burst(pw.base, 14, { glow: true, color: 0xff9ae6, size: 0.04, up: 0.6, speed: 1.0, grav: 0, life: 0.5, drag: 3 });
          const lineDone = paws.filter(q => q.line === pw.line).every(q => q.taken);
          if (lineDone) trick('PARKOUR LINE!', 200, { cls: 'big' });
        }
      }
      // props knocked in by running through them or a swat
      const hs = Math.hypot(ctrl.vel.x, ctrl.vel.z);
      if (hs > 1.2 || ctrl.mode === 'slide') { const dir = new THREE.Vector3(ctrl.vel.x, 0, ctrl.vel.z).normalize(); phys.push(new THREE.Vector3(c.x, c.y + 0.14, c.z), dir, 0.17, 1 + hs * 0.6, 1.0); }
    }
    if (S.swatPending !== undefined && S.swatPending > 0) {
      S.swatPending -= dt;
      if (S.swatPending <= 0) {
        const f = ctrl.fwd(new THREE.Vector3()), at = ctrl.pos.clone().addScaledVector(f, 0.24); at.y += 0.18;
        const hit = phys.push(at, f, 0.2, 3.4, 1.6);
        if (hit.length) { snd.clatter(hit[0].sound, 2); buzz(15); }
      }
    }
    if (P === 'alert') {
      // the bedroom door light flickers on... LOAF before it opens!
      env.door(Math.min(0.35, S.t * 0.6) * (0.6 + Math.random() * 0.4));
      if (inp.loaf && !S.loafed) { S.loafed = true; ctrl.loaf(true); snd.mrrp(); buzz(20); ui.loafed(); }
      if (S.t > 1.7) { S.phase = 'watch'; S.t = 0; snd.door(); if (!S.loafed) { S.caught++; ctrl.loaf(false); } }
    }
    if (P === 'watch') {
      env.door(Math.min(1, S.t * 3));
      if (S.t > 0.5 && !S.watchMsg) { S.watchMsg = true; if (S.loafed) { snd.safe(); popup('SNEAKY LOAF', 'mint', '+300'); S.score += 300; S.sneaky++; } else { snd.caught(); popup('CAUGHT!', 'bad', '-250'); S.score = Math.max(0, S.score - 250); breakCombo(''); } }
      if (S.t > 2.4) { S.phase = 'run'; S.watchMsg = false; S.noise = S.loafed ? 30 : 20; S.alertCd = 7; ctrl.loaf(false); ui.alert(false); env.door(0); snd.hmm(); }
    }
    if (P === 'ending') {
      env.door(Math.min(1, S.t * 2));
      if (S.t > 2.0) showEnd();
    }
    if (P === 'end' && S.t > 1.2 && (S.t % 4.2) < dt) miko.slowBlink = 1;

    // freeze-pose for getting caught
    const frozen = (P === 'watch' && !S.loafed) || P === 'ending';
    const boost = S.zoomT > 0 ? 1.45 : 1;
    ctrl.update(dt, ctrlInp, { boost, swatTarget: () => swatTarget() });
    if (frozen && ctrl.grounded && ctrl.mode !== 'tumble') { ctrl.vel.x *= 0.8; ctrl.vel.z *= 0.8; }

    // paws: bob, spin, face the camera
    const showPaws = P !== 'menu' && P !== 'end';
    for (const pw of paws) {
      if (!showPaws) { pw.m.visible = false; continue; }
      if (pw.taken) { if (pw.m.visible) { pw.m.scale.multiplyScalar(1 + dt * 8); if (pw.m.scale.x > 2) pw.m.visible = false; } continue; }
      pw.m.visible = true; pw.m.position.y = pw.base.y + Math.sin(S.t * 3 + pw.ph) * 0.03;
      pw.m.quaternion.copy(env.camera.quaternion);
    }
    ui.hud(S, saved);
  }
  function swatTarget() {
    const f = ctrl.fwd(new THREE.Vector3()), at = ctrl.pos.clone().addScaledVector(f, 0.24);
    return phys.items.some(it => { const p = it.body.position; return Math.hypot(p.x - at.x, p.z - at.z) < 0.32 && p.y - ctrl.pos.y > -0.1 && p.y - ctrl.pos.y < 0.4; });
  }
  function animOverride(st) {
    const P = S.phase;
    if (P === 'menu' || P === 'end') { st.mode = 'sit'; }
    if (P === 'countdown') st.mode = 'crouch';
    if ((P === 'watch' && !S.loafed) || (P === 'ending' && ctrl.grounded)) { st.mode = 'freeze'; }
    return st;
  }
  return { S, saved, paws, update, onCat, onImpact, startCountdown, toMenu, showEnd, resetRun, trick, startAlert, animOverride, swatTarget, ZOOM_TIME };
}
