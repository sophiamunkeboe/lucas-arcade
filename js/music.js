/* Lucas's Arcade - BACKGROUND MUSIC, made in code with Web Audio (original tunes, no audio files, works offline).
     arcade home  : upbeat chiptune          Pop the Dog  : bouncy + playful
     Fetch Frenzy : sunny, outdoorsy         Blackjack / Poker : smooth jazzy casino lounge (swing)
   - Uses the same AudioContext + master volume as LA.sfx, so the sound (mute) button silences everything.
   - The music-note button next to it turns ONLY the music on/off (saved on this device).
   - Starts after the first tap (iPhone rule). Quiet under the sound effects; ducks for POPs and prize fanfares.
   - CPU friendly: ONE lookahead scheduler (a timer every 100 ms schedules the next ~0.4 s of notes on the audio clock),
     nothing runs while muted / music off / the tab is hidden. Loops are seamless (the step counter just wraps). */
(function () {
  'use strict';
  const KEY = 'lucasArcade.music';                 // 'on' | 'off', per device
  const LEVEL = 0.2, LOOK = 0.4, TICK = 100, FADE = 1.4;
  const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const midi = n => { const m = /^([A-G][#b]?)(-?\d)$/.exec(n); return 12 * (+m[2] + 1) + NOTE[m[1]]; };
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const CH = { maj: [0, 4, 7], min: [0, 3, 7], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], '7': [0, 4, 7, 10] };
  const chord = s => { const m = /^([A-G][#b]?)(maj7|m7|7|m)?$/.exec(s); const k = m[2] === 'm' ? 'min' : m[2] || 'maj'; return { root: NOTE[m[1]], iv: CH[k] }; };

  // melody text: one token per 8th note ("-" holds, "." rests), bars separated by "|"
  function melody(text, steps8, swing) {
    const out = []; let step = 0, last = null;
    text.split('|').forEach(bar => bar.trim().split(/\s+/).forEach((tok, i) => {
      const beat = Math.floor(i / 2), at = swing ? step + beat * 3 + (i % 2 ? 2 : 0) : step + i * steps8;
      if (tok === '-') { if (last) last.len = at + (swing ? (i % 2 ? 1 : 2) : steps8) - last.at; }
      else if (tok === '.') last = null;
      else { last = { at, m: midi(tok), len: swing ? (i % 2 ? 1 : 2) : steps8 }; out.push(last); }
    }) || (step += swing ? 12 : steps8 * 8));
    return out;
  }
  // (forEach returns undefined, so the "|| step +=" above advances one bar after each bar)

  // ---------------- the four tunes ----------------
  const TRACKS = {
    arcade: { bpm: 132, spb: 4, bars: 8, lp: 3800,
      chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G'],
      lead: 'E5 G5 C6 G5 A5 G5 E5 D5 | C5 E5 A5 - G5 E5 C5 D5 | F5 A5 C6 A5 G5 F5 E5 F5 | G5 - D5 - G5 A5 B5 - |' +
            'C6 B5 C6 G5 E5 G5 C6 E6 | D6 C6 A5 E5 A5 - C6 - | A5 G5 F5 A5 G5 F5 E5 C5 | D5 E5 F5 D5 G5 - . .',
      leadInst: 'square', drums: 'k.h.s.h.k.hks.hh', bass: 'oct8', comp: 'arp' },
    pop: { bpm: 116, spb: 4, bars: 8, lp: 5000,
      chords: ['F', 'Dm', 'Gm', 'C', 'F', 'Dm', 'Bb', 'C'],
      lead: 'C5 . F5 A5 . F5 C5 . | D5 . F5 A5 . D6 C6 . | Bb4 . D5 G5 . F5 D5 . | C5 E5 G5 Bb5 A5 G5 E5 . |' +
            'F5 . A5 C6 . A5 F5 . | A5 . F5 D5 . F5 A5 . | Bb5 A5 G5 F5 D5 . F5 . | G5 . E5 . C5 . . .',
      leadInst: 'marimba', drums: 'k..hs.h.kk.hs.hb', bass: 'boing', comp: 'stab' },
    fetch: { bpm: 124, spb: 4, bars: 8, lp: 6000,
      chords: ['G', 'D', 'Em', 'C', 'G', 'D', 'Em', 'C'],
      lead: 'B4 - D5 - G5 - F#5 G5 | A5 - F#5 - D5 - . . | G5 - E5 - B4 - E5 G5 | A5 - G5 - E5 - D5 - |' +
            'B5 - A5 G5 D5 - G5 - | F#5 - A5 - D6 - A5 - | B5 - G5 - E5 - G5 A5 | G5 - E5 - D5 . . .',
      leadInst: 'whistle', drums: 'kxhxcxhxkxhkcxhx', bass: 'walk8', comp: 'strum' },
    smash: { bpm: 140, spb: 4, bars: 8, lp: 4200,
      chords: ['Em', 'C', 'D', 'Em', 'Em', 'C', 'D', 'B'],
      lead: 'E5 . E5 G5 . E5 B5 . | C6 . B5 G5 . E5 G5 . | D5 . F#5 A5 . D6 C6 B5 | E5 . . B4 E5 . G5 . |' +
            'E5 . E5 G5 . E5 B5 . | C6 . B5 G5 . E5 G5 . | A5 . F#5 D5 . F#5 A5 . | B5 . A5 . F#5 . D#5 . .',
      leadInst: 'square', drums: 'k.hsk.hskkhsk.hs', bass: 'oct8', comp: 'stab' },
    disco: { bpm: 120, spb: 4, bars: 8, lp: 5200,
      chords: ['Am7', 'D7', 'Am7', 'D7', 'Fmaj7', 'Em', 'Dm7', 'G'],
      lead: 'A5 . C6 . A5 G5 . E5 | F#5 . A5 . D6 . C6 . | A5 . C6 . E6 D6 C6 A5 | F#5 - - . D5 . . . |' +
            'C6 . A5 . F5 . A5 C6 | B5 . G5 . E5 . G5 B5 | A5 . F5 . D5 . F5 A5 | G5 - B5 - D6 - . .',
      leadInst: 'vibes', drums: 'kxhxkxhxkxhxkxhx', bass: 'oct8', comp: 'arp' },
    lounge: { bpm: 96, spb: 3, swing: true, bars: 8, lp: 2600,
      chords: ['Fmaj7', 'Dm7', 'Gm7', 'C7', 'Am7', 'D7', 'Gm7', 'C7'],
      lead: 'C5 - A4 C5 E5 - . . | F5 - E5 D5 C5 - A4 - | Bb4 - D5 F5 A5 - G5 - | E5 - G5 - Bb5 A5 G5 E5 |' +
            'C5 - E5 G5 . . A5 - | F#5 - A5 - C6 - A5 F#5 | G5 - F5 D5 Bb4 - D5 - | E5 - D5 C5 . . . .',
      leadInst: 'vibes', drums: 'R..RbRR..RbR', bass: 'walking', comp: 'rhodes' },
  };
  Object.keys(TRACKS).forEach(id => {
    const T = TRACKS[id]; T.barSteps = T.spb * 4; T.total = T.barSteps * T.bars;
    T.notes = {}; melody(T.lead, T.spb === 3 ? 0 : 2, T.swing).forEach(n => { (T.notes[n.at] = T.notes[n.at] || []).push(n); });
    T.ch = T.chords.map(chord);
  });

  // ---------------- engine ----------------
  let A = null, bus = null, duckG = null, on = true, playing = [], timer = 0, want = null, started = false;
  try { on = localStorage.getItem(KEY) !== 'off'; } catch (e) { /* */ }
  const sfx = () => window.LA && LA.sfx;
  function audio() {
    if (A) return A;
    const a = sfx() && LA.sfx.audio(); if (!a) return null;
    A = a; duckG = a.ctx.createGain(); duckG.gain.value = 1; duckG.connect(a.master);
    return A;
  }
  const audible = () => on && sfx() && !LA.sfx.isMuted() && !document.hidden;

  function startTrack(id) {
    const c = A.ctx, T = TRACKS[id];
    const g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = T.lp;
    g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(LEVEL, c.currentTime + FADE);
    lp.connect(g); g.connect(duckG);
    const p = { id, T, out: lp, gain: g, step: 0, next: c.currentTime + 0.08, stopAt: Infinity };
    playing.push(p); return p;
  }
  function fadeOut(p, sec) {
    const c = A.ctx; p.stopAt = c.currentTime + sec;
    p.gain.gain.cancelScheduledValues(c.currentTime); p.gain.gain.setValueAtTime(Math.max(0.0001, p.gain.gain.value), c.currentTime);
    p.gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + sec);
  }
  function tick() {
    const c = A.ctx;
    playing = playing.filter(p => { if (c.currentTime > p.stopAt + 0.1) { p.gain.disconnect(); return false; } return true; });
    for (const p of playing) {
      const sd = 60 / p.T.bpm / p.T.spb;
      while (p.next < c.currentTime + LOOK && p.next < p.stopAt) {
        playStep(p, p.step, p.next, sd);
        p.next += sd; p.step = (p.step + 1) % p.T.total;
      }
    }
  }
  function run() {
    clearInterval(timer); timer = 0;
    if (!audio() || !want || !audible() || A.ctx.state !== 'running') {
      // nothing to play: let current music fade out and stop the scheduler (saves battery)
      if (A) playing.forEach(p => { if (p.stopAt === Infinity) fadeOut(p, 0.3); });
      if (A && playing.length) { tick(); setTimeout(() => { if (!timer) playing.forEach(p => p.gain.disconnect()), playing = []; }, 500); }
      return;
    }
    const cur = playing.find(p => p.stopAt === Infinity);
    if (!cur || cur.id !== want) { if (cur) fadeOut(cur, FADE); startTrack(want); }   // crossfade
    playing.forEach(p => { if (p.next < A.ctx.currentTime) p.next = A.ctx.currentTime + 0.05; });  // after a pause, don't catch up
    tick(); timer = setInterval(tick, TICK); started = true;
  }

  // ---------------- instruments (a couple of oscillators each, freed when they stop) ----------------
  function note(p, type, f, t, dur, vol, a, rel, detune) {
    const c = A.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (detune) o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * 0.5), t + Math.max(a + 0.01, dur));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
    o.connect(g); g.connect(p.out); o.start(t); o.stop(t + dur + rel + 0.02); return o;
  }
  function noise(p, t, dur, vol, type, f, q) {
    const c = A.ctx, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = A.noiseBuf; fl.type = type; fl.frequency.value = f; fl.Q.value = q || 1;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(p.out); s.start(t, Math.random() * 0.8); s.stop(t + dur + 0.02);
  }
  function kick(p, t, vol) {
    const c = A.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g); g.connect(p.out); o.start(t); o.stop(t + 0.2);
  }
  const LEAD = {
    square: (p, f, t, d) => note(p, 'square', f, t, d * 0.85, 0.055, 0.005, 0.04),
    marimba: (p, f, t, d) => { note(p, 'sine', f, t, 0.08, 0.22, 0.003, 0.25); note(p, 'sine', f * 4, t, 0.02, 0.04, 0.002, 0.06); },
    whistle: (p, f, t, d) => { const o = note(p, 'sine', f, t, d * 0.9, 0.14, 0.04, 0.08); o.frequency.setValueAtTime(f * 0.97, t); o.frequency.linearRampToValueAtTime(f, t + 0.05); },
    vibes: (p, f, t, d) => { note(p, 'sine', f, t, 0.12, 0.16, 0.004, Math.min(1.2, d + 0.5)); note(p, 'sine', f * 4.01, t, 0.03, 0.03, 0.002, 0.25); },
  };
  function playStep(p, step, t, sd) {
    const T = p.T, bs = T.barSteps, inBar = step % bs, bar = Math.floor(step / bs), ch = T.ch[bar];
    const nextCh = T.ch[(bar + 1) % T.bars];
    const r = (oct, i) => hz(12 * (oct + 1) + ch.root + ch.iv[i % ch.iv.length] + 12 * Math.floor(i / ch.iv.length));
    // melody
    (T.notes[step] || []).forEach(n => LEAD[T.leadInst](p, hz(n.m), t, n.len * sd));
    // bass
    const root = oct => hz(12 * (oct + 1) + ch.root);
    if (T.bass === 'oct8' && inBar % 2 === 0) note(p, 'triangle', root(2) * (inBar % 4 ? 2 : 1), t, sd * 1.6, 0.2, 0.004, 0.03);
    if (T.bass === 'boing' && inBar % 4 === 0) { const o = note(p, 'triangle', root(2) * [1, 1.5, 2, 1.5][inBar / 4], t, sd * 2.5, 0.22, 0.004, 0.06); o.frequency.setValueAtTime(root(2) * [1, 1.5, 2, 1.5][inBar / 4] * 0.94, t); o.frequency.exponentialRampToValueAtTime(root(2) * [1, 1.5, 2, 1.5][inBar / 4], t + 0.06); }
    if (T.bass === 'walk8' && [0, 6, 8, 12, 14].includes(inBar)) note(p, 'triangle', root(2) * (inBar === 14 ? 1.5 : inBar === 8 ? 1.5 : 1), t, sd * 1.8, 0.2, 0.004, 0.05);
    if (T.bass === 'walking' && inBar % 3 === 0) {           // jazz walking bass: root, 3rd, 5th, then a half-step into the next chord
      const beat = inBar / 3, semis = [ch.root, ch.root + ch.iv[1], ch.root + ch.iv[2], nextCh.root + (ch.root > nextCh.root ? 1 : -1)][beat];
      note(p, 'triangle', hz(36 + ((semis % 12) + 12) % 12 + (semis % 12 < 5 ? 12 : 0)), t, sd * 2.6, 0.26, 0.01, 0.08);
      note(p, 'sine', hz(36 + ((semis % 12) + 12) % 12 + (semis % 12 < 5 ? 12 : 0)) * 2, t, 0.05, 0.05, 0.003, 0.1);
    }
    // chords
    if (T.comp === 'arp') note(p, 'square', r(4, inBar % 4 === 3 ? 1 : inBar % 3), t, sd * 0.5, 0.018, 0.003, 0.02);
    if (T.comp === 'stab' && (inBar === 4 || inBar === 12)) for (let i = 0; i < 3; i++) note(p, 'triangle', r(4, i), t, sd * 0.8, 0.05, 0.004, 0.06);
    if (T.comp === 'strum' && [0, 3, 6, 10, 12].includes(inBar)) for (let i = 0; i < 4; i++) note(p, 'triangle', r(3, i + 1), t + i * 0.012, sd * 1.5, 0.045, 0.003, 0.15);
    if (T.comp === 'rhodes' && (inBar === 0 || inBar === 5 || (bar % 2 && inBar === 9))) for (let i = 1; i < 5; i++) { note(p, 'sine', r(3, i), t, sd * (inBar ? 1.6 : 3.5), 0.05, 0.012, 0.35); }
    // drums
    const d = T.drums[inBar % T.drums.length];
    if (d === 'k') kick(p, t, T.swing ? 0.12 : 0.32);
    if (d === 's') noise(p, t, 0.12, 0.12, 'bandpass', 1800, 0.8);
    if (d === 'c') { noise(p, t, 0.09, 0.12, 'bandpass', 1400, 1.2); noise(p, t + 0.012, 0.08, 0.08, 'bandpass', 1600, 1.2); }
    if (d === 'h') noise(p, t, 0.035, 0.05, 'highpass', 7000);
    if (d === 'x') noise(p, t, 0.03, 0.025, 'highpass', 8000);
    if (d === 'b') noise(p, t, T.swing ? 0.22 : 0.05, T.swing ? 0.05 : 0.07, T.swing ? 'bandpass' : 'highpass', T.swing ? 2600 : 5000, 0.6);   // brush swish / tick
    if (d === 'R') noise(p, t, 0.18, 0.035, 'highpass', 6500, 0.7);      // ride cymbal
    if (T.swing && inBar === 0 && bar % 2 === 0) kick(p, t, 0.1);
  }

  // ---------------- the music-note button (next to the sound button) ----------------
  const ICON_ON = '<svg viewBox="0 0 24 24"><path d="M9 17.5 V5.5 L19 3.5 V15.5" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linejoin="round"/><ellipse cx="6.6" cy="17.6" rx="3" ry="2.4" fill="currentColor"/><ellipse cx="16.6" cy="15.6" rx="3" ry="2.4" fill="currentColor"/></svg>';
  const ICON_OFF = ICON_ON.replace('</svg>', '<path d="M3 3 L21 21" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>');
  let btn = null;
  function paint() {
    if (!btn) return;
    btn.innerHTML = on ? ICON_ON : ICON_OFF; btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Music on (tap to turn off)' : 'Music off (tap to turn on)');
    btn.classList.toggle('music-off', !on);
  }
  function addButton() {
    const mute = document.getElementById('muteBtn'); if (!mute || document.getElementById('musicBtn')) return;
    const st = document.createElement('style');
    st.textContent = '.sound-pair{display:flex;gap:8px;align-items:center;margin-left:auto}.sound-pair>*{margin:0!important}' +
      '.sound-pair.abs{flex-direction:column}.sound-pair.abs>*{position:static!important}#musicBtn{background:#a259e6;box-shadow:0 3px 0 #6d2fae}#musicBtn.music-off{opacity:.6}';
    document.head.appendChild(st);
    const pair = document.createElement('span'); pair.className = 'sound-pair';
    const cs = getComputedStyle(mute);
    if (cs.position === 'absolute' || cs.position === 'fixed') {   // the button was pinned in a corner: pin the pair there instead
      pair.classList.add('abs'); Object.assign(pair.style, { position: cs.position, right: cs.right, top: cs.top, zIndex: cs.zIndex === 'auto' ? '5' : cs.zIndex });
    }
    mute.parentNode.insertBefore(pair, mute);
    btn = document.createElement('button'); btn.id = 'musicBtn'; btn.type = 'button'; btn.className = mute.className;
    if (pair.classList.contains('abs')) { pair.appendChild(mute); pair.appendChild(btn); } else { pair.appendChild(btn); pair.appendChild(mute); }
    btn.addEventListener('click', () => { music.toggle(); if (sfx()) LA.sfx.click(); });
    paint();
  }

  const music = {
    TRACKS: Object.keys(TRACKS),
    play(id) { want = TRACKS[id] ? id : null; run(); },
    sync: () => run(),
    isOn: () => on,
    setOn(v) { on = !!v; try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { /* */ } paint(); run(); },
    toggle() { music.setOn(!on); return on; },
    duck(depth, ms) {
      if (!A || !duckG) return; const c = A.ctx, t = c.currentTime;
      duckG.gain.cancelScheduledValues(t); duckG.gain.setValueAtTime(duckG.gain.value, t);
      duckG.gain.linearRampToValueAtTime(depth == null ? 0.3 : depth, t + 0.06);
      duckG.gain.setValueAtTime(depth == null ? 0.3 : depth, t + (ms || 1500) / 1000);
      duckG.gain.linearRampToValueAtTime(1, t + (ms || 1500) / 1000 + 0.8);
    },
    get state() { return { on, want, running: !!timer, voices: playing.length, ctx: A && A.ctx.state, started }; },
  };
  window.LA = window.LA || {}; window.LA.music = music;

  // which tune for this page
  const path = location.pathname;
  want = /pop-the-dog/.test(path) ? 'pop' : /fetch-frenzy/.test(path) ? 'fetch' : /smash-room/.test(path) ? 'smash' : /blackjack|poker/.test(path) ? 'lounge' : 'arcade';
  document.addEventListener('visibilitychange', run);
  // leaving for another arcade page: quick fade so it never cuts off with a click (the next page fades in)
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target || e.defaultPrevented || !timer || /^(#|javascript:|mailto:)/.test(a.getAttribute('href'))) return;
    e.preventDefault(); playing.forEach(p => fadeOut(p, 0.25)); setTimeout(() => { location.href = a.href; }, 230);
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButton); else addButton();
})();
