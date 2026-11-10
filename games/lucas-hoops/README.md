# Lucas Hoops v2.2 — Sunburst Pep Rally

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


## Opening cinematic (v15)

A real **7.4-second canvas intro** runs before the menu: sweeping purple/orange lights and a presenting title; three synchronized between-the-legs dribbles; a tracked sprint; a slow-motion, flaming-ball dunk; rim/net/screen shake, sparks and crowd roar; and a logo slam with a bass drop, shockwave, embers and camera flashes. It uses the same Lucas cap/face/jersey renderer as gameplay, plus intro-only dribbling and overhead dunk poses.

Tap anywhere or press Space/Enter/Escape to skip; skipping stops the cinematic audio immediately. Later visits in the same tab/session play a **2.6-second** highlight version. **Replay Intro** on the menu always replays the full version. Hidden tabs freeze the intro; reduced-motion preferences reduce camera movement/shake.

Sound uses synthesized Web Audio and the game's saved sound setting. Browsers can block first-visit autoplay audio: **Tap for Sound** enables it without skipping the animation. **Sound Off** is honored, including a true master mute for already-playing sounds. Replaying from a menu tap can play the whole soundtrack. There are no downloaded video/audio files, extra animation loops or remote assets.

`python3 tools/hoops-intro-play.py` checks full playback and all three dribbles, real audio enable, mute, pointer/keyboard skip, session shortening, offline first-view playback, game handoff, and phone touch/performance. Screenshots: `screens/intro-dribble.png`, `intro-dunk.png`, `intro-logo-slam.png`. `--live` targets production; HOOPS_SCREEN_DIR keeps production images outside the checkout.

## Arena and rendering

Wide, fixed full-court oblique 2D view with smaller players and real X/Y movement. Static light-maple parquet, purple paint, black/purple baselines, an original orange pixel sun-ball at center, invented retired numbers, orange LED decks and a dense dark crowd are cached into one canvas. A four-sided orange video cube displays score/clock, with deterministic camera-flash twinkles and original pixel crowd faces. The same arena is the menu intro background.

Ball simulation uses X/Y/Z gravity, a backboard plane, toroidal rim collision, rebounds, passes and jump-height blocks. Simulation substeps at 120 Hz; rendering remains one animation frame. AI spreads to wings, cuts to the basket, marks opponents, helps on drives, rebounds and passes to open teammates.

## Pep band, arena audio and party lights (v16)

An original **126 BPM, eight-bar looping pep arrangement** layers marching snare/ghost rolls, bass drum, brass-synth stabs, bass line and handclaps. The bed is louder on menus and quiet in live play. Original organ phrases mark possession breaks, makes and timeouts. Dunks/horns duck only the pep bed; the victory fanfare or sliding sad trombone remains audible above it. All instruments, crowd vowels and noises are synthesized Web Audio, **without tracks, recordings or external audio downloads**.

Settings and the HUD have independent **SFX** and **🎶 music** switches, both on by default and saved in localStorage. Music OFF also mutes organ/fanfare cues; SFX OFF independently mutes dribbling and game/intro effects. First tap unlocks browser audio. Hiding the tab stops all scheduled sources, zeroes output and suspends the context; returning safely restarts the groove. Source sets are bounded and cleaned up, and noise uses one reused buffer.

Extra effects: sneaker squeaks on cuts/crossovers, backboard bangs, near-miss crowd “ooh,” streak-scaled cheers, synthesized two-syllable DE-FENSE/clap rhythms late in CPU possessions, referee whistles on charges, and an arena horn at the final buzzer. Charge remains the implemented foul type; there is no separate quarter simulation.

Five original colored spotlights—purple, orange, hot pink, cyan and gold—sweep in time with the music beat. Menus, dead balls and timeouts get stronger beams; live play is subtle and lights draw **behind players/HUD**. Buckets flash the crowd, threes get a multicolor sweep, and dunks/buzzer-beaters trigger full pulsing beams, confetti and video-cube flashes. A win gets a nine-second light show with additional confetti bursts. No rapid full-screen strobe: pulses are beat-limited, and reduced-motion preferences tone them down. Five pre-rendered cone canvases use additive blending; sustained slow frames reduce beams and confetti, recovering gradually.

Root service worker **lucas-arcade-v16** precaches the new audio/light modules alongside the existing intro, game, art, CSS, font, thumbnail and folder URL. Everything works offline after one complete load. Older cached HTML can safely load the new modules during an update.

## Tests

`python3 tools/hoops-audio-play.py` uses real Web Audio sample metering to verify independent toggles, settings persistence, quiet gameplay music, actual event-driven arena sounds, organ/fanfare/loss cues, music duck/recovery, hidden-tab source cancellation/suspension, made-three/dunk/buzzer/win lighting, offline audio/light modules, reduced-motion and forced-low-FPS adaptation. Position/clock fixtures use normal gameplay code and real keys. `--live` targets production. New screenshots: `screens/v16-light-show.png`, `v16-victory-show.png`, `v16-three-point-sweep.png`, `v16-pep-menu.png`.

`python3 tools/hoops-play.py` runs a full real-input 90-second 3v3 game, a complete 60-second Shootout, made shots, a real directional pass/catch, contextual defense/switch, 1v1/5v5, pause/rematch, the actual arcade tile, offline reload/play and real two-finger diagonal joystick + shooting/switching in phone-size Chrome. It samples 120 animation frames in 5v5. Screenshots use `screens/v2-*.png`. `--live` checks production; HOOPS_SCREEN_DIR redirects production captures outside the checkout.

`python3 tools/hoops-mechanics.py` adds controlled physics/position fixtures with real keyboard actions for a steal, charge foul, block, pass-clock preservation, crossover, sprint, made 3v3 shot, rim, rebound, shot clock and buzzer-beater. Fixtures are test-only; no public cheat commands are added.

## Intentional limits

Arcade AI and physics, not a complete league simulation. No online multiplayer, free throws, off-ball foul rules, career mode, substitutions or overtime. Charge is the implemented foul type. Five-on-five is tested in Chrome phone emulation, not yet on a physical iPhone/Android device.
