// MIKO: ZOOMIES - bootstrap: renderer, adaptive quality, post FX (bloom, DOF, grade), camera, UI, loop.
// URL options: ?mode=sandbox (free roam dev mode)  ?day=1 (daytime)  ?q=high|med|low|potato  ?fps=1 (perf readout)
//              ?noadapt=1  ?dev=1 (shows the free-roam link)  ?shot=start|close|overview|fall|combo|wallrun|maxzoom|freeze|end
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildHouse, H } from './house.js';
import { buildPhysics } from './physics.js';
import { Miko } from './miko.js';
import { RIM } from './fur.js';
import { FX } from './fx.js';
import { CatController } from './controller.js';
import { createInput } from './input.js';
import { createZoomies } from './zoomies.js';
import { snd, buzz } from './audio.js';

const Q = new URLSearchParams(location.search);
const MODE = Q.get('mode') === 'sandbox' ? 'sandbox' : 'zoomies';
const SHOT = Q.get('shot');
const $ = id => document.getElementById(id);
let night = !Q.get('day');

// ---------------- WebGL + quality ----------------
const canvas = $('c');
const gl2 = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; } })();
if (!gl2) { $('fallback').classList.remove('hidden'); $('loading').classList.add('gone'); throw new Error('no webgl2'); }
const LEVELS = [
  { name: 'high', pr: 2.0, shadows: 2048, bloom: true, msaa: 4, shells: 14, dof: true },
  { name: 'med', pr: 1.5, shadows: 1024, bloom: true, msaa: 0, shells: 8, dof: false },
  { name: 'low', pr: 1.15, shadows: 0, bloom: false, msaa: 0, shells: 4, dof: false },
  { name: 'potato', pr: 0.8, shadows: 0, bloom: false, msaa: 0, shells: 1, dof: false },
];
const DPR = Math.min(window.devicePixelRatio || 1, 3);
let level = (() => {
  const q = Q.get('q'); const i = LEVELS.findIndex(l => l.name === q); if (i >= 0) return i;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const cores = navigator.hardwareConcurrency || 4;
  if (ios) return DPR >= 3 && Math.max(screen.width, screen.height) >= 844 ? 0 : 1;   // iPhone 12 and newer start high
  return cores >= 8 ? 0 : cores >= 4 ? 1 : 2;
})();
const ADAPT = !Q.get('noadapt') && !SHOT && !Q.get('q');
let LQ = LEVELS[level];
let pr = Math.min(DPR, LQ.pr);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
renderer.setPixelRatio(pr);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = LQ.shadows > 0; renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070f);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(62, 1, 0.03, 40);
camera.position.set(0, 1.2, 2);

const house = buildHouse(scene, LQ.name === 'potato' || LQ.name === 'low' ? 'low' : 'high');
house.lights.moon.shadow.mapSize.set(LQ.shadows || 512, LQ.shadows || 512);
const miko = new Miko({ shells: 14 }); scene.add(miko.root); scene.add(miko.blob); miko.setShells(LQ.shells);
const fx = new FX(scene, LQ.name);

