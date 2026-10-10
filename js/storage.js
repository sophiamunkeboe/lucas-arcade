/* Lucas's Arcade - saved stuff, kept ONLY on this phone/computer (localStorage).
   Nothing is ever sent anywhere.

   Players: each player has a name, an avatar, a 4-digit secret code (stored scrambled),
   their own Trophy Shelf, and per-game stats (best score, fastest pop, total pops).
   Who is playing right now is remembered until the app is closed (sessionStorage),
   so every new launch starts at "Who's playing?". */
(function () {
  const PLAYERS_KEY = 'lucasArcade.players.v1';
  const SESSION_KEY = 'lucasArcade.currentPlayer';
  const LEGACY_TROPHY_KEY = 'lucasArcade.trophies.v1';   // trophies saved before logins existed
  const MUTE_KEY = 'lucasArcade.muted';

  function read(key, fallback) {
    try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); }
    catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode etc. */ }
  }
  function session(id) {
    try {
      if (id === undefined) return sessionStorage.getItem(SESSION_KEY);
      if (id === null) sessionStorage.removeItem(SESSION_KEY); else sessionStorage.setItem(SESSION_KEY, id);
    } catch (e) { return null; }
  }
  // not real security - just so the code isn't sitting there in plain sight
  function scramble(id, code) {
    let h = 2166136261; const s = 'arcade:' + id + ':' + code;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  }

  const db = () => read(PLAYERS_KEY, { players: [] });
  function edit(id, fn) {
    const d = db(); const p = d.players.find(x => x.id === id);
    if (!p) return null;
    fn(p); write(PLAYERS_KEY, d); return p;
  }

  const players = {
    list: () => db().players,
    get: id => db().players.find(p => p.id === id) || null,
    current: () => { const id = session(); return id ? players.get(id) : null; },
    create(name, avatar, code) {
      const d = db();
      const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const p = { id, name: String(name).trim().slice(0, 14) || 'Player', avatar, code: scramble(id, code),
        created: Date.now(), trophies: [], games: {} };
      if (d.players.length === 0) {           // first player gets any trophies won before logins existed
        const old = read(LEGACY_TROPHY_KEY, []);
        if (Array.isArray(old) && old.length) p.trophies = old;
        try { localStorage.removeItem(LEGACY_TROPHY_KEY); } catch (e) { /* ignore */ }
      }
      d.players.push(p); write(PLAYERS_KEY, d);
      session(id);
      return p;
    },
    checkCode: (id, code) => { const p = players.get(id); return !!p && p.code === scramble(id, code); },
    login: id => session(id),
    logout: () => session(null),
  };

  window.LA = window.LA || {};
  window.LA.players = players;
  window.LA.store = {
    // Trophy Shelf of whoever is playing
    trophies: () => { const p = players.current(); return p ? p.trophies : []; },
    addTrophy: (prizeId, gameId, extra) => {
      const p = players.current(); if (!p) return [];
      return edit(p.id, q => q.trophies.push(Object.assign({ prize: prizeId, game: gameId, at: Date.now() }, extra || {}))).trophies;
    },
    // after a round: { score, seconds } -> keeps best score, fastest pop and pop count
    recordResult: (gameId, r) => {
      const p = players.current(); if (!p) return null;
      return edit(p.id, q => {
        const g = q.games[gameId] || (q.games[gameId] = { best: 0, fastest: null, pops: 0 });
        g.pops++;
        if (r.score > g.best) g.best = r.score;
        if (r.seconds && (g.fastest == null || r.seconds < g.fastest)) g.fastest = r.seconds;
      }).games[gameId];
    },
    stats: gameId => { const p = players.current(); return (p && p.games[gameId]) || { best: 0, fastest: null, pops: 0 }; },
    isMuted: () => read(MUTE_KEY, false) === true,
    setMuted: (m) => write(MUTE_KEY, !!m),
  };
})();
