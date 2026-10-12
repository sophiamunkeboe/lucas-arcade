/* Poker Table - Lucas's Arcade game #4. Texas Hold'em for 2 to 6 players, each on their own phone. PRETEND CHIPS ONLY.
   Needs internet: the table lives in the arcade's Supabase project. All the rules run on the server
   (supabase/poker.sql); this page only shows what the server says and sends taps.
   SECURITY: each phone gets a secret seat token when it sits down (kept in localStorage so you can come back).
   The server only ever sends this phone its OWN hole cards; other players' cards are sent only after a showdown.
   Sync: Supabase Realtime broadcast "room:CODE" says "something changed" (no secrets) -> we re-fetch our view.
   We also poll (every 2 s without Realtime, every 6 s with it) so nothing gets stuck. */
(function () {
  'use strict';
  const SB_URL = 'https://xmxztvljmuniuojlvcxv.supabase.co';
  const SB_KEY = 'sb_publishable_yCNpEO52oApeLPgB28TqsQ_q9x77cYv';   // publishable (public) key - safe in the browser
  const GAME_ID = 'poker', TURN_SECONDS = 75;
  const $ = id => document.getElementById(id);
  const sfx = LA.sfx;
  const player = LA.players.current();
  if (!player) { location.replace('../../index.html'); return; }
  const SAVE_KEY = 'lucasArcade.poker.seat.' + player.id;
  const AWARD_KEY = 'lucasArcade.poker.awarded';
  const AV = id => LA.avatars.html(id, '../../');

  // ---------------- network ----------------
  let sb = null, chan = null, rt = 'off', sess = null, view = null, prev = null, inflight = null, again = false, pollT = 0, fetchedAt = 0;
  const client = () => sb || (sb = supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }));
  async function rpc(fn, args) {
    if (!navigator.onLine) throw { offline: true };
    const { data, error } = await client().rpc(fn, args);
    if (error) throw error;
    return data;
  }
  const ERR = {
    no_such_table: 'No table with that code. Check the letters!',
    table_full: 'That table is full (6 players).',
    table_closed: 'That game already started. Ask the host to open seats between hands.',
    not_seated: 'You are not at that table anymore.',
    not_your_turn: 'Wait for your turn!',
    raise_too_small: 'That raise is too small.',
    cannot_check: "You can't check - somebody bet.",
    need_two_players: 'You need at least 2 players to start.',
    host_only: 'Only the host can do that.',
  };
  function errText(e) {
    if (e && e.offline) return 'No internet. Poker needs Wi-Fi or data.';
    const m = (e && (e.message || e.hint)) || String(e);
    for (const k in ERR) if (m.indexOf(k) >= 0) return ERR[k];
    if (/fetch|network|Load failed/i.test(m)) return "Can't reach the table. Check your internet.";
    return 'Oops: ' + m;
  }
  let toastT = 0;
  function toast(t) { const el = $('toast'); el.textContent = t; el.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.add('hidden'), 2600); }

  const saved = () => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; } };
  const save = s => { try { s ? localStorage.setItem(SAVE_KEY, JSON.stringify(s)) : localStorage.removeItem(SAVE_KEY); } catch (e) { /* */ } };

  function subscribe(code) {
    unsubscribe();
    try {
      chan = client().channel('room:' + code, { config: { broadcast: { self: false }, private: false } })
        .on('broadcast', { event: 'update' }, msg => { if (!view || !msg.payload || msg.payload.v > view.version) refresh(); })
        .subscribe(st => { rt = st; });
    } catch (e) { rt = 'off'; }
  }
  function unsubscribe() { if (chan) { try { client().removeChannel(chan); } catch (e) { /* */ } chan = null; } rt = 'off'; }
  function poll() {
    clearTimeout(pollT);
    if (!sess) return;
    pollT = setTimeout(() => { refresh().finally(poll); }, rt === 'SUBSCRIBED' ? 6000 : 2000);
  }
  // one fetch at a time; if something changes meanwhile, fetch once more
  function refresh() {
    if (!sess) return Promise.resolve();
    if (inflight) { again = true; return inflight; }
    inflight = rpc('poker_view', { p_code: sess.code, p_token: sess.token })
      .then(v => { fetchedAt = Date.now(); onView(v); })
      .catch(e => {
        const t = errText(e);
        if (t === ERR.not_seated || t === ERR.no_such_table) { leaveLocal('That table closed (or you left it).'); }
        else toast(t);
      })
      .finally(() => { inflight = null; if (again) { again = false; refresh(); } });
    return inflight;
  }

  // ---------------- screens ----------------
  const SCREENS = ['screen-home', 'screen-lobby', 'screen-table'];
  function show(id) { SCREENS.forEach(s => $(s).classList.toggle('hidden', s !== id)); $('tablePill').classList.toggle('hidden', id !== 'screen-table'); }

  function home(msg) {
    show('screen-home');
    $('screen-over').classList.add('hidden'); $('screen-menu').classList.add('hidden');
    $('me').innerHTML = AV(player.avatar) + '<span>' + esc(player.name) + '</span>';
    const s = saved();
    $('rejoin').classList.toggle('hidden', !s); if (s) $('rejoinCode').textContent = s.code;
    $('homeMsg').innerHTML = msg ? esc(msg) : '&nbsp;';
    checkOnline();
  }
  function checkOnline() {
    const off = !navigator.onLine;
    $('offline').classList.toggle('hidden', !off);
    ['createBtn', 'joinBtn', 'rejoinBtn'].forEach(id => { $(id).disabled = off; });
  }
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  async function enter(s) {
    sess = s; save(s); view = null; prev = null;
    subscribe(s.code);
    await refresh(); poll();
  }
  async function create() {
    sfx.click(); busyBtn('createBtn', true);
    try { const r = await rpc('poker_create', { p_name: player.name, p_avatar: player.avatar }); await enter(r); }
    catch (e) { $('homeMsg').textContent = errText(e); }
    busyBtn('createBtn', false);
  }
  async function join() {
    const code = $('codeIn').value.toUpperCase().replace(/[^A-Z]/g, '');
    if (code.length !== 4) { $('homeMsg').textContent = 'Type the 4-letter table code.'; return; }
    sfx.click(); busyBtn('joinBtn', true);
    try {
      const s = saved();
      if (s && s.code === code) await enter(s);       // already sitting there: just go back
      else { const r = await rpc('poker_join', { p_code: code, p_name: player.name, p_avatar: player.avatar }); await enter(r); }
    } catch (e) { $('homeMsg').textContent = errText(e); }
    busyBtn('joinBtn', false);
  }
  function busyBtn(id, b) { $(id).disabled = b; }
  function leaveLocal(msg) { clearTimeout(pollT); unsubscribe(); sess = null; view = null; save(null); home(msg); }
  async function leave() {
    sfx.click();
    if (sess) { try { await rpc('poker_leave', { p_code: sess.code, p_token: sess.token }); } catch (e) { /* table may be gone */ } }
    leaveLocal();
  }
  async function send(fn, extra) {
    if (!sess) return;
    try { const v = await rpc(fn, Object.assign({ p_code: sess.code, p_token: sess.token }, extra || {})); if (v) { fetchedAt = Date.now(); onView(v); } }
    catch (e) { toast(errText(e)); refresh(); }
  }

  // ---------------- view -> screen ----------------
  function onView(v) {
    prev = view; view = v;
    if (v.status === 'lobby') { renderLobby(v); show('screen-lobby'); }
    else { show('screen-table'); renderTable(v); }
    $('pillCode').textContent = v.code;
    $('pillHand').textContent = v.hand_no ? 'Hand ' + v.hand_no : 'Table for up to 6';
    sounds(prev, v);
    over(v);
    menuSync(v);
  }

  function renderLobby(v) {
    $('bigCode').textContent = v.code;
    const bySeat = {}; v.seats.forEach(s => { bySeat[s.seat] = s; });
    let h = '';
    for (let i = 0; i < 6; i++) {
      const s = bySeat[i];
      if (!s) { h += '<div class="lseat empty">Open seat</div>'; continue; }
      h += '<div class="lseat' + (s.seat === v.me ? ' you' : '') + '">' + (s.seat === v.host ? '<span class="crown">\u{1F451}</span>' : '') +
        AV(s.avatar) + '<span>' + esc(s.name) + (s.seat === v.me ? ' (you)' : '') + '</span></div>';
    }
    $('lobbySeats').innerHTML = h;
    const host = v.me === v.host, n = v.seats.length;
    $('startBtn').classList.toggle('hidden', !host); $('openRow').classList.toggle('hidden', !host);
    $('waitHost').classList.toggle('hidden', host);
    $('startBtn').disabled = n < 2;
    $('startBtn').textContent = n < 2 ? 'Waiting for players\u2026' : 'Start the game (' + n + ' players)';
  }

  const relPos = (seat, me) => (seat - me + 6) % 6;
  function badgeFor(v, seat) {
    if (v.status === 'lobby' || !v.hand_no) return '';
    if (seat === v.button) return '<span class="badge d">D</span>';
    if (seat === v.sb && v.street === 'preflop') return '<span class="badge sb">SB</span>';
    if (seat === v.bb && v.street === 'preflop') return '<span class="badge bb">BB</span>';
    return '';
  }
  function winnersOf(v) { const w = new Set(); if (v.result) v.result.pots.forEach(p => p.winners.forEach(x => w.add(x))); return w; }
  const nameOf = (v, seat) => { const s = v.seats.find(x => x.seat === seat); return s ? s.name : '?'; };

  function renderTable(v) {
    const meS = v.seats.find(s => s.seat === v.me) || {};
    const shown = (v.result && v.result.shown) || {};
    const wins = winnersOf(v);
    const over = v.status !== 'playing';
    // other seats
    let h = '';
    v.seats.forEach(s => {
      if (s.seat === v.me) return;
      const pos = relPos(s.seat, v.me);
      const cls = ['seat', 'pos' + pos];
      if (v.status === 'playing' && v.to_act === s.seat) cls.push('turn');
      if (s.folded) cls.push('folded');
      if (!s.in_hand) cls.push('out');
      if (over && wins.has(s.seat)) cls.push('winner');
      let cards = '';
      if (shown[s.seat]) { cls.push('showdown'); cards = shown[s.seat].cards.map(c => cardHTML(c)).join(''); }
      else if (s.has_cards) cards = cardHTML(null) + cardHTML(null);
      let lbl = '';
      if (s.left) lbl = '<span class="lbl">left</span>';
      else if (shown[s.seat]) lbl = '<span class="lbl hand">' + esc(shown[s.seat].hand) + '</span>';
      else if (s.folded && s.in_hand) lbl = '<span class="lbl">fold</span>';
      else if (s.all_in) lbl = '<span class="lbl">all-in</span>';
      else if (s.busted) lbl = '<span class="lbl">out</span>';
      else if (!s.in_hand) lbl = '<span class="lbl">next hand</span>';
      else if (s.away) lbl = '<span class="lbl">away</span>';
      if (v.status === 'playing' && v.to_act === s.seat) lbl = '<span class="lbl">' + timeLeft(v) + '</span>';
      h += '<div class="' + cls.join(' ') + '" data-seat="' + s.seat + '">' +
        '<div class="top">' + badgeFor(v, s.seat) + AV(s.avatar) + '<div class="who"><span class="nm">' + esc(s.name) + '</span><span class="st">' + s.stack.toLocaleString() + '</span></div></div>' +
        '<div class="hole">' + cards + '</div>' + lbl + (s.bet ? '<span class="bet">' + s.bet + '</span>' : '') + '</div>';
    });
    $('seats').innerHTML = h;
    // board
    const b = $('board'); const oldN = prev && prev.hand_no === v.hand_no ? (prev.board || []).length : 0;
    let bh = '';
    for (let i = 0; i < 5; i++) bh += v.board[i] != null ? '' : '<div class="slot"></div>';
    b.innerHTML = '';
    v.board.forEach((c, i) => b.appendChild(LA.cards.el(c, i >= oldN ? { flip: true } : {})));
    b.insertAdjacentHTML('beforeend', bh);
    $('pot').textContent = 'Pot ' + v.pot.toLocaleString();
    // result
    let r = '';
    if (over && v.result) {
      if (v.result.uncontested) r = '<div class="res"><b>' + esc(nameOf(v, v.result.pots[0].winners[0])) + '</b> wins ' + v.result.pots[0].amount + '<br>(everyone else folded)</div>';
      else {
        const real = v.result.pots.filter(p => p.elig.length > 1 || p.winners.length > 1);
        v.result.pots.forEach(p => {
          if (p.elig.length === 1) { r += '<div class="res">' + p.amount + ' back to ' + esc(nameOf(v, p.winners[0])) + '</div>'; return; }
          const i = real.indexOf(p);
          const label = real.length > 1 ? (i === 0 ? 'Main pot ' : 'Side pot ' + (real.length > 2 ? i : '') + ' ') : '';
          r += '<div class="res">' + label + p.amount + ': <b>' + p.winners.map(w => esc(nameOf(v, w))).join(' + ') + '</b>' + (p.winners.length > 1 ? ' split' : '') + '<br>' + esc(p.hand) + '</div>';
        });
      }
    }
    $('sideInfo').innerHTML = r;
    $('log').innerHTML = over ? '' : (v.log || []).slice(-2).map(t => '<div>' + esc(t) + '</div>').join('');
    // me
    const mc = $('myCards'); mc.classList.toggle('folded', !!meS.folded);
    const myKey = v.hand_no + ':' + (v.my_cards || []).join(',');
    if (mc.dataset.key !== myKey) {
      mc.innerHTML = '';
      (v.my_cards || []).forEach((c, i) => { const el = LA.cards.el(c, { deal: { x: 0, y: -260 } }); el.style.animationDelay = (i * 0.12) + 's'; mc.appendChild(el); });
      mc.dataset.key = myKey;
    }
    if (over && wins.has(v.me)) mc.querySelectorAll('.pcard').forEach(c => c.classList.add('win'));
    $('myHandName').textContent = (v.my_cards || []).length && !meS.folded ? handName(v.my_cards.concat(v.board)) : '';
    let st = '';
    if (meS.bet) st += '<span class="bet">' + meS.bet + '</span> ';
    if (meS.all_in) st += '<b>ALL-IN</b>';
    else if (meS.folded && meS.in_hand) st += 'Folded';
    $('myInfo').innerHTML = '<div class="mytop">' + badgeFor(v, v.me) + AV(player.avatar) + '<div><div class="nm">' + esc(meS.name || player.name) + '</div><div class="st">' +
      (meS.stack || 0).toLocaleString() + ' chips</div></div></div><div id="myHandName">' + esc($('myHandName').textContent) + '</div><div id="myStatus">' + st + '</div>';
    actions(v, meS);
  }
  const cardHTML = c => LA.cards.el(c).outerHTML;
  function timeLeft(v) {
    const t = Math.max(0, TURN_SECONDS - (v.turn_age || 0) - Math.round((Date.now() - fetchedAt) / 1000));
    return t > 30 ? 'thinking\u2026' : t + 's';
  }

  // ---------------- actions ----------------
  function actions(v, meS) {
    const mine = v.status === 'playing' && v.to_act === v.me;
    $('actRow').classList.toggle('hidden', !mine);
    $('handOverRow').classList.toggle('hidden', v.status !== 'hand_over');
    if (!mine) $('raisePanel').classList.add('hidden');
    let w = '';
    if (v.status === 'playing' && !mine) {
      if (!meS.in_hand) w = 'You\u2019ll be dealt in next hand!';
      else if (meS.folded) w = 'You folded. Waiting for ' + esc(nameOf(v, v.to_act)) + '\u2026';
      else w = 'Waiting for ' + esc(nameOf(v, v.to_act)) + '\u2026';
    }
    if (v.status === 'hand_over') w = '';
    $('waitMsg').innerHTML = w; $('waitMsg').classList.toggle('hidden', !w);
    if (mine) {
      const toCall = v.to_call;
      $('callBtn').textContent = toCall > 0 ? (toCall >= meS.stack ? 'All-in ' + toCall : 'Call ' + toCall) : 'Check';
      $('foldBtn').disabled = false;
      const canRaise = v.max_raise_to > v.cur_bet && meS.stack > toCall;
      $('raiseBtn').disabled = !canRaise;
      $('raiseBtn').textContent = v.cur_bet === 0 ? 'Bet' : 'Raise';
    }
  }
  let raiseTo = 0;
  function openRaise() {
    const v = view; if (!v) return;
    sfx.click();
    const s = $('raiseSlider'); s.min = v.min_raise_to; s.max = v.max_raise_to; s.step = 1;
    setRaise(v.min_raise_to);
    $('raisePanel').classList.remove('hidden');
  }
  function setRaise(x) {
    const v = view; x = Math.round(x);
    x = Math.max(v.min_raise_to, Math.min(v.max_raise_to, x));
    raiseTo = x; $('raiseSlider').value = x; $('raiseAmt').textContent = x.toLocaleString();
    const all = x >= v.max_raise_to;
    $('raiseGo').textContent = all ? 'ALL-IN ' + x : (v.cur_bet === 0 ? 'Bet ' : 'Raise to ') + x;
  }
  function quick(q) {
    const v = view, potAfterCall = v.pot + v.to_call;
    if (q === 'min') setRaise(v.min_raise_to);
    if (q === 'half') setRaise(v.cur_bet + potAfterCall / 2);
    if (q === 'pot') setRaise(v.cur_bet + potAfterCall);
    if (q === 'all') setRaise(v.max_raise_to);
    sfx.chip(1);
  }
  function act(a, amt) {
    $('raisePanel').classList.add('hidden'); $('actRow').classList.add('hidden');
    send('poker_act', { p_action: a, p_amount: amt == null ? null : amt });
  }

  // ---------------- sounds + dealer reactions ----------------
  const dc = $('dealer'), dx = dc.getContext('2d');
  let dImgs = null, dFace = 'normal', dFaceUntil = 0;
  PTD.load('marley-dealer').then(i => { dImgs = i; });
  function drawDealer(t) {
    dx.clearRect(0, 0, 400, 330);
    if (dImgs) {
      if (dFaceUntil && t > dFaceUntil) { dFace = 'normal'; dFaceUntil = 0; }
      dx.save(); dx.translate(0, -50);
      PTD.draw(dx, 'marley-dealer', dImgs, PTD.pose('sit', { headRot: Math.sin(t / 1100) * 0.05, wag: 0.3 }), { face: dFace, time: t / 1000 });
      dx.restore();
    }
    requestAnimationFrame(drawDealer);
  }
  requestAnimationFrame(drawDealer);
  const react = (f, ms) => { dFace = f; dFaceUntil = performance.now() + ms; };

  function sounds(p, v) {
    if (!p || p.code !== v.code) return;
    if (v.hand_no !== p.hand_no && v.status === 'playing') { sfx.shuffle(); setTimeout(() => sfx.card(), 450); setTimeout(() => sfx.card(), 600); }
    else if ((v.board || []).length > (p.board || []).length) { sfx.flip(); }
    const newLog = (v.log || []).filter((x, i) => (p.log || [])[i] !== x).slice(-1)[0] || '';
    if (/raises|bets|calls|ALL-IN/.test(newLog) && v.version !== p.version) sfx.chip(/ALL-IN/.test(newLog) ? 6 : 3);
    if (/ALL-IN/.test(newLog) && v.version !== p.version) { react('bark', 1500); sfx.bark(0.72, 0.8, 1); }
    if (v.status === 'playing' && v.to_act === v.me && !(p.status === 'playing' && p.to_act === v.me)) sfx.ding();
    if (v.status !== 'playing' && p.status === 'playing') {
      const w = winnersOf(v);
      if (w.has(v.me)) { sfx.win(); react('happy', 2500); } else react('normal', 100);
    }
  }

  // ---------------- match over + prize ----------------
  function over(v) {
    const o = $('screen-over');
    if (v.status !== 'match_over') { o.classList.add('hidden'); return; }
    if (!o.classList.contains('hidden') && o.dataset.match === String(v.match_no)) return;
    o.dataset.match = String(v.match_no);
    const w = v.seats.find(s => s.seat === v.winner);
    const iWon = v.winner === v.me;
    $('overTitle').textContent = iWon ? 'You win the table!' : 'Game over!';
    $('overWho').innerHTML = w ? AV(w.avatar) + '<span>' + esc(w.name) + (iWon ? '' : ' wins all the chips!') + '</span>' : '';
    $('card').classList.toggle('hidden', !iWon); $('card').classList.remove('flipped');
    $('prizeMsg').innerHTML = iWon ? '&nbsp;' : 'Tap Rematch to play again with everyone.';
    o.classList.remove('hidden');
    const key = v.code + ':' + v.match_no;
    let done = []; try { done = JSON.parse(localStorage.getItem(AWARD_KEY)) || []; } catch (e) { /* */ }
    const first = done.indexOf(key) < 0;
    if (first) {
      done.push(key); try { localStorage.setItem(AWARD_KEY, JSON.stringify(done.slice(-50))); } catch (e) { /* */ }
      const meS = v.seats.find(s => s.seat === v.me);
      LA.store.recordResult(GAME_ID, { score: iWon && meS ? meS.stack : 0 });
    }
    if (iWon) {
      const prize = first ? LA.prizes.random('cards') : LA.prizes.get(localStorage.getItem(AWARD_KEY + '.last')) || LA.prizes.random('cards');
      if (first) { LA.store.addTrophy(prize.id, GAME_ID, { table: v.code }); try { localStorage.setItem(AWARD_KEY + '.last', prize.id); } catch (e) { /* */ } }
      $('prizeArt').innerHTML = prize.svg; $('prizeName').textContent = prize.name;
      setTimeout(() => {
        $('card').classList.add('flipped'); sfx.fanfare(); react('happy', 4000);
        const a = /s$/.test(prize.name) ? 'some' : /^[aeiou]/i.test(prize.name) ? 'an' : 'a';
        $('prizeMsg').textContent = 'You won ' + a + ' ' + prize.name + '! It\u2019s on your Trophy Shelf.';
      }, 700);
      window.__lastPrize = prize.id;
    }
  }

  // ---------------- table menu ----------------
  function menuSync(v) {
    $('menuCode').textContent = v.code;
    const host = v.me === v.host;
    $('openRow2').classList.toggle('hidden', !host); $('openChk2').checked = !!v.allow_join;
    const n = v.seats.filter(s => !s.left).length;
    $('menuSeats').textContent = n + ' of 6 seats taken. ' + (v.allow_join ? 'New players can join between hands.' : 'The table is closed to new players.');
  }

  // ---------------- hand name (just a hint for kids; the server decides who wins) ----------------
  const HN = ['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush'];
  function handName(cards) {
    if (cards.length < 2) return '';
    const R = cards.map(LA.cards.rank), cnt = {}, suits = [0, 0, 0, 0];
    R.forEach(r => { cnt[r] = (cnt[r] || 0) + 1; }); cards.forEach(c => suits[LA.cards.suit(c)]++);
    const straight = rs => { const s = new Set(rs); if (s.has(14)) s.add(1); for (let h = 14; h >= 5; h--) { let ok = true; for (let k = 0; k < 5; k++) if (!s.has(h - k)) ok = false; if (ok) return true; } return false; };
    const fs = suits.findIndex(n => n >= 5);
    if (fs >= 0 && straight(cards.filter(c => LA.cards.suit(c) === fs).map(LA.cards.rank))) return HN[8];
    const counts = Object.values(cnt).sort((a, b) => b - a);
    if (counts[0] === 4) return HN[7];
    if (counts[0] === 3 && counts[1] >= 2) return HN[6];
    if (fs >= 0) return HN[5];
    if (straight(R)) return HN[4];
    if (counts[0] === 3) return HN[3];
    if (counts[0] === 2 && counts[1] === 2) return HN[2];
    if (counts[0] === 2) return HN[1];
    return HN[0];
  }

  // ---------------- wiring ----------------
  function setMuteIcon() {
    $('muteBtn').innerHTML = sfx.isMuted()
      ? '<svg viewBox="0 0 24 24"><path d="M4 9 H8 L13 4 V20 L8 15 H4 Z" fill="currentColor"/><path d="M16 9 L21 14 M21 9 L16 14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M4 9 H8 L13 4 V20 L8 15 H4 Z" fill="currentColor"/><path d="M16 8 Q19 12 16 16 M18 5 Q23 12 18 19" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>';
  }
  $('muteBtn').onclick = () => { sfx.toggleMute(); setMuteIcon(); };
  $('createBtn').onclick = create; $('joinBtn').onclick = join;
  $('codeIn').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); });
  $('codeIn').addEventListener('keydown', e => { if (e.key === 'Enter') join(); });
  $('rejoinBtn').onclick = () => { const s = saved(); if (s) enter(s); };
  $('retryBtn').onclick = checkOnline;
  $('startBtn').onclick = async () => {
    sfx.click(); $('startBtn').disabled = true;
    await send('poker_start');
    if ($('openChk').checked) await send('poker_set_open', { p_open: true });
  };
  $('openChk2').onchange = e => send('poker_set_open', { p_open: e.target.checked });
  ['leaveBtn1', 'leaveBtn2', 'leaveBtn3'].forEach(id => { $(id).onclick = leave; });
  $('foldBtn').onclick = () => act('fold');
  $('callBtn').onclick = () => act(view && view.to_call > 0 ? 'call' : 'check');
  $('raiseBtn').onclick = openRaise;
  $('raiseCancel').onclick = () => { $('raisePanel').classList.add('hidden'); sfx.click(); };
  $('raiseSlider').oninput = e => setRaise(+e.target.value);
  $('minusBtn').onclick = () => setRaise(raiseTo - (view ? view.big_blind : 20));
  $('plusBtn').onclick = () => setRaise(raiseTo + (view ? view.big_blind : 20));
  document.querySelectorAll('.quick button').forEach(b => { b.onclick = () => quick(b.dataset.q); });
  $('raiseGo').onclick = () => act(raiseTo >= view.max_raise_to ? 'allin' : (view.cur_bet === 0 ? 'bet' : 'raise'), raiseTo);
  $('nextBtn').onclick = () => { sfx.click(); $('handOverRow').classList.add('hidden'); send('poker_next'); };
  $('rematchBtn').onclick = () => { sfx.click(); $('screen-over').classList.add('hidden'); send('poker_rematch'); };
  $('tablePill').onclick = () => { sfx.click(); $('screen-menu').classList.remove('hidden'); };
  $('menuClose').onclick = () => $('screen-menu').classList.add('hidden');
  window.addEventListener('online', () => { checkOnline(); refresh(); });
  window.addEventListener('offline', () => { checkOnline(); if (sess) toast('Lost internet - waiting to reconnect\u2026'); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  setInterval(() => { if (view && view.status === 'playing') document.querySelectorAll('.seat.turn .lbl').forEach(l => { l.textContent = timeLeft(view); }); }, 1000);

  setMuteIcon();
  LA.casino.wall($('wall'), { slots: 2, start: new URLSearchParams(location.search).get('sign') || 'taylor' });
  const s0 = saved();
  if (s0 && new URLSearchParams(location.search).get('resume') !== '0') { home(); enter(s0); } else home();
  window.__poker = { get view() { return view; }, get rt() { return rt; }, refresh };
})();
