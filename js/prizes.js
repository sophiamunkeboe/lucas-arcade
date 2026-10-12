/* Lucas's Arcade - prize art (simple SVG, viewBox 0 0 100 100).
   To add a prize: push a new {id, name, svg} object into the list. */
(function () {
  const W = (inner) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' + inner + '</svg>';

  const PRIZES = [
    { id: 'cash', also: ['cards'], name: 'Stack of Cash', svg: W(
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

    // ---- Fetch Frenzy prizes (Lucas's list) ----
    { id: 'sunglasses', pool: 'fetch', also: ['cards'], name: 'Sunglasses', svg: W(
      '<path d="M8 40 Q50 32 92 40" stroke="#222" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<path d="M12 40 L46 40 Q46 66 30 66 Q12 66 12 40 Z" fill="#1d1d2b" stroke="#111" stroke-width="3"/>' +
      '<path d="M54 40 L88 40 Q88 66 70 66 Q54 66 54 40 Z" fill="#1d1d2b" stroke="#111" stroke-width="3"/>' +
      '<path d="M18 46 L26 46 L20 58 Z M60 46 L68 46 L62 58 Z" fill="#7fd3ff" opacity=".8"/>' +
      '<path d="M46 42 Q50 38 54 42" stroke="#111" stroke-width="4" fill="none"/>') },

    { id: 'dirtbike', pool: 'fetch', name: 'Dirtbike', svg: W(
      '<circle cx="24" cy="70" r="15" fill="#222"/><circle cx="24" cy="70" r="6" fill="#bbb"/>' +
      '<circle cx="78" cy="70" r="15" fill="#222"/><circle cx="78" cy="70" r="6" fill="#bbb"/>' +
      '<g stroke="#999" stroke-width="2"><path d="M24 58 l0 -4 M14 66 l-4 -2 M34 66 l4 -2 M78 58 l0 -4 M68 66 l-4 -2 M88 66 l4 -2"/></g>' +
      '<path d="M24 70 L44 50 L62 52 L78 70" stroke="#555" stroke-width="5" fill="none" stroke-linejoin="round"/>' +
      '<path d="M36 50 Q42 36 60 40 L70 46 L56 54 Z" fill="#31c46c" stroke="#1d8a49" stroke-width="2"/>' +
      '<path d="M30 44 L48 42 L46 48 L28 50 Z" fill="#222"/>' +
      '<path d="M66 44 L74 30 M70 30 L80 28" stroke="#333" stroke-width="4" stroke-linecap="round"/>' +
      '<rect x="46" y="54" width="14" height="9" rx="2" fill="#777"/>' +
      '<text x="55" y="50" font-size="9" font-weight="900" font-family="Arial" fill="#fff">7</text>') },

    { id: 'sports-car', pool: 'fetch', also: ['cards'], name: 'Sports Car', svg: W(
      '<path d="M6 64 Q8 52 24 50 L36 40 Q50 34 66 40 L78 50 Q94 52 94 64 L94 70 L6 70 Z" fill="#e53935" stroke="#8e1b19" stroke-width="2"/>' +
      '<path d="M38 43 Q50 38 62 42 L72 50 L30 50 Z" fill="#9fd8ff" stroke="#3a6f8f" stroke-width="1.5"/>' +
      '<path d="M50 40 L50 50" stroke="#8e1b19" stroke-width="2"/>' +
      '<path d="M8 58 L20 58 M80 58 L92 58" stroke="#ffe066" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M20 60 L80 60" stroke="#fff" stroke-width="3" opacity=".7"/>' +
      '<circle cx="26" cy="70" r="10" fill="#222"/><circle cx="26" cy="70" r="4.5" fill="#ddd"/>' +
      '<circle cx="74" cy="70" r="10" fill="#222"/><circle cx="74" cy="70" r="4.5" fill="#ddd"/>' +
      '<path d="M88 46 L96 44" stroke="#8e1b19" stroke-width="3"/>') },

    { id: 'computer', pool: 'fetch', name: 'Computer', svg: W(
      '<rect x="12" y="16" width="76" height="52" rx="5" fill="#3b4252" stroke="#1f2430" stroke-width="3"/>' +
      '<rect x="18" y="22" width="64" height="40" rx="2" fill="#5bc0ff"/>' +
      '<path d="M18 50 L36 36 L50 48 L62 40 L82 56 L82 62 L18 62 Z" fill="#31c46c"/>' +
      '<circle cx="70" cy="30" r="5" fill="#ffe066"/>' +
      '<path d="M44 68 L40 80 L60 80 L56 68 Z" fill="#9aa3b5"/>' +
      '<rect x="22" y="80" width="56" height="8" rx="3" fill="#cfd5e1" stroke="#9aa3b5" stroke-width="1.5"/>' +
      '<rect x="80" y="78" width="12" height="10" rx="5" fill="#cfd5e1" stroke="#9aa3b5" stroke-width="1.5"/>') },

    { id: 'game-console', pool: 'fetch', name: 'X BOX', svg: W(
      // a generic black game console + controller (just labeled "X BOX", no real logo)
      '<rect x="14" y="14" width="44" height="58" rx="6" fill="#1b1d22" stroke="#000" stroke-width="2"/>' +
      '<rect x="18" y="20" width="36" height="3" rx="1.5" fill="#33363d"/>' +
      '<circle cx="36" cy="42" r="8" fill="#2a2d33" stroke="#4be37a" stroke-width="2.5"/>' +
      '<text x="36" y="66" font-size="8.5" font-weight="900" text-anchor="middle" font-family="Arial" fill="#4be37a">X BOX</text>' +
      '<path d="M50 70 Q50 58 62 56 L86 56 Q98 58 96 72 Q94 84 86 84 Q80 84 77 78 L71 78 Q68 84 62 84 Q52 84 50 70 Z" fill="#2a2d33" stroke="#000" stroke-width="2"/>' +
      '<circle cx="62" cy="66" r="4" fill="#555"/><circle cx="86" cy="64" r="2.5" fill="#4be37a"/><circle cx="90" cy="69" r="2.5" fill="#ef5350"/>' +
      '<circle cx="82" cy="69" r="2.5" fill="#42a5f5"/><circle cx="86" cy="74" r="2.5" fill="#ffd54f"/>') },

    { id: 'dollar-1', pool: 'fetch', name: '$1 Bill', svg: W(
      '<g transform="rotate(-8 50 50)"><rect x="6" y="30" width="88" height="42" rx="3" fill="#cfe8c4" stroke="#4e7d43" stroke-width="2.5"/>' +
      '<rect x="11" y="35" width="78" height="32" rx="2" fill="none" stroke="#6f9e63" stroke-width="1.5"/>' +
      '<ellipse cx="50" cy="51" rx="12" ry="13" fill="#e6f3df" stroke="#4e7d43" stroke-width="2"/>' +
      '<circle cx="50" cy="47" r="5" fill="#8db582"/><path d="M42 58 Q50 52 58 58" fill="#8db582"/>' +
      '<text x="20" y="48" font-size="12" font-weight="900" text-anchor="middle" font-family="Arial" fill="#2f5a27">1</text>' +
      '<text x="80" y="64" font-size="12" font-weight="900" text-anchor="middle" font-family="Arial" fill="#2f5a27">1</text>' +
      '<text x="76" y="47" font-size="10" font-weight="900" text-anchor="middle" font-family="Arial" fill="#2f5a27">$1</text></g>') },

    { id: 'dollar-50', pool: 'fetch', name: '$50 Bill', svg: W(
      '<g transform="rotate(6 50 50)"><rect x="6" y="30" width="88" height="42" rx="3" fill="#d9e6f2" stroke="#3f6a8a" stroke-width="2.5"/>' +
      '<rect x="11" y="35" width="78" height="32" rx="2" fill="none" stroke="#e46b6b" stroke-width="1.5" stroke-dasharray="4 2"/>' +
      '<ellipse cx="50" cy="51" rx="12" ry="13" fill="#eef4fa" stroke="#3f6a8a" stroke-width="2"/>' +
      '<circle cx="50" cy="47" r="5" fill="#93b2cc"/><path d="M42 58 Q50 52 58 58" fill="#93b2cc"/>' +
      '<text x="22" y="49" font-size="13" font-weight="900" text-anchor="middle" font-family="Arial" fill="#2e4f6b">50</text>' +
      '<text x="78" y="65" font-size="13" font-weight="900" text-anchor="middle" font-family="Arial" fill="#c94545">50</text>' +
      '<text x="78" y="47" font-size="9" font-weight="900" text-anchor="middle" font-family="Arial" fill="#2e4f6b">$50</text></g>') },

    { id: 'milkshake', pool: 'fetch', name: 'Milkshake', svg: W(
      '<path d="M60 6 L52 40" stroke="#ff3d7f" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M26 40 L74 40 L66 92 L34 92 Z" fill="#ffc6dd" stroke="#d96b98" stroke-width="2.5"/>' +
      '<path d="M28 52 L72 52" stroke="#fff" stroke-width="4" opacity=".7"/>' +
      '<path d="M24 42 Q24 26 38 28 Q42 16 54 22 Q66 16 70 28 Q80 28 76 42 Z" fill="#fffaf0" stroke="#e2d6c2" stroke-width="2"/>' +
      '<circle cx="52" cy="16" r="6" fill="#e53935"/><path d="M52 10 q4 -6 8 -4" stroke="#3a7d2b" stroke-width="2" fill="none"/>' +
      '<g fill="#ff9ec4"><rect x="36" y="32" width="5" height="2" rx="1"/><rect x="58" y="34" width="5" height="2" rx="1" transform="rotate(30 60 35)"/></g>') },

    { id: 'trash-bags', pool: 'fetch', name: 'Trash Bags', svg: W(
      // the joke prize :)
      '<path d="M18 86 Q8 60 26 46 L34 40 L44 46 Q60 62 50 86 Z" fill="#2d2f36" stroke="#111" stroke-width="2"/>' +
      '<path d="M30 40 L28 30 M34 40 L38 30" stroke="#ffd23f" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M48 88 Q40 56 62 42 L70 36 L80 42 Q98 60 88 88 Z" fill="#3a3d46" stroke="#111" stroke-width="2"/>' +
      '<path d="M66 36 L64 26 M70 36 L74 26" stroke="#ffd23f" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M58 60 q6 -4 10 2 M72 56 q4 6 10 2" stroke="#5a5e6a" stroke-width="2" fill="none"/>' +
      '<g fill="#fff"><circle cx="64" cy="70" r="3"/><circle cx="78" cy="70" r="3"/></g><g fill="#111"><circle cx="64" cy="71" r="1.6"/><circle cx="78" cy="71" r="1.6"/></g>' +
      '<path d="M66 78 q5 4 10 0" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<g stroke="#666" stroke-width="1.5" fill="none"><path d="M20 22 q4 -4 8 0 q4 4 8 0"/><path d="M78 14 q3 -3 6 0 q3 3 6 0"/></g>' +
      '<g fill="#333"><circle cx="26" cy="20" r="2"/><circle cx="86" cy="12" r="2"/></g>') },

    // ---- card games (Blackjack + Poker): pool 'cards' (plus a few Lucas favorites marked also: ['cards']) ----
    { id: 'golden-chip', pool: 'cards', name: 'Golden Chip', svg: W(
      '<ellipse cx="50" cy="58" rx="38" ry="12" fill="#b8860b"/>' +
      '<rect x="12" y="46" width="76" height="12" fill="#b8860b"/>' +
      '<ellipse cx="50" cy="46" rx="38" ry="12" fill="#ffd23f" stroke="#b8860b" stroke-width="2"/>' +
      '<g fill="#fff6c4"><path d="M18 42 l8 2 l-2 6 l-8 -2z"/><path d="M74 42 l8 2 l-2 6 l-8 -2z"/><path d="M45 34 h10 v4 h-10z"/><path d="M45 54 h10 v4 h-10z"/></g>' +
      '<ellipse cx="50" cy="46" rx="22" ry="7" fill="none" stroke="#b8860b" stroke-width="2" stroke-dasharray="4 3"/>' +
      '<text x="50" y="50" font-size="11" font-weight="900" text-anchor="middle" font-family="Arial" fill="#8a5a00">LA</text>' +
      '<g fill="#fff"><path d="M80 18 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2z"/><path d="M20 20 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5z"/></g>') },

    { id: 'lucky-dice', pool: 'cards', name: 'Lucky Dice', svg: W(
      '<g transform="rotate(-14 34 56)"><rect x="12" y="34" width="44" height="44" rx="9" fill="#ef5350" stroke="#a52a2a" stroke-width="2.5"/>' +
      '<g fill="#fff"><circle cx="24" cy="46" r="4.5"/><circle cx="34" cy="56" r="4.5"/><circle cx="44" cy="66" r="4.5"/></g></g>' +
      '<g transform="rotate(12 68 48)"><rect x="46" y="26" width="44" height="44" rx="9" fill="#fffaf0" stroke="#8a8fa8" stroke-width="2.5"/>' +
      '<g fill="#2b2140"><circle cx="58" cy="38" r="4.5"/><circle cx="78" cy="38" r="4.5"/><circle cx="58" cy="58" r="4.5"/><circle cx="78" cy="58" r="4.5"/><circle cx="58" cy="48" r="4.5"/><circle cx="78" cy="48" r="4.5"/></g></g>' +
      '<path d="M16 18 q4 -8 10 -2 M84 82 q6 2 4 8" stroke="#ffd23f" stroke-width="3" fill="none" stroke-linecap="round"/>') },

    { id: 'crown', pool: 'cards', name: 'Crown', svg: W(
      '<path d="M14 72 L10 30 L32 50 L50 20 L68 50 L90 30 L86 72 Z" fill="#ffd23f" stroke="#b8860b" stroke-width="3" stroke-linejoin="round"/>' +
      '<rect x="14" y="70" width="72" height="14" rx="4" fill="#ffc400" stroke="#b8860b" stroke-width="3"/>' +
      '<g stroke="#b8860b" stroke-width="2"><circle cx="10" cy="28" r="5" fill="#fff"/><circle cx="50" cy="18" r="6" fill="#fff"/><circle cx="90" cy="28" r="5" fill="#fff"/></g>' +
      '<circle cx="50" cy="77" r="5" fill="#e53935"/><circle cx="30" cy="77" r="4" fill="#42a5f5"/><circle cx="70" cy="77" r="4" fill="#43a047"/>' +
      '<path d="M50 44 l6 10 l-6 8 l-6 -8 z" fill="#7c5cff"/>') },

    { id: 'royal-flush', pool: 'cards', name: 'Royal Flush', svg: W(
      [-34, -17, 0, 17, 34].map((a, i) => '<g transform="rotate(' + a + ' 50 92)"><rect x="34" y="18" width="32" height="46" rx="4" fill="#fff" stroke="#8a8fa8" stroke-width="1.5"/>' +
        '<text x="38" y="30" font-size="10" font-weight="900" font-family="Arial" fill="#d32f2f">' + ['10', 'J', 'Q', 'K', 'A'][i] + '</text>' +
        '<path d="M50 52 c-8 -6 -8 -12 -3 -13 c2 0 3 1 3 3 c0 -2 1 -3 3 -3 c5 1 5 7 -3 13z" fill="#d32f2f"/></g>').join('')) },

    { id: 'top-hat', pool: 'cards', name: 'Magic Top Hat', svg: W(
      '<ellipse cx="50" cy="78" rx="40" ry="10" fill="#2b2140"/>' +
      '<path d="M26 76 L28 26 Q50 18 72 26 L74 76 Q50 84 26 76 Z" fill="#3a2f55" stroke="#1a1430" stroke-width="2"/>' +
      '<path d="M27 62 Q50 70 73 62 L73.6 70 Q50 78 26.6 70 Z" fill="#ff3d7f"/>' +
      '<ellipse cx="50" cy="26" rx="22" ry="6" fill="#4b3f6b" stroke="#1a1430" stroke-width="2"/>' +
      '<g fill="#ffd23f"><path d="M82 16 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2z"/><path d="M14 36 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5z"/></g>') },

    { id: 'trophy-cup', pool: 'cards', name: 'Champion Cup', svg: W(
      '<path d="M28 14 H72 V38 Q72 62 50 64 Q28 62 28 38 Z" fill="#ffd23f" stroke="#b8860b" stroke-width="3"/>' +
      '<path d="M28 22 Q12 22 14 36 Q16 48 30 48 M72 22 Q88 22 86 36 Q84 48 70 48" fill="none" stroke="#b8860b" stroke-width="5"/>' +
      '<rect x="44" y="62" width="12" height="12" fill="#e2b33c" stroke="#b8860b" stroke-width="2"/>' +
      '<rect x="30" y="74" width="40" height="14" rx="3" fill="#7c5cff" stroke="#4a2fc4" stroke-width="2.5"/>' +
      '<text x="50" y="44" font-size="20" font-weight="900" text-anchor="middle" font-family="Arial" fill="#b8860b">1</text>' +
      '<path d="M36 20 Q34 34 40 44" stroke="#fff6c4" stroke-width="3" fill="none" stroke-linecap="round"/>') },
  ];

  const inPool = pool => PRIZES.filter(p => (p.pool || null) === (pool || null) || (pool && (p.also || []).includes(pool)));
  const byId = {};
  PRIZES.forEach(p => { byId[p.id] = p; });

  window.LA = window.LA || {};
  window.LA.prizes = {
    list: PRIZES,
    get: id => byId[id],
    // random(pool): each game has its own prize list (Pop the Dog = no pool, Fetch Frenzy = 'fetch')
    // (Blackjack + Poker = 'cards'; a prize can also join other lists with also: [...])
    random: pool => { const l = inPool(pool); return l[Math.floor(Math.random() * l.length)]; },
    pool: pool => inPool(pool),
  };
})();
