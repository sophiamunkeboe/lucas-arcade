/* Poker Table - the Texas Hold'em RULES ENGINE in JavaScript, used by "Play vs Dogs" (fully offline).
   It is a line-by-line port of the multiplayer server rules in supabase/poker.sql (same blinds/button rotation,
   betting rounds, min-raise + re-open rules, side pots, odd-chip rule, hand evaluator and scores), and
   view(table, seat) returns exactly the same shape as the server's poker_view, so the same table UI draws both.
   tools/poker-parity.mjs checks this file against the live SQL engine.
   Cards are 0..51: rank = floor(c / 4) + 2 (14 = ace), suit = c % 4. */
(function (root) {
  'use strict';
  const rank = c => Math.floor(c / 4) + 2, suit = c => c % 4;

  // ---------------- hand evaluation (same scores as poker.eval7) ----------------
  function straightHigh(rs) {
    for (let h = 14; h >= 5; h--) {
      if (h === 5) { if (rs.has(5) && rs.has(4) && rs.has(3) && rs.has(2) && rs.has(14)) return 5; }
      else if (rs.has(h) && rs.has(h - 1) && rs.has(h - 2) && rs.has(h - 3) && rs.has(h - 4)) return h;
    }
    return 0;
  }
  function mkscore(cat, tb) { let s = cat; for (let i = 0; i < 5; i++) s = s * 15 + (tb[i] || 0); return s; }
  function eval7(cards) {
    const cnt = new Array(15).fill(0), sc = [0, 0, 0, 0];
    for (const c of cards) { cnt[rank(c)]++; sc[suit(c)]++; }
    let fs = -1; for (let s = 0; s < 4; s++) if (sc[s] >= 5) fs = s;
    const allr = [], trips = [], pairs = []; let quads = 0;
    for (let r = 14; r >= 2; r--) {
      if (cnt[r] > 0) allr.push(r);
      if (cnt[r] === 4 && !quads) quads = r; else if (cnt[r] === 3) trips.push(r); else if (cnt[r] === 2) pairs.push(r);
    }
    let flushr = null;
    if (fs >= 0) {
      flushr = [...new Set(cards.filter(c => suit(c) === fs).map(rank))].sort((a, b) => b - a);
      const h = straightHigh(new Set(flushr)); if (h) return mkscore(8, [h]);
    }
    if (quads) return mkscore(7, [quads, Math.max(...allr.filter(x => x !== quads))]);
    if (trips.length >= 1 && (trips.length >= 2 || pairs.length >= 1)) return mkscore(6, [trips[0], Math.max(trips[1] || 0, pairs[0] || 0)]);
    if (fs >= 0) return mkscore(5, flushr.slice(0, 5));
    const h = straightHigh(new Set(allr)); if (h) return mkscore(4, [h]);
    if (trips.length) return mkscore(3, [trips[0]].concat(allr.filter(x => x !== trips[0]).slice(0, 2)));
    if (pairs.length >= 2) return mkscore(2, [pairs[0], pairs[1], Math.max(0, ...allr.filter(x => x !== pairs[0] && x !== pairs[1]))]);
    if (pairs.length === 1) return mkscore(1, [pairs[0]].concat(allr.filter(x => x !== pairs[0]).slice(0, 3)));
    return mkscore(0, allr.slice(0, 5));
  }
  function handName(score) {
    const cat = Math.floor(score / 759375);
    if (cat === 8) return Math.floor(score / 50625) % 15 === 14 ? 'Royal Flush' : 'Straight Flush';
    return ['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind'][cat];
  }

  // ---------------- table ----------------
  function newTable(players, opts) {
    opts = opts || {};
    return {
      code: opts.code || 'DOGS', host_seat: players[0].seat, status: 'lobby', allow_join: false, hand_no: 0,
      button: null, sb_seat: null, bb_seat: null, small_blind: 10, big_blind: 20, start_stack: opts.startStack || 1000,
      street: 'none', deck: [], deck_pos: 0, board: [], cur_bet: 0, min_raise: 20, to_act: null, turn_started: 0,
      log: [], result: null, winner_seat: null, version: 0, match_no: 1,
      rng: opts.rng || Math.random, rig: opts.rig || null,
      seats: players.map(p => ({ seat: p.seat, name: p.name, avatar: p.avatar, bot: p.bot || null, stack: opts.startStack || 1000, hole: [],
        street_bet: 0, total_bet: 0, in_hand: false, folded: false, all_in: false, acted: false, left_room: false, last_seen: 0 })),
    };
  }
  const seatOf = (t, s) => t.seats.find(x => x.seat === s);
  const order = from => (a, b) => ((a.seat - from - 1 + 12) % 6) - ((b.seat - from - 1 + 12) % 6);
  const MODES = {
    eligible: s => !s.left_room && s.stack > 0,
    inhand: s => s.in_hand,
    canact: s => s.in_hand && !s.folded && !s.all_in,
  };
  function nextSeat(t, from, mode) { const l = t.seats.filter(MODES[mode]).sort(order(from)); return l.length ? l[0].seat : null; }
  function put(t, seat, amt) { const s = seatOf(t, seat); s.stack -= amt; s.street_bet += amt; s.total_bet += amt; s.all_in = s.stack === 0; }
  function addlog(t, text) { t.log.push(text); if (t.log.length > 8) t.log = t.log.slice(-8); }
  const bump = t => { t.version++; };

  function finishHand(t) {
    const live = t.seats.filter(s => !s.left_room && s.stack > 0);
    if (live.length <= 1) { t.status = 'match_over'; t.winner_seat = live.length ? Math.min(...live.map(s => s.seat)) : null; }
    else t.status = 'hand_over';
    t.to_act = null;
  }
  function awardUncontested(t) {
    const w = t.seats.find(s => s.in_hand && !s.folded);
    const pot = t.seats.reduce((a, s) => a + s.total_bet, 0);
    w.stack += pot; t.seats.forEach(s => { s.street_bet = 0; });
    t.street = 'done';
    t.result = { uncontested: true, pots: [{ amount: pot, winners: [w.seat], hand: null }], shown: {} };
    addlog(t, w.name + ' wins ' + pot + ' chips');
    finishHand(t);
  }
  function showdown(t) {
    const shown = {};
    t.seats.filter(s => s.in_hand && !s.folded).sort((a, b) => a.seat - b.seat).forEach(s => {
      const sc = eval7(s.hole.concat(t.board));
      shown[s.seat] = { cards: s.hole.slice(), hand: handName(sc), score: sc };
    });
    const total = t.seats.reduce((a, s) => a + s.total_bet, 0);
    const levels = [...new Set(t.seats.filter(s => s.in_hand && !s.folded && s.total_bet > 0).map(s => s.total_bet))].sort((a, b) => a - b);
    const pots = []; let prev = 0, accounted = 0, prevElig = null;
    for (const lvl of levels) {
      const amt = t.seats.reduce((a, s) => a + Math.min(s.total_bet, lvl) - Math.min(s.total_bet, prev), 0);
      const elig = t.seats.filter(s => s.in_hand && !s.folded && s.total_bet >= lvl).map(s => s.seat).sort((a, b) => a - b);
      if (prevElig && prevElig.join() === elig.join()) pots[pots.length - 1].amount += amt;
      else pots.push({ amount: amt, elig });
      prevElig = elig; accounted += amt; prev = lvl;
    }
    if (total > accounted && pots.length) pots[pots.length - 1].amount += total - accounted;
    const out = [];
    for (const p of pots) {
      const best = Math.max(...p.elig.map(e => shown[e].score));
      const winners = p.elig.filter(e => shown[e].score === best).sort((a, b) => ((a - t.button - 1 + 12) % 6) - ((b - t.button - 1 + 12) % 6));
      const share = Math.floor(p.amount / winners.length), rem = p.amount % winners.length;
      winners.forEach((w, i) => { seatOf(t, w).stack += share + (i < rem ? 1 : 0); });
      out.push({ amount: p.amount, winners, elig: p.elig, hand: handName(best) });
    }
    t.seats.forEach(s => { s.street_bet = 0; });
    t.street = 'showdown';
    t.result = { uncontested: false, pots: out, shown };
    addlog(t, 'Showdown!');
    finishHand(t);
  }
  function nextStreet(t) {
    t.seats.forEach(s => { s.street_bet = 0; s.acted = false; });
    if (t.street === 'river') { showdown(t); return; }
    const n = t.street === 'preflop' ? 3 : 1;
    const nxt = t.street === 'preflop' ? 'flop' : t.street === 'flop' ? 'turn' : 'river';
    t.board = t.board.concat(t.deck.slice(t.deck_pos + 1, t.deck_pos + 1 + n));   // burn one, deal n
    t.deck_pos += n + 1;
    t.street = nxt; t.cur_bet = 0; t.min_raise = t.big_blind;
    addlog(t, nxt.charAt(0).toUpperCase() + nxt.slice(1) + '!');
    if (t.seats.filter(MODES.canact).length <= 1) { nextStreet(t); return; }   // everyone else all-in: run it out
    t.to_act = nextSeat(t, t.button, 'canact'); t.turn_started = Date.now();
  }
  function progress(t, from) {
    const active = t.seats.filter(s => s.in_hand && !s.folded);
    if (active.length <= 1) { awardUncontested(t); return; }
    const can = t.seats.filter(MODES.canact);
    if (can.length === 0 || (can.length === 1 && can[0].street_bet >= t.cur_bet)) { nextStreet(t); return; }
    const nx = can.filter(s => !s.acted || s.street_bet < t.cur_bet).sort(order(from));
    if (!nx.length) { nextStreet(t); return; }
    t.to_act = nx[0].seat; t.turn_started = Date.now();
  }
  function startHand(t) {
    const n = t.seats.filter(MODES.eligible).length;
    if (n < 2) { finishHand(t); return; }
    t.seats.forEach(s => { s.in_hand = !s.left_room && s.stack > 0; s.folded = false; s.all_in = false; s.acted = false; s.street_bet = 0; s.total_bet = 0; s.hole = []; });
    const btn = t.button == null ? Math.min(...t.seats.filter(s => s.in_hand).map(s => s.seat)) : nextSeat(t, t.button, 'inhand');
    let sb, bb;
    if (n === 2) { sb = btn; bb = nextSeat(t, btn, 'inhand'); } else { sb = nextSeat(t, btn, 'inhand'); bb = nextSeat(t, sb, 'inhand'); }
    const deck = []; for (let c = 0; c < 52; c++) deck.push(c);
    for (let i = 51; i > 0; i--) { const j = Math.floor(t.rng() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    let pos = 0; const first = nextSeat(t, btn, 'inhand');
    const dealOrder = []; { let s = first; do { dealOrder.push(s); s = nextSeat(t, s, 'inhand'); } while (s !== first); }
    if (t.rig) t.rig(deck, dealOrder, t);    // debug only: arrange the deck
    for (let r = 0; r < 2; r++) dealOrder.forEach(s => { seatOf(t, s).hole.push(deck[pos++]); });
    Object.assign(t, { status: 'playing', hand_no: t.hand_no + 1, button: btn, sb_seat: sb, bb_seat: bb, deck, deck_pos: pos,
      board: [], street: 'preflop', cur_bet: 0, min_raise: t.big_blind, result: null, winner_seat: null, log: [] });
    put(t, sb, Math.min(t.small_blind, seatOf(t, sb).stack));
    put(t, bb, Math.min(t.big_blind, seatOf(t, bb).stack));
    t.cur_bet = Math.max(...t.seats.map(s => s.street_bet));
    addlog(t, 'Hand #' + t.hand_no + ': ' + seatOf(t, sb).name + ' small blind, ' + seatOf(t, bb).name + ' big blind');
    progress(t, bb);
    bump(t);
  }
  function act(t, me, action, amount) {
    if (t.status !== 'playing' || t.to_act !== me) throw new Error('not_your_turn');
    const ms = seatOf(t, me), toCall = t.cur_bet - ms.street_bet, maxto = ms.street_bet + ms.stack;
    let msg;
    if (action === 'fold') { ms.folded = true; msg = 'folds'; }
    else if (action === 'check') { if (toCall > 0) throw new Error('cannot_check'); msg = 'checks'; }
    else if (action === 'call') {
      if (toCall <= 0) msg = 'checks';
      else { const amt = Math.min(toCall, ms.stack); const allin = amt === ms.stack; put(t, me, amt); msg = allin ? 'calls all-in (' + amt + ')' : 'calls ' + amt; }
    } else if (action === 'bet' || action === 'raise' || action === 'allin') {
      let target = action === 'allin' ? maxto : Math.min(amount || 0, maxto);
      if (target <= t.cur_bet) {
        if (target < maxto) throw new Error('raise_too_small');
        const amt = ms.stack; put(t, me, amt); msg = 'calls all-in (' + amt + ')';
      } else {
        if (target < t.cur_bet + t.min_raise && target < maxto) throw new Error('raise_too_small');
        put(t, me, target - (ms.street_bet));
        const prevBet = t.cur_bet;
        if (target - prevBet >= t.min_raise) { t.min_raise = target - prevBet; t.seats.forEach(s => { if (s.seat !== me) s.acted = false; }); }
        t.cur_bet = target;
        msg = target === maxto ? 'goes ALL-IN (' + target + ')' : prevBet === 0 ? 'bets ' + target : 'raises to ' + target;
      }
    } else throw new Error('bad_action');
    ms.acted = true;
    addlog(t, ms.name + ' ' + msg);
    progress(t, me);
    bump(t);
  }
  function rematch(t) {
    t.seats = t.seats.filter(s => !s.left_room);
    t.seats.forEach(s => { s.stack = t.start_stack; s.in_hand = false; });
    t.button = null; t.hand_no = 0; t.winner_seat = null; t.match_no++;
    addlog(t, 'Rematch!');
    startHand(t);
  }
  // exactly what one seat may see (same shape as the server's poker_view): only ITS OWN hole cards,
  // other players' cards only after a showdown (inside result.shown)
  function view(t, me) {
    const ms = seatOf(t, me);
    const pot = t.seats.reduce((a, s) => a + s.total_bet, 0);
    return JSON.parse(JSON.stringify({
      code: t.code, me, match_no: t.match_no, host: t.host_seat, status: t.status, allow_join: t.allow_join, hand_no: t.hand_no,
      button: t.button, sb: t.sb_seat, bb: t.bb_seat, small_blind: t.small_blind, big_blind: t.big_blind,
      street: t.street, board: t.board, pot, cur_bet: t.cur_bet, to_act: t.to_act, turn_age: 0, log: t.log, result: t.result,
      winner: t.winner_seat, version: t.version,
      seats: t.seats.slice().sort((a, b) => a.seat - b.seat).map(s => ({ seat: s.seat, name: s.name, avatar: s.avatar, stack: s.stack, bet: s.street_bet,
        total: s.total_bet, in_hand: s.in_hand, folded: s.folded, all_in: s.all_in, left: s.left_room, away: false,
        busted: s.stack === 0 && !s.in_hand && t.hand_no > 0, has_cards: s.in_hand && !s.folded && t.status !== 'lobby' })),
      my_cards: ms.in_hand ? ms.hole : [],
      to_call: Math.max(0, Math.min(t.cur_bet - ms.street_bet, ms.stack)),
      min_raise_to: Math.min(t.cur_bet + t.min_raise, ms.street_bet + ms.stack),
      max_raise_to: ms.street_bet + ms.stack,
    }));
  }
  root.PokerEngine = { newTable, startHand, act, rematch, view, eval7, handName, rank, suit, seatOf };
})(typeof window !== 'undefined' ? window : globalThis);
