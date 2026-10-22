// MIKO - touch controls: floating thumbstick on the left (drag anywhere there), big JUMP + TRICK buttons on the right.
// Keyboard too: arrows/WASD, Space = jump, F/J/Shift = trick.
export function createInput(el) {
  const st = { x: 0, y: 0, jump: false, trick: false, loaf: false, sit: false, sneak: false, active: false };
  const zone = el.zone, base = el.base, knob = el.knob; let pid = null, ox = 0, oy = 0; const MAXR = 52;
  const setKnob = (dx, dy) => { knob.style.transform = `translate(${dx}px,${dy}px)`; };
  zone.addEventListener('pointerdown', e => {
    if (pid !== null) return; pid = e.pointerId; ox = e.clientX; oy = e.clientY; zone.setPointerCapture(pid);
    const r = zone.getBoundingClientRect(); base.style.left = (ox - r.left) + 'px'; base.style.top = (oy - r.top) + 'px'; base.classList.add('on'); setKnob(0, 0); st.active = true;
  });
  zone.addEventListener('pointermove', e => {
    if (e.pointerId !== pid) return;
    let dx = e.clientX - ox, dy = e.clientY - oy; const l = Math.hypot(dx, dy);
    if (l > MAXR) { dx *= MAXR / l; dy *= MAXR / l; }
    st.x = dx / MAXR; st.y = -dy / MAXR; setKnob(dx, dy); base.classList.toggle('dart', Math.hypot(st.x, st.y) > 0.85);
  });
  const up = e => { if (e.pointerId !== pid) return; pid = null; st.x = 0; st.y = 0; st.active = false; base.classList.remove('on', 'dart'); setKnob(0, 0); };
  zone.addEventListener('pointerup', up); zone.addEventListener('pointercancel', up);
  const btn = (b, key) => { if (!b) return; b.addEventListener('pointerdown', e => { e.preventDefault(); st[key] = true; b.classList.add('down'); }); const r = () => b.classList.remove('down'); b.addEventListener('pointerup', r); b.addEventListener('pointerleave', r); b.addEventListener('pointercancel', r); };
  btn(el.jump, 'jump'); btn(el.trick, 'trick'); btn(el.loaf, 'loaf'); btn(el.sit, 'sit'); btn(el.sneak, 'sneak');
  const keys = {};
  window.addEventListener('keydown', e => {
    if (e.repeat) return; keys[e.code] = true;
    if (e.code === 'Space') { st.jump = true; st.loaf = true; e.preventDefault(); }
    if (e.code === 'KeyF' || e.code === 'KeyJ' || e.code === 'ShiftLeft') st.trick = true;
    if (e.code === 'KeyL') st.loaf = true; if (e.code === 'KeyC') st.sit = true; if (e.code === 'KeyV') st.sneak = true;
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  return {
    st,
    read() {
      let x = st.x, y = st.y;
      const kx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0), ky = (keys.ArrowUp || keys.KeyW ? 1 : 0) - (keys.ArrowDown || keys.KeyS ? 1 : 0);
      if (kx || ky) { x = kx; y = ky; }
      const out = { x, y, jump: st.jump, trick: st.trick, loaf: st.loaf, sit: st.sit, sneak: st.sneak };
      st.jump = st.trick = st.loaf = st.sit = st.sneak = false;
      return out;
    },
  };
}
