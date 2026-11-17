# Product vision

FitNES is a personal, offline-first PWA for logging workouts on a phone. The
owner is its sole user. Keep workout data on-device and core flows usable
without a connection.

This document records product intent and durable design decisions. Code and
tests describe implemented behavior; the [backlog](backlog.md) records remaining
work. Do not use Vision as an interaction specification or a change log.

## Workout experience

Recording work during training must be quick. The owner should be able to see
what to do now, follow the set without mentally tracking time or repetitions,
and record actual performance with little interruption. Keep exercise names,
planned work, actual performance, actions, and progress readable on a phone.
Focus the training experience on the current set.

Workout sounds provide preparation, start, repetition/second pacing, and
completion cues so the owner can follow a session without watching the screen.
Keep their volume configurable, including silence. App-wide sound effects and
music remain undecided.

Workouts must support any ordered sequence of individual sets and rest,
including circuits, supersets, and interleaved exercises. Do not constrain the
sequence by grouping sets by exercise. Rest depends on the surrounding work;
it is distinct from preparation time for getting into position.

Historical records represent actual performance. Preparation and repetition
pace are execution settings, not historical performance.

Preserve the owner's real workout data and existing preview data when changing
storage or deployments. Moving to another origin requires an explicit data
transfer.

## NES visual contract

The interface should feel like an NES game menu built for training, with the
detail and finish of a well-made NES game. Follow actual NES palette, tile,
background attribute, and sprite constraints. Use a 256-pixel logical content
width, available screen height, and crisp pixel art when scaling.

Pattern-bank/tile-count capacity is outside this contract; colors and resolution
remain constrained by actual NES hardware. Legitimate hardware features such
as MMC5 extended 8×8 attributes and PPUMASK color emphasis may be used with an
explicit construction and reproduction proof. RGB must use a documented display
interpretation of PPU codes rather than treating one emulator's RGB table as
the only possible NES output. Mid-frame palette rewrites need a verified
timing/blanking plan before approval. See the
[hardware proof verifier](../tools/nes-hardware/README.md).

**Only the owner may approve a visual exception for UX.** Demonstrate the
readability or interaction problem, explain the constraint, and propose
alternatives. Keep the constraint in force until the owner decides. Record an
approved exception's rationale, affected rule, and scope here.

Visual fidelity does not require an NES emulator, CPU timing, audio hardware,
or controller-only input. Research and prototypes remain candidates until the
owner adopts them.

## Design direction

Use the **rightmost charcoal/steel design** in the
[style reference](style-reference.png) as the art reference. Carry forward dark
panels, steel frames, shaped corners, rivets, industrial gym scenery, and warm
logo/character accents. Adapt texture and shading to NES constraints while
retaining depth, silhouettes, and contrast. Reserve elaborate metal framing
for top-level panels.

Preserve the warm orange/skin logo treatment rather than replacing it with a
gold-only treatment. The owner-adopted home artwork and direct-color logo from
PR #30 define the current material direction. Use the
[home artwork's indexed palette and emphasis](../art/home/construction.json)
as the material-color reference for future icons and steel panels. Existing
semantic UI inks retain their meanings. The number of artwork colors is not a
hardware maximum; future palette changes still require an exact construction
and owner approval.

The [UI system contract](../src/design-system/README.md) owns shared component
and composition rules. Consult it rather than duplicating those rules here.
Use the adopted [menu reference](references/menu.md) for navigation that shows
a few choices and exposes further options through subsequent menus, while
keeping workout interaction quick.

## Future corridor experience

The corridor is an optional between-set interstitial; the guided current-set
experience takes priority. Use top-down character movement between sets to
communicate workout progress.

The selected direction is a thin vertical corridor on black, with narrow wall
caps and small door thresholds seen from above. Avoid tall wall faces or
upright door facades. Corridor **A — Basement** supplies the material direction.
The whole workout is one corridor, with the entrance below, set doors along its
sides, and the final exit above. After logging a set, the character leaves its
room and walks to the next; the last set leads to the terminal exit.

**F — Boulder** is the provisional character preference. Preserve the character
alternatives. The wide corridor is a material study, not an approved perspective.
Animation timing and detailed interaction remain open. See the
[retained corridor sources](design/corridor-interstitial/README.md) and
[reference notes](references/corridor.md).

## Reference authority

The owner confirms that the [compact workout preview](references/compact-workout-ui.md)
is the dogfooded behavioral reference for the application. Its appearance is
temporary and its source branch is not a complete UI specification. Adopted art,
component availability, and retained prototypes do not by themselves establish
that a full application flow has been reviewed.

See the [repository inventory](repo-status.md) for current sources and adoption
status, and the [reference notes](references/README.md) for provenance. Historical
feedback and implementation details remain in Git history, PRs, code, and tests.
