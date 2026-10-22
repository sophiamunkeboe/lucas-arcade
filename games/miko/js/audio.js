// MIKO - all sounds made in code with Web Audio (goes through the arcade's shared mute switch, LA.sfx)
const rnd = (a, b) => a + Math.random() * (b - a);
function A() { const s = window.LA && LA.sfx; if (!s) return null; const a = s.audio(); return a && !s.isMuted() && a.ctx.state === 'running' ? a : null; }

function tone(type, f0, f1, at, dur, peak, dest) {
  const a = A(); if (!a) return; const c = a.ctx, t = c.currentTime + (at || 0);
  const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + Math.min(0.02, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || a.master); o.start(t); o.stop(t + dur + 0.05); return o;
}
function noise(at, dur, peak, type, f, q, f1) {
  const a = A(); if (!a) return; const c = a.ctx, t = c.currentTime + (at || 0);
  const s = c.createBufferSource(); s.buffer = a.noiseBuf; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t);
  if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur); fl.Q.value = q || 1;
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(a.master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}
// a cat "meow": sawtooth through two moving formant filters
function catVoice(f0, f1, f2, dur, at = 0, peak = 0.22) {
  const a = A(); if (!a) return; const c = a.ctx, t = c.currentTime + at;
  const o = c.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f1, t + dur * 0.4); o.frequency.linearRampToValueAtTime(f2, t + dur);
  const vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = 6; vg.gain.value = 8; vib.connect(vg); vg.connect(o.frequency);
  const fA = c.createBiquadFilter(); fA.type = 'bandpass'; fA.Q.value = 6; fA.frequency.setValueAtTime(700, t); fA.frequency.linearRampToValueAtTime(1500, t + dur * 0.45); fA.frequency.linearRampToValueAtTime(900, t + dur);
  const fB = c.createBiquadFilter(); fB.type = 'bandpass'; fB.Q.value = 8; fB.frequency.setValueAtTime(2200, t); fB.frequency.linearRampToValueAtTime(3000, t + dur * 0.5);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + 0.05); g.gain.setValueAtTime(peak, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const gB = c.createGain(); gB.gain.value = 0.4;
  o.connect(fA); o.connect(fB); fA.connect(g); fB.connect(gB); gB.connect(g); g.connect(a.master);
  o.start(t); vib.start(t); o.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
}

