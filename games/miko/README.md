# MIKO: ZOOMIES (prototype, not on the arcade menu yet)

It's 3 AM, the house is dark, and Miko (the lion-cut lynx-point cat) has the zoomies. The game is a 60-second 3D
parkour run through the living room, hallway and kitchen. It runs on Three.js r186 and cannon-es 0.20, both vendored
in `vendor/` so nothing loads from a CDN, plus a Luckiest Guy title font in `fonts/` (Apache 2.0).

## Run locally
    cd lucas-arcade && python3 -m http.server 8000
    open http://localhost:8000/games/miko/
It's an ES module, so it has to be served over http and won't work from file://.

URL options: `?day=1` daytime, `?mode=sandbox` free roam (dev), `?dev=1` shows the free-roam link,
`?q=high|med|low|potato` force a quality level, `?noadapt=1`, `?fps=1` shows an fps / draw-call readout,
`?shot=start|close|overview|fall|combo|wallrun|maxzoom|freeze|end` sets up a screenshot scene.
Screens: `python3 tools/miko-shots.py` (writes `games/miko/screens/`). Soak test: `python3 tools/miko-play.py [q] [sandbox]`.

## Controls
Miko runs on his own. Drag on the left to steer: pull back to brake, push up to go faster. Tap JUMP, then tap it again
in the air for a double jump. Jump while touching a wall to wall-kick, and run into the curtains to climb them. TRICK
swats nearby objects, power-slides on the floor, or flips in the air. Turning hard at speed on the wood floor starts
a drift. When the human stirs, tap LOAF! (Keyboard: arrows/WASD, Space, F.)

## Files
- `js/miko.js`: the procedural cat rig and its animations (idle, walk, gallop, sneak, crouch, pounce/air, swat, sit/stare, loaf, freeze, tumble, climb, slide, drift, slow blink)
- `js/fur.js`: shell-fur shader (InstancedMesh, one instance per shell) plus a soft rim light
- `js/house.js`, `js/textures.js`: the house, procedural textures, lights, collision boxes and paw-print lines
- `js/controller.js`: cat movement (momentum, jumps, wall kicks, curtain climbing, drift, slide, wipe-outs)
- `js/physics.js`: knockable props in cannon-es; `js/fx.js`: particles and the motion-streak ribbon
- `js/zoomies.js`: the game mode (scoring, combos, MAX ZOOM, noise and the human, end screen); `js/audio.js`: Web Audio sounds
- `js/main.js`: renderer, adaptive quality, post FX (bloom, bokeh DOF on the close-ups, vignette/grain/aberration), camera, UI

To ship it: add a tile to `js/games.js`, add the files to `sw.js` FILES, and bump VERSION.
