# Product vision

FitNES is a personal, offline-first PWA for logging workouts on a phone. Keep
workout data on-device and core flows usable without a connection.

## Workout experience

Recording work during training must be quick. Exercise names, planned work,
actual performance, actions, and session progress must be readable on a phone.

The existing model is a good starting point. Preserve its measurement and load
meanings when designing the interface; raise concrete gaps separately.

Use top-down character movement between sets to communicate workout progress.

## NES visual contract

The interface should feel like an NES game menu built for training. Follow
actual NES palette, tile, background attribute, and sprite constraints. Use a
256-pixel logical content width; pages may extend vertically and scroll.
Preserve crisp pixel art when scaling for a device.

Owner decision (2026-11-04): pattern-bank/tile-count capacity is outside this
visual contract; colors and resolution remain constrained by actual NES
hardware. Legitimate hardware features such as MMC5 extended 8×8 attributes
and PPUMASK color emphasis may be used with an explicit construction and
reproduction proof. RGB must use a documented display interpretation of PPU
codes, rather than treating one emulator's RGB table as the only possible NES
output. Mid-frame palette rewrites need a verified timing/blanking plan before
approval. The [hardware proof verifier](../tools/nes-hardware/README.md) records
supported profiles and their limits.

**Only the owner may approve a visual exception for UX.** Demonstrate the
readability or interaction problem, explain the constraint, and propose
alternatives. Keep the constraint in force until the owner decides. Record an
approved exception's rationale, affected rule, and scope here.

Visual fidelity does not require an NES emulator, CPU timing, audio hardware,
or controller-only input. Research and prototypes are candidates until the
owner adopts them.

## Design direction

Aim for the detail and finish of a well-made NES game. Use the **rightmost
charcoal/steel design** in the [style reference](style-reference.png) as the
art reference. Carry forward its dark panels, steel frames, shaped
corners, rivets, industrial gym scenery, and warm logo/character accents. Adapt
texture and shading to NES constraints while retaining depth, silhouettes, and
contrast.

Reserve elaborate metal framing for top-level panels. The approved frame uses
4-pixel metal bars, riveted H-style corners with only the outermost corner
pixel cut off, and a 2-pixel black surround. The reusable
[SteelPanel component](../src/components/SteelPanel/README.md) implements this
border. The [selected bottom tabs](../src/components/BottomTabs/README.md)
provide the six adopted 24×24 icons and 256×56 steel bar. These components are
adopted building blocks; full-screen layout and typography remain open.

Use the [final home artwork's indexed palette and emphasis](../art/home/construction.json)
as the material-color reference for future icons and steel panels. Validate
their combined screen's shared palettes and budgets before adopting a
composition. Use the [standalone FitNES logo](fitnes-logo.png) as the logo
source and [the original home reference](reference-home-screen-image.png) as
composition provenance.

Use the [menu capture](https://capture-487s.dw3-capture-preview.pages.dev/)
as a navigation design reference: show a few choices, then expose further
options through subsequent menus, keeping workout interaction quick. It is an
adopted design reference, not a dogfooded UI.

Use the [corridor capture](https://feat-corridor-transition.fitnes-corridor-capture-preview.pages.dev/)
and the [corridor source package in #22](https://github.com/eduter/fitnes/pull/22)
for a thin, top-down corridor on black, traversed by the character between sets
through doors that represent workout sets. The source package records the
whole-workout corridor direction and character F as provisional; timing and
interaction details were deferred for later work. Preserve those decisions
while planning integration; the PR is still pending.

The owner confirms that the [compact workout preview](https://feat-compact-workout-ui.fitnes-preview.pages.dev/)
is the only dogfooded UI and the behavioral reference for the new application.
Use its workout flows, including compact logging, previous-performance display,
and navigation, as behavioral evidence while building the new UI around the
selected art and components above. Its appearance is temporary and its source
branch is not a complete UI specification.

The proposed [reusable controls in #24](https://github.com/eduter/fitnes/pull/24)
and [corridor design sources in #22](https://github.com/eduter/fitnes/pull/22)
are pending PRs, not yet adopted in main. The corridor's timing and detailed
interaction remain open for implementation planning. See the
[repository inventory](repo-status.md) for source status and the
[reference notes and captures](references/README.md) for retained materials,
and the [backlog](backlog.md) for next work.

## Preview data

Preserve the compact preview's real workout data before clearing storage or
replacing its deployment. Moving to another origin requires an explicit data
transfer.
