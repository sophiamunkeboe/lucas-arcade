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
| **Bella's Blackjack** | `games/blackjack/` | You vs Bella the dealer (in a tuxedo) at a Las Vegas casino table. Pretend chips only. |
| **Poker Table** | `games/poker/` | Texas Hold'em for 2 to 6 players, each on their own phone, using a 4-letter table code. Pretend chips only. Needs internet. |
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

### The casino (Blackjack + Poker)
Both card games are set in a fancy Las Vegas casino: dark room, chasing gold marquee bulbs, green felt tables with a
padded rail, and dog dealers in tuxedos (Bella deals Blackjack, Marley deals Poker). The walls have glowing **neon signs**
made from the family's five business logos (Arizona Event Rentals, Munkeboe Party Rentals, Special Events Table Linens,
Taylor Equipment and Event Rentals, Thank Q Rentals). The signs slowly rotate, hum, and one now and then flickers.
`tools/make-neon.py` turns `art/logos/*.png` into `art/neon/<id>-on.webp` (lit) and `-off.webp` (unlit, for the flicker):
it removes backgrounds, keeps proportions, outlines bold letters as tubes, adds glow + a white-hot core on a dark plate.
Preview: `screens/91-neon-signs.png`.

### Bella's Blackjack
- Bet with pretend chip buttons (10 / 25 / 100 / 500), then **Hit**, **Stand**, **Double** (first two cards) or **Split** (one split; split aces get one card each).
- 4-deck shoe, Blackjack pays 3 to 2, Bella stands on all 17s and peeks for Blackjack.
- Bust and you get Bella's famous **RBF**. She barks when you win.
- Chips are saved per player (start with 1,000; a refill button appears when you're out). The tile shows your best chip total.
- **Prize card** (card-game prize list: Golden Chip, Lucky Dice, Crown, Royal Flush, Magic Top Hat, Champion Cup, plus Stack of Cash, Sunglasses and Sports Car) every 5 hand wins and the first time you reach 2,500 / 5,000 / 10,000 chips.
- Testing: `?debug=play | bust | bj | split | prize | broke` (no login needed, nothing saved).

### Poker Table (2 to 6 phones)
- One player taps **Create a table** and gets a 4-letter code. Friends open Poker Table on their own phones and type it.
  Anyone can join until the table is full (6) or the host taps **Start**. The host can also let people join between hands.
- Full Texas Hold'em: dealer button and blinds (10/20) move around the table, preflop/flop/turn/river, fold/check/call/bet/raise/all-in,
  main pot + side pots when people are all-in for different amounts, split pots, busted players are skipped,
  **Next hand** button. Win all the chips to win the table (and a prize card); **Rematch** starts over.
- Players who leave are folded and skipped; someone away for more than ~75 s on their turn is checked/folded automatically.
  Close the page and come back: your seat is remembered on this phone.
- **Playing with friends needs internet.** Offline the Create/Join buttons are off and a note points to Play vs Dogs.

**Play vs Dogs** (one player, works offline - nobody else needed):
- Tap the pink **Play vs Dogs** button, pick 1-5 dogs and a difficulty: **Puppy** (easy), **Good Dog**, **Top Dog** (hard).
  Default table: Bella, Marley (in her #4 jersey) and Gorda. Extra dogs: Biscuit (the neighbor's golden dog) and Waffles the corgi.
- Everyone starts with 1,000. Take ALL the dogs' chips to win a prize card for the Trophy Shelf; run out and it's **Rematch**.
  Wins vs dogs are saved per player and shown on the setup screen.
- The dogs: **Bella** is tight and careful and gives her RBF when she folds or loses. **Marley** is loose and goofy, bluffs,
  and slobbers when she wins. **Gorda** is sleepy: she snores and checks, and once in a while wakes up and goes ALL-IN.
  **Biscuit** plays solid; **Waffles** makes huge bets. They "think" for 0.6-1.5 s and talk in speech bubbles.
- How a dog decides: a preflop hand chart (Chen points), then after the flop a Monte Carlo estimate of its chance to win
  against the players still in (60 / 160 / 400 random run-outs for Puppy / Good Dog / Top Dog), pot odds, its personality,
  and a bit of randomness (Puppy also makes silly mistakes).
- **Same rules as the online table.** `games/poker/engine.js` is a line-by-line JavaScript port of `supabase/poker.sql`
  (blinds, button, betting, min-raise, side pots, odd chips, hand scores). `node tools/poker-parity.mjs sim` replays the
  4-way side-pot hand from the server tests and plays thousands of random hands checking that chips always add up;
  `hands`/`check` compares the hand evaluator with the database's `poker.eval7` (606/606 identical).
- **The dogs can't peek.** A dog only ever gets `PokerEngine.view(table, itsSeat)`: the same view a phone gets from the
  server - its own two cards, the board, stacks and bets. Never your cards, never the deck.
- Files: `engine.js` (rules), `bots.js` (dogs + faces), `local.js` (runs the table on the phone), `game.js` (the same table UI for both).
- Testing: `?dogs=1` opens the setup screen, `?dogs=go` deals right away; add `&debug=fast` (dogs act instantly),
  `&force=bella:fold`, `&freeze=4` (dogs stop after 4 moves, bubbles stay), `&rig=win` (you always get the aces).

**How the server keeps cards secret** (Supabase project `xmxztvljmuniuojlvcxv`, SQL in `supabase/poker.sql`):
- Tables live in a private `poker` schema that the public API doesn't expose. Row Level Security is on with a deny-all
  policy and no table grants, so nobody can read or change the tables directly.
- Every rule (shuffle, deal, betting, side pots, showdown) runs inside the database in SECURITY DEFINER functions.
  The browser can only call small `public.poker_*` functions.
- Each seat gets a random secret token when it sits down (stored only on that phone). Every call needs code + token.
  `poker_view` returns the public table (board, pot, stacks, bets, whose turn, last actions) plus **only your own** two cards.
  Other players' cards are sent only after a showdown. The deck is never sent.
- Realtime: after each change the server broadcasts just a version number on the public channel `room:CODE`;
  phones then re-fetch their own view. Phones also poll every few seconds, so nothing gets stuck.
- Tables idle for 24 hours are deleted (hourly `pg_cron` job + on create).

## How it's built
Plain HTML, CSS, and JavaScript with no build step and nothing loaded from a CDN (Poker talks to its game server).

```
index.html            arcade home (game buttons + Trophy Shelf)
css/arcade.css
js/games.js           THE GAMES LIST - add new games here
js/prizes.js          prize pictures (SVG) - add new prizes here
js/storage.js         players, trophies, stats + mute setting (all on the phone)
js/avatars.js         player pictures
js/sfx.js             all sound effects, including barks and whimpers
js/music.js           background music (made in code, see below)
games/pop-the-dog/    the Pop the Dog game
  gorda.js            Gorda, the background couch dog
  dogs.js             Bella + Marley drawn in parts (legs, tail, head...) + poses + tricks + outfits
  game.js             the game itself
games/fetch-frenzy/   the Fetch Frenzy game
  runners.js          side-view running dogs (Bella, Marley, Gorda, Biscuit) on one shared rig
  scenes.js           the 4 places, the toys and the squirrel
  game.js             the game itself
games/cards/          shared by the card games: cards.js/.css (playing cards), casino.js/.css (neon wall, felt, tuxedos)
games/blackjack/      Bella's Blackjack
games/poker/          Poker Table: game.js (UI), engine.js + bots.js + local.js (Play vs Dogs); server: supabase/poker.sql
js/vendor/supabase.js supabase-js (MIT), kept here so there's no CDN
art/logos/, art/neon/ family business logos and the neon signs made from them (tools/make-neon.py)
manifest.json, sw.js  make it installable + work offline
icons/                app icons
art/                  first character drafts
tools/make-icons.html redraws the icons from the dog art
screens/              screenshots
```

### Music
Every screen has its own original tune, generated in code with Web Audio (no song files, no copyrighted music, works offline):
arcade home = upbeat chiptune, Pop the Dog = bouncy and playful, Fetch Frenzy = sunny and outdoorsy,
Blackjack + Poker = smooth, swingy casino lounge. The tunes are written as note lists in `js/music.js` (TRACKS).
- The **music note** button next to the sound button turns music on/off (saved on this device). The sound button still mutes everything.
- Music starts after the first tap (iPhone rule), plays quietly under the sound effects, dips for POPs, wins and prize fanfares,
  fades in on each page and fades out when you tap to another page.
- Light on phones: one lookahead scheduler (a 100 ms timer that queues the next 0.4 s of notes on the audio clock).
  Nothing runs while muted, music off, or the app is in the background.

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
