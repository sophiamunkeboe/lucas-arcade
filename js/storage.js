/* Lucas's Arcade - saved stuff (trophies + settings) in localStorage. */
(function () {
  const TROPHY_KEY = 'lucasArcade.trophies.v1';
  const MUTE_KEY = 'lucasArcade.muted';

  function read(key, fallback) {
    try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); }
    catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode etc. */ }
  }

  window.LA = window.LA || {};
  window.LA.store = {
    trophies: () => read(TROPHY_KEY, []),
    addTrophy: (prizeId, gameId, extra) => {
      const list = read(TROPHY_KEY, []);
      list.push(Object.assign({ prize: prizeId, game: gameId, at: Date.now() }, extra || {}));
      write(TROPHY_KEY, list);
      return list;
    },
    isMuted: () => read(MUTE_KEY, false) === true,
    setMuted: (m) => write(MUTE_KEY, !!m),
  };
})();
