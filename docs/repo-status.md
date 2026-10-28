# Repository status and existing work

Snapshot: 2026-10-28. Verify current refs and PR state before integrating work;
this is a navigation aid, not a live deployment registry.

## Canonical baseline

The consolidated domain model reached `main` through
[PR #2](https://github.com/eduter/fitnes/pull/2). It includes the later model
changes from `feat/compact-workout-ui`, without that branch's UI, IndexedDB
integration, or NES tooling. Start new work from current `main`.

The owner currently uses
[the compact UI preview](https://feat-compact-workout-ui.fitnes-preview.pages.dev/).
It is usable for evaluating the model but does not match the intended visual
direction. The URL does not establish which commit is currently deployed.

Data is stored per origin. Preserve the preview and export its data before a
deliberate transfer to another deployment. Do not clear site storage to refresh
a preview without first preserving any real workout data.

## Existing branches

| PR | Branch | Purpose and integration guidance |
| --- | --- | --- |
| [#3](https://github.com/eduter/fitnes/pull/3) | `cursor/dogfood-ui-ed81` | Functional UI, IndexedDB integration, and database import/export. Model changes from this branch are already consolidated through #2; review the remaining work against current main. |
| [#4](https://github.com/eduter/fitnes/pull/4) | `feat/compact-workout-ui` | Compact logging, previous-performance display, and navigation; also contains a separate NES rendering tool. Separate those concerns when reviewing. |
| [#5](https://github.com/eduter/fitnes/pull/5) | `cursor/nes-design-system-31db` | Alternative visual system and extracted artwork. Preserve candidate assets; do not blindly combine competing styles. |
| [#6](https://github.com/eduter/fitnes/pull/6) | `cursor/nes-window-ui-81c6` | NES window UI and picture checks. A design candidate to assess against the vision, not an approved final UI. |
| [#7](https://github.com/eduter/fitnes/pull/7) | `cursor/nes-typography-menu-research-33d8` | Typography/menu research, specimens, and readability findings. Recommendations require evaluation and owner decisions. |
| [#8](https://github.com/eduter/fitnes/pull/8) | `cursor/nes-sprite-layer-2fae` | Sprite-aware picture validator. Review its correctness and cost before integration. |
| [#9](https://github.com/eduter/fitnes/pull/9) | `cursor/set-transition-concepts-11ed` | Four standalone transition prototypes. The author's recommendation is not an owner selection. |

The original development chain was domain model, dogfood UI, compact UI, then
NES window UI. #5 forked earlier from the compact branch. #7, #8, and #9 forked
from #6. Consolidation of the model changes the merge situation: compare current
content and dependencies rather than treating each old PR's entire diff as new.

## Where to inspect visual work

These files live on experimental branches, not necessarily on main:

- [NES renderer documentation on #6](https://github.com/eduter/fitnes/blob/cursor/nes-window-ui-81c6/nes/README.md):
  still-image rendering, palette/tile rules, page-picture checking, and omissions.
- [Typography research on #7](https://github.com/eduter/fitnes/blob/cursor/nes-typography-menu-research-33d8/docs/design/nes-typography-and-menu-research.md):
  readability problems, font candidates, menu studies, and specimens.
- [Transition comparison on #9](https://github.com/eduter/fitnes/blob/cursor/set-transition-concepts-11ed/prototypes/set-transitions/README.md):
  Stations, Path, Cue, and Shaft, plus the limitations of the existing character art.
- [Artwork on #5](https://github.com/eduter/fitnes/tree/cursor/nes-design-system-31db/public):
  logo, gym scene, character image, and icons to inspect before creating replacements.

The character image used by the transition prototype is a single stance, not a
walk-cycle sprite sheet. Its bob animation does not establish a finished movement
system or prove that the art fits the intended hardware budgets.

## Keeping this useful

After integration, update this map, mark adopted ideas in the decisions file,
and remove obsolete backlog entries. Preserve useful experiments before deleting
branches. Check actual deployed builds and CI rather than relying on old PR prose.
