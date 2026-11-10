# Lucas Hoops

Original, kid-friendly 2D basketball for Lucas's Arcade. Canvas art and synthesized Web Audio; the bundled, renamed ASCII subset of Press Start 2P is licensed under SIL OFL (see FONT-LICENSE.txt). No CDNs, social links, accounts, analytics or paid assets.

## Play

- **Quick Game:** 90 seconds, 1v1 CPU, 14-second possession clock. You attack the right basket. Two-point field goals; three beyond 258 court units. Play again on a tie (no overtime).
- **Shootout:** exactly 60 active seconds. Five cycling long-range spots; movement is constrained behind the three-point line. Misses auto-return the ball. Released shots may finish after the buzzer.
- **Move:** touch arrows, A/D or left/right arrow keys.
- **Shoot:** hold the orange button, Space or J; release when the meter reaches the green end (about 0.6 seconds). Near the basket a tap dunks. Without possession, tap to jump and block.
- **Pass / Steal:** E or K / blue button. Steal near a ball handler; with possession, a pass fake grants a brief speed boost (there is no teammate in 1v1).
- **Pause:** P / Escape or the top-left button. Switching apps / hiding the page pauses automatically. Clock and simulation stop while paused.

Rookie, Baller and All-Star affect CPU speed, defense, shooting and the perfect-release window. Scores and sound/difficulty settings are stored only in localStorage; storage-disabled/private mode is safe but may not retain scores. The arcade's active player also gets a completed-round result.

## Implementation

960x540 canvas, cached static arena background, procedural pixel sprites. Ball gravity, damped floor/board/rim collisions with two substeps; descending crossings of the hoop score. Rebounds, blocks, dribble cadence, particle celebrations, buzzer-beaters and alternating possessions. No downloaded audio.

The parent service worker caches HTML/CSS/JS/font/thumbnail at version **lucas-arcade-v13**. A standalone first visit also registers that root worker, so the game works offline once installation completes.

## Test / deploy

`python3 tools/hoops-play.py` starts its own HTTP server and runs headless Chrome. It uses real keyboard input for a made shot, early misses, a full 60-second shootout, a drive/dunk, CPU attack, pause/rematch, the actual arcade tile, offline reload/play, and real CDP two-finger touch input at 844x390. Screenshots go in `screens/`. `--live` runs the same checks against production.

Deploy the static site using the existing root `netlify.toml` site ID. Exclude `.git`, `.netlify`, tooling and test screenshots from the staging directory.

## Intentional limits

Arcade-style physics and CPU, not a rules-complete basketball simulation. One player vs CPU or solo shootout; no multiplayer or teammates. No fouls, out-of-bounds calls, team selection, online leaderboard or overtime. Real-device Safari / Android performance and audio have not been physically tested; mobile is covered by Chrome touch emulation.
