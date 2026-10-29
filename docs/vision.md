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

## Preview in use

The owner uses [the compact preview](https://feat-compact-workout-ui.fitnes-preview.pages.dev/)
to evaluate the model. Its appearance is temporary.
Preserve its real workout data before clearing storage or replacing the
deployment; moving to another origin requires an explicit data transfer.
