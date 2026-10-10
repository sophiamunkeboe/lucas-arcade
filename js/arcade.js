/* Lucas's Arcade - home screen: "Who's playing?" login, game buttons, Trophy Shelf. */
(function () {
  const $ = id => document.getElementById(id);
  const Q = new URLSearchParams(location.search);
  const sfx = LA.sfx;

  // ================= WHO'S PLAYING? =================
  let pending = null;      // { mode: 'login'|'create', player, name, avatar, first }
  let code = '';

  function showView(id) {
    ['whoList', 'whoNew', 'whoCode'].forEach(v => $(v).classList.toggle('hidden', v !== id));
  }
  function showWho() {
    $('arcade').classList.add('hidden'); $('who').classList.remove('hidden');
    const list = LA.players.list();
    if (!list.length) { startCreate(true); return; }
    const box = $('playerTiles'); box.innerHTML = '';
    list.forEach(p => {
      const b = document.createElement('button');
      b.className = 'player-tile';
      b.innerHTML = LA.avatars.html(p.avatar) + '<span class="pname"></span>';
      b.querySelector('.pname').textContent = p.name;
      b.addEventListener('click', () => { sfx.click(); startLogin(p); });
      box.appendChild(b);
    });
    const add = document.createElement('button');
    add.className = 'player-tile add';
    add.innerHTML = '<span class="avatar plus">+</span><span class="pname">Add Player</span>';
    add.addEventListener('click', () => { sfx.click(); startCreate(false); });
    box.appendChild(add);
    showView('whoList');
  }

  function startCreate(first) {
    pending = { mode: 'create', first, avatar: first ? 'bella' : null };
    $('newTitle').textContent = first ? "Hi! Who's playing?" : 'New player';
    $('nameInput').value = first ? 'Lucas' : '';
    renderAvatarGrid();
    showView('whoNew');
    document.querySelector('#whoNew [data-back]').classList.toggle('hidden', first);
  }
  function renderAvatarGrid() {
    const g = $('avatarGrid'); g.innerHTML = '';
    LA.avatars.list.forEach(a => {
      const b = document.createElement('button');
      b.className = 'avatar-pick' + (pending.avatar === a.id ? ' on' : '');
      b.title = a.name; b.setAttribute('aria-label', a.name);
      b.innerHTML = LA.avatars.html(a.id);
      b.addEventListener('click', () => { sfx.click(); pending.avatar = a.id; renderAvatarGrid(); });
      g.appendChild(b);
    });
  }
  $('nameNext').addEventListener('click', () => {
    const name = $('nameInput').value.trim();
    if (!name) { shake($('nameInput')); sfx.boing(); return; }
    if (!pending.avatar) { shake($('avatarGrid')); sfx.boing(); return; }
    sfx.click();
    pending.name = name; pending.step = 'pick';
    openPad(pending.avatar, 'Pick a secret code', '4 numbers only you know');
  });

  function startLogin(p) {
    pending = { mode: 'login', player: p };
    openPad(p.avatar, 'Hi ' + p.name + '!', 'Type your secret code');
  }
  function openPad(avatar, title, hint) {
    code = ''; drawDots();
    $('codeAvatar').innerHTML = LA.avatars.html(avatar);
    $('codeTitle').textContent = title;
    $('codeHint').textContent = hint;
    showView('whoCode');
  }

  function buildPad() {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];
    const pad = $('pad');
    keys.forEach(k => {
      const b = document.createElement('button');
      b.className = 'key' + (k === 'del' ? ' del' : k === 'ok' ? ' ok' : '');
      b.innerHTML = k === 'del' ? '&#9003;' : k === 'ok' ? '&#10003;' : k;
      b.dataset.k = k;
      b.setAttribute('aria-label', k === 'del' ? 'Delete' : k === 'ok' ? 'OK' : k);
      b.addEventListener('click', () => press(k));
      pad.appendChild(b);
    });
  }
  function press(k) {
    if (k === 'del') { code = code.slice(0, -1); sfx.click(); drawDots(); return; }
    if (k === 'ok') { if (code.length === 4) submit(); else { shake($('dots')); sfx.boing(); } return; }
    if (code.length >= 4) return;
    code += k; sfx.click(); drawDots();
    if (code.length === 4) setTimeout(submit, 180);
  }
  function drawDots() {
    [...$('dots').children].forEach((d, i) => d.classList.toggle('on', i < code.length));
  }
  function shake(el) {
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
    if (navigator.vibrate) try { navigator.vibrate(120); } catch (e) { /* ignore */ }
  }
  function wrong(msg) {
    shake($('dots')); sfx.boing();
    $('codeHint').textContent = msg;
    setTimeout(() => { code = ''; drawDots(); }, 350);
  }
  function submit() {
    if (code.length !== 4) return;
    if (pending.mode === 'login') {
      if (LA.players.checkCode(pending.player.id, code)) { LA.players.login(pending.player.id); welcome(); }
      else wrong('Oops! Not quite. Try again!');
      return;
    }
    // creating a player: type it, then type it again
    if (pending.step === 'pick') {
      pending.code = code; pending.step = 'confirm';
      code = ''; drawDots();
      $('codeTitle').textContent = 'Type it again';
      $('codeHint').textContent = 'Just to be sure!';
      sfx.bonus();
    } else if (code === pending.code) {
      LA.players.create(pending.name, pending.avatar, code);
      welcome();
    } else {
      pending.step = 'pick'; pending.code = null;
      $('codeTitle').textContent = 'Pick a secret code';
      wrong("Those didn't match. Pick your code again!");
    }
  }
  function welcome() {
    sfx.fanfare();
    pending = null; code = '';
    showArcade();
  }
  document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => { sfx.click(); showWho(); }));

  // ================= ARCADE =================
  function showArcade() {
    const me = LA.players.current();
    if (!me) { showWho(); return; }
    $('who').classList.add('hidden'); $('arcade').classList.remove('hidden');
    $('meAvatar').innerHTML = LA.avatars.html(me.avatar);
    $('hiName').textContent = 'Hi ' + me.name + '!';
    $('shelfOwner').textContent = me.name + "'s Trophy Shelf";
    renderGames(); renderShelf();
  }
  $('switchBtn').addEventListener('click', () => { sfx.click(); LA.players.logout(); showWho(); });

  function renderGames() {
    const box = $('games'); box.innerHTML = '';
    LA.games.forEach(g => {
      const el = document.createElement(g.comingSoon ? 'div' : 'a');
      el.className = 'tile' + (g.comingSoon ? ' soon' : '');
      el.style.setProperty('--c', g.color || '#ff8a3d');
      if (!g.comingSoon) {
        el.href = g.url;
        el.addEventListener('click', () => sfx.click());
      }
      let stats = '';
      if (!g.comingSoon) {
        const s = LA.store.stats(g.id);
        stats = s.pops ? '<div class="stats">Best ' + s.best + (s.fastest ? ' &middot; ' + s.fastest + 's pop' : '') +
          ' &middot; ' + s.pops + ' pop' + (s.pops === 1 ? '' : 's') + '</div>' : '<div class="stats">Not played yet</div>';
      }
      el.innerHTML =
        '<div class="thumb">' + (g.thumb ? '<img src="' + g.thumb + '" alt="">' :
          '<svg viewBox="0 0 100 100"><rect x="22" y="44" width="56" height="42" rx="8" fill="#fff" opacity=".9"/><path d="M34 44 V32 a16 16 0 0 1 32 0 V44" stroke="#fff" stroke-width="8" fill="none" opacity=".9"/><circle cx="50" cy="62" r="6" fill="#8a8fa8"/><rect x="47" y="62" width="6" height="12" rx="3" fill="#8a8fa8"/></svg>') +
        '</div><div class="title">' + g.title + '</div><div class="tag">' + g.tagline + '</div>' + stats;
      box.appendChild(el);
    });
  }

  function renderShelf() {
    const list = LA.store.trophies();
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
    $('muteBtn').innerHTML = sfx.isMuted()
      ? '<svg viewBox="0 0 24 24"><path d="M3 9 H7 L12 4 V20 L7 15 H3 Z" fill="#fff"/><path d="M16 9 L22 15 M22 9 L16 15" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M3 9 H7 L12 4 V20 L7 15 H3 Z" fill="#fff"/><path d="M15.5 8.5 Q18 12 15.5 15.5 M18.5 6 Q22.5 12 18.5 18" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>';
  }
  $('muteBtn').addEventListener('click', () => { sfx.toggleMute(); setMuteIcon(); sfx.click(); });

  buildPad();
  setMuteIcon();
  if (Q.get('switch') === '1') LA.players.logout();
  if (LA.players.current()) showArcade(); else showWho();
  // refresh stats/trophies when coming back from a game (also from the back/forward cache)
  window.addEventListener('pageshow', () => { if (LA.players.current()) showArcade(); else showWho(); });
})();
