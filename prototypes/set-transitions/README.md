# FitNES set transitions

Standalone visual prototype for moving between workout sets. It is not wired
into the app, and it does not log workouts.

## Launch

From this directory:

```bash
python3 -m http.server 8765
```

Open `http://127.0.0.1:8765/`. A phone-width column is centered on a black
page. On a narrow screen the column fills the width.

The page loads its font and sprite from `assets/`. It does not call a
network service.

## Navigate

The four buttons under the FitNES wordmark switch concepts. The address
hash does the same thing: `#a`, `#b`, `#c`, `#d`. Each concept remembers
its own place in the sample workout.

The sample is eight sets of bench press, 60 kg × 8. Set 1 starts already
logged, so the screen opens with a completed set, a current set, and an
upcoming set. **Complete set** advances. The button stays usable while the
320 ms step plays. **Train again** returns to that opening state.

## The hero sprite

`assets/hero-fighter.png` is a byte-for-byte copy of
`public/artwork/hero-fighter.png` from commit `f1bca218` (`add NES pixel
design system`). That file is not on the branch this prototype was built
from. It was read with `git show f1bca218:public/artwork/hero-fighter.png`
and was not checked out over the working tree.

The file is 92×132, RGBA, with alpha only at 0 or 255. It is one
south-facing stance: brown hair, white tank, blue pants, white shoes. It is
not a sprite sheet. Slicing it on a grid still shows pieces of the same
figure. The picture was not redrawn, recolored, or replaced. The page
scales it with `image-rendering: pixelated`.

The opaque fringe is anti-aliased against black, so every concept puts the
figure on black.

## Assumptions and animation limits

- There is no walk cycle. A step is a 320 ms, four-frame move: two pixels
  side to side while traveling down. Concepts A, B, and D travel onto the
  next marker. Concept C bobs downward while the floor scrolls up by two
  tiles, which lands on the same pattern it started from.
- The whole step is 320 ms. The next set can be completed again immediately.
  Reduced motion snaps the state and skips the step.
- The progress strip is the logged-sets bar from the workout screen: a white
  track and a gold stripe whose width is sets logged. It is not a new meter.
- VT323 is the mixed-case face. It was already vendored in `f1bca218` at
  `public/fonts/vt323-regular.ttf` (SIL Open Font License, see
  `assets/fonts/OFL.txt`). The FitNES HUD face only has uppercase tiles, which
  is the readability problem this prototype is not supposed to repeat.
- Short labels use uppercase. Exercise names, set lines, weights, and the
  action stay in mixed case.
- Colors are the FCEUX palette entries the app and the workout dashboard
  already use: black `$0F`, blue `$02`, white `$30`, gold `$28`, slate `$0C`,
  brown `$08` for the active set, green `$2A` for a passed lamp.

## Comparison

The current set is a brown window in A–C, the same brown the dashboard uses
for the active row. D puts that text in a blue bay inside the shaft. The
gold stripe is the whole-workout bar in every concept.

### A — Stations

A short tiled floor. Three plates: logged, the plate under the hero, and
the next plate. Completing a set walks him down onto the current plate and
compresses the logged line.

Strengths: the walk reads as changing station, and the floor stays short
enough that the set window still dominates. The plates do not try to be
equipment.

Weaknesses: the floor is a second progress display next to the stripe and
the logged line, so a 20-set session repeats the same three plates. The
room is the most literal of the four and the easiest to overbuild later.

### B — Path

A seven-stone trail in a narrow column, hero on the middle stone, text
beside it. Stones behind him are passed, the gold stone is the current set,
stones below are ahead. The window moves with him, so a long workout never
draws every set.

Strengths: southward progress is the clearest of the four, and it still
fits a portrait phone because the trail does not run sideways. The stripe
can stay as the session total while the trail is only the local step.

Weaknesses: the column costs width the numbers want. After many sets the
step can feel like nudging a token down a track. It is the most “map” of
the four, which the workout does not otherwise need.

### C — Cue

Almost the whole screen is the set. A black slot between the logged line
and the current set holds the hero. On complete he takes a short step, the
floor scrolls south, the finished line collapses, and the next set drops
into the window.

Strengths: the active set stays huge and readable. The step costs one fixed
slot, so repeating it twenty times does not accumulate scenery. It is the
smallest thing to build for real: one sprite, one stepped move, the logged
line, and the existing stripe.

Weaknesses: he does not remain on a route, so the walk is a cue rather than
a place. If the slot is too quiet between sets, it can look like a blank
band until it moves.

### D — Shaft

Blue side rails, dark bulkheads, three lamps. The hero stands on the lit
checkpoint and walks down to the next one. The set sits in a blue bay under
the shaft. The stripe still counts the session; the lamps only mark logged,
now, and next.

Strengths: it is the most specific to FitNES. The downward route matches a
portrait phone, and the lamps give the step a target without drawing a gym.

Weaknesses: the shaft and the bay compete. The industrial frame is doing
more work than the set change, and it will get noisy if the lamps or rails
grow. Harder to keep restrained once it leaves a prototype.

## Recommendation

Pursue **C — Cue**, and borrow the arrival beat from A.

C wins the questions that matter while a set is in your hand: the active
prescription stays dominant, the type stays large, the step is short and
downward, and the twentieth repeat costs the same space as the first. It
still feels like a game because the figure actually changes place for the
length of the step and the floor moves with him, instead of a panel simply
growing. A’s station plates communicate “I went to the next set” more
plainly, but they spend a band of the screen on a marker that does not get
richer as the workout goes on. If a later pass wants that clearer spatial
beat, add a single plate under the cue slot rather than a room or a shaft.

B is the right reference if the product later wants persistent position.
D is the right reference for color and materials, not for layout.
