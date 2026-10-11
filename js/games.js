/* Lucas's Arcade - THE GAMES LIST.
   To add a new game:
     1. Make a folder games/<your-game-id>/ with an index.html inside.
     2. Add an entry below (copy the Pop the Dog one).
     3. Add the new files to the FILES list in sw.js so they work offline. */
window.LA = window.LA || {};
window.LA.games = [
  {
    id: 'pop-the-dog',
    title: 'Pop the Dog',
    tagline: 'Feed the pup popcorn till she POPS!',
    url: 'games/pop-the-dog/index.html',
    thumb: 'games/pop-the-dog/thumb.png',
    color: '#ff8a3d',
  },
  {
    id: 'fetch-frenzy',
    title: 'Fetch Frenzy',
    tagline: 'Throw it, catch it, bring it back!',
    url: 'games/fetch-frenzy/index.html',
    thumb: 'games/fetch-frenzy/thumb.png',
    color: '#31c46c',
    statWord: 'round',           // tile says "Best 812 · 3 rounds"
    noFastest: true,
  },
  {
    id: 'coming-soon',
    title: 'Coming soon',
    tagline: "Lucas's next big idea!",
    comingSoon: true,
    color: '#8a8fa8',
  },
];
