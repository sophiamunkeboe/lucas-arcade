# Lucas's Arcade

Lucas's own game room, made by Lucas and his dad. It's a phone web app: open it, tap
**Share > Add to Home Screen** (iPhone) or **Add to Home screen** (Android), and it gets its
own icon and works offline.

## Players ("Who's playing?")
Each launch starts at **Who's playing?**. Tap your picture and type your 4-digit secret code on
the number pad (a wrong code just wiggles, there's no lockout). **Add Player** makes a new
player (name, picture, secret code typed twice). Every player has their own Trophy Shelf and
their own best score (per game), fastest pop, and total pops/rounds. The home screen says "Hi Lucas!" and has a
**Switch player** button.

Everything stays on the device in localStorage: no server, no email, no passwords, nothing sent
anywhere. The code is stored scrambled, but this is a kid-friendly "whose turn is it", not real
security. Trophies won before logins existed went to the first player created.

## Games

| Game | Folder | What it is |
|---|---|---|
| **Pop the Dog** | `games/pop-the-dog/` | Toss popcorn from the recliner to Bella or Marley. Every catch puffs her up until she goes **POP!** and you win a prize. |
| **Fetch Frenzy** | `games/fetch-frenzy/` | Throw a ball, frisbee, stick or cheeseburger for Bella, Marley or Gorda. Catch it mid-air for big points, dodge the toy thief, puddles and squirrels, fill the meter and win a prize. |
| *Coming soon* | | Lucas's next idea! |

### Pop the Dog
- Pick **Bella** (fluffy Goldendoodle, famous RBF face when you miss) or **Marley** (chubby, slobbery American Bulldog in her #4 Suns-style jersey; her drool gives a **slobber bonus**, and fur floats off her).
- **Swipe up** from the bowl to flick popcorn (or **tap** where you want it to go).
- The bigger she gets, the more she wiggles side to side.
- **Tricks:** Shake, Sit, Stay, Speak, Roll Over, Sit Pretty. When she finishes, toss her a treat for a **GOOD DOG** bonus. Sometimes she asks for a trick herself, and doing the one she asked for gives extra points.
- Stop tossing popcorn and she starts whimpering and begging. She barks too (Bella yips higher, Marley barks lower and gruffer).
- Fill the **POP METER**, she pops into popcorn and confetti (and comes right back, totally fine), and a prize card flips over. Prizes go on the **Trophy Shelf** on the home screen.
- **Gorda**, Marley's sister (brindle bulldog, pink collar), naps on the couch in the background: she snores, twitches her ears, lifts her head to watch the popcorn, and perks up when the dog pops. In Marley's game she sometimes gets the zoomies (every ~30-45 s, and once just after Marley comes back from a POP): she stretches, hops down, runs 2 laps around Marley (behind her on the far side, in front on the near side), does a play bow while Marley turns her head to watch and barks, then jumps back on the couch and naps. Popcorn that hits her just bounces off (no points lost). Debug: `?debug=mid&dog=marley&freeze=0.02&zoomies=<seconds>`. On the floor Gorda is full size (about 88% of Marley's size, with only mild +/-10% depth scaling).
  - **Cleanup crew** (both games): missed popcorn stays on the floor (a tiny popcorn counter shows how many). When 10 pieces pile up, Gorda wakes ("Cleanup crew!"), hops down and runs to the nearest piece each time, sniffing and chomping each one with a little crunch, then says "Gorda: nom nom!" and goes back to nap on the couch. It takes about 10 s at most (if there are lots of pieces she slurps up the rest). No points lost or gained, the floor counter resets, and in Marley's game zoomies wait until the cleanup is done. Debug: `?debug=mid&dog=marley&freeze=0.02&cleanup=<N fake misses>&ct=<seconds into the cleanup>`. Not playable yet!
- All sounds are made in code (Web Audio). The speaker button mutes them.

### Fetch Frenzy
- **Setup screen:** pick a dog (**Bella** is the fastest runner, **Marley** in her #4 Suns-style jersey jumps the highest, **Gorda** - now playable! - mostly ignores squirrels), a place (**Backyard**, **Park**, **The Lake** with big red and grey rocks, calm water and a cloudy sunset like Bella's puppy photo, or the purple + orange **Basketball Court**), and a toy (**Ball**, **Frisbee**, **Stick**, silly **Cheeseburger**). The round buttons at the top switch toys while the toy is in your hand.
- **Swipe up** to throw: a longer/faster swipe throws farther, and the swipe direction aims. Mouse drags work too.
- Your dog runs out, catches it **mid-air** (big bonus, biggest for the frisbee) or picks it up, and runs it back. Points for distance, a **Speedy!** bonus for fast returns, and a **combo** for fetches in a row.
- As the **FETCH METER** fills it gets harder: **squirrels** distract your dog (tap the squirrel: "Shoo!"), **muddy puddles** slow her down (splash, muddy paws), and a **toy thief** races for the toy: Gorda, or the neighbor's dog **Biscuit** when Gorda is playing. Tap the thief for "Leave it!" (or "Drop it!" if she already has it). A steal resets the combo and you get a new toy.
- Fill the meter (about 60-90 s) and a prize card flips: Sunglasses, Dirtbike, Sports Car, Computer, X BOX, $1 Bill, $50 Bill, Milkshake, or... Trash Bags. Prizes go on the player's Trophy Shelf, and the tile shows the best score and rounds played.
- Sounds: throw whoosh, paw patter, catch chomp, barks in each dog's voice, splash, squirrel chatter, the thief's playful "grr-RUFF!", prize fanfare.
- Testing: `games/fetch-frenzy/index.html?debug=select|play|air|thief|puddle|squirrel|prize|fast|real` with `&dog=bella|marley|gorda`, `&place=backyard|park|lake|court`, `&toy=ball|frisbee|stick|burger`, `&p=0.5` (meter part-full), `&prize=<id>`, `&after=<s>`. The scene ones set up the moment and freeze it for screenshots; `fast` is a quick full round that still saves the trophy.

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
  gorda.js            Gorda, the background couch dog
  dogs.js             Bella + Marley drawn in parts (legs, tail, head...) + poses + tricks + outfits
  game.js             the game itself
games/fetch-frenzy/   the Fetch Frenzy game
  runners.js          side-view running dogs (Bella, Marley, Gorda, Biscuit) on one shared rig
  scenes.js           the 4 places, the toys and the squirrel
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
