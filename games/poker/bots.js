/* Poker Table - the DOG opponents for "Play vs Dogs" (offline, single player). PRETEND CHIPS ONLY.
   FAIR PLAY: a dog decides from PokerEngine.view(table, itsSeat) only - the exact same view a human phone
   gets: its own two cards, the board, stacks and bets. It never sees your cards or the deck.
   Brain: preflop hand chart (Chen points) -> postflop Monte Carlo equity vs the dogs/players still in ->
   pot odds -> personality (tight / loose / bluffy / sleepy) -> a little randomness (more for Puppy). */
(function (root) {
  'use strict';
  const E = root.PokerEngine;
  const rank = c => Math.floor(c / 4) + 2, suit = c => c % 4;

  // ---------------- the dogs ----------------
  //  loose: plays more hands   aggr: bets/raises more   bluff: bets with nothing   sleepy: just checks/calls sometimes
  //  wild: chance of a random all-in   voice: bark pitch/gruff (LA.sfx.bark)
  const DOGS = {
    bella:   { name: 'Bella',   loose: -0.35, aggr: 0.0,  bluff: 0.03, sleepy: 0,    wild: 0,     voice: [1.35, 0],   blurb: 'Tight and careful. Fold = RBF.' },
    marley:  { name: 'Marley',  loose: 0.45,  aggr: 0.35, bluff: 0.28, sleepy: 0,    wild: 0.004, voice: [0.72, 0.8], blurb: 'Loose goofball in her #4 jersey. Loves to bluff.' },
    gorda:   { name: 'Gorda',   loose: 0.05,  aggr: -0.1, bluff: 0.05, sleepy: 0.3,  wild: 0.03,  voice: [0.6, 1],    blurb: 'Sleepy... snores and checks. Sometimes goes ALL-IN!' },
    biscuit: { name: 'Biscuit', loose: 0.0,   aggr: 0.15, bluff: 0.08, sleepy: 0,    wild: 0,     voice: [1.05, 0.3], blurb: "The neighbor's golden dog. Solid player." },
    waffles: { name: 'Waffles', loose: 0.3,   aggr: 0.6,  bluff: 0.18, sleepy: 0,    wild: 0.012, voice: [1.6, 0.1],  blurb: 'Tiny corgi, HUGE bets. Zoom zoom!' },
  };
  const ORDER = ['bella', 'marley', 'gorda', 'biscuit', 'waffles'];
  const LEVELS = {
    puppy: { name: 'Puppy',    sims: 60,  noise: 0.16, goof: 0.14, odds: 0.4 },   // easy: random-ish, ignores pot odds a lot
    good:  { name: 'Good Dog', sims: 160, noise: 0.07, goof: 0.04, odds: 0.8 },
    top:   { name: 'Top Dog',  sims: 400, noise: 0.025, goof: 0,  odds: 1 },      // hard: careful pot odds, value bets
  };

  const SAY = {
    bella:   { fold: ['I fold.', 'Nope.', '*RBF*'], check: ['Check.'], call: ['Fine. Call.', 'Call.'], bet: ['Bet.', 'I bet.'], raise: ['Raise.', 'Raise!'], allin: ['All-in.'], win: ['Obviously.'], lose: ['...', '*RBF*'] },
    marley:  { fold: ['Aww, fold.', 'Fold! *slurp*'], check: ['Check!', 'Checky check!'], call: ['Call! Woof!', 'I call!'], bet: ['Bet! Hehe', 'Woof! Bet!'], raise: ['Raise!', 'RAISE! Woof!'], allin: ['ALL IN!! WOOF!'], win: ['*SLOBBER*', 'Woof woof!'], lose: ['Aww...'] },
    gorda:   { fold: ['zzz... fold', 'I fold.'], check: ['zzz...', 'Check... zzz'], snore: ['ZZzzz...', '*snore*'], call: ['...call', 'Mmm. Call.'], bet: ['Bet.'], raise: ['Raise!'], allin: ['*WAKES UP* ALL IN!!'], win: ['*happy snort*'], lose: ['zzz'] },
    biscuit: { fold: ['I fold.'], check: ['Check.'], call: ['Call.'], bet: ['Bet!', 'woof'], raise: ['Raise!'], allin: ['All-in!'], win: ['Good game!'], lose: ['Ruff luck.'] },
    waffles: { fold: ['Fine, fold.'], check: ['Check!'], call: ['Call!'], bet: ['BIG BET!', 'Yip! Bet!'], raise: ['RAISE! Yip!', 'Raise!!'], allin: ['ZOOMIES ALL-IN!'], win: ['Yip yip yip!'], lose: ['*grumble*'] },
  };
  const pick = (a, rng) => a[Math.floor(rng() * a.length)];

  // ---------------- preflop chart (Chen points, -1..20) ----------------
  function chen(h) {
    const [a, b] = h.map(rank).sort((x, y) => y - x);
    const base = { 14: 10, 13: 8, 12: 7, 11: 6 };
    let p = base[a] || a / 2;
    if (a === b) p = Math.max(5, p * 2);
    if (suit(h[0]) === suit(h[1])) p += 2;
    const gap = a - b - 1;
    if (a !== b) { p -= gap <= 0 ? 0 : gap === 1 ? 1 : gap === 2 ? 2 : gap === 3 ? 4 : 5; if (gap <= 1 && a < 12) p += 1; }
    return Math.ceil(p);
  }

  // ---------------- Monte Carlo equity: my share of the pot vs nOpp random hands ----------------
  function equity(hole, board, nOpp, sims, rng) {
    const used = new Set(hole.concat(board)); const rest = [];
    for (let c = 0; c < 52; c++) if (!used.has(c)) rest.push(c);
    const need = 2 * nOpp + (5 - board.length); let tot = 0;
    for (let s = 0; s < sims; s++) {
      for (let i = 0; i < need; i++) { const j = i + Math.floor(rng() * (rest.length - i)); const x = rest[i]; rest[i] = rest[j]; rest[j] = x; }
      const bd = board.concat(rest.slice(2 * nOpp, need));
      const me = E.eval7(hole.concat(bd)); let best = 0, ties = 0;
      for (let o = 0; o < nOpp; o++) { const sc = E.eval7([rest[2 * o], rest[2 * o + 1]].concat(bd)); if (sc > best) { best = sc; ties = 0; } if (sc === best) ties++; }
      if (me > best) tot += 1; else if (me === best) tot += 1 / (ties + 1);
    }
    return tot / sims;
  }

  // ---------------- decide: ONLY uses the bot's own view ----------------
  // returns { action, amount, say, face, mood }
  function decide(v, dogId, levelId, rng) {
    rng = rng || Math.random;
    const D = DOGS[dogId] || DOGS.biscuit, L = LEVELS[levelId] || LEVELS.good, S = SAY[dogId] || SAY.biscuit;
    const me = v.seats.find(s => s.seat === v.me);
    const hole = v.my_cards, board = v.board, toCall = v.to_call, pot = v.pot;
    const nOpp = Math.max(1, v.seats.filter(s => s.seat !== v.me && s.in_hand && !s.folded).length);
    const canRaise = v.max_raise_to > v.cur_bet && me.stack > toCall;
    const bb = v.big_blind;
    const out = (action, amount, mood) => {
      let say = pick(S[mood || action] || S[action] || ['woof'], rng);
      if (rng() < 0.12 && mood !== 'snore') say = 'woof';
      return { action, amount: amount == null ? null : amount, say, mood: mood || action,
        face: action === 'fold' ? (dogId === 'bella' ? 'miss' : 'sad') : action === 'allin' || mood === 'raise' || mood === 'bet' ? 'bark' : mood === 'snore' ? 'sleep' : 'normal' };
    };
    const passive = () => toCall === 0 ? out('check') : out('fold');
    const raiseTo = frac => {   // raise/bet sized as a fraction of the pot, rounded to 10s
      let t = v.cur_bet + Math.max(v.min_raise_to - v.cur_bet, Math.round(((pot + toCall) * frac) / 10) * 10);
      t = Math.max(v.min_raise_to, Math.min(v.max_raise_to, t));
      if (t >= v.max_raise_to || v.max_raise_to - t < bb) return out('allin');
      return out(v.cur_bet === 0 ? 'bet' : 'raise', t);
    };

    // Gorda: wild all-in, or dozing off
    if (D.wild && rng() < D.wild) return out('allin');
    if (D.sleepy && rng() < D.sleepy) {
      if (toCall === 0) return out('check', null, 'snore');
      if (toCall <= bb * 2 || rng() < 0.35) return out('call', null, 'call');
      return out('fold');
    }
    // Puppy goofs: a random legal move now and then
    if (L.goof && rng() < L.goof) {
      const r = rng();
      if (r < 0.45) return toCall === 0 ? out('check') : out('call');
      if (r < 0.75 || !canRaise) return passive();
      return raiseTo(0.5 + rng());
    }

    const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;
    const fair = 1 / (nOpp + 1);
    const noise = (rng() * 2 - 1) * L.noise;

    if (v.street === 'preflop') {
      const c = chen(hole) + noise * 10;
      const playAt = 6.5 - D.loose * 6 + (nOpp >= 3 ? 0.5 : 0);   // Bella ~8.6, Marley ~3.8
      const raiseAt = 9.5 - D.aggr * 3;
      const bigBet = toCall > Math.max(bb * 6, me.stack * 0.25);
      if (c >= 12 && canRaise) return rng() < 0.5 + D.aggr * 0.3 ? raiseTo(toCall > bb ? 1 : 0.8) : out('call');
      if (c >= raiseAt && canRaise && !bigBet) return raiseTo(0.6 + rng() * 0.5);
      if (c >= playAt && (!bigBet || c >= raiseAt + 1)) return out('call');
      if (toCall === 0) return D.bluff > 0.1 && canRaise && rng() < D.bluff * 0.6 ? raiseTo(0.6) : out('check');
      if (toCall <= bb / 2 && c >= playAt - 2) return out('call');                 // cheap small-blind complete
      if (D.bluff > 0.2 && !bigBet && rng() < D.bluff * 0.5) return out('call'); // Marley just likes to play
      return out('fold');
    }

    const eq = Math.max(0, Math.min(1, equity(hole, board, nOpp, L.sims, rng) + noise));
    const strong = Math.max(0.55, fair * 1.9) - D.aggr * 0.08;
    const good = Math.max(0.4, fair * 1.35) - D.aggr * 0.05 - D.loose * 0.04;
    if (toCall === 0) {
      if (canRaise && eq > strong) return raiseTo(0.55 + rng() * 0.4 + D.aggr * 0.3);
      if (canRaise && eq > good && rng() < 0.45 + D.aggr * 0.4) return raiseTo(0.4 + rng() * 0.3);
      if (canRaise && rng() < D.bluff * (v.street === 'river' ? 0.7 : 1)) return raiseTo(0.5 + rng() * 0.5);
      return out('check');
    }
    // facing a bet
    const need = potOdds * L.odds + (1 - L.odds) * 0.3 + 0.03 - D.loose * 0.08;   // looser dogs call lighter
    if (canRaise && eq > strong + 0.08 && rng() < 0.55 + D.aggr * 0.3) return raiseTo(0.7 + rng() * 0.5);
    if (eq > need || (toCall >= me.stack && eq > need + 0.05)) return out('call');
    if (canRaise && rng() < D.bluff * 0.25) return raiseTo(0.8);   // a cheeky bluff-raise
    return out('fold');
  }

  // ---------------- portraits (round avatar faces) ----------------
  // Bella + Marley use the real Pop-the-Dog art (Marley wears her #4 jersey); the others are drawn here.
  const FRAME = (bg, inner) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="' + bg + '"/>' + inner + '</svg>';
  function eyesSVG(face, lx, rx, y, r) {
    if (face === 'happy') return '<path d="M' + (lx - 6) + ' ' + y + ' Q' + lx + ' ' + (y - 7) + ' ' + (lx + 6) + ' ' + y + ' M' + (rx - 6) + ' ' + y + ' Q' + rx + ' ' + (y - 7) + ' ' + (rx + 6) + ' ' + y + '" stroke="#1a110b" stroke-width="3" fill="none" stroke-linecap="round"/>';
    if (face === 'sleep') return '<path d="M' + (lx - 6) + ' ' + y + ' Q' + lx + ' ' + (y + 5) + ' ' + (lx + 6) + ' ' + y + ' M' + (rx - 6) + ' ' + y + ' Q' + rx + ' ' + (y + 5) + ' ' + (rx + 6) + ' ' + y + '" stroke="#1a110b" stroke-width="3" fill="none" stroke-linecap="round"/>';
    let s = '<circle cx="' + lx + '" cy="' + y + '" r="' + (r + 2) + '" fill="#fff"/><circle cx="' + rx + '" cy="' + y + '" r="' + (r + 2) + '" fill="#fff"/>' +
      '<circle cx="' + lx + '" cy="' + (y + 1) + '" r="' + r + '" fill="#1a110b"/><circle cx="' + rx + '" cy="' + (y + 1) + '" r="' + r + '" fill="#1a110b"/>' +
      '<circle cx="' + (lx + 1.5) + '" cy="' + (y - 1) + '" r="1.4" fill="#fff"/><circle cx="' + (rx + 1.5) + '" cy="' + (y - 1) + '" r="1.4" fill="#fff"/>';
    if (face === 'sad' || face === 'miss') s += '<path d="M' + (lx - 7) + ' ' + (y - 9) + ' L' + (lx + 5) + ' ' + (y - 6) + ' M' + (rx + 7) + ' ' + (y - 9) + ' L' + (rx - 5) + ' ' + (y - 6) + '" stroke="#1a110b" stroke-width="2.5" stroke-linecap="round"/>';
    return s;
  }
  const mouthSVG = (face, y) => face === 'happy' || face === 'bark'
    ? '<path d="M42 ' + y + ' Q50 ' + (y + (face === 'bark' ? 16 : 12)) + ' 58 ' + y + ' Z" fill="' + (face === 'bark' ? '#3d2a22' : '#ff7f93') + '" stroke="#5b4636" stroke-width="1.5"/>'
    : face === 'sad' || face === 'miss' ? '<path d="M43 ' + (y + 5) + ' Q50 ' + (y - 1) + ' 57 ' + (y + 5) + '" stroke="#5b4636" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
    : '<path d="M43 ' + y + ' Q50 ' + (y + 5) + ' 57 ' + y + '" stroke="#5b4636" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
  const DRAWN = {
    gorda: face => FRAME('#f7b2c4',
      '<defs><pattern id="b" width="8" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(18)"><rect width="8" height="30" fill="#4a3426"/><rect x="1" width="2" height="30" fill="#34241a"/></pattern></defs>' +
      '<rect x="24" y="80" width="52" height="9" rx="4" fill="#e0436b"/>' +
      '<ellipse cx="50" cy="54" rx="34" ry="30" fill="url(#b)" stroke="#20150e" stroke-width="2"/>' +
      '<path d="M20 36 Q4 34 8 58 Q14 60 22 50 Z M80 36 Q96 34 92 58 Q86 60 78 50 Z" fill="#2b1c13"/>' +
      '<path d="M46 26 Q50 24 54 26 L57 52 Q72 60 68 72 Q50 82 32 72 Q28 60 43 52 Z" fill="#fbf6ee"/>' +
      eyesSVG(face, 37, 63, 48, 4) + '<ellipse cx="50" cy="60" rx="8" ry="5" fill="#1d130d"/>' + mouthSVG(face, 68) +
      (face === 'sleep' ? '<text x="74" y="22" font-size="16" font-weight="bold" fill="#5a2d91" font-family="sans-serif">z</text>' : '')),
    biscuit: face => FRAME('#8fd3ff',
      '<rect x="26" y="82" width="48" height="9" rx="4" fill="#2f7de1"/>' +
      '<ellipse cx="50" cy="54" rx="32" ry="30" fill="#e0a245" stroke="#a8701e" stroke-width="2"/>' +
      '<path d="M22 32 Q6 40 12 66 Q20 70 26 58 Z M78 32 Q94 40 88 66 Q80 70 74 58 Z" fill="#c98a2e" stroke="#a8701e" stroke-width="1.5"/>' +
      '<ellipse cx="50" cy="66" rx="17" ry="12" fill="#f3d08a"/>' +
      eyesSVG(face, 38, 62, 48, 4) + '<ellipse cx="50" cy="60" rx="7" ry="5" fill="#1d130d"/>' + mouthSVG(face, 68)),
    waffles: face => FRAME('#ffd66b',
      '<path d="M30 80 L50 94 L70 80 Z" fill="#e53935"/>' +
      '<path d="M18 40 L22 6 L42 30 Z M82 40 L78 6 L58 30 Z" fill="#e8893a" stroke="#a85a1c" stroke-width="2"/>' +
      '<path d="M24 34 L26 16 L36 30 Z M76 34 L74 16 L64 30 Z" fill="#ffc9b0"/>' +
      '<ellipse cx="50" cy="54" rx="32" ry="28" fill="#e8893a" stroke="#a85a1c" stroke-width="2"/>' +
      '<path d="M46 30 Q50 28 54 30 L58 52 Q72 58 70 70 Q50 82 30 70 Q28 58 42 52 Z" fill="#fff8ef"/>' +
      eyesSVG(face, 37, 63, 46, 4) + '<ellipse cx="50" cy="60" rx="7" ry="5" fill="#1d130d"/>' + mouthSVG(face, 67)),
  };
  function ptdPortrait(id, face) {
    const P = root.PTD && PTD.DOGS && PTD.DOGS[id]; if (!P) return null;
    const f = face === 'sad' ? 'miss' : face === 'sleep' ? 'normal' : face;
    const outfit = P.outfit && PTD.OUTFITS && PTD.OUTFITS[P.outfit];
    const body = '<g>' + P.parts.body.svg + '</g>' + (outfit ? outfit.svg(id) : '');
    const box = id === 'marley' ? '62 70 276 276' : '72 48 256 256';   // zoomed on the face (Marley: + top of her #4 jersey)
    const bg = id === 'marley' ? '#ffcf8a' : '#d6c6ff';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + box + '"><rect x="-50" y="-50" width="500" height="500" fill="' + bg + '"/>' +
      body + P.headSvg(!!outfit) + P.face(f) + '</svg>';
  }
  const pcache = {};
  function portraitURL(id, face) {
    const k = id + ':' + (face || 'normal');
    if (!pcache[k]) {
      const s = DRAWN[id] ? DRAWN[id](face || 'normal') : ptdPortrait(id, face || 'normal') || DRAWN.biscuit(face);
      pcache[k] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
    }
    return pcache[k];
  }
  const avatarHTML = (id, face) => '<span class="avatar dog-av"><img src="' + portraitURL(id, face) + '" alt="' + ((DOGS[id] || {}).name || 'dog') + '"></span>';

  root.PokerBots = { DOGS, ORDER, LEVELS, SAY, decide, equity, chen, avatarHTML, portraitURL };
})(typeof window !== 'undefined' ? window : globalThis);