// ---------------- post FX ----------------
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uVig: { value: 0.9 }, uTime: { value: 0 }, uAberr: { value: 0 }, uGrain: { value: 0.035 }, uTint: { value: new THREE.Vector3(1, 1, 1) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uVig, uTime, uAberr, uGrain; uniform vec3 uTint; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){ vec2 d = vUv - 0.5; float r = length(d);
      vec4 c = texture2D(tDiffuse, vUv);
      if (uAberr > 0.0) { vec2 o = d * uAberr * r; c.r = texture2D(tDiffuse, vUv + o).r; c.b = texture2D(tDiffuse, vUv - o).b; }
      c.rgb *= uTint;
      c.rgb *= mix(1.0, smoothstep(0.85, 0.25, r), uVig * 0.75);
      c.rgb += (h(vUv * 1000.0 + uTime) - 0.5) * uGrain * (0.4 + c.rgb);
      gl_FragColor = c; }`,
};
let composer = null, bloom = null, bokeh = null, grade = null;
function buildComposer() {
  if (composer) { composer.renderTarget1.dispose(); composer.renderTarget2.dispose(); composer = null; }
  if (!LQ.bloom) return;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const rt = new THREE.WebGLRenderTarget(w * pr, h * pr, { type: THREE.HalfFloatType, samples: LQ.msaa });
  composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(pr); composer.setSize(w, h);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(w * pr * 0.5, h * pr * 0.5), 0.55, 0.55, 0.92); composer.addPass(bloom);
  if (LQ.dof) { bokeh = new BokehPass(scene, camera, { focus: 1.2, aperture: 0.006, maxblur: 0.007 }); bokeh.enabled = false; composer.addPass(bokeh); } else bokeh = null;
  grade = new ShaderPass(GradeShader); composer.addPass(grade);
  composer.addPass(new OutputPass());
}
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  if (composer) { composer.setPixelRatio(pr); composer.setSize(w, h); }
  fx.setScale(h, pr);
  const fc = $('fxc'); fc.width = Math.round(w * Math.min(DPR, 2)); fc.height = Math.round(h * Math.min(DPR, 2));
}
function applyLevel(i) {
  const prevShadows = LQ.shadows > 0;
  level = i; LQ = LEVELS[i]; pr = Math.min(DPR, LQ.pr); renderer.setPixelRatio(pr);
  renderer.shadowMap.enabled = LQ.shadows > 0;
  if (LQ.shadows) { house.lights.moon.shadow.mapSize.set(LQ.shadows, LQ.shadows); if (house.lights.moon.shadow.map) { house.lights.moon.shadow.map.dispose(); house.lights.moon.shadow.map = null; } }
  if (prevShadows !== LQ.shadows > 0) scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); });
  miko.setShells(LQ.shells); buildComposer(); resize();
}
buildComposer();
window.addEventListener('resize', resize);

// ---------------- physics, controller, game ----------------
let zoom = null;
const phys = buildPhysics(scene, house, (it, v, floor) => { if (zoom) zoom.onImpact(it, v, floor); else snd.clatter(it.sound, v); });
const ctrl = new CatController(house.colliders, (t, d) => onCatEvent(t, d));
let shakeAmt = 0;
const env = {
  scene, camera, ctrl, miko, phys, fx, house, snd, buzz,
  shake: a => { shakeAmt = Math.min(0.25, shakeAmt + a); },
  door: k => setDoor(k),
  ui: null,
};

// ---------------- UI ----------------
const ui = {
  popup(text, cls, sub) {
    const el = document.createElement('div'); el.className = 'pop ' + (cls || ''); el.innerHTML = text + (sub ? `<small>${sub}</small>` : '');
    const box = $('pops'); box.appendChild(el); while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => el.remove(), 1150);
  },
  big(text, cls) { const b = $('big'); b.innerHTML = ''; const d = document.createElement('div'); d.className = cls || ''; d.textContent = text; b.appendChild(d); },
  comboPop(n, mult) {
    const c = $('combo');
    if (n < 2) { c.classList.add('hidden'); return; }
    c.classList.remove('hidden'); c.innerHTML = `<b>x${n}</b><small>COMBO</small>${mult > 1 ? `<span class="mult">${mult}x points</span>` : ''}`;
    c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
  },
  hud(S) {
    const t = $('timer'); const sec = Math.ceil(S.time); if (t.textContent !== String(sec)) t.textContent = sec; t.classList.toggle('low', S.time < 10 && S.phase === 'run');
    $('score').textContent = S.score;
    $('zoomMeter').querySelector('.fill').style.width = S.zoom + '%'; $('zoomMeter').classList.toggle('full', S.zoomT > 0);
    $('noiseMeter').querySelector('.fill').style.width = S.noise + '%'; $('noiseMeter').classList.toggle('hot', S.noise > 75);
  },
  zoomMode(on) { $('flash').classList.toggle('zoom', on); },
  alert(on) { $('alert').classList.toggle('hidden', !on); $('alert').classList.remove('loafed'); $('flash').classList.toggle('warn', on); $('controls').style.visibility = on ? 'hidden' : ''; },
  loafed() { $('alert').classList.add('loafed'); },
  show(which) {
    $('screen-menu').classList.toggle('hidden', which !== 'menu'); $('screen-end').classList.toggle('hidden', which !== 'end');
    $('hud').classList.toggle('hidden', which !== 'run'); $('controls').classList.toggle('hidden', which !== 'run' && which !== 'sandbox');
    $('dayBtn').style.display = which === 'run' ? 'none' : '';
    if (which !== 'run') { $('combo').classList.add('hidden'); $('alert').classList.add('hidden'); $('flash').className = ''; }
  },
  end(r) {
    ui.show('end'); $('endScore').textContent = r.score; $('newBest').classList.toggle('hidden', !r.isBest);
    $('endStats').innerHTML = `<div><b>x${r.bestCombo}</b>best combo</div><div><b>${r.best}</b>high score</div>
      <div><b>${r.paws}/${r.pawsTotal}</b>paw prints</div><div><b>${r.knocked}</b>things knocked off</div>
      <div><b>${r.sneaky}</b>sneaky loafs</div><div><b>${r.caught}</b>times caught</div>`;
  },
};
env.ui = ui;
zoom = createZoomies(env);
function onCatEvent(t, d) {
  if (MODE === 'zoomies') zoom.onCat(t, d);
  else {   // sandbox: sounds + particles only
    if (t === 'step') snd.step(0.6 + (d.speed || 0) * 0.1);
    if (t === 'jump') { snd.jump(); miko.hop(1); } if (t === 'dbl') { snd.dbl(); miko.hop(0.8); }
    if (t === 'land') { const k = Math.min(1.4, -d.vy / 6); miko.land(k); snd.land(k); }
    if (t === 'swat') { snd.swipe(); sandSwat = 0.11; }
    if (t === 'climbStart') snd.mrrp();
  }
}
let sandSwat = 0;

const input = createInput({ zone: $('stickZone'), base: $('stickBase'), knob: $('stickKnob'), jump: $('btnJump'), trick: $('btnTrick'), loaf: $('btnLoaf'), sit: $('btnSit'), sneak: $('btnSneak') });
function setMuteIcon() { $('muteBtn').innerHTML = LA.sfx.isMuted() ? '&#128263;' : '&#128264;'; }
$('muteBtn').addEventListener('click', () => { LA.sfx.toggleMute(); setMuteIcon(); if (!LA.sfx.isMuted() && night) snd.ambience(true); }); setMuteIcon();
$('dayBtn').addEventListener('click', () => { setNight(!night); snd.click(); });
$('startBtn').addEventListener('click', () => { LA.sfx.unlock(); snd.click(); if (night) snd.ambience(true); zoom.startCountdown(); });
$('againBtn').addEventListener('click', () => { snd.click(); snd.purr(false); zoom.startCountdown(); });
$('howBtn').addEventListener('click', () => $('how').classList.toggle('hidden'));
if (Q.get('dev')) $('sandLink').classList.remove('hidden');
const bestLine = () => { const s = zoom.saved; $('bestLine').textContent = s.best ? `Best: ${s.best}  ·  Best combo: x${s.bestCombo}` : ''; };
bestLine();
if (Q.get('fps')) $('perf').classList.remove('hidden');

// ---------------- day / night + door ----------------
function setNight(n) {
  night = n; house.setNight(n); miko.setNight(n);
  scene.environmentIntensity = n ? 0.14 : 0.35;
  renderer.toneMappingExposure = n ? 1.2 : 1.0;
  scene.fog = n ? new THREE.Fog(0x070a16, 7, 16) : null;
  RIM.color.value.set(n ? 0x7f9cff : 0xffe2c0); RIM.strength.value = n ? 0.55 : 0.25;
  $('dayBtn').innerHTML = n ? '&#127769;' : '&#9728;&#65039;';
  if (n) snd.ambience(true); else snd.ambience(false);
}
setNight(night);
let doorK = 0;
function setDoor(k) {
  doorK = k; const d = house.glow.door, L = house.lights;
  d.pivot.rotation.y = -Math.max(0, (k - 0.35) / 0.65) * 1.1;
  d.roomGlow.visible = k > 0.35;
  d.crack.opacity = Math.min(1, k * 3);
  L.door.intensity = k * 9;
}

// ---------------- camera ----------------
const cam = { pos: new THREE.Vector3(-1, 1.2, 1.5), look: new THREE.Vector3(-1, 0.4, -0.5), fov: 62, override: null };
const ray = new THREE.Raycaster(); const camBlockers = [...house.walls];
const tmpV = new THREE.Vector3(), tmpF = new THREE.Vector3();
function updateCamera(dt, t) {
  const P = zoom.S.phase, c = ctrl.pos, f = ctrl.fwd(tmpF);
  const head = new THREE.Vector3(); miko.head.getWorldPosition(head);
  let want, look, k = 5, fov = 62;
  const ov = cam.override || (MODE === 'zoomies' && (P === 'menu' ? 'menu' : P === 'end' ? 'end' : null));
  if (ov === 'menu') {
    const a = ctrl.heading + Math.sin(t * 0.25) * 0.55;
    want = head.clone().add(new THREE.Vector3(Math.sin(a) * 1.15, 0.05, Math.cos(a) * 1.15)); look = head.clone().add(new THREE.Vector3(0, -0.1, 0)); k = 3; fov = 48;
  } else if (ov === 'end' || ov === 'close') {
    const a = ctrl.heading + 0.35 + Math.sin(t * 0.3) * 0.08;
    want = head.clone().add(new THREE.Vector3(Math.sin(a) * 0.95, 0.02, Math.cos(a) * 0.95)); look = head.clone().add(new THREE.Vector3(0, -0.13, 0)); k = 3; fov = 40;
  } else if (ov === 'overview') {
    want = new THREE.Vector3(-2.6, 2.25, 2.7); look = new THREE.Vector3(1.0, 0.45, -1.2); k = 50; fov = 70;
  } else if (ov === 'fall') {
    want = new THREE.Vector3(0.25, 0.95, -0.95); look = new THREE.Vector3(1.45, 0.4, -2.45); k = 50; fov = 58;
  } else if (ov === 'door') {
    want = c.clone().add(new THREE.Vector3(0.35, 0.55, -0.85)); look = new THREE.Vector3(-2.0, 0.8, 8.3); k = 50; fov = 60;
  } else {
    const hs = Math.hypot(ctrl.vel.x, ctrl.vel.z);
    const dist = 1.75 + Math.min(0.9, hs * 0.08) + (ctrl.mode === 'climb' ? 0.6 : 0), hgt = 0.85 + (ctrl.mode === 'climb' ? 0.2 : 0);
    if (MODE === 'sandbox') {
      // lazy follow: stay where we are but keep a distance, swing behind when moving
      const back = cam.pos.clone().sub(c).setY(0); if (back.lengthSq() < 0.01) back.copy(f).negate();
      back.normalize(); if (hs > 0.5) back.lerp(f.clone().negate(), Math.min(1, dt * 1.6)).normalize();
      want = c.clone().addScaledVector(back, 1.55).add(new THREE.Vector3(0, 0.75, 0)); look = c.clone().add(new THREE.Vector3(0, 0.3, 0)); k = 4;
    } else {
      want = c.clone().addScaledVector(f, -dist).add(new THREE.Vector3(0, hgt, 0));
      look = c.clone().addScaledVector(f, 1.0).add(new THREE.Vector3(0, 0.3 + (ctrl.mode === 'climb' ? 0.7 : 0), 0)); k = 6;
    }
    fov = 62 + Math.min(6, hs * 0.7) + (zoom.S.zoomT > 0 ? 10 : 0);
    // keep the camera inside the house
    const from = c.clone().add(new THREE.Vector3(0, 0.35, 0)), dir = want.clone().sub(from), len = dir.length(); dir.normalize();
    ray.set(from, dir); ray.far = len + 0.2;
    const hit = ray.intersectObjects(camBlockers, false)[0];
    if (hit) want = from.clone().addScaledVector(dir, Math.max(0.3, hit.distance - 0.18));
  }
  want.y = THREE.MathUtils.clamp(want.y, 0.15, H - 0.12);
  const kk = 1 - Math.exp(-k * dt);
  cam.pos.lerp(want, kk); cam.look.lerp(look, 1 - Math.exp(-(k + 3) * dt));
  cam.fov += (fov - cam.fov) * (1 - Math.exp(-6 * dt));
  camera.position.copy(cam.pos);
  if (shakeAmt > 0.0005) { camera.position.x += (Math.random() - 0.5) * shakeAmt; camera.position.y += (Math.random() - 0.5) * shakeAmt; camera.position.z += (Math.random() - 0.5) * shakeAmt; shakeAmt *= Math.exp(-dt * 9); }
  camera.lookAt(cam.look);
  if (Math.abs(camera.fov - cam.fov) > 0.01) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
  if (bokeh) { const on = LQ.dof && (ov === 'end' || ov === 'close' || ov === 'menu'); bokeh.enabled = on; if (on) bokeh.uniforms.focus.value = camera.position.distanceTo(head); }
}

// speed lines overlay
const fxc = $('fxc'), fxx = fxc.getContext('2d');
let linesK = 0;
function drawSpeedLines(dt, k) {
  linesK += (k - linesK) * Math.min(1, dt * 6);
  const w = fxc.width, h = fxc.height; fxx.clearRect(0, 0, w, h);
  if (linesK < 0.03) return;
  const cx = w / 2, cy = h * 0.52, n = Math.round(26 + linesK * 30), R0 = Math.min(w, h) * (0.42 - linesK * 0.1);
  fxx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r0 = R0 + Math.random() * R0 * 0.6, r1 = r0 + (0.25 + Math.random() * 0.5) * Math.max(w, h) * 0.5;
    fxx.strokeStyle = `rgba(${Math.random() < 0.3 ? '170,230,255' : '255,255,255'},${(0.08 + Math.random() * 0.25) * linesK})`;
    fxx.lineWidth = (1 + Math.random() * 2.5) * (w / 400);
    fxx.beginPath(); fxx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); fxx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); fxx.stroke();
  }
}

// ---------------- adaptive quality ----------------
const perf = { acc: 0, n: 0, good: 0, last: 0, fps: 60, log: [] };
function adapt(dt) {
  perf.acc += dt; perf.n++;
  if (perf.acc < 1.5) return;
  const avg = perf.acc / perf.n; perf.fps = 1 / avg; perf.log.push(Math.round(perf.fps)); if (perf.log.length > 40) perf.log.shift();
  perf.acc = 0; perf.n = 0;
  if (!ADAPT || document.hidden) return;
  if (avg > 1 / 50) {                        // under ~50fps: lower pixel ratio, then the quality level
    perf.good = 0;
    const floor = Math.min(DPR, LQ.pr) * 0.7;
    if (pr - 0.25 >= Math.max(0.75, floor)) { pr -= 0.25; renderer.setPixelRatio(pr); if (composer) composer.setPixelRatio(pr); resize(); }
    else if (level < LEVELS.length - 1) applyLevel(level + 1);
  } else if (avg < 1 / 58) {
    if (++perf.good >= 4 && pr < Math.min(DPR, LQ.pr)) { pr = Math.min(Math.min(DPR, LQ.pr), pr + 0.25); renderer.setPixelRatio(pr); if (composer) composer.setPixelRatio(pr); resize(); perf.good = 0; }
  }
}

// ---------------- sandbox mode ----------------
function sandboxUpdate(dt, inp) {
  if (inp.sit) ctrl.sit = !ctrl.sit; if (inp.sneak) ctrl.sneak = !ctrl.sneak;
  if (Math.hypot(inp.x, inp.y) > 0.3) ctrl.sit = false;
  const camYaw = Math.atan2(cam.look.x - cam.pos.x, cam.look.z - cam.pos.z);
  ctrl.update(dt, { x: inp.x, y: inp.y, jump: inp.jump, trick: inp.trick, auto: false }, { camYaw });
  const hs = Math.hypot(ctrl.vel.x, ctrl.vel.z);
  if (hs > 1.2) phys.push(ctrl.pos.clone().setY(ctrl.pos.y + 0.14), new THREE.Vector3(ctrl.vel.x, 0, ctrl.vel.z).normalize(), 0.17, 1 + hs * 0.6, 1.0);
  if (sandSwat > 0) { sandSwat -= dt; if (sandSwat <= 0) { const f = ctrl.fwd(new THREE.Vector3()), at = ctrl.pos.clone().addScaledVector(f, 0.24); at.y += 0.18; phys.push(at, f, 0.22, 3.4, 1.6); } }
}

// ---------------- main loop ----------------
let last = performance.now(), T = 0, timeScale = 1, frames = 0;
const clock = { fixed: !!SHOT };
const trailP = new THREE.Vector3();
function frame(now) {
  requestAnimationFrame(frame);
  let rdt = Math.min(0.05, (now - last) / 1000); last = now;
  adapt(rdt);
  const dt = (clock.fixed ? 1 / 60 : rdt) * timeScale;
  T += dt; frames++;
  const inp = input.read();
  if (dt > 0) {
    if (MODE === 'zoomies') zoom.update(dt, inp); else sandboxUpdate(dt, inp);
    phys.step(dt);
  }
  // Miko rig
  miko.root.position.copy(ctrl.pos); miko.root.rotation.y = ctrl.heading;
  let st = ctrl.animState(); if (MODE === 'zoomies') st = zoom.animOverride(st);
  st.lookAt = camera.position;
  if (zoom.S.phase === 'end' || cam.override === 'close') st.headTilt = Math.sin(T * 0.6) * 0.12 + 0.1;
  const zoomOn = MODE === 'zoomies' && zoom.S.zoomT > 0;
  miko.puff += ((zoomOn ? 1.75 : 1) - miko.puff) * Math.min(1, dt * 5);
  // eyeshine: glows at night when he looks toward the camera
  const closeCam = cam.override === 'close' || (MODE === 'zoomies' && zoom.S.phase === 'end');
  if (night) { const hd = new THREE.Vector3(0, 0, 1).applyQuaternion(miko.head.getWorldQuaternion(new THREE.Quaternion())); const hp = miko.head.getWorldPosition(new THREE.Vector3()); const tc = camera.position.clone().sub(hp).normalize(); miko.eyeGlow = closeCam ? 0.12 : 0.3 + Math.max(0, hd.dot(tc)) ** 2 * 1.7; } else miko.eyeGlow = 0;
  if (dt > 0) miko.update(dt, st);
  // phone screen glow pulses like a notification came in
  const ph = phys.items.find(i => i.kind === 'phone');
  if (ph && night) { const k = 0.35 + 0.65 * Math.max(0, Math.sin(T * 0.7)) ** 6; house.lights.phone.intensity = k * 0.9; house.lights.phone.position.copy(ph.body.position).y += 0.1; ph.def.screenMat.color.setRGB(0.5 * k + 0.05, 0.7 * k + 0.05, 1.2 * k + 0.1); }
  else if (ph) { house.lights.phone.intensity = 0; ph.def.screenMat.color.setRGB(0.05, 0.05, 0.08); }
  updateCamera(clock.fixed ? 1 / 60 : rdt, T);
  miko.head.getWorldPosition(trailP); trailP.y -= 0.12;
  const tp = miko.puffG.getWorldPosition(new THREE.Vector3());
  if (dt > 0) fx.update(dt, camera, tp, zoomOn);
  const hs = Math.hypot(ctrl.vel.x, ctrl.vel.z);
  drawSpeedLines(rdt, zoomOn ? 1 : MODE === 'zoomies' && zoom.S.phase === 'run' ? Math.max(0, (hs - 5.6) / 3) * 0.5 : 0);
  if (grade) { grade.uniforms.uTime.value = T % 100; grade.uniforms.uAberr.value = zoomOn ? 0.012 : 0; grade.uniforms.uVig.value = night ? 1.0 : 0.6;
    const warm = doorK > 0 ? 1 + doorK * 0.15 : 1; grade.uniforms.uTint.value.set(warm, 1, 1 / warm); }
  if (bloom) { bloom.strength = night ? 0.62 : 0.18; bloom.threshold = night ? 0.92 : 1.2; }
  if (composer) composer.render(); else renderer.render(scene, camera);
  if (frames % 15 === 0 && !$('perf').classList.contains('hidden')) $('perf').textContent = `${Math.round(perf.fps)} fps  ${LQ.name}  pr ${pr.toFixed(2)}  calls ${renderer.info.render.calls}  tris ${(renderer.info.render.triangles / 1000).toFixed(0)}k`;
}

// ---------------- start ----------------
resize();
if (MODE === 'sandbox') {
  ui.show('sandbox'); $('sandBtns').classList.remove('hidden'); $('btnTrick').innerHTML = 'SWAT'; ctrl.setAuto(false);
  ctrl.reset(new THREE.Vector3(-0.6, 0, 0.6), Math.PI * 0.8);
} else {
  ui.show('menu'); zoom.toMenu();
}
setTimeout(() => $('loading').classList.add('gone'), 300);
requestAnimationFrame(t => { last = t; frame(t); });

// ---------------- test / screenshot hooks ----------------
window.MIKO = { THREE, scene, camera, renderer, ctrl, miko, phys, zoom, house, cam, perf, input, setNight, applyLevel, get level() { return LQ.name; }, setTimeScale: s => { timeScale = s; }, setDoor };
if (SHOT) {
  document.body.classList.add('shot');
  const wait = n => new Promise(r => { const f0 = frames; const chk = () => frames - f0 >= n ? r() : requestAnimationFrame(chk); chk(); });
  const S = zoom.S;
  const go = async () => {
    await wait(5);
    switch (SHOT) {
      case 'start': await wait(90); break;
      case 'close': ui.show('none'); document.body.classList.add('clean'); cam.override = 'close'; await wait(100); miko.slowBlink = 0; miko.blink = 0; miko.nextBlink = 99; await wait(10); break;
      case 'overview': ui.show('none'); document.body.classList.add('clean'); cam.override = 'overview'; ctrl.reset(new THREE.Vector3(0.38, 0.42, 1.48), -2.2); ctrl.sit = true; await wait(60); break;
      case 'fall': {
        ui.show('none'); document.body.classList.add('clean'); cam.override = 'fall'; zoom.S.phase = 'shot';
        ctrl.reset(new THREE.Vector3(1.72, 0.6, -2.64), -Math.PI / 2); ctrl.setAuto(false); await wait(40);
        ctrl.swatT = 0.34; ctrl.swatSide = -1; await wait(6);
        const tum = phys.items.find(i => i.kind === 'tumbler'); tum.body.wakeUp(); tum.body.velocity.set(-1.6, 1.2, 0.25); tum.body.angularVelocity.set(1, 2, 9);
        const bowl = phys.items.find(i => i.kind === 'bowl'); bowl.body.wakeUp(); bowl.body.velocity.set(-0.4, 1.6, 1.3); bowl.body.angularVelocity.set(6, 1, 3);
        await wait(13); timeScale = 0; break;
      }
      case 'combo': {
        zoom.startCountdown(); await wait(140);
        ctrl.reset(new THREE.Vector3(0.45, 0.42, 1.45), Math.PI * 0.72); await wait(2);
        ['OTTOMAN', 'DRIFT', 'WALL KICK!'].forEach((n, i) => zoom.trick(n, 100 + i * 50));
        S.zoom = 70; S.noise = 35; S.time = 41.2;
        input.st.jump = true; await wait(14); zoom.trick('KNOCKED OFF THE REMOTE!', 160, { cls: 'big' }); await wait(10); timeScale = 0; break;
      }
      case 'wallrun': {
        zoom.startCountdown(); await wait(140);
        ctrl.reset(new THREE.Vector3(-2.2, 0, -1.6), Math.PI); ctrl.momentum = 1; S.zoom = 45; S.noise = 20; S.time = 33.4;
        for (let i = 0; i < 80 && !(ctrl.mode === 'climb' && ctrl.pos.y > 0.95); i++) await wait(1);
        timeScale = 0; break;
      }
      case 'maxzoom': {
        zoom.startCountdown(); await wait(140);
        ctrl.reset(new THREE.Vector3(-2.0, 0, 3.3), 0.0); ctrl.momentum = 2; S.zoom = 100; S.combo = 7; S.score = 4810; S.time = 22.7; ui.comboPop(7, 4);
        await wait(36); timeScale = 0; break;
      }
      case 'freeze': {
        zoom.startCountdown(); await wait(140);
        ctrl.reset(new THREE.Vector3(-2.0, 0, 4.4), 0.0); S.score = 3120; S.time = 28.0; await wait(20);
        S.noise = 100; S.alertCd = 0; await wait(30); input.st.loaf = true; await wait(112); timeScale = 0; break;
      }
      case 'end': {
        zoom.startCountdown(); await wait(140);
        S.score = 6420; S.bestCombo = 12; S.paws = 23; S.knocked = 5; S.sneaky = 1; S.caught = 1;
        zoom.showEnd(); await wait(150); miko.nextBlink = 99; miko.slowBlink = 1; await wait(22); break;
      }
    }
    await wait(3);
    window.__shotReady = true;
  };
  go();
}
