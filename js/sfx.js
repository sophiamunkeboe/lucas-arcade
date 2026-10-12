/* Lucas's Arcade - sound effects made with the Web Audio API (no audio files).
   Audio has to be "unlocked" by a tap on iPhone, so we call LA.sfx.unlock()
   from the first pointer/touch event. */
(function () {
  let ctx = null, master = null, noiseBuf = null;
  let muted = (window.LA && LA.store) ? LA.store.isMuted() : false;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.7;
    master.connect(ctx.destination);
    // 1 second of white noise, reused for whooshes / crunches / pops
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function unlock() {
    const c = ensure();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    // play a silent blip (old iOS needs an actual sound started in the gesture)
    const o = c.createOscillator(), g = c.createGain();
    g.gain.value = 0; o.connect(g); g.connect(master);
    o.start(); o.stop(c.currentTime + 0.01);
    if (window.LA && LA.music) LA.music.sync();      // background music starts after the first tap (iOS rule)
  }
  ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(ev =>
    window.addEventListener(ev, unlock, { passive: true }));

  // big moments push the background music down for a moment
  const duck = (depth, ms) => { if (window.LA && LA.music) LA.music.duck(depth, ms); };
  function ready() { return ctx && !muted && ctx.state === 'running'; }

  function env(g, t, peak, a, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function tone(type, f0, f1, t, dur, peak, dest) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, peak, Math.min(0.02, dur / 4), dur);
    o.connect(g); g.connect(dest || master);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function noise(t, dur, peak, filterType, f0, f1, q) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = filterType; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); env(g, t, peak, 0.01, dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  const sfx = {
    unlock,
    isMuted: () => muted,
    setMuted(m) {
      muted = !!m;
      if (window.LA && LA.store) LA.store.setMuted(muted);
      if (master) master.gain.value = muted ? 0 : 0.7;
      if (window.LA && LA.music) LA.music.sync();     // mute silences the music too (and stops scheduling it)
    },
    // shared with js/music.js so music + effects go through one mute switch
    audio() { ensure(); return ctx ? { ctx, master, noiseBuf } : null; },
    toggleMute() { sfx.setMuted(!muted); return muted; },

    click() { if (!ready()) return; tone('triangle', 660, 990, ctx.currentTime, 0.08, 0.25); },

    whoosh() {
      if (!ready()) return; const t = ctx.currentTime;
      noise(t, 0.28, 0.35, 'bandpass', 600, 3200, 2.5);
    },

    crunch() {
      if (!ready()) return; const t = ctx.currentTime;
      for (let i = 0; i < 4; i++) noise(t + i * 0.055, 0.04, 0.5, 'highpass', 1800 + Math.random() * 1500, 0, 0.7);
      tone('square', 180, 90, t, 0.07, 0.12);           // chomp
      tone('square', 160, 80, t + 0.12, 0.07, 0.1);
    },

    boing() {
      if (!ready()) return; const t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(420, t);
      o.frequency.exponentialRampToValueAtTime(110, t + 0.55);
      lfo.frequency.value = 18; lg.gain.value = 30; lfo.connect(lg); lg.connect(o.frequency);
      env(g, t, 0.35, 0.01, 0.6);
      o.connect(g); g.connect(master);
      o.start(t); lfo.start(t); o.stop(t + 0.7); lfo.stop(t + 0.7);
    },

    // p = 0..1 how inflated the dog is; higher = higher squeak
    squeak(p) {
      if (!ready()) return; const t = ctx.currentTime;
      const base = 500 + (p || 0) * 900;
      const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(base, t);
      o.frequency.linearRampToValueAtTime(base * 1.5, t + 0.16);
      lfo.frequency.value = 35; lg.gain.value = base * 0.06; lfo.connect(lg); lg.connect(o.frequency);
      env(g, t, 0.18, 0.02, 0.18);
      o.connect(g); g.connect(master);
      o.start(t); lfo.start(t); o.stop(t + 0.25); lfo.stop(t + 0.25);
    },

    // long rising squeal before the pop
    stretch(dur) {
      if (!ready()) return; const t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(500, t);
      o.frequency.exponentialRampToValueAtTime(1800, t + dur);
      lfo.frequency.value = 22; lg.gain.value = 60; lfo.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0.05, t); g.gain.linearRampToValueAtTime(0.22, t + dur);
      g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.03);
      o.connect(g); g.connect(master);
      o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
    },

    pop() {
      if (!ready()) return; const t = ctx.currentTime; duck(0.25, 1200);
      noise(t, 0.35, 1.0, 'lowpass', 6000, 300, 0.8);
      noise(t, 0.08, 0.8, 'highpass', 2000, 0, 0.5);
      tone('sine', 160, 40, t, 0.35, 0.9);
      // confetti sparkle
      for (let i = 0; i < 6; i++) tone('sine', 1500 + Math.random() * 2000, 0, t + 0.25 + i * 0.06, 0.08, 0.06);
    },

    poof() {
      if (!ready()) return; const t = ctx.currentTime;
      noise(t, 0.3, 0.25, 'bandpass', 900, 400, 1);
      tone('sine', 300, 600, t + 0.05, 0.2, 0.15);
    },

    fanfare() {
      duck(0.2, 2600);
      if (!ready()) return; const t = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) => { tone('square', f, 0, t + i * 0.12, 0.14, 0.12); tone('triangle', f, 0, t + i * 0.12, 0.16, 0.15); });
      [523.25, 659.25, 783.99, 1046.5].forEach(f => { tone('triangle', f, 0, t + 0.52, 0.7, 0.13); tone('square', f / 2, 0, t + 0.52, 0.6, 0.04); });
    },


    /* Dog voices. pitch: 1 = medium dog; Bella uses ~1.35 (higher), Marley ~0.75 (lower, gruffer).
       gruff: 0..1 adds rough noise to the bark. */
    bark(pitch, gruff, times) {
      if (!ready()) return; const t0 = ctx.currentTime;
      pitch = pitch || 1; gruff = gruff || 0; times = times || 1;
      for (let k = 0; k < times; k++) {
        const t = t0 + k * 0.2 + Math.random() * 0.02;
        const f = 420 * pitch * (0.95 + Math.random() * 0.1);
        // voiced part: sawtooth through a "mouth" formant filter
        const o = ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(f * 0.8, t);
        o.frequency.linearRampToValueAtTime(f * 1.15, t + 0.03);
        o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.16);
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2.2;
        bp.frequency.setValueAtTime(900 * pitch, t);
        bp.frequency.linearRampToValueAtTime(1500 * pitch, t + 0.03);
        bp.frequency.exponentialRampToValueAtTime(600 * pitch, t + 0.16);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000 * pitch;
        const g = ctx.createGain(); env(g, t, 0.55, 0.012, 0.16);
        o.connect(bp); bp.connect(lp); lp.connect(g); g.connect(master);
        o.start(t); o.stop(t + 0.25);
        // breathy / gruff part
        noise(t, 0.12 + gruff * 0.06, 0.12 + gruff * 0.3, 'bandpass', 1200 * pitch, 500 * pitch, 1.2);
        if (gruff > 0) tone('square', f * 0.25, f * 0.18, t, 0.14, 0.06 * gruff);
      }
    },

    // begging whine: rising then falling, wobbly
    whimper(pitch) {
      if (!ready()) return; const t = ctx.currentTime;
      pitch = pitch || 1;
      const f = 700 * pitch * (0.92 + Math.random() * 0.16);
      const dur = 0.55 + Math.random() * 0.35;
      const o = ctx.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(f * 0.85, t);
      o.frequency.linearRampToValueAtTime(f * 1.25, t + dur * 0.35);
      o.frequency.linearRampToValueAtTime(f * 0.7, t + dur);
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 7 + Math.random() * 3; lg.gain.value = f * 0.035;
      lfo.connect(lg); lg.connect(o.frequency);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.5; bp.frequency.value = 1300 * pitch;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.08);
      g.gain.setValueAtTime(0.16, t + dur * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(bp); bp.connect(g); g.connect(master);
      o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
      noise(t, dur * 0.8, 0.03, 'highpass', 3000, 0, 0.5); // a little breath
    },

    // Gorda on the couch: a soft sleepy snore (in + out) and a little sigh
    snore() {
      if (!ready()) return; const t = ctx.currentTime;
      [[0, 1.0, 0.07], [1.25, 0.8, 0.05]].forEach(([d, dur, peak]) => {
        const o = ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(d ? 70 : 55, t + d); o.frequency.linearRampToValueAtTime(d ? 50 : 65, t + d + dur);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 3;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t + d); g.gain.linearRampToValueAtTime(peak, t + d + dur * 0.6);
        g.gain.linearRampToValueAtTime(0.0001, t + d + dur);
        // rattle
        const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 26; lg.gain.value = peak * 0.6;
        lfo.connect(lg); lg.connect(g.gain);
        o.connect(lp); lp.connect(g); g.connect(master);
        o.start(t + d); lfo.start(t + d); o.stop(t + d + dur + 0.05); lfo.stop(t + d + dur + 0.05);
        noise(t + d, dur, peak * 0.6, 'bandpass', d ? 700 : 500, d ? 400 : 650, 1.2);
      });
    },
    sigh() {
      if (!ready()) return; const t = ctx.currentTime;
      noise(t, 0.9, 0.1, 'bandpass', 900, 300, 1.5);
      tone('sine', 260, 170, t + 0.05, 0.6, 0.03);
    },

    // little paw-patter footstep (Gorda's zoomies)
    patter() {
      if (!ready()) return; const t = ctx.currentTime;
      noise(t, 0.035, 0.07, 'bandpass', 1800 + Math.random() * 1400, 0, 2);
      tone('sine', 180 + Math.random() * 60, 120, t, 0.04, 0.04);
    },
    // Gorda snuffling for popcorn on the floor: 2-3 quick nose sniffs
    sniff() {
      if (!ready()) return; const t = ctx.currentTime;
      for (let i = 0; i < 3; i++) noise(t + i * 0.07, 0.05, 0.16, 'bandpass', 2600 + i * 300, 1600, 3);
    },
    // Gorda gobbling a popcorn piece: small chomp + crispy crunch
    chomp() {
      if (!ready()) return; const t = ctx.currentTime;
      tone('square', 240, 110, t, 0.06, 0.09);
      for (let i = 0; i < 3; i++) noise(t + 0.03 + i * 0.045, 0.035, 0.32, 'highpass', 2200 + Math.random() * 1500, 0, 0.7);
    },
    // ---- Fetch Frenzy ----
    // muddy puddle splash
    splash() {
      if (!ready()) return; const t = ctx.currentTime;
      noise(t, 0.35, 0.45, 'bandpass', 1400, 500, 1.2);
      noise(t + 0.05, 0.25, 0.25, 'lowpass', 900, 300, 1);
      for (let i = 0; i < 4; i++) tone('sine', 900 + Math.random() * 700, 300, t + 0.04 + i * 0.05, 0.06, 0.06);
    },
    // squirrel chatter: fast squeaky chit-chit-chit
    chatter() {
      if (!ready()) return; const t = ctx.currentTime;
      for (let i = 0; i < 7; i++) tone('square', 2400 + Math.random() * 600, 1700, t + i * 0.055, 0.035, 0.05);
    },
    // the thief's playful "hey!" growl (grr-RUFF!)
    heyGrowl(pitch) {
      if (!ready()) return; const t = ctx.currentTime, p = pitch || 1;
      const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(120 * p, t); o.frequency.linearRampToValueAtTime(150 * p, t + 0.4);
      lfo.frequency.value = 28; lg.gain.value = 0.5; lfo.connect(lg);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      lg.connect(g.gain);
      o.connect(f); f.connect(g); g.connect(master);
      o.start(t); lfo.start(t); o.stop(t + 0.5); lfo.stop(t + 0.5);
      setTimeout(() => sfx.bark(p, 0.4, 1), 420);
    },
    // little hop for a jump catch
    hop() {
      if (!ready()) return; const t = ctx.currentTime;
      tone('sine', 380, 760, t, 0.12, 0.12);
    },
    // popcorn bouncing off Gorda
    boop() {
      if (!ready()) return; const t = ctx.currentTime;
      tone('sine', 700, 320, t, 0.12, 0.15);
    },

    bonus() {
      if (!ready()) return; const t = ctx.currentTime;
      [880, 1175, 1568].forEach((f, i) => tone('sine', f, 0, t + i * 0.06, 0.1, 0.15));
    },

    // ---- card games (Blackjack + Poker) ----
    // a card sliding across the felt
    card() {
      if (!ready()) return; const t = ctx.currentTime;
      noise(t, 0.09, 0.3, 'highpass', 2500, 5000, 0.8);
      tone('triangle', 260, 140, t + 0.05, 0.04, 0.08);
    },
    // card turning over
    flip() {
      if (!ready()) return; const t = ctx.currentTime;
      noise(t, 0.05, 0.28, 'bandpass', 3000, 1800, 1.5);
      noise(t + 0.05, 0.04, 0.2, 'bandpass', 2000, 1200, 1.5);
    },
    // clicky plastic chips
    chip(n) {
      if (!ready()) return; const t = ctx.currentTime;
      for (let i = 0; i < (n || 2); i++) {
        tone('sine', 2600 + Math.random() * 900, 2200, t + i * 0.045, 0.03, 0.12);
        tone('square', 5200 + Math.random() * 800, 0, t + i * 0.045, 0.015, 0.03);
      }
    },
    // riffle shuffle
    shuffle() {
      if (!ready()) return; const t = ctx.currentTime;
      for (let i = 0; i < 14; i++) noise(t + i * 0.03, 0.035, 0.15, 'highpass', 3000 + i * 80, 0, 0.7);
      noise(t + 0.48, 0.12, 0.25, 'lowpass', 1500, 400, 1);
    },
    // sad trombone-ish "womp womp"
    womp() {
      if (!ready()) return; const t = ctx.currentTime;
      [[392, 370], [370, 330], [330, 262]].forEach(([a, b], i) => tone('sawtooth', a / 2, b / 2, t + i * 0.28, i === 2 ? 0.55 : 0.24, 0.07));
    },
    // little "your turn" ding
    ding() {
      if (!ready()) return; const t = ctx.currentTime;
      tone('sine', 1320, 0, t, 0.25, 0.18); tone('sine', 1760, 0, t + 0.12, 0.35, 0.14);
    },
    // short win jingle (smaller than the prize fanfare)
    win() {
      if (!ready()) return; const t = ctx.currentTime; duck(0.4, 900);
      [659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone('triangle', f, 0, t + i * 0.08, 0.16, 0.14));
    },
  };

  window.LA = window.LA || {};
  window.LA.sfx = sfx;
})();
