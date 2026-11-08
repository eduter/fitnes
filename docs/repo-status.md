# Repository inventory

Updated 2026-11-08. Use [the vision](vision.md) for product authority and
[the backlog](backlog.md) for open work.

## Adopted in main

- [Current home artwork](../art/home/gym.png) and its
  [construction](../art/home/construction.json), using the owner-edited PR #30 image.
- [Current logo](../art/logo/logo.png) and [construction](../art/logo/construction.json),
  rendered directly. Original references remain under `docs/`; no alternate app images are retained.
- [Local artwork editor](../tools/art-editor/README.md); Save artwork replaces the
  current selected asset, with drafts and backups under ignored `work/`.
- [SteelPanel](../src/components/SteelPanel/README.md), the reusable steel frame.
- [BottomTabs](../src/components/BottomTabs/README.md), the selected six icons
  and steel tab bar.
- [Design-system foundation](../src/design-system/README.md): Button,
  OptionPicker, MultiPicker, Spinner/NumberPad, DateSpinner, TextInput, TextArea,
  Popover, ConfirmDialog and PagedWindow. The
  [private showcase](https://fitnes-design-system.eduardo-terroso.chatgpt.site)
  demonstrates the adopted vocabulary with temporary in-memory examples;
  the application integrates those same components with IndexedDB in this
  branch. Use the showcase for component review. The older
  [controls preview](https://fitnes-numeric-preview.eduardo-terroso.chatgpt.site/)
  remains available as a historical mechanical fixture.
- [Selected style reference](style-reference.png),
  [original logo reference](fitnes-logo.png), and
  [original home composition reference](reference-home-screen-image.png).
- Public PWA icons and component proof routes are build/runtime assets. Keep
  generated proof captures, reports, and ROMs under ignored `work/`.

## Application integration in review

[Private application preview](https://fitnes-app-design-system.eduardo-terroso.chatgpt.site) rebuilds the screens from
current main while reusing PR #26's repository, model adapters and regression
coverage. It includes home/start/resume, compact logging with previous results,
completion/reopening, catalog/template edits, weight history and JSON transfer.
Page-level catalogs and workout sets adapt their row count to available height;
child editors preserve the underlying page. New composites remain drafts until
Create/Save. Existing valid edits persist immediately, with shared confirmations
for deletion and draft dismissal. The original PR #26 preview is preserved.

The application preview seeds only an unused database. Normal builds never seed
sample sessions/templates/readings. Schema upgrades retain legacy scaffold rows.
No deployment or data at another origin is replaced automatically. The corridor
transition remains deferred; this branch does not claim it is integrated.

## Guided workout preview

[Private guided workout preview](https://fitnes-guided-workout.eduardo-terroso.chatgpt.site)
is an isolated sample-data prototype of the current-set direction. It supports
preparation countdowns, timed sets, paced repetitions, pause/resume, Log to
advance, explicit rest steps, and exercise timing defaults with workout
overrides. Plan edits an ordered set/rest array without changing the persistent
application model or stored data. See [behavior and provisional choices](../src/guided-preview/README.md).
The owner has not yet reviewed this preview on Android; it is not a dogfooded
behavioral reference. The corridor remains deferred.

## Retained design sources

The [corridor art package](design/corridor-interstitial/README.md) is available
in main with editable sources, native tiles, proof samples, sprites and all
character sheets. It records A — Basement materials, the thin vertical top-down
corridor on black, whole-workout travel through set doors, and provisional
character F. Preserve the alternatives. Implementation remains deferred behind
earlier backlog work; timing and detailed interaction remain open.

The adopted [menu capture](https://capture-487s.dw3-capture-preview.pages.dev/)
is a navigation design reference, distinct from behavioral validation. The
[corridor capture](https://feat-corridor-transition.fitnes-corridor-capture-preview.pages.dev/)
and local art sources record the selected corridor direction. See
[retained reference notes and captures](references/README.md).

## Behavioral reference

The owner confirms the [compact workout preview](https://feat-compact-workout-ui.fitnes-preview.pages.dev/)
is the only dogfooded UI. Its workflows are the behavioral reference for the
new UI. The source PR is [#4](https://github.com/eduter/fitnes/pull/4), and the
source snapshot is preserved under the `reference/compact-dogfood` Git tag at
[`4b81ee5ee2516dcbe794d071fa83bfe7042c0d21`](https://github.com/eduter/fitnes/commit/4b81ee5ee2516dcbe794d071fa83bfe7042c0d21).
This source reference is not verified as the exact deployed build. It is useful
behavior evidence, not a direction to reuse its whole implementation or
appearance. The deployment and its data should remain intact while the new UI
is developed.

NES UI proposals, including [#12](https://github.com/eduter/fitnes/pull/12),
were not dogfooded and are not owner-validated UX references. Their proposals
and screenshots are historical comparison material only.

## Historical audit

The detailed branch review and its findings remain available in the immutable
[main snapshot at `bd99bdf`](https://github.com/eduter/fitnes/blob/bd99bdf/docs/branch-review.md).
It is retained there as historical audit material, not as active task guidance.
