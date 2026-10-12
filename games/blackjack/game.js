/* Bella's Blackjack - Lucas's Arcade game #3. PRETEND CHIPS ONLY.
   You vs Bella the dealer, in her tuxedo at a fancy Las Vegas casino table (neon signs on the wall; bust and you get her famous RBF).
   Rules: 4-deck shoe, Blackjack pays 3 to 2, Bella stands on all 17s (and peeks for Blackjack),
   Hit / Stand / Double (first two cards) / Split (one split; split aces get one card each).
   Chips are saved per player (start 1000, refill button when broke). Best chip total + hands played go on the arcade tile.
   Prize card (pool 'cards'): every 5 hand wins, and the first time you reach 2,500 / 5,000 / 10,000 chips.
   Debug URL flags (skip the login check, nothing is saved):
     ?debug=play   mid-hand (you have 9 + 3 vs Bella's 7)        ?debug=bust  you hit and bust -> Bella's RBF
     ?debug=bj     you get Blackjack                              ?debug=split  a pair of 8s to split
     ?debug=prize  the prize card                                  ?debug=broke  0 chips -> refill button */
(function () {
  'use strict';
  const GAME_ID = 'blackjack';
  const Q = new URLSearchParams(location.search);
  const DEBUG = Q.get('debug');
  const $ = id => document.getElementById(id);
  const sfx = LA.sfx;
  const WINS_PER_PRIZE = 5, MILESTONES = [2500, 5000, 10000], START = 1000, DECKS = 4;
  const wait = ms => new Promise(r => setTimeout(r, DEBUG ? Math.min(ms, 120) : ms));

  // ---------------- saved data ----------------
  const save = (!DEBUG && LA.store.getData(GAME_ID)) || { chips: START, wins: 0, since: 0, milestones: [] };
  if (DEBUG === 'broke') save.chips = 0;
  const persist = () => { if (!DEBUG) LA.store.setData(GAME_ID, save); };

  // ---------------- state ----------------
  const S = { shoe: [], bet: 0, lastBet: 25, hands: [], active: 0, dealer: [], hole: true, phase: 'bet', rig: [] };

  // ---------------- cards ----------------
  const R = LA.cards.rank;
  const val = c => { const r = R(c); return r === 14 ? 11 : Math.min(r, 10); };
  function total(cards) {
    let t = 0, aces = 0;
    cards.forEach(c => { t += val(c); if (R(c) === 14) aces++; });
    while (t > 21 && aces) { t -= 10; aces--; }
    return { t, soft: aces > 0 && t <= 21 };
  }
  const isBJ = h => h.cards.length === 2 && total(h.cards).t === 21 && !h.fromSplit;
  function newShoe() {
    S.shoe = [];
    for (let d = 0; d < DECKS; d++) for (let c = 0; c < 52; c++) S.shoe.push(c);
    for (let i = S.shoe.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [S.shoe[i], S.shoe[j]] = [S.shoe[j], S.shoe[i]]; }
    sfx.shuffle(); say('Shuffling!', 'normal', 900);
  }
  const draw1 = () => (S.rig.length ? S.rig.shift() : S.shoe.pop());

  // ---------------- Bella ----------------
  const bc = $('bella'), bx = bc.getContext('2d');
  let bImgs = null, face = 'normal', faceUntil = 0, tilt = 0;
  PTD.load('bella-dealer').then(i => { bImgs = i; });
  LA.casino.wall($('wall'), { slots: 2, start: DEBUG ? 'aer' : null });
  function drawBella(t) {
    bx.clearRect(0, 0, 400, 330);
    if (!bImgs) return;
    if (faceUntil && t > faceUntil) { face = 'normal'; faceUntil = 0; }
    bx.save(); bx.translate(0, -50);
    const p = PTD.pose('sit', { headRot: Math.sin(t / 900) * 0.04 + tilt, wag: 0.4 });
    PTD.draw(bx, 'bella-dealer', bImgs, p, { face, time: t / 1000 });
    bx.restore();
  }
  function frame(t) { drawBella(t); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);

  let bubbleT = 0;
  function say(text, f, ms) {
    const b = $('bubble'); b.textContent = text; b.classList.remove('hidden');
    b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
    clearTimeout(bubbleT); if (ms) bubbleT = setTimeout(() => b.classList.add('hidden'), ms);
    if (f) { face = f; faceUntil = ms ? performance.now() + Math.max(ms, 1600) : 0; }
  }

  // ---------------- rendering ----------------
  function setBank() { $('bankNum').textContent = save.chips.toLocaleString(); const b = $('bank'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
  function chipStack(amount) {
    const box = $('betChips'); box.innerHTML = '';
    const out = []; let a = amount;
    [500, 100, 25, 10].forEach(v => { while (a >= v && out.length < 10) { out.push(v); a -= v; } });
    out.reverse().forEach((v, i) => { const d = document.createElement('div'); d.className = 'stackchip s' + v; d.style.top = (20 - i * 4) + 'px'; box.appendChild(d); });
    $('betNum').textContent = 'Bet ' + amount.toLocaleString();
  }
  function renderTrack() {
    let h = '<span>Prize in</span>';
    for (let i = 0; i < WINS_PER_PRIZE; i++) h += '<span class="dot' + (i < save.since ? ' on' : '') + '"></span>';
    h += '<span>wins</span>'; $('prizeTrack').innerHTML = h;
  }
  function addCard(handEl, c, faceDown) {
    const el = LA.cards.el(faceDown ? null : c, { deal: LA.cards.from(handEl, $('shoe')) });
    handEl.appendChild(el); sfx.card(); return el;
  }
  function showTotal(el, cards, extra) {
    const { t, soft } = total(cards);
    el.classList.remove('hidden', 'bust', 'bj');
    if (t > 21) { el.textContent = 'BUST'; el.classList.add('bust'); }
    else if (extra === 'bj') { el.textContent = '21!'; el.classList.add('bj'); }
    else el.textContent = (soft && t < 21 ? t - 10 + '/' : '') + t;
  }
  function buildPlayerHands() {
    const row = $('playerRow'); row.innerHTML = ''; row.classList.toggle('split', S.hands.length > 1);
    S.hands.forEach((h, i) => {
      const w = document.createElement('div'); w.className = 'pHand'; w.id = 'ph' + i;
      w.innerHTML = '<div class="hand"></div><div class="info"><div class="total hidden"></div><div class="hbet">' + h.bet + '</div></div>';
      row.appendChild(w); h.el = w; h.handEl = w.querySelector('.hand'); h.totEl = w.querySelector('.total');
      h.cards.forEach(c => h.handEl.appendChild(LA.cards.el(c)));
      if (h.cards.length) showTotal(h.totEl, h.cards);
    });
  }
  function highlight() { S.hands.forEach((h, i) => h.el.classList.toggle('active', S.phase === 'play' && i === S.active && S.hands.length > 1)); }
  function tag(h, cls, text) { const t = document.createElement('div'); t.className = 'tag ' + cls; t.textContent = text; h.el.appendChild(t); }

  function controls() {
    $('betControls').classList.toggle('hidden', S.phase !== 'bet');
    $('playControls').classList.toggle('hidden', S.phase !== 'play');
    $('doneControls').classList.toggle('hidden', S.phase !== 'done');
    if (S.phase === 'bet') {
      document.querySelectorAll('.chipbtn').forEach(b => { b.disabled = +b.dataset.v > save.chips; });
      $('dealBtn').disabled = S.bet <= 0; $('clearBtn').disabled = S.bet <= 0;
      const broke = save.chips + S.bet < 10;
      $('refillBtn').classList.toggle('hidden', !broke);
      document.querySelector('#betControls .chips').classList.toggle('hidden', broke);
      document.querySelector('#betControls .row').classList.toggle('hidden', broke);
    }
    if (S.phase === 'play') {
      const h = S.hands[S.active];
      $('doubleBtn').disabled = !(h.cards.length === 2 && save.chips >= h.bet);
      $('splitBtn').disabled = !(S.hands.length === 1 && h.cards.length === 2 && val(h.cards[0]) === val(h.cards[1]) && save.chips >= h.bet);
    }
  }

  // ---------------- betting ----------------
  function addBet(v) {
    if (S.phase !== 'bet' || v > save.chips) return;
    save.chips -= v; S.bet += v; sfx.chip(2); setBank(); chipStack(S.bet); controls();
  }
  function clearBet() { if (S.phase !== 'bet') return; save.chips += S.bet; S.bet = 0; sfx.chip(3); setBank(); chipStack(0); controls(); }
  function refill() {
    save.chips = START; persist(); sfx.bonus(); setBank(); say('Here are 1000 more chips. Good luck!', 'happy', 2200); controls();
  }

  // ---------------- a hand ----------------
  async function deal() {
    if (S.phase !== 'bet' || S.bet <= 0) return;
    if (S.shoe.length < 52 * DECKS * 0.25) { newShoe(); await wait(700); }
    S.lastBet = S.bet; persist();
    S.phase = 'deal'; controls();
    $('bubble').classList.add('hidden'); face = 'normal';
    S.hands = [{ cards: [], bet: S.bet, done: false }]; S.active = 0; S.dealer = []; S.hole = true;
    $('dealerHand').innerHTML = ''; $('dealerTotal').classList.add('hidden');
    buildPlayerHands(); chipStack(S.bet);
    const h = S.hands[0];
    for (let i = 0; i < 2; i++) {
      const c = draw1(); h.cards.push(c); addCard(h.handEl, c); await wait(330);
      const d = draw1(); S.dealer.push(d); addCard($('dealerHand'), d, i === 1); await wait(330);
    }
    showTotal(h.totEl, h.cards);
    const up = S.dealer[0];
    // Bella peeks when she shows an ace or a ten
    if (val(up) >= 10 && total(S.dealer).t === 21) { say('Ooh, I peeked...', 'normal', 1200); await wait(900); return finish(); }
    if (isBJ(h)) return finish();
    S.phase = 'play'; controls(); highlight();
  }
  async function hit() {
    if (S.phase !== 'play') return;
    const h = S.hands[S.active]; S.phase = 'busy';
    const c = draw1(); h.cards.push(c); addCard(h.handEl, c); await wait(300);
    showTotal(h.totEl, h.cards);
    const t = total(h.cards).t;
    if (t > 21) {
      h.done = true; h.bust = true;
      sfx.womp(); say('Bust.', 'miss', 2600); tag(h, 'lose', 'BUST!');     // the RBF
      await wait(700); return nextHand();
    }
    if (t === 21) { h.done = true; await wait(250); return nextHand(); }
    S.phase = 'play'; controls();
  }
  function stand() { if (S.phase !== 'play') return; S.hands[S.active].done = true; sfx.click(); nextHand(); }
  async function double() {
    if (S.phase !== 'play') return;
    const h = S.hands[S.active]; if (h.cards.length !== 2 || save.chips < h.bet) return;
    save.chips -= h.bet; h.bet *= 2; h.doubled = true; setBank(); sfx.chip(4);
    h.el.querySelector('.hbet').textContent = h.bet; chipStack(S.hands.reduce((a, x) => a + x.bet, 0));
    say('Double down!', 'normal', 1100);
    S.phase = 'play'; await hit();
    if (S.phase === 'play') { S.hands[S.active].done = true; nextHand(); }
  }
  async function split() {
    if (S.phase !== 'play') return;
    const h = S.hands[0]; if (S.hands.length !== 1 || h.cards.length !== 2 || val(h.cards[0]) !== val(h.cards[1]) || save.chips < h.bet) return;
    save.chips -= h.bet; setBank(); sfx.chip(4); S.phase = 'busy';
    const aces = R(h.cards[0]) === 14;
    S.hands = [{ cards: [h.cards[0]], bet: h.bet, fromSplit: true }, { cards: [h.cards[1]], bet: h.bet, fromSplit: true }];
    buildPlayerHands(); chipStack(h.bet * 2);
    for (const x of S.hands) { await wait(250); const c = draw1(); x.cards.push(c); addCard(x.handEl, c); showTotal(x.totEl, x.cards); }
    if (aces) { S.hands.forEach(x => { x.done = true; }); say('Split aces get one card each!', 'normal', 1600); await wait(600); return dealerTurn(); }
    S.active = 0; S.phase = 'play'; controls(); highlight();
    if (total(S.hands[0].cards).t === 21) { S.hands[0].done = true; nextHand(); }
  }
  function nextHand() {
    while (S.active < S.hands.length && S.hands[S.active].done) S.active++;
    if (S.active < S.hands.length) {
      S.phase = 'play'; controls(); highlight();
      if (total(S.hands[S.active].cards).t === 21) { S.hands[S.active].done = true; return nextHand(); }
      return;
    }
    S.active = S.hands.length - 1;
    dealerTurn();
  }
  async function revealHole() {
    if (!S.hole) return;
    S.hole = false;
    const el = $('dealerHand').children[1];
    const n = LA.cards.el(S.dealer[1], { flip: true }); el.replaceWith(n); sfx.flip();
    showTotal($('dealerTotal'), S.dealer, S.dealer.length === 2 && total(S.dealer).t === 21 ? 'bj' : null);
    await wait(450);
  }
  async function dealerTurn() {
    S.phase = 'dealer'; controls(); highlight();
    await revealHole();
    const live = S.hands.some(h => !h.bust);
    if (live) {
      while (total(S.dealer).t < 17) {        // Bella stands on ALL 17s
        const c = draw1(); S.dealer.push(c); addCard($('dealerHand'), c); await wait(420);
        showTotal($('dealerTotal'), S.dealer);
      }
    }
    finish();
  }
  async function finish() {
    await revealHole();
    S.phase = 'busy';
    const dt = total(S.dealer).t, dBJ = S.dealer.length === 2 && dt === 21;
    let paid = 0, wins = 0, losses = 0, pushes = 0, bj = false;
    S.hands.forEach(h => {
      const pt = total(h.cards).t, pBJ = isBJ(h);
      let res;
      if (h.bust) res = 'lose';
      else if (pBJ && !dBJ) { res = 'bj'; bj = true; }
      else if (dBJ && !pBJ) res = 'lose';
      else if (dt > 21 || pt > dt) res = 'win';
      else if (pt === dt) res = 'push';
      else res = 'lose';
      if (res === 'bj') { paid += Math.floor(h.bet * 2.5); wins++; tag(h, 'bj', 'BLACKJACK!'); h.handEl.querySelectorAll('.pcard').forEach(c => c.classList.add('win')); }
      else if (res === 'win') { paid += h.bet * 2; wins++; tag(h, 'win', 'WIN +' + h.bet); h.handEl.querySelectorAll('.pcard').forEach(c => c.classList.add('win')); }
      else if (res === 'push') { paid += h.bet; pushes++; tag(h, 'push', 'PUSH'); }
      else { losses++; if (!h.bust) tag(h, 'lose', 'LOSE'); }
    });
    // Bella's reaction
    if (bj) { sfx.fanfare(); say('Blackjack! Pays 3 to 2!', 'happy', 2600); }
    else if (wins && dt > 21) { sfx.win(); sfx.bark(1.35, 0, 2); say('Oops, I busted! You win!', 'bark', 2400); }
    else if (wins) { sfx.win(); sfx.bark(1.35, 0, 1); say('You win! Good hand!', 'bark', 2200); }
    else if (pushes && !losses) { say('Push - nobody wins.', 'normal', 2000); }
    else if (S.hands.every(h => h.bust)) { /* RBF already showing */ }
    else { sfx.womp(); say(dBJ ? 'Dealer Blackjack!' : 'Dealer wins!', 'happy', 2200); }
    save.chips += paid;
    if (paid) { sfx.chip(5); setBank(); }
    S.bet = 0; chipStack(0);
    // stats + prizes
    save.wins += wins; save.since += wins;
    let prizeWhy = null;
    if (save.since >= WINS_PER_PRIZE) { save.since -= WINS_PER_PRIZE; prizeWhy = WINS_PER_PRIZE + ' hand wins!'; }
    const ms = MILESTONES.find(m => save.chips >= m && !save.milestones.includes(m));
    if (ms) { save.milestones.push(ms); prizeWhy = prizeWhy || ms.toLocaleString() + ' chips!'; }
    persist();
    if (!DEBUG) LA.store.recordResult(GAME_ID, { score: save.chips });
    renderTrack();
    S.phase = 'done'; controls();
    if (prizeWhy) setTimeout(() => showPrize(prizeWhy), 1300);
  }
  function again() {
    $('dealerHand').innerHTML = ''; $('dealerTotal').classList.add('hidden');
    S.hands = []; buildPlayerHands();
    S.phase = 'bet';
    // same bet as last time, if you can afford it
    if (S.lastBet && save.chips >= S.lastBet) { save.chips -= S.lastBet; S.bet = S.lastBet; setBank(); }
    chipStack(S.bet); controls(); face = 'normal';
  }

  // ---------------- prize ----------------
  function showPrize(why, debugNoSave) {
    const prize = (DEBUG && LA.prizes.get(Q.get('prize'))) || LA.prizes.random('cards');
    if (!debugNoSave && !DEBUG) LA.store.addTrophy(prize.id, GAME_ID, { chips: save.chips });
    $('prizeTitle').textContent = why;
    $('prizeArt').innerHTML = prize.svg; $('prizeName').textContent = prize.name; $('prizeMsg').innerHTML = '&nbsp;';
    $('card').classList.remove('flipped'); $('screen-prize').classList.remove('hidden');
    setTimeout(() => {
      $('card').classList.add('flipped'); sfx.fanfare();
      const a = /s$/.test(prize.name) ? 'some' : /^[aeiou]/i.test(prize.name) ? 'an' : 'a';
      $('prizeMsg').textContent = 'You won ' + a + ' ' + prize.name + '! It\u2019s on your Trophy Shelf.';
    }, DEBUG === 'prize' ? 50 : 700);
    window.__lastPrize = prize.id;
  }

  // ---------------- wiring ----------------
  function setMuteIcon() {
    $('muteBtn').innerHTML = sfx.isMuted()
      ? '<svg viewBox="0 0 24 24"><path d="M4 9 H8 L13 4 V20 L8 15 H4 Z" fill="currentColor"/><path d="M16 9 L21 14 M21 9 L16 14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M4 9 H8 L13 4 V20 L8 15 H4 Z" fill="currentColor"/><path d="M16 8 Q19 12 16 16 M18 5 Q23 12 18 19" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>';
  }
  document.querySelectorAll('.chipbtn').forEach(b => b.addEventListener('click', () => addBet(+b.dataset.v)));
  $('clearBtn').onclick = clearBet; $('dealBtn').onclick = deal; $('refillBtn').onclick = refill;
  $('hitBtn').onclick = hit; $('standBtn').onclick = stand; $('doubleBtn').onclick = double; $('splitBtn').onclick = split;
  $('againBtn').onclick = again;
  $('keepBtn').onclick = () => { $('screen-prize').classList.add('hidden'); sfx.click(); };
  $('muteBtn').onclick = () => { sfx.toggleMute(); setMuteIcon(); };

  function init() {
    setMuteIcon(); newShoe(); $('bubble').classList.add('hidden');
    setBank(); renderTrack();
    if (save.chips >= S.lastBet) { save.chips -= S.lastBet; S.bet = S.lastBet; }
    setBank(); chipStack(S.bet); controls();
    say(save.chips + S.bet < 10 ? 'Out of chips? Tap refill!' : 'Place your bet!', 'normal', 2200);
    if (DEBUG) debugStart();
  }
  // debug setups (cards dealt in order: you, Bella, you, Bella(hole), then hits)
  const C = (r, s) => (r - 2) * 4 + (s || 0);   // r: 2..14, s: 0 clubs 1 diamonds 2 hearts 3 spades
  async function debugStart() {
    await wait(300);
    if (DEBUG === 'play') { S.rig = [C(9, 2), C(7, 3), C(3, 1), C(10, 0)]; await deal(); }
    if (DEBUG === 'bust') { S.rig = [C(10, 3), C(7, 2), C(6, 1), C(12, 0), C(13, 2)]; await deal(); await wait(300); await hit(); }
    if (DEBUG === 'bj') { S.rig = [C(14, 3), C(9, 2), C(13, 3), C(7, 0)]; await deal(); }
    if (DEBUG === 'split') { S.rig = [C(8, 3), C(10, 2), C(8, 1), C(6, 0), C(3, 2), C(13, 1)]; await deal(); }
    if (DEBUG === 'prize') showPrize('5 hand wins!', true);
    window.__ready = true;
  }
  window.__bj = { S, save, hit, stand, deal, double, split, again, addBet, total };

  if (!DEBUG && !LA.players.current()) { location.replace('../../index.html'); return; }
  init();
})();
