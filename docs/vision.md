# Product vision

FitNES is a personal, offline-first PWA for logging workouts on a phone. Keep
workout data on-device and core flows usable without a connection.

## Workout experience

Recording work during training must be quick. Exercise names, planned work,
actual performance, actions, and session progress must be readable on a phone.

An exercise defines its supported sides (Both sides, One side, or both), units
(Reps or Seconds), and load behavior. A One side set applies its target to each
side and records left and right separately. Show Sides and Unit selectors only
when the exercise supports more than one choice; other exercise properties
apply automatically.

Added weight is the total external weight used during the movement: two 10 kg
dumbbells and one 20 kg barbell both mean 20 kg. Negative added weight represents
assistance; zero covers the unweighted case without a separate load selector.

Owner clarification (2026-11-08): the tracking screen focuses on the current
set rather than a list of sets. Show what to do now and provide a clear Log
action that records the result and advances to the next set.

Owner feedback (2026-11-11): require Start before Log or Next side for each
side. Skip remains the explicit zero-work action. Previous reopens the preceding
sequence step and removes its logged result or rest completion, so an accidental
log can be corrected during training, including after the final step.

Guide the set while the owner exercises. A timed set has a Start action,
a short preparation countdown to allow getting into position or arranging
equipment, then a visible remaining-time countdown. The screen should stay
on during the guided set so the owner can glance at it.

For repetition-based sets, support a configurable duration per repetition and
count repetitions at that pace so the owner can follow along without keeping
count mentally. Exercise timing and workout overrides are now persisted in the
guided integration.
Preparation duration and time per repetition are configurable defaults on the
exercise. Owner clarification: overrides belong to individual sets, in the Add
and Edit set forms. Show effective defaults directly in the UI; opening a form
does not copy them into set data. Persist only fields changed to values that
differ from the exercise default; returning to a default removes its override.
There is no Timing menu in workout or session dropdowns.

Preparation and pace are execution settings. An active session may keep them
to run consistently, but completion removes them from its historical snapshot,
including copied exercise defaults. History retains actual reps, duration,
load, bodyweight and performance metadata. Neither prep nor pace is kept as
historical performance. Older completed records are cleaned without changing
their results. Current exercise defaults are used when starting/reopening work.
Pause, early logging, skip and rest transitions have functional initial behavior
for review, documented with the [session components](../src/components/session/README.md).

Owner clarification (2026-11-08): preserve the workout as an arbitrarily
ordered sequence of individual sets. Circuits, supersets and any interleaving
must be possible; do not regroup sets by exercise or change their execution
order in the tracking UI. Focusing on the current set changes presentation,
not this sequencing flexibility.

Owner feedback (2026-11-08): make the current exercise name the prominent
tracking-screen heading. Omit the generic Workout heading and workout name
during training; they are not useful in the middle of a set. Remove the redundant
Current set label and the Ready when you are message.

Owner feedback: all tracking elements retain fixed vertical positions throughout
a set, including ready, preparation, active, paused and completed states. Reserve
space for conditional status, pacing, actions, result editing and wake-lock
feedback rather than recentering content as controls appear. Spinner contents
align to the right when a longer label determines the field width.

Owner feedback (2026-11-09): one-side-at-a-time sets guide Left then Right,
including sets with a single recorded rep count. Each side gets its own
preparation and counter before advancing to the next sequence entry. Show the
side before starting; side order is fixed for now. Keep the Log/Next side action
to the right of the actual-performance spinner, aligned with its numeric controls.

Owner feedback (2026-11-09): show the segmented progress bar immediately below
Step X of Y, reflecting the current step's position in the whole workout.
The large rep/time counter covers progress within the current set; omit its
redundant bar. Switching sides stays on the same workout step.

Support flexible rest time between sets. The required rest depends on the
surrounding sequence and workload, including the exercise coming next; one
fixed rest duration per exercise is insufficient. The proposed model is one
ordered array whose steps can be either individual sets or explicit rest
durations, replacing the separate set/sequence structure. Owner clarification:
the tracker must be integrated and reviewed in the actual full application.
The integration now supports explicit rest entries in the existing ordered
sequence and preserves old set references for compatibility. Collapsing those
internal set/reference arrays is still follow-up work. The owner is the sole user and
accepts manually converting an exported JSON backup for that future change;
an automatic migration system is not required. Detailed rest interaction
remains subject to preview review. Do not conflate rest
between sets with the preparation countdown before starting a set.

The corridor is a between-set interstitial after finishing a set and before
the next one. It is optional for the first version; the guided current-set
experience takes priority. Later, use top-down character movement between
sets to communicate workout progress.

## NES visual contract

The interface should feel like an NES game menu built for training. Follow
actual NES palette, tile, background attribute, and sprite constraints. Use a
256-pixel logical content width and use available screen height. Paginate
page-level lists when necessary; do not paginate modal editors.
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