let skid = null, purr = null, amb = null;
export const snd = {
  step(soft = 1) { noise(0, 0.05, 0.05 * soft, 'lowpass', rnd(300, 500), 1); tone('sine', rnd(90, 120), 60, 0, 0.05, 0.03 * soft); },
  jump() { noise(0, 0.18, 0.12, 'bandpass', 900, 1.5, 2400); },
  dbl() { noise(0, 0.15, 0.1, 'bandpass', 1400, 2, 3400); tone('triangle', 700, 1400, 0, 0.12, 0.05); },
  land(p = 1) { tone('sine', 120, 50, 0, 0.12, 0.12 * p); noise(0, 0.08, 0.12 * p, 'lowpass', 500, 1); },
  meow() { catVoice(rnd(480, 560), rnd(750, 850), rnd(450, 520), rnd(0.45, 0.6)); },
  mrrp() { catVoice(400, 700, 650, 0.22, 0, 0.16); catVoice(650, 820, 760, 0.12, 0.2, 0.12); },   // chirp / trill
  yowl() { catVoice(600, 1100, 500, 0.6, 0, 0.25); },
  chirp() { [0, 0.09, 0.18].forEach(t => catVoice(1200, 1700, 1300, 0.07, t, 0.1)); },
  purr(on) {
    const a = A();
    if (!on || !a) { if (purr) { try { purr.g.gain.setTargetAtTime(0, purr.c.currentTime, 0.2); const p = purr; setTimeout(() => { try { p.s.stop(); p.lfo.stop(); } catch (e) {} }, 800); } catch (e) {} purr = null; } return; }
    if (purr) return; const c = a.ctx;
    const s = c.createBufferSource(); s.buffer = a.noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 180;
    const am = c.createGain(); am.gain.value = 0;
    const lfo = c.createOscillator(); lfo.frequency.value = 24; const lg = c.createGain(); lg.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain);
    const g = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(0.5, c.currentTime, 0.3);
    s.connect(f); f.connect(am); am.connect(g); g.connect(a.master); s.start(); lfo.start();
    purr = { s, lfo, g, c };
  },
  clatter(kind, v) {
    const p = Math.min(1, v / 5);
    if (kind === 'glass' || kind === 'ceramic') { noise(0, 0.25, 0.3 * p, 'highpass', 2600, 0.8); for (let i = 0; i < 4; i++) tone('sine', rnd(2600, 5200), 0, rnd(0, 0.12), 0.07, 0.05 * p); }
    else if (kind === 'metal') { tone('triangle', rnd(700, 900), 0, 0, 0.35, 0.1 * p); tone('sine', rnd(1700, 2100), 0, 0, 0.25, 0.06 * p); noise(0, 0.08, 0.15 * p, 'bandpass', 2000, 2); }
    else if (kind === 'soft') { tone('sine', 140, 70, 0, 0.1, 0.12 * p); }
    else if (kind === 'book') { noise(0, 0.12, 0.3 * p, 'lowpass', 900, 1); tone('sine', 100, 50, 0, 0.1, 0.18 * p); }
    else { noise(0, 0.07, 0.25 * p, 'bandpass', 1500, 2); tone('square', rnd(300, 420), 0, 0, 0.05, 0.05 * p); }
  },
  swipe() { noise(0, 0.12, 0.12, 'bandpass', 2400, 2, 900); },
  skid(on, amt = 1) {
    const a = A();
    if (!on || !a) { if (skid) { skid.g.gain.setTargetAtTime(0, skid.c.currentTime, 0.05); const s = skid; setTimeout(() => { try { s.s.stop(); } catch (e) {} }, 300); skid = null; } return; }
    if (!skid) {
      const c = a.ctx, s = c.createBufferSource(); s.buffer = a.noiseBuf; s.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 3;
      const g = c.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(a.master); s.start(); skid = { s, f, g, c };
    }
    skid.g.gain.setTargetAtTime(0.09 * amt, skid.c.currentTime, 0.03); skid.f.frequency.setTargetAtTime(1800 + amt * 1800, skid.c.currentTime, 0.05);
  },
  bonk() { tone('sine', 220, 80, 0, 0.18, 0.2); noise(0, 0.1, 0.2, 'lowpass', 700, 1); },
  wipe() { noise(0, 0.4, 0.35, 'lowpass', 900, 1, 200); tone('sine', 160, 50, 0, 0.35, 0.3); setTimeout(() => snd.yowl(), 80); },
  paw(n) { const f = 880 * Math.pow(2, Math.min(n, 12) / 12); tone('triangle', f, 0, 0, 0.12, 0.09); tone('sine', f * 2, 0, 0.04, 0.12, 0.05); },
  trick(n) { const f = 520 * Math.pow(1.06, Math.min(n, 20)); tone('square', f, 0, 0, 0.07, 0.06); tone('square', f * 1.5, 0, 0.06, 0.12, 0.06); },
  zoom() { tone('sawtooth', 200, 1600, 0, 0.6, 0.1); noise(0, 0.6, 0.2, 'bandpass', 600, 1.5, 5000); tone('square', 1046, 0, 0.55, 0.2, 0.08); tone('square', 1318, 0, 0.65, 0.3, 0.08); },
  door() { tone('sawtooth', 90, 70, 0, 0.5, 0.05); noise(0, 0.05, 0.2, 'highpass', 3000, 1); tone('square', 1200, 0, 0.05, 0.03, 0.08); },
  hmm() { [0, 0.45, 0.9].forEach(t => { tone('sine', 70, 45, t, 0.18, 0.2); noise(t, 0.12, 0.12, 'lowpass', 300, 1); }); tone('sawtooth', 180, 140, 1.3, 0.35, 0.03); },   // off-screen footsteps + a floor creak
  caught() { tone('square', 400, 200, 0, 0.3, 0.1); tone('square', 300, 150, 0.3, 0.4, 0.1); },
  safe() { tone('triangle', 660, 0, 0, 0.1, 0.08); tone('triangle', 880, 0, 0.1, 0.15, 0.08); },
  tick() { tone('square', 1400, 0, 0, 0.03, 0.04); },
  end() { [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, 0, i * 0.12, 0.3, 0.09)); },
  click() { tone('triangle', 660, 990, 0, 0.08, 0.1); },
  ambience(on) {    // 3 AM: fridge hum + crickets outside, very quiet
    const a = A();
    if (!on || !a) { if (amb) { amb.g.gain.setTargetAtTime(0, amb.c.currentTime, 0.3); const x = amb; setTimeout(() => { try { x.o.stop(); x.t && clearInterval(x.t); } catch (e) {} }, 1200); amb = null; } return; }
    if (amb) return; const c = a.ctx;
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 58; const g = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(0.025, c.currentTime, 1);
    o.connect(g); g.connect(a.master); o.start();
    const t = setInterval(() => { if (Math.random() < 0.6) [0, 0.06, 0.12].forEach(d => tone('sine', 4200 + Math.random() * 300, 0, d, 0.04, 0.012)); }, 900);
    amb = { o, g, c, t };
  },
};
export function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }
