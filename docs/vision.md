# Product vision

FitNES is a personal, offline-first PWA for logging workouts on a phone.
The intended interface follows NES visual constraints and feels like a game
menu built for training. The usable compact preview is a way to test the
workout model; its appearance is not the product's visual direction.

## Core goals

- Record work quickly during a real workout, with readable targets and actuals.
- Keep workout data on-device in IndexedDB and usable without a connection.
- Install as a PWA and target Chrome on Android and desktop.
- Preserve the meaning of exercises, planned work, and recorded performances.
- Make NES aesthetics a structural design constraint, not a decorative skin.

## NES visual contract

Use a 256-pixel logical content width. Height may extend vertically and scroll;
the app is not restricted to one 256-by-240 screen.

Stay within actual NES visual constraints for palette use, tiles, background
attribute regions, and sprites. The existing renderer's baseline includes:

- 8-by-8 background tiles with two-bit color indexes.
- Four background subpalettes sharing a universal color, with three additional
  colors each; one background subpalette per 16-by-16 attribute region.
- Separate sprite palettes with transparency, and sprite size, count, and
  scanline limits. Do not count sprite colors as extra background colors.

Work in logical pixels and preserve crisp pixel art when scaling for a device.
Review the renderer's tile-bank and scrolling assumptions before adopting them.
Its current checker is not the final definition of correctness.

**Only the owner may approve bending a visual constraint for UX.** When a
constraint gets in the way of readability or interaction, demonstrate the
problem, explain the constraint, and propose an alternative. Keep the constraint
in force until the owner decides. Do not quietly weaken a validator, invent a
hardware exception, or treat a prototype's deviation as permission.

This is a browser workout app. Visual fidelity does not imply implementing an
NES emulator, CPU timing, audio hardware, or controller-only input.

## Workout experience

The interface must make the exercise, planned work, actual performance, and
session progress understandable while training. Support the model's different
measurement and load meanings rather than designing only for bilateral
weight-and-repetition sets.

The owner has expressed interest in a character moving as the workout advances.
That is a direction to explore. The exact movement, layout, animation, and
relationship to sets remain undecided. None of the four existing transition
concepts has been selected as the final design.

Do not infer requirements for XP, levels, rewards, combat, or a persistent map
from the NES direction or the character idea.

## Readability within the constraints

Design for the actual phone experience as well as native-resolution screenshots.
Workout values, exercise names, actions, and current state must be readable.
Investigate typography, case, hierarchy, and layout within the visual constraints
before proposing an exception.

An uppercase-only font, blue frames around every row, a particular typeface,
and a specific menu layout are not settled product requirements. Earlier agents'
research contains candidates, not owner approvals.

## Scope and next steps

The current model is a good starting point, not a mandate to redesign it around
a new mockup. Consolidate and review existing work before rebuilding it.

The immediate sequence is to establish the model baseline, capture these product
decisions, then review persistence and build the intended NES interface in small,
reviewable changes. Keep the existing preview available while that work happens.

See [decisions](product-decisions.md) for confirmed policies and open questions,
[repository status](repo-status.md) for existing work, and
[backlog](backlog.md) for the proposed integration order.