The [UI system contract](../src/design-system/README.md) records the single
adopted vocabulary: framed fields, compact summary rows, bounded stacked windows,
no inline expansion and no pagination inside a modal. Alternate field layouts
are removed. Do not focus text inputs automatically on open; notes belong
directly in the editor. Choice/numeric windows have no visible header; numeric
and multi-choice editors finish with End. Multi checks sit immediately after
the label; End is bottom-right. Use available screen height for page content.

The source palette follows the current 256×200 home artwork, including the
off-white ink added in the owner-edited PR #30 image. Existing semantic UI inks
retain their meanings. The number of artwork colors is not a hardware maximum;
future palette changes still require an exact construction and owner approval.

## Design direction

Owner-approved controls use gold interactive values/actions and copper passive
text, with two-pixel cut-corner frames. Numeric/date spinners share compact
symmetric geometry. Names and multiline notes use native text entry inside the
same frame; preserve keyboard/selection behavior. The native date-picker escape
hatch is explicitly approved for rare use. Confirmations use Yes/No. Controls
retain normal colors on focus/press; digit selection uses a blinking underline
(steady under reduced motion). Read the system contract for implementation.

Aim for the detail and finish of a well-made NES game. Use the **rightmost
charcoal/steel design** in the [style reference](style-reference.png) as the
art reference. Carry forward its dark panels, steel frames, shaped
corners, rivets, industrial gym scenery, and warm logo/character accents. Adapt
texture and shading to NES constraints while retaining depth, silhouettes, and
contrast.

Owner feedback (2026-11-07): preserve the warm orange/skin logo treatment from
PR #26; do not substitute the gold-only treatment. Carry forward #26's fixed-raster
border painting fix, including the same runtime path for the copper field/window
frames, while retaining the editable SVG sources.

Reserve elaborate metal framing for top-level panels. The approved frame uses
4-pixel metal bars, riveted H-style corners with only the outermost corner
pixel cut off, and a 2-pixel black surround. The reusable
[SteelPanel component](../src/components/SteelPanel/README.md) implements this
border. The [selected bottom tabs](../src/components/BottomTabs/README.md)
provide the six adopted 24×24 icons and 256×56 steel bar. These components are
adopted building blocks; full-screen layouts remain subject to review; shared PageTitle, DialogTitle and
SectionHeading now own the typography hierarchy.

Use the [final home artwork's indexed palette and emphasis](../art/home/construction.json)
as the material-color reference for future icons and steel panels. Validate
their combined screen's shared palettes and budgets before adopting a
composition. Use the [current FitNES logo](../art/logo/logo.png) in the app;
the [original logo](fitnes-logo.png) and [original home reference](reference-home-screen-image.png)
remain read-only visual references.

Owner clarification (2026-11-08): adopt the edited hero and direct-color logo
from PR #30. Keep only the original reference and current app image for each
asset; older app versions belong in Git history, drafts and backups in ignored
`work/`. Editor Save artwork explicitly replaces the current asset after proof.

Owner decision (2026-11-08): the installed PWA icon uses the exact 90×90 crop
of the current home artwork at (83, 65), with the rack near the top and sneakers
near the bottom. Preserve its pixels and palette with nearest-neighbor scaling;
ship opaque square artwork and let Android apply its launcher mask. The wordmark
continues to identify the app on Home. `npm run generate:icons` regenerates the
launcher assets and favicons from the hero via `tools/build-pwa-icons.ts`.

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

Owner feedback (2026-11-07): exercise editing opens directly in a popover over
its library row; Edit, Duplicate and Delete fit directly on each exercise row.
Secondary workout actions belong in a More menu; set actions stay in one row
with dedicated MoveButton icons for reordering. Buttons activate only
on their visible gold label or icon, with short verbs and passive black space.
Use separators between library items, distinguish copper page headings from
normal text and gold actions, and call the workout library Workouts. Remove the
small FitNES header from all non-home pages.

Steel-frame feedback (2026-11-07): straight edges must repeat the same native tile
between fixed corners. Render 8×8 PNG edge tiles with repeat-x/repeat-y; do not
stretch the material artwork to fit the panel.

## Preview data

Preserve the compact preview's real workout data before clearing storage or
replacing its deployment. Moving to another origin requires an explicit data
transfer.

Owner feedback (2026-11-07): page, dialog and section typography are shared,
documented components. DialogActions centralizes copy and opposing-corner
placement: Cancel left, Save/Create/Add right; End at right closes existing
immediate edits. Restore full native DW3 field/window corners with one opaque
black logical pixel outside the border, including corners. Editors leave room
on both sides and between their border and fields; multi-choice fields have
fixed width and reserved summary height. Workout editing uses Back navigation,
bounded Add/Details editors and secondary More menus. Record weight places Date
and Weight on one row with Cancel/Save below.

Owner feedback (2026-11-07): Home's frequent action labels have a 16-logical-pixel
gap for touch separation. Choosing a workout starts it immediately, attaching
the latest recorded weight at or before the start instant; there is no weight
choice/confirmation screen. This also applies to workouts without bodyweight
sets. With no weight history, start without a snapshot. Multi-choice summaries
align at the top of their fixed field. Popover motion uses a fixed frame behind
a stepped overflow viewport to address reported Chromium painting artifacts.
