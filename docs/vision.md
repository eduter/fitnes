# Product vision

FitNES is a personal, offline-first PWA for logging workouts on a phone.
Keep workout data on-device and core flows usable without a connection.

## Workout experience

Recording work during training must be quick. Exercise names, planned work,
actual performance, actions, and session progress must be readable on a phone.

The existing model is a good starting point. Preserve its measurement and load
meanings when designing the interface; raise concrete gaps separately.

Use top-down character movement between sets to communicate workout progress.

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

Aim for the detail and finish of a well-made NES game. Use the **rightmost
charcoal/steel design** in
[this FitNES showcase](https://chatgpt.com/s/m_6aea3a709a188191894ab84e01827e0b)
as the art reference; the comparison sheet is also attached in the project
discussion. Carry forward its dark panels, steel frames, shaped corners,
rivets, industrial gym scenery, and warm logo/character accents. Adapt texture
and shading to NES constraints while retaining depth, silhouettes, and contrast.

Use the [menu capture](https://capture-487s.dw3-capture-preview.pages.dev/)
for navigation: show a few choices, then expose further options through
subsequent menus, keeping workout interaction quick.

Use the [corridor capture](https://feat-corridor-transition.fitnes-corridor-capture-preview.pages.dev/)
for top-down character movement through the environment between sets. Develop
the graphics for FitNES; timing and interaction remain to be designed.

The [inventory](repo-status.md) locates useful existing code, artwork, and research.

## Preview in use

The owner uses [the compact preview](https://feat-compact-workout-ui.fitnes-preview.pages.dev/)
to evaluate the model. Its appearance is temporary.
Preserve its real workout data before clearing storage or replacing the
deployment; moving to another origin requires an explicit data transfer.
