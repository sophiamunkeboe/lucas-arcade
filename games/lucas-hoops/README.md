# Lucas Hoops v2 — Squad Up

Original kid-friendly pixel basketball for Lucas's Arcade. All art, geometry, sound and gameplay run locally. No CDNs, official league/team logos, sponsors, analytics or paid assets. The renamed ASCII pixel font is licensed under SIL OFL (FONT-LICENSE.txt).

## Modes and players

Quick Game offers **3v3 (default)**, **1v1** and **5v5**. 90-second matches, 14-second possession clock, two-point shots / threes beyond the arc. You attack the right hoop. Shootout is still a full 60 seconds of long-range shots, cycling spots after makes/misses. Released shots can finish after the buzzer.

Sunburst: Lucas (PG #1), Nova (SG #8), Rio (SF #23), Jett (PF #32), Enzo (C #14). Three-on-three uses Lucas, Nova and Enzo. Original Night Owls opponents: Milo, Zeke, Arlo, Finn and Atlas.

Lucas is a teen-inspired pixel captain with light skin, brown hair, a cream cap with purple SUNS block text, a friendly brace-lined smile and a black/purple/orange jersey. His lineup face, menu portrait, profile, game sprite and Shootout appearance use the same character renderer. All Sunburst uniforms share an original tiny sun motif, not official team artwork.

## Controls

- **Move:** floating virtual joystick appears wherever you touch the left half. Drag in any direction; let go to stop. Keyboard WASD / arrows.
- **Offense circles:** Shoot (hold/release, Space/J), Pass (E/K), Cross/Spin (Q), Sprint (hold, Shift).
- **Defense circles:** Block (Space/J), Steal (E/K), Charge (Q), Switch (R/Tab).
- **Shooting:** release at the full green meter (~0.6 seconds). A close-range tap dunks. Without possession the primary button jumps to block.
- **Passing:** point the stick toward an available teammate and tap Pass. It chooses the nearest teammate in that direction, with nearest-teammate fallback; the ball travels through the court and can be intercepted. Control follows a successful catch. In 1v1, Pass becomes a fake/crossover because there is no teammate.
- **Charge:** plant your feet before the dribbler reaches you. A moving opponent who collides after your feet are set draws an offensive foul and turns possession over. The plant lasts 1.8 seconds.
- **Switch:** selects the next defender, ordered by distance to the ball. The closest defender is selected automatically on a possession change; manual switching is respected for 2.5 seconds. The lineup highlights your current player.
- **Pause:** P/Escape or bottom-right pause. Hiding the page automatically pauses and suspends audio.

The four thin pixel-ring buttons accept separate pointer IDs, so movement and action buttons work simultaneously. Touch cancellation, lost capture and hiding the page clear held inputs safely. Scores/settings remain on the device and existing v1 records are retained.

## Arena and rendering

Wide, fixed full-court oblique 2D view with smaller players and real X/Y movement. Static light-maple parquet, purple paint, black/purple baselines, an original orange pixel sun-ball at center, invented retired numbers, orange LED decks and a dense dark crowd are cached into one canvas. A four-sided orange video cube displays score/clock, with deterministic camera-flash twinkles and original pixel crowd faces. The same arena is the menu intro background.

Ball simulation uses X/Y/Z gravity, a backboard plane, toroidal rim collision, rebounds, passes and jump-height blocks. Simulation substeps at 120 Hz; rendering remains one animation frame. AI spreads to wings, cuts to the basket, marks opponents, helps on drives, rebounds and passes to open teammates.

Synthesized dribble, rim, swish, buzzer, steal and cheer sounds need only the first tap to unlock Web Audio. Root service worker **lucas-arcade-v14** caches the folder URL, HTML, JS, CSS, font and thumbnail for standalone offline use after the first complete load.

## Tests

`python3 tools/hoops-play.py` runs a full real-input 90-second 3v3 game, a complete 60-second Shootout, made shots, a real directional pass/catch, contextual defense/switch, 1v1/5v5, pause/rematch, the actual arcade tile, offline reload/play and real two-finger diagonal joystick + shooting/switching in phone-size Chrome. It samples 120 animation frames in 5v5. Screenshots use `screens/v2-*.png`. `--live` checks production; HOOPS_SCREEN_DIR redirects production captures outside the checkout.

`python3 tools/hoops-mechanics.py` adds controlled physics/position fixtures with real keyboard actions for a steal, charge foul, block, pass-clock preservation, crossover, sprint, made 3v3 shot, rim, rebound, shot clock and buzzer-beater. Fixtures are test-only; no public cheat commands are added.

## Intentional limits

Arcade AI and physics, not a complete league simulation. No online multiplayer, free throws, off-ball foul rules, career mode, substitutions or overtime. Charge is the implemented foul type. Five-on-five is tested in Chrome phone emulation, not yet on a physical iPhone/Android device.
