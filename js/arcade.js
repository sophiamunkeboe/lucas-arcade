/* Lucas's Arcade - home screen: game buttons + Trophy Shelf. */
(function () {
  const $ = id => document.getElementById(id);
  const Q = new URLSearchParams(location.search);

  function renderGames() {
    const box = $('games');
    LA.games.forEach(g => {
      const el = document.createElement(g.comingSoon ? 'div' : 'a');
      el.className = 'tile' + (g.comingSoon ? ' soon' : '');
      el.style.setProperty('--c', g.color || '#ff8a3d');
      if (!g.comingSoon) {
        el.href = g.url;
        el.addEventListener('click', () => LA.sfx.click());
      }
      el.innerHTML =
        '<div class="thumb">' + (g.thumb ? '<img src="' + g.thumb + '" alt="">' :
          '<svg viewBox="0 0 100 100"><rect x="22" y="44" width="56" height="42" rx="8" fill="#fff" opacity=".9"/><path d="M34 44 V32 a16 16 0 0 1 32 0 V44" stroke="#fff" stroke-width="8" fill="none" opacity=".9"/><circle cx="50" cy="62" r="6" fill="#8a8fa8"/><rect x="47" y="62" width="6" height="12" rx="3" fill="#8a8fa8"/></svg>') +
        '</div><div class="title">' + g.title + '</div><div class="tag">' + g.tagline + '</div>';
      box.appendChild(el);
    });
  }

  function renderShelf() {
    let list = LA.store.trophies();
    if (Q.get('debug') === 'shelf') {   // sample trophies for screenshots (not saved)
      list = ['cash', 'cheeseburger', 'burrito', 'monster-truck', 'cheeseburger', 'pizza', 'cash', 'taco'].map(p => ({ prize: p }));
    }
    const counts = {}, order = [];
    list.forEach(t => {
      if (!LA.prizes.get(t.prize)) return;
      if (!counts[t.prize]) { counts[t.prize] = 0; order.push(t.prize); }
      counts[t.prize]++;
    });
    $('trophyCount').textContent = list.length ? '(' + list.length + ')' : '';
    const shelf = $('shelf');
    if (!order.length) {
      shelf.innerHTML = '<div class="empty">No trophies yet!<br>Win prizes in games to fill up your shelf.</div>';
      return;
    }
    // 4 prizes per wooden shelf
    let html = '';
    for (let i = 0; i < order.length; i += 4) {
      html += '<div class="plank-row">';
      order.slice(i, i + 4).forEach(id => {
        const p = LA.prizes.get(id);
        html += '<div class="trophy" title="' + p.name + '">' + p.svg +
          (counts[id] > 1 ? '<span class="count">x' + counts[id] + '</span>' : '') +
          '<div class="tname">' + p.name + '</div></div>';
      });
      html += '</div><div class="plank"></div>';
    }
    shelf.innerHTML = html;
  }

  function setMuteIcon() {
    $('muteBtn').innerHTML = LA.sfx.isMuted()
      ? '<svg viewBox="0 0 24 24"><path d="M3 9 H7 L12 4 V20 L7 15 H3 Z" fill="#fff"/><path d="M16 9 L22 15 M22 9 L16 15" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M3 9 H7 L12 4 V20 L7 15 H3 Z" fill="#fff"/><path d="M15.5 8.5 Q18 12 15.5 15.5 M18.5 6 Q22.5 12 18.5 18" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>';
  }
  $('muteBtn').addEventListener('click', () => { LA.sfx.toggleMute(); setMuteIcon(); LA.sfx.click(); });

  renderGames();
  renderShelf();
  setMuteIcon();
  window.addEventListener('pageshow', renderShelf);   // refresh after coming back from a game
})();
