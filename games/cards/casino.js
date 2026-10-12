/* Lucas's Arcade - the Las Vegas casino look shared by Blackjack and Poker.
   * Neon signs on the wall made from the family's business logos (art/neon/*, built by tools/make-neon.py).
     LA.casino.wall(el, { slots: 2 }) fills el with sign slots that slowly cycle through all five signs.
     Every sign hums (a gentle buzz); now and then one of them flickers off and back on.
   * Dealer dogs in tuxedos: adds a 'tuxedo' outfit + 'bella-dealer' / 'marley-dealer' to PTD (pop-the-dog/dogs.js). */
(function () {
  const SIGNS = [
    { id: 'aer', name: 'Arizona Event Rentals' },
    { id: 'munkeboe', name: 'Munkeboe Party Rentals' },
    { id: 'sel', name: 'Special Events Table Linens' },
    { id: 'taylor', name: 'Taylor Equipment and Event Rentals' },
    { id: 'thankq', name: 'Thank Q Rentals' },
  ];
  const REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function signEl(s, base) {
    const f = document.createElement('figure');
    f.className = 'neon'; f.dataset.sign = s.id;
    f.innerHTML = '<img class="off" src="' + base + 'art/neon/' + s.id + '-off.webp" alt="">' +
      '<img class="on" src="' + base + 'art/neon/' + s.id + '-on.webp" alt="' + s.name + ' neon sign">';
    f.style.setProperty('--buzz-delay', (-Math.random() * 3).toFixed(2) + 's');
    return f;
  }

  function wall(el, opts) {
    opts = opts || {};
    const base = opts.base || '../../', n = opts.slots || 2, every = opts.cycle || 12000;
    const order = SIGNS.slice();
    if (opts.start) { const i = order.findIndex(s => s.id === opts.start); if (i > 0) order.push(...order.splice(0, i)); }
    let next = 0;
    const slots = [];
    for (let i = 0; i < n; i++) {
      const slot = document.createElement('div'); slot.className = 'neon-slot';
      slot.appendChild(signEl(order[next++ % order.length], base));
      el.appendChild(slot); slots.push(slot);
    }
    // cycle: one slot at a time fades to the next sign, so all five show up
    let k = 0;
    if (!opts.still) setInterval(() => {
      const slot = slots[k++ % slots.length];
      const old = slot.firstChild, nu = signEl(order[next++ % order.length], base);
      nu.classList.add('enter'); slot.appendChild(nu);
      old.classList.add('leave'); setTimeout(() => old.remove(), 900);
    }, every);
    // occasional flicker (one sign at a time)
    if (!REDUCED) (function flick() {
      setTimeout(() => {
        const all = el.querySelectorAll('.neon:not(.leave)');
        const s = all[Math.floor(Math.random() * all.length)];
        if (s) { s.classList.add('flicker'); setTimeout(() => s.classList.remove('flicker'), 1600); }
        flick();
      }, 4000 + Math.random() * 5000);
    })();
    return { flicker(id) { const s = el.querySelector('.neon[data-sign="' + id + '"]'); if (s) s.classList.add('flicker', 'hold'); } };
  }

  // ---- tuxedo for the dealer dogs ----
  if (window.PTD && PTD.OUTFITS && PTD.DOGS) {
    PTD.OUTFITS.tuxedo = {
      name: 'Tuxedo',
      box: [70, 236, 260, 170],
      tagUp: true,
      svg: () =>
        '<defs><clipPath id="tux"><ellipse cx="200" cy="322" rx="116" ry="82"/></clipPath>' +
        '<linearGradient id="tuxg" x1="0" x2="1"><stop offset="0" stop-color="#151320"/><stop offset=".5" stop-color="#2a2738"/><stop offset="1" stop-color="#151320"/></linearGradient></defs>' +
        '<g clip-path="url(#tux)">' +
        '<path d="M60 250 L340 250 L340 410 L60 410 Z" fill="url(#tuxg)"/>' +
        // white shirt V + pleats
        '<path d="M160 250 L240 250 L214 360 L186 360 Z" fill="#fbfbff"/>' +
        '<path d="M190 262 L194 352 M210 262 L206 352" stroke="#d9dbe6" stroke-width="2"/>' +
        '<g fill="#1b1a24"><circle cx="200" cy="300" r="3.5"/><circle cx="200" cy="320" r="3.5"/><circle cx="200" cy="340" r="3.5"/></g>' +
        // satin lapels
        '<path d="M160 250 L186 360 L150 316 L136 262 Z" fill="#3b3850"/><path d="M240 250 L214 360 L250 316 L264 262 Z" fill="#3b3850"/>' +
        '<path d="M150 266 Q160 300 178 340" stroke="#5a5672" stroke-width="3" fill="none"/><path d="M250 266 Q240 300 222 340" stroke="#5a5672" stroke-width="3" fill="none"/>' +
        // pocket square
        '<path d="M262 316 l22 0 l-4 -12 l-6 8 l-4 -10 l-4 10 z" fill="#ffd23f"/><rect x="258" y="314" width="30" height="5" rx="2" fill="#151320"/>' +
        '</g>' +
        // bow tie (sits just under the chin)
        '<g transform="translate(200 280)"><path d="M-6 -6 L-34 -18 Q-40 0 -34 18 L-6 6 Z M6 -6 L34 -18 Q40 0 34 18 L6 6 Z" fill="#c0163f" stroke="#7a0d28" stroke-width="3" stroke-linejoin="round"/>' +
        '<rect x="-9" y="-9" width="18" height="18" rx="5" fill="#e0245a" stroke="#7a0d28" stroke-width="3"/></g>',
    };
    ['bella', 'marley'].forEach(id => {
      PTD.DOGS[id + '-dealer'] = Object.assign({}, PTD.DOGS[id], { id: id + '-dealer', outfit: 'tuxedo' });
    });
  }

  window.LA = window.LA || {};
  window.LA.casino = { wall, SIGNS };
})();
