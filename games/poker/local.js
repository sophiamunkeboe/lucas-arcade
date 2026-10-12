/* Poker Table - "Play vs Dogs": a whole table that runs on THIS phone (no internet).
   Uses the same rules engine (engine.js) and the same table UI (game.js) as multiplayer.
   You are seat 0; the dogs sit around the table. Each dog only ever gets PokerEngine.view(table, itsSeat). */
(function (root) {
  'use strict';
  const E = root.PokerEngine, B = root.PokerBots;
  const SEATS = { 1: [3], 2: [2, 4], 3: [2, 3, 4], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5] };
  const BUBBLE_MS = 2400;

  // opts: { dogs:[ids], level, name, avatar, onView(view), onEvent(type, info), fast, force:{dog:action}, freeze:N, rig:'win', debug }
  function start(opts) {
    const seats = SEATS[opts.dogs.length];
    const players = [{ seat: 0, name: opts.name, avatar: opts.avatar }]
      .concat(opts.dogs.map((d, i) => ({ seat: seats[i], name: B.DOGS[d].name, avatar: 'bot:' + d, bot: d })));
    const t = E.newTable(players, { code: 'DOGS', rig: opts.rig === 'win' ? rigWin : null });
    const st = { t, opts, timer: 0, acted: 0, decor: {}, stopped: false, busted: false, awarded: false };
    if (opts.debug) root.__botViews = [];

    const push = () => { if (!st.stopped) opts.onView(E.view(t, 0)); };
    const say = (seat, text, face, mood) => {
      st.decor[seat] = { text, face, mood, at: Date.now(), until: opts.freeze ? Infinity : Date.now() + BUBBLE_MS, id: (st.decor[seat] ? st.decor[seat].id : 0) + 1 };
    };
    function afterChange() {
      // the match is over for YOU when you run out of chips
      if (t.status !== 'playing' && E.seatOf(t, 0).stack === 0 && !st.busted) { st.busted = true; t.status = 'match_over'; }
      try { if (t.status !== 'playing' && t.result) reactions(); push(); }
      finally { schedule(); }            // the dogs keep playing even if drawing hiccups
    }
    function reactions() {
      if (st.reacted === t.hand_no) return; st.reacted = t.hand_no;
      const wins = new Set(); t.result.pots.forEach(p => { if (t.result.uncontested || (p.elig || []).length > 1) p.winners.forEach(w => wins.add(w)); });
      const shown = t.result.shown || {};
      t.seats.filter(s => s.bot).forEach(s => {
        const S = B.SAY[s.bot];
        if (wins.has(s.seat)) { say(s.seat, S.win[Math.floor(Math.random() * S.win.length)], 'happy', 'win'); opts.onEvent('win', s); }
        else if (shown[s.seat]) { say(s.seat, S.lose[0], s.bot === 'bella' ? 'miss' : 'sad', 'lose'); opts.onEvent('lose', s); }
      });
    }
    function schedule() {
      clearTimeout(st.timer);
      if (st.stopped || t.status !== 'playing') return;
      const s = E.seatOf(t, t.to_act); if (!s || !s.bot) return;
      if (opts.freeze && st.acted >= opts.freeze) return;            // debug: hold still for a screenshot
      const ms = opts.fast ? 30 : 600 + Math.random() * 900;          // 0.6 - 1.5 s of "thinking"
      st.timer = setTimeout(() => botTurn(s), ms);
    }
    function botTurn(s) {
      if (st.stopped || t.status !== 'playing' || t.to_act !== s.seat) return;
      const v = E.view(t, s.seat);                                   // the ONLY thing a dog gets to see
      if (root.__botViews) { root.__botViews.push({ seat: s.seat, dog: s.bot, view: v }); if (root.__botViews.length > 3000) root.__botViews.shift(); }
      let d = B.decide(v, s.bot, opts.level);
      const f = opts.force && opts.force[s.bot];
      if (f) d = Object.assign({}, d, { action: f, amount: null, say: f === 'fold' ? 'I fold.' : d.say, face: f === 'fold' && s.bot === 'bella' ? 'miss' : d.face, mood: f });
      try { E.act(t, s.seat, d.action, d.amount); }
      catch (e) { d = { action: v.to_call > 0 ? 'call' : 'check', say: 'woof', face: 'normal', mood: 'call' }; E.act(t, s.seat, d.action); }
      st.acted++;
      say(s.seat, d.say, d.face, d.mood);
      opts.onEvent('act', s, d);
      afterChange();
    }
    function rigWin(deck, order) {   // debug only: you get two aces and the flop brings the other two
      const n = order.length, i = order.indexOf(0); if (i < 0) return;
      const want = {}; want[i] = 48; want[i + n] = 49; want[2 * n + 1] = 50; want[2 * n + 2] = 51;
      Object.keys(want).forEach(p => { const j = deck.indexOf(want[p]); const x = deck[+p]; deck[+p] = deck[j]; deck[j] = x; });
    }

    E.startHand(t); st.decor = {}; afterChange();
    return {
      table: t,
      view: () => E.view(t, 0),
      send(fn, extra) {
        extra = extra || {};
        if (fn === 'poker_act') E.act(t, 0, extra.p_action, extra.p_amount);
        else if (fn === 'poker_next') { if (t.status === 'hand_over') { st.decor = {}; E.startHand(t); } }
        else if (fn === 'poker_rematch') { if (t.status === 'match_over') { st.busted = false; st.awarded = false; st.decor = {}; t.status = 'hand_over'; E.rematch(t); } }
        afterChange();
        return E.view(t, 0);
      },
      decor(seat) {           // speech bubble + face for a dog's seat
        const d = st.decor[seat], s = E.seatOf(t, seat);
        let face = d && Date.now() < d.at + 3500 ? d.face : 'normal';
        if (s && s.folded && s.in_hand && s.bot === 'bella') face = 'miss';            // Bella keeps the RBF while she sits out
        if (d && d.mood === 'snore' && t.to_act !== seat && s.in_hand && !s.folded) face = 'sleep';
        return { face, bubble: d && Date.now() < d.until ? d : null };
      },
      get busted() { return st.busted; },
      claimAward() { if (st.awarded) return false; st.awarded = true; return true; },
      stop() { st.stopped = true; clearTimeout(st.timer); if (root.__botViews) root.__botViews = null; },
      resume() { opts.freeze = 0; schedule(); },
      dogs: opts.dogs, level: opts.level,
    };
  }
  root.PokerLocal = { start, SEATS };
})(typeof window !== 'undefined' ? window : globalThis);
