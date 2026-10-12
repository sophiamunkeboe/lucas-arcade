// Checks games/poker/engine.js (offline "Play vs Dogs" rules) against the multiplayer server rules (supabase/poker.sql).
//   node tools/poker-parity.mjs hands > /tmp/hands.sql   -> SQL that scores the same random hands with poker.eval7
//   node tools/poker-parity.mjs check /tmp/sql-scores.json -> compare those scores with the JS evaluator
//   node tools/poker-parity.mjs sim                       -> side-pot replay + thousands of random hands (invariants)
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('../games/poker/engine.js');
const E = globalThis.PokerEngine;
let seed = 12345; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
function hands(n) {
  const out = [];
  for (let i = 0; i < n; i++) { const d = [...Array(52).keys()]; for (let k = 51; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [d[k], d[j]] = [d[j], d[k]]; } out.push(d.slice(0, 7)); }
  // plus some rare categories
  out.push([48, 44, 40, 36, 32, 0, 5], [48, 0, 4, 8, 12, 30, 31], [0, 1, 2, 3, 48, 44, 40], [0, 1, 2, 4, 5, 6, 48], [1, 9, 17, 25, 45, 2, 6], [48, 1, 6, 11, 12, 30, 38]);
  return out;
}
const mode = process.argv[2];
if (mode === 'hands') {
  const H = hands(600);
  console.log("select json_agg(poker.eval7(h) order by i) from (values " + H.map((h, i) => `(${i}, array[${h}])`).join(',') + ") v(i, h)");
} else if (mode === 'check') {
  const sql = JSON.parse(readFileSync(process.argv[3], 'utf8'));
  const H = hands(600); let bad = 0;
  H.forEach((h, i) => { if (E.eval7(h) !== Number(sql[i])) { bad++; if (bad < 5) console.log('MISMATCH', h, E.eval7(h), sql[i]); } });
  const cats = {}; H.forEach(h => { const n = E.handName(E.eval7(h)); cats[n] = (cats[n] || 0) + 1; });
  console.log('evaluator parity:', H.length - bad, '/', H.length, 'identical scores', JSON.stringify(cats));
  process.exit(bad ? 1 : 0);
} else {
  // 1) the exact rigged 4-way all-in hand that was played on the server (stacks 1000/300/600/150)
  const t = E.newTable([0, 1, 2, 3].map(s => ({ seat: s, name: 'S' + s })));
  [1000, 300, 600, 150].forEach((st, i) => { t.seats[i].stack = st; });
  t.rig = (deck) => { const want = [49, 40, 45, 4, 50, 41, 46, 9, 1, 0, 21, 30, 3, 39, 5, 44];   // dealt s1,s2,s3,s0 twice, then burn+flop, burn+turn, burn+river
    // server rig: holes s0 3c/4d(4,9) s1 AA(49,50) s2 QQ(40,41) s3 KK(45,46); deal order is s1,s2,s3,s0 twice
    want.forEach((c, i) => { const j = deck.indexOf(c); [deck[i], deck[j]] = [deck[j], deck[i]]; }); };
  E.startHand(t);
  for (const s of [3, 0, 1, 2]) E.act(t, s, 'allin');
  const got = t.result.pots.map(p => p.amount + '>' + p.winners).join(' ');
  console.log('side-pot replay:', got, '| stacks', t.seats.map(s => s.stack).join('/'), got === '600>3 450>1 600>2 400>0' ? 'MATCHES SERVER' : 'DIFFERENT!');
  // 2) random matches: chips conserved, every pot legal, matches always end
  let hands_ = 0, matches = 0, errors = 0;
  for (let m = 0; m < 300; m++) {
    const n = 2 + Math.floor(rnd() * 5);
    const tb = E.newTable([...Array(n).keys()].map(s => ({ seat: s, name: 'P' + s })), { rng: rnd });
    const total = n * 1000; E.startHand(tb); let guard = 0;
    while (tb.status !== 'match_over' && guard++ < 400) {
      while (tb.status === 'playing') {
        const v = E.view(tb, tb.to_act); const r = rnd();
        try {
          if (r < 0.15 && v.to_call > 0) E.act(tb, v.me, 'fold');
          else if (r < 0.22) E.act(tb, v.me, 'allin');
          else if (r < 0.4) E.act(tb, v.me, 'raise', v.min_raise_to + Math.floor(rnd() * 3) * 20);
          else E.act(tb, v.me, 'call');
        } catch (e) { errors++; E.act(tb, v.me, 'call'); }
      }
      hands_++;
      const sum = tb.seats.reduce((a, s) => a + s.stack, 0);
      if (sum !== total) { console.log('CHIPS NOT CONSERVED', sum, total); process.exit(1); }
      if (tb.status === 'hand_over') E.startHand(tb);
    }
    if (tb.status === 'match_over') matches++;
  }
  console.log('random play:', hands_, 'hands,', matches, '/ 300 matches finished, chips always conserved, rejected actions:', errors);
}
