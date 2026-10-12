/* Lucas's Arcade - playing cards for Blackjack and Poker (plain HTML/CSS, no image files).
   A card is a number 0..51:  rank = floor(c / 4) + 2  (2..14, 14 = ace),  suit = c % 4  (0 clubs, 1 diamonds, 2 hearts, 3 spades).
   LA.cards.el(c, { size, back, deal: {x, y}, flip })  -> a <div class="pcard"> ready to append
   null / undefined or back: true draws the card back (purple with a paw print). */
(function () {
  const RANKS = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
  const SUITS = ['\u2663\uFE0E', '\u2666\uFE0E', '\u2665\uFE0E', '\u2660\uFE0E'];
  const SUIT_NAMES = ['clubs', 'diamonds', 'hearts', 'spades'];
  const rank = c => Math.floor(c / 4) + 2;
  const suit = c => c % 4;
  const rankText = c => RANKS[rank(c)] || String(rank(c));
  const isRed = c => suit(c) === 1 || suit(c) === 2;
  const name = c => (rank(c) > 10 ? ['Jack', 'Queen', 'King', 'Ace'][rank(c) - 11] : rank(c)) + ' of ' + SUIT_NAMES[suit(c)];

  // little crown for J/Q/K (sizes in em so it scales with the card)
  const CROWN = '<svg class="crown" viewBox="0 0 40 24"><path d="M3 22 L1 4 L12 14 L20 2 L28 14 L39 4 L37 22 Z" fill="#ffd23f" stroke="#b8860b" stroke-width="2" stroke-linejoin="round"/></svg>';

  function el(c, opts) {
    opts = opts || {};
    const d = document.createElement('div');
    d.className = 'pcard';
    if (opts.size) d.style.setProperty('--cw', opts.size + 'px');
    if (c == null || opts.back) {
      d.classList.add('back');
      d.setAttribute('aria-label', 'face-down card');
    } else {
      const r = rankText(c), s = SUITS[suit(c)], face = rank(c) >= 11 && rank(c) <= 13;
      d.classList.add(isRed(c) ? 'red' : 'black');
      if (face) d.classList.add('face');
      d.setAttribute('aria-label', name(c));
      d.dataset.card = c;
      d.innerHTML = '<span class="corner tl"><b>' + r + '</b><i>' + s + '</i></span>' +
        '<span class="mid">' + (face ? CROWN + '<b>' + r + '</b><i>' + s + '</i>' : rank(c) === 14 ? '<i class="ace">' + s + '</i>' : '<i>' + s + '</i>') + '</span>' +
        '<span class="corner br"><b>' + r + '</b><i>' + s + '</i></span>';
    }
    if (opts.deal) {   // slide in from the deck position (x, y relative to where the card lands)
      d.style.setProperty('--fx', opts.deal.x + 'px'); d.style.setProperty('--fy', opts.deal.y + 'px');
      d.classList.add('deal');
    }
    if (opts.flip) d.classList.add('flip');
    return d;
  }
  // where the deck is, relative to an element that is about to get a card
  function from(target, deckEl) {
    if (!deckEl || !target) return { x: 0, y: -200 };
    const a = deckEl.getBoundingClientRect(), b = target.getBoundingClientRect();
    return { x: a.left - b.right, y: a.top - b.top };
  }
  window.LA = window.LA || {};
  window.LA.cards = { el, from, rank, suit, rankText, isRed, name, SUITS };
})();
