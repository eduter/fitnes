# Product vision

FitNES is a personal, offline-first PWA for logging workouts on a phone.
Keep workout data on-device and core flows usable without a connection.

## Workout experience

Recording work during training must be quick. Exercise names, planned work,
actual performance, actions, and session progress must be readable on a phone.

The existing model is a good starting point. Preserve its measurement and load
meanings when designing the interface; raise concrete gaps separately.

Explore a character moving as the workout advances. This does not imply XP,
levels, rewards, combat, or a persistent map.

## NES visual contract

The interface should feel like an NES game menu built for training. Follow
actual NES palette, tile, background attribute, and sprite constraints.
Use a 256-pixel logical content width; pages may extend vertically and scroll.
Preserve crisp pixel art when scaling for a device.

**Only the owner may approve a visual exception for UX.** Demonstrate the
readability or interaction problem, explain the constraint, and propose
alternatives. Keep the constraint in force until the owner decides.
Record an approved exception's rationale, affected rule, and scope here.

Visual fidelity does not require an NES emulator, CPU timing, audio hardware,
or controller-only input. Research and prototypes are candidates until the
owner adopts them.

## Design direction

NES compliance alone is not sufficient: the art should have the deliberate
detail and finish of a well-made NES game. The owner's preferred mood reference
is the **rightmost image** in
[this shared FitNES showcase](https://chatgpt.com/s/m_6aea3a709a188191894ab84e01827e0b).
Use it for atmosphere and visual richness, adapting its modern level of detail
to the console's constraints. Its presence in the repository is not yet verified;
do not assume another concept sheet is the same reference.
The [repository inventory](repo-status.md) locates the concept art and existing
asset candidates.

The owner selected these references on 2026-11-03:

- [Menu capture](https://capture-487s.dw3-capture-preview.pages.dev/): show a few
  choices, then expose further options through subsequent menus. Preserve quick
  workout interaction. The reference's simple border does not establish the
  desired appearance; frames and graphics need further art direction.
- [Corridor capture](https://feat-corridor-transition.fitnes-corridor-capture-preview.pages.dev/):
  use the **top-down view**, with a character moving through the environment,
  for transitioning between sets. Develop the graphics for FitNES. The owner
  rejected the separate first-person corridor animation for this flow. The
  older four transition concepts are historical alternatives. Exact timing,
  interaction, and final artwork remain to be designed.

These directions do not grant visual exceptions or approve an entire existing
UI branch.

## Preview in use

The owner uses [the compact preview](https://feat-compact-workout-ui.fitnes-preview.pages.dev/)
to evaluate the model. Its appearance is temporary.
Preserve its real workout data before clearing storage or replacing the
deployment; moving to another origin requires an explicit data transfer.
