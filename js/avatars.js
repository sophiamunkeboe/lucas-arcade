/* Lucas's Arcade - player pictures. Add more by pushing {id, name, bg, img or svg}. */
(function () {
  const W = inner => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' + inner + '</svg>';
  const prize = id => (LA.prizes && LA.prizes.get(id) ? LA.prizes.get(id).svg : '');
  const AVATARS = [
    { id: 'bella', name: 'Bella', bg: '#bfe3ff', img: 'icons/avatars/bella.png' },
    { id: 'marley', name: 'Marley #4', bg: '#ffd9a8', img: 'icons/avatars/marley.png' },
    { id: 'monster-truck', name: 'Monster Truck', bg: '#ffe066', svg: () => prize('monster-truck') },
    { id: 'cheeseburger', name: 'Cheeseburger', bg: '#ffb3a7', svg: () => prize('cheeseburger') },
    { id: 'basketball', name: 'Basketball', bg: '#c9b6ff', svg: () => W(
      '<circle cx="50" cy="50" r="38" fill="#f47b20" stroke="#7a3a0a" stroke-width="3"/>' +
      '<g stroke="#7a3a0a" stroke-width="3" fill="none"><path d="M12 50 H88 M50 12 V88"/>' +
      '<path d="M24 22 Q40 50 24 78"/><path d="M76 22 Q60 50 76 78"/></g>' +
      '<ellipse cx="36" cy="32" rx="9" ry="5" fill="#fff" opacity=".35" transform="rotate(-30 36 32)"/>') },
    { id: 'burrito', name: 'Burrito', bg: '#b9f0c4', svg: () => prize('burrito') },
    { id: 'rocket', name: 'Rocket', bg: '#9fd8ff', svg: () => W(
      '<path d="M50 8 Q70 26 68 60 L32 60 Q30 26 50 8 Z" fill="#f2f4f8" stroke="#56607a" stroke-width="3"/>' +
      '<circle cx="50" cy="36" r="8" fill="#5bc0ff" stroke="#56607a" stroke-width="3"/>' +
      '<path d="M32 48 L20 66 L32 64 Z M68 48 L80 66 L68 64 Z" fill="#ef5350" stroke="#56607a" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M40 62 Q50 92 60 62 Z" fill="#ffb300"/><path d="M45 62 Q50 80 55 62 Z" fill="#fff176"/>') },
    { id: 'video-game', name: 'Game Controller', bg: '#ffc2e2', svg: () => prize('video-game') },
  ];
  const byId = {}; AVATARS.forEach(a => { byId[a.id] = a; });
  // returns HTML for an avatar. base = path prefix to the arcade root ('' or '../../')
  function html(id, base) {
    const a = byId[id] || AVATARS[0];
    const inner = a.img ? '<img src="' + (base || '') + a.img + '" alt="">' : a.svg();
    return '<span class="avatar" style="background:' + a.bg + '">' + inner + '</span>';
  }
  window.LA = window.LA || {};
  window.LA.avatars = { list: AVATARS, get: id => byId[id], html };
})();
