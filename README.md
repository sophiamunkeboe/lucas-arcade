# Lucas's Arcade

Lucas's own game room, made by Lucas and his dad. It's a phone web app: open it, tap
**Share > Add to Home Screen** (iPhone) or **Add to Home screen** (Android), and it gets its
own icon and works offline.

## Players ("Who's playing?")
Each launch starts at **Who's playing?**. Tap your picture and type your 4-digit secret code on
the number pad (a wrong code just wiggles, there's no lockout). **Add Player** makes a new
player (name, picture, secret code typed twice). Every player has their own Trophy Shelf and
their own best score, fastest pop, and total pops. The home screen says "Hi Lucas!" and has a
**Switch player** button.

Everything stays on the device in localStorage: no server, no email, no passwords, nothing sent
anywhere. The code is stored scrambled, but this is a kid-friendly "whose turn is it", not real
security. Trophies won before logins existed went to the first player created.

## Games

| Game | Folder | What it is |
|---|---|---|
| **Pop the Dog** | `games/pop-the-dog/` | Toss popcorn from the recliner to Bella or Marley. Every catch puffs her up until she goes **POP!** and you win a prize. |
| *Coming soon* | | Lucas's next idea! |

### Pop the Dog
- Pick **Bella** (fluffy Goldendoodle, famous RBF face when you miss) or **Marley** (chubby, slobbery American Bulldog in her #4 Suns-style jersey; her drool gives a **slobber bonus**, and fur floats off her).
- **Swipe up** from the bowl to flick popcorn (or **tap** where you want it to go).
- The bigger she gets, the more she wiggles side to side.
- **Tricks:** Shake, Sit, Stay, Speak, Roll Over, Sit Pretty. When she finishes, toss her a treat for a **GOOD DOG** bonus. Sometimes she asks for a trick herself, and doing the one she asked for gives extra points.
- Stop tossing popcorn and she starts whimpering and begging. She barks too (Bella yips higher, Marley barks lower and gruffer).
- Fill the **POP METER**, she pops into popcorn and confetti (and comes right back, totally fine), and a prize card flips over. Prizes go on the **Trophy Shelf** on the home screen.
- All sounds are made in code (Web Audio). The speaker button mutes them.

## How it's built
Plain HTML, CSS, and JavaScript with no build step and nothing loaded from the internet.

```
index.html            arcade home (game buttons + Trophy Shelf)
css/arcade.css
js/games.js           THE GAMES LIST - add new games here
js/prizes.js          prize pictures (SVG) - add new prizes here
js/storage.js         players, trophies, stats + mute setting (all on the phone)
js/avatars.js         player pictures
js/sfx.js             all sound effects, including barks and whimpers
games/pop-the-dog/    the Pop the Dog game
  dogs.js             Bella + Marley drawn in parts (legs, tail, head...) + poses + tricks + outfits
  game.js             the game itself
manifest.json, sw.js  make it installable + work offline
icons/                app icons
art/                  first character drafts
tools/make-icons.html redraws the icons from the dog art
screens/              screenshots
```

### Add a new game
1. Make a folder `games/<new-game>/` with an `index.html`.
2. Add it to `js/games.js`.
3. Add its files to `FILES` in `sw.js` and bump `VERSION`.

### Outfits
Marley wears Lucas's pick: a purple and orange Suns-style fan jersey, number **4**
(`suns-jersey` in `OUTFITS` in `games/pop-the-dog/dogs.js`). To add another outfit, add an
entry to `OUTFITS` and set `outfit:` on the dog.

### Testing shortcuts
Add these to the Pop the Dog URL: `?debug=play`, `?debug=mid`, `?debug=pop`, `?debug=prize`,
`?debug=rbf`, `?debug=ask`, `?debug=trick&trick=rollover&tt=1.1`, `&dog=marley`,
`&freeze=1.5` (stop the action at 1.5 s), and `?debug=fast` (the POP METER fills fast).
On the home page, `?debug=shelf` shows sample trophies.
