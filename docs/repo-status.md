# Repository inventory

Updated 2026-11-05. Use [the vision](vision.md) for product authority and
[the backlog](backlog.md) for open work.

## Adopted in main

- [Final home artwork](../art/home/gym.png) and its
  [construction/proof inputs](../art/home/construction.json).
- [SteelPanel](../src/components/SteelPanel/README.md), the reusable steel frame.
- [BottomTabs](../src/components/BottomTabs/README.md), the selected six icons
  and steel tab bar.
- [Selected style reference](style-reference.png),
  [standalone logo](fitnes-logo.png), and
  [original home composition reference](reference-home-screen-image.png).
- Public PWA icons and component proof routes are build/runtime assets. Keep
  generated proof captures, reports, and ROMs under ignored `work/`.

## Pending source PRs

These sources are under review and have not been merged into main. Do not treat
them as adopted implementation until their PRs merge.

| Source | Useful material | Status |
| --- | --- | --- |
| [#24 — Reusable NES controls](https://github.com/eduter/fitnes/pull/24) | Shared native controls proposed for integration with the adopted frame and tabs. | Pending PR and integration/review. |
| [#22 — Corridor art package](https://github.com/eduter/fitnes/pull/22) | Editable corridor and character design sources, with reproduction notes. | Pending PR; its design decisions are recorded in the vision. Character F is provisional; timing and interaction were deferred. |

The adopted [menu capture](https://capture-487s.dw3-capture-preview.pages.dev/)
is a navigation design reference, distinct from behavioral validation. The
[corridor capture](https://feat-corridor-transition.fitnes-corridor-capture-preview.pages.dev/)
and #22 sources record the selected thin top-down corridor, whole-workout travel,
and set doors. See [retained reference notes and captures](references/README.md).

## Behavioral reference

The owner confirms the [compact workout preview](https://feat-compact-workout-ui.fitnes-preview.pages.dev/)
is the only dogfooded UI. Its workflows are the behavioral reference for the
new UI. The source PR is [#4](https://github.com/eduter/fitnes/pull/4), and the
source commit to preserve is
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
