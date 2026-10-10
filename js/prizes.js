/* Lucas's Arcade - prize art (simple SVG, viewBox 0 0 100 100).
   To add a prize: push a new {id, name, svg} object into the list. */
(function () {
  const W = (inner) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' + inner + '</svg>';

  const PRIZES = [
    { id: 'cash', name: 'Stack of Cash', svg: W(
      '<g stroke="#2f6b2f" stroke-width="2">' +
      '<rect x="14" y="58" width="72" height="22" rx="3" fill="#7cc576"/>' +
      '<rect x="12" y="46" width="72" height="22" rx="3" fill="#8fd488"/>' +
      '<rect x="16" y="34" width="72" height="22" rx="3" fill="#9fe097"/>' +
      '<rect x="44" y="34" width="10" height="22" fill="#f4d35e" stroke="#b8932a"/></g>' +
      '<circle cx="30" cy="45" r="7" fill="none" stroke="#2f6b2f" stroke-width="2"/>' +
      '<text x="30" y="49" font-size="11" font-weight="bold" text-anchor="middle" fill="#2f6b2f" font-family="Arial">$</text>' +
      '<circle cx="72" cy="45" r="7" fill="none" stroke="#2f6b2f" stroke-width="2"/>' +
      '<text x="72" y="49" font-size="11" font-weight="bold" text-anchor="middle" fill="#2f6b2f" font-family="Arial">$</text>' +
      '<g fill="#ffd700" stroke="#b8932a" stroke-width="2"><ellipse cx="78" cy="84" rx="12" ry="5"/><ellipse cx="78" cy="79" rx="12" ry="5"/></g>') },

    { id: 'cheeseburger', name: 'Cheeseburger', svg: W(
      '<path d="M16 48 Q16 18 50 18 Q84 18 84 48 Z" fill="#e9a23b" stroke="#a8681c" stroke-width="2"/>' +
      '<g fill="#fff6d8"><ellipse cx="35" cy="30" rx="3" ry="1.6"/><ellipse cx="50" cy="25" rx="3" ry="1.6"/><ellipse cx="64" cy="31" rx="3" ry="1.6"/><ellipse cx="44" cy="38" rx="3" ry="1.6"/><ellipse cx="60" cy="40" rx="3" ry="1.6"/></g>' +
      '<path d="M12 50 Q20 44 28 50 T44 50 T60 50 T76 50 T90 50 L88 56 L12 56 Z" fill="#5cb85c"/>' +
      '<path d="M14 55 L86 55 L74 66 L64 58 L50 66 L36 58 L26 66 Z" fill="#ffcc33" stroke="#d9a400" stroke-width="1.5"/>' +
      '<rect x="14" y="58" width="72" height="12" rx="6" fill="#6b3a1e"/>' +
      '<path d="M16 72 L84 72 Q84 86 50 86 Q16 86 16 72 Z" fill="#e9a23b" stroke="#a8681c" stroke-width="2"/>') },

    { id: 'burrito', name: 'Burrito', svg: W(
      '<g transform="rotate(-25 50 50)">' +
      '<rect x="14" y="34" width="70" height="34" rx="17" fill="#f3dcaa" stroke="#c8a165" stroke-width="2"/>' +
      '<ellipse cx="80" cy="51" rx="9" ry="16" fill="#f8e6bf" stroke="#c8a165" stroke-width="2"/>' +
      '<circle cx="78" cy="45" r="3" fill="#5cb85c"/><circle cx="82" cy="53" r="3" fill="#e74c3c"/><circle cx="77" cy="57" r="2.5" fill="#8b4513"/><circle cx="81" cy="44" r="2" fill="#ffcc33"/>' +
      '<rect x="30" y="34" width="22" height="34" fill="#e9eef2" stroke="#9aa7b0" stroke-width="2"/>' +
      '<path d="M30 42 L52 42 M30 52 L52 52 M30 62 L52 62" stroke="#c4cdd4" stroke-width="1.5"/>' +
      '<path d="M22 44 q4 -3 8 0 M60 40 q4 -3 8 0" stroke="#d4b07a" stroke-width="1.5" fill="none"/></g>') },

    { id: 'monster-truck', name: 'Monster Truck', svg: W(
      '<path d="M18 52 L26 34 L56 34 L64 46 L84 48 Q88 49 88 54 L88 62 L14 62 L14 56 Z" fill="#e53935" stroke="#8e1b19" stroke-width="2"/>' +
      '<path d="M30 37 L52 37 L58 46 L28 46 Z" fill="#9fd8ff" stroke="#3a6f8f" stroke-width="1.5"/>' +
      '<path d="M66 52 L80 52" stroke="#ffd54f" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M26 56 L40 52 M52 52 L62 56" stroke="#ffd54f" stroke-width="3"/>' +
      '<g><circle cx="28" cy="72" r="15" fill="#222"/><circle cx="72" cy="72" r="15" fill="#222"/>' +
      '<circle cx="28" cy="72" r="7" fill="#9e9e9e" stroke="#666" stroke-width="2"/><circle cx="72" cy="72" r="7" fill="#9e9e9e" stroke="#666" stroke-width="2"/>' +
      '<g stroke="#444" stroke-width="3"><path d="M14 66 l4 2 M14 78 l4 -2 M42 66 l-4 2 M42 78 l-4 -2 M58 66 l4 2 M58 78 l4 -2 M86 66 l-4 2 M86 78 l-4 -2"/></g></g>') },

    { id: 'pizza', name: 'Pizza Slice', svg: W(
      '<path d="M50 90 L16 22 Q50 8 84 22 Z" fill="#ffd166" stroke="#d99a1e" stroke-width="2"/>' +
      '<path d="M16 22 Q50 8 84 22 L80 30 Q50 17 20 30 Z" fill="#d98c3a"/>' +
      '<g fill="#d64545"><circle cx="40" cy="40" r="7"/><circle cx="60" cy="38" r="6"/><circle cx="50" cy="60" r="6"/><circle cx="44" cy="74" r="4"/></g>' +
      '<g fill="#5cb85c"><circle cx="55" cy="50" r="2"/><circle cx="36" cy="55" r="2"/></g>') },

    { id: 'ice-cream', name: 'Ice Cream Cone', svg: W(
      '<path d="M32 50 L50 94 L68 50 Z" fill="#e0a75e" stroke="#a8722f" stroke-width="2"/>' +
      '<path d="M38 58 L60 58 M42 68 L57 68 M46 78 L54 78 M40 52 L58 82 M60 52 L42 82" stroke="#a8722f" stroke-width="1.2"/>' +
      '<circle cx="50" cy="40" r="20" fill="#ff9ec4" stroke="#d96b98" stroke-width="2"/>' +
      '<circle cx="50" cy="22" r="14" fill="#fff3d6" stroke="#d9c49a" stroke-width="2"/>' +
      '<circle cx="50" cy="8" r="6" fill="#e53935"/>' +
      '<g fill="#6fc3ff"><rect x="40" y="34" width="5" height="2" rx="1" transform="rotate(30 42 35)"/><rect x="56" y="42" width="5" height="2" rx="1" transform="rotate(-30 58 43)"/><rect x="47" y="48" width="5" height="2" rx="1"/></g>') },

    { id: 'taco', name: 'Taco', svg: W(
      '<path d="M16 46 Q22 30 32 40 Q40 26 50 38 Q60 26 68 40 Q78 30 84 46 Z" fill="#5cb85c"/>' +
      '<g fill="#8b4a22"><circle cx="28" cy="46" r="6"/><circle cx="44" cy="44" r="6"/><circle cx="60" cy="44" r="6"/><circle cx="74" cy="46" r="6"/></g>' +
      '<g fill="#e74c3c"><circle cx="36" cy="40" r="4"/><circle cx="56" cy="36" r="4"/><circle cx="70" cy="40" r="3.5"/></g>' +
      '<g fill="#ffd54f"><rect x="40" y="36" width="8" height="3" rx="1.5" transform="rotate(-20 44 37)"/><rect x="62" y="34" width="8" height="3" rx="1.5" transform="rotate(25 66 35)"/></g>' +
      '<path d="M10 48 A40 38 0 0 0 90 48 Z" fill="#f2c14e" stroke="#c48f1e" stroke-width="2.5"/>' +
      '<g fill="#d9a03a"><circle cx="30" cy="62" r="1.8"/><circle cx="48" cy="72" r="1.8"/><circle cx="66" cy="62" r="1.8"/><circle cx="58" cy="78" r="1.8"/><circle cx="38" cy="76" r="1.8"/></g>') },

    { id: 'gold-coins', name: 'Bag of Gold Coins', svg: W(
      '<path d="M36 30 Q50 38 64 30 L60 22 Q50 26 40 22 Z" fill="#b5844a" stroke="#7a5428" stroke-width="2"/>' +
      '<path d="M38 32 Q14 50 22 76 Q30 90 50 90 Q70 90 78 76 Q86 50 62 32 Z" fill="#c8955a" stroke="#7a5428" stroke-width="2"/>' +
      '<path d="M38 32 Q50 38 62 32" stroke="#e8d36b" stroke-width="4" fill="none"/>' +
      '<text x="50" y="72" font-size="28" font-weight="bold" text-anchor="middle" fill="#ffe066" stroke="#7a5428" stroke-width="1" font-family="Arial">$</text>' +
      '<g fill="#ffd700" stroke="#b8932a" stroke-width="2"><circle cx="18" cy="86" r="8"/><circle cx="84" cy="84" r="8"/><circle cx="90" cy="72" r="6"/></g>') },

    { id: 'video-game', name: 'Video Game', svg: W(
      '<path d="M22 36 L78 36 Q94 36 94 58 Q94 78 82 78 Q74 78 68 66 L32 66 Q26 78 18 78 Q6 78 6 58 Q6 36 22 36 Z" fill="#5b5fc7" stroke="#2f3283" stroke-width="2"/>' +
      '<rect x="20" y="48" width="18" height="6" rx="2" fill="#fff"/><rect x="26" y="42" width="6" height="18" rx="2" fill="#fff"/>' +
      '<circle cx="68" cy="46" r="4.5" fill="#ffd54f"/><circle cx="78" cy="54" r="4.5" fill="#ef5350"/><circle cx="68" cy="60" r="4.5" fill="#66bb6a"/><circle cx="58" cy="54" r="4.5" fill="#42a5f5"/>') },
  ];

  const byId = {};
  PRIZES.forEach(p => { byId[p.id] = p; });

  window.LA = window.LA || {};
  window.LA.prizes = {
    list: PRIZES,
    get: id => byId[id],
    random: () => PRIZES[Math.floor(Math.random() * PRIZES.length)],
  };
})();
