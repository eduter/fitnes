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

## Design-system foundation

Owner direction (2026-11-06): review a separate design-system PR before revising
the complete UI in #26. Take the **full palette from the home-screen image**.
Define tokens, semantic text/action roles, and a restricted component vocabulary
with a phone-testable showcase. Choice menus open a popover from the current
value and apply/close on selection; use this pattern for on/off settings as
well. Avoid native select, radio and checkbox presentation. The
[foundation](../src/design-system/README.md) records source tokens, proposed
roles, the component API, and remaining gaps. New role assignments and patterns
await owner review; this direction does not approve the current showcase's
specific colors-for-roles or complete screen composition.

Owner comparison request (2026-11-06): keep both editable-choice alternatives
in the showcase for phone review: a thin border interrupted by its top label,
and compact status rows with right-aligned labels/colons and gold editable
values. Neither is selected yet. All option lists, including On/Off, open
anchored to the tapped value, below by default with an above fallback when space
requires; keep menus visible after scrolling.

Owner revision (2026-11-06): favor compact bounded screens and stacked overlay
windows over scrolling forms or expanding rows. A fields shrink to their widest
option (plus legend/padding). B menus open to the right of the label, vertically
centered, with edge fallback. Choice windows contain options only; remove their
headers, Back items and chevrons. Outside press dismisses the top choice without
changing selection. Gold consistently signals interaction; action chevrons are
no longer used. This supersedes earlier chevron/outside-tap guidance below.
See the [PR #26 pattern audit](../src/design-system/pr26-audit.md) for gaps.

## Design direction

Owner-approved controls (2026-11-04): use uppercase action labels with the bold
leading chevron close to the text, keeping other content mixed case. Numeric
spinners use fixed monospaced masks, corner brackets, borderless stacked filled
triangles and the selected number-pad editor. Popovers have a thin continuous
border and stepped opening/reverse closing. Name fields use an ordinary native
text input with the same corners, preserving the phone's virtual keyboard.
Other numerical interactions activate immediately on press. The reusable
[controls](../src/components/Controls/README.md) provide this API; integration
into the workout app remains open.

Owner feedback (2026-11-05): controls retain their normal colors when pressed,
focused or selected. Focus rings are omitted per owner feedback. The selected
number-pad digit uses a terminal-style blinking underline (steady with reduced
motion).

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
adopted building blocks; full-screen layout and broader typography remain open.

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
and the [retained corridor source package](design/corridor-interstitial/README.md)
for a thin, top-down corridor on black. Use narrow wall caps and small door
thresholds seen from above, with pure black outside the corridor; avoid tall
wall faces or upright door facades. Corridor **A — Basement** supplies the
material direction. The whole workout is one vertical corridor, with the
entrance below, set doors along its sides and the final exit above. After
logging a set, the character leaves the current room, walks to the next door
and enters the next set's room; the last set leads to the terminal exit.

**F — Boulder** is the provisional character preference; preserve all character
alternatives. The package retains both corridor versions, native tiles, sprites
and character sheets. The wide version is a material study, not an approved
perspective. Implementation is deferred behind earlier backlog work; animation
timing, detailed interaction and workout integration remain open.

The owner confirms that the [compact workout preview](https://feat-compact-workout-ui.fitnes-preview.pages.dev/)
is the only dogfooded UI and the behavioral reference for the new application.
Use its workout flows, including compact logging, previous-performance display,
and navigation, as behavioral evidence while building the new UI around the
selected art and components above. Its appearance is temporary and its source
branch is not a complete UI specification.

The reusable controls and corridor design sources are available in main.
Component availability does not complete workout-app integration, and retained
corridor art does not implement the transition. See the
[repository inventory](repo-status.md) for current sources, the
[reference notes and captures](references/README.md) for retained materials,
and the [backlog](backlog.md) for next work.

## Preview data

Preserve the compact preview's real workout data before clearing storage or
replacing its deployment. Moving to another origin requires an explicit data
transfer.
