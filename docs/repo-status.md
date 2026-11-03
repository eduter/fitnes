# Repository inventory

Snapshot: **2026-11-03**, against `origin/main` at
[`7ebe341`](https://github.com/eduter/fitnes/commit/7ebe341f84e8c12cc1c7eb576b9d41ac6474185d).
This is a map of existing work, not a merge plan or approval of a design.
Product decisions belong in [the vision](vision.md); pending work belongs in
[the backlog](backlog.md).

## What changed since the previous inventory

The 2026-10-28 inventory at this path was removed in
[`b0d3d71`](https://github.com/eduter/fitnes/commit/b0d3d71a67cb6ebbd7b1e2312b74f34eaa61bc92)
during the product-documentation cleanup. This restores the navigation aid,
without restoring the separate product-decisions document.

- Before this update, GitHub advertised **14 branches**, including `main` and
  three already-merged branches. All are accounted for below. The additional
  `docs/refresh-work-inventory` branch carries this documentation update only.
- The original inventory covered PRs #3–#9. The newer checker (#11), focused UI
  (#12), corridor capture (#13), and corridor implementation branch are added.
- #8 is closed without merging, and its source branch is no longer advertised.
  Its last PR head remains retrievable; the experiment is not lost.
- #1, #2, and #10 are merged. Their branches still exist.
- The owner selected the menu and corridor pages and a preferred mood image on
  2026-11-03. The set transition must use the reference's top-down view; the
  first-person corridor implementation is rejected for that flow. The mood
  image guides adaptation within NES constraints, not literal reproduction.

## Baseline and data in use

Start implementation work from current `main`. It contains the scaffold (#1),
consolidated workout domain (#2), and product guidance (#10). It does not contain
the functional workout UI, later NES checker, or corridor experiments.

The owner uses [the compact preview](https://feat-compact-workout-ui.fitnes-preview.pages.dev/)
to evaluate the model. Its appearance is temporary. Preserve its real workout
data and deployment; moving to another origin needs an explicit export/import.
A preview URL alone does not establish the deployed commit.

#12 also reports a separate [focused UI preview](https://fitnes-focused-preview.aloftalto.chatgpt.site).
Its availability and deployed SHA were not verified in this review.

## Branches still on GitHub

Tips and links identify the content inspected at this snapshot. An open PR
means proposed work, not accepted product behavior or visual design.

| Branch | Tip | PR state | Contents and reuse guidance |
| --- | --- | --- | --- |
| `cursor/dogfood-ui-ed81` | [`72e519d`](https://github.com/eduter/fitnes/commit/72e519d9981266573dbc1e9125031ed443ba10cf) | [#3](https://github.com/eduter/fitnes/pull/3), open draft | First complete workout UI, IndexedDB, and database import/export. Inspect behavior and persistence separately from styling. Its domain lookup files lag main; do not replace the consolidated domain with this branch. |
| `feat/compact-workout-ui` | [`4b81ee5`](https://github.com/eduter/fitnes/commit/4b81ee5ee2516dcbe794d071fa83bfe7042c0d21) | [#4](https://github.com/eduter/fitnes/pull/4), open draft | Compact logging, previous-performance display, fixed navigation, and a separate JSON NES renderer. Functional source for the preview named in the vision; the live build SHA was not verified. Domain/fixture files match main. |
| `cursor/nes-design-system-31db` | [`f1bca21`](https://github.com/eduter/fitnes/commit/f1bca218a5b0905bb688022decf43caa75f29126) | [#5](https://github.com/eduter/fitnes/pull/5), open | Alternative styling, original concept sheet, extracted gym/character/logo art, and 13 icons. Preserve the assets as candidates; this is not proof of NES compliance or an adopted UI. |
| `cursor/nes-window-ui-81c6` | [`0f811eb`](https://github.com/eduter/fitnes/commit/0f811ebbb16fd1df476369675c13c738110a8040) | [#6](https://github.com/eduter/fitnes/pull/6), open | Window UI, palette-reduced poster/logo/navigation art, and older picture checks. Assess the art separately from the menu layout and checker. |
| `cursor/nes-typography-menu-research-33d8` | [`385e4a9`](https://github.com/eduter/fitnes/commit/385e4a92773e26e82564fd527c8ab4038baa4e1f) | [#7](https://github.com/eduter/fitnes/pull/7), open | Font/menu research, specimens, phone captures, and readability findings. Recommendations remain candidates, including case and font choices. |
| `cursor/set-transition-concepts-11ed` | [`40cfd13`](https://github.com/eduter/fitnes/commit/40cfd1307322210aef9b32a4f82190e1fe054b30) | [#9](https://github.com/eduter/fitnes/pull/9), open | Four standalone alternatives: Stations, Path, Cue, Shaft. Historical comparison; the corridor reference is now the preferred direction. The author's Cue recommendation is not an owner decision. |
| `feat/nes-ui-check` | [`c910349`](https://github.com/eduter/fitnes/commit/c910349a6cd90d29766ebd69fb64ec6032a5cc0c) | [#11](https://github.com/eduter/fitnes/pull/11), open | Standalone PNG/live-Chrome checker, extracted from earlier checks. Replacement candidate for compliance tooling, not a visual design. Its branch-local contract permits unlimited tile patterns; reconcile scope with main's vision before adoption. |
| `feat/focused-nes-ui` | [`f3df2a3`](https://github.com/eduter/fitnes/commit/f3df2a3eb2a7bb9337c92e418d6bd34a08511f04) | [#12](https://github.com/eduter/fitnes/pull/12), open | Complete functional UI adapted from compact logging, current-set presentation, local fonts, artwork, screenshots, and rendered checks. Useful behavior/evidence to inspect; checker success does not approve its appearance. Domain/fixture files match main. |
| `feat/corridor-transition` | [`20bc327`](https://github.com/eduter/fitnes/commit/20bc3275240d723586f24877838c908bce5ffad3) | [#13](https://github.com/eduter/fitnes/pull/13), open draft | Reference capture page, video/audio, 60 sampled screens, contact sheets, and transition strips. This is the source of the owner-selected corridor page, not the FitNES implementation. |
| `feat/corridor-interstitial` | [`709714a`](https://github.com/eduter/fitnes/commit/709714a206f2b5e2740db54235627648a045e088) | No PR found among #1–#13 | Separate renderer and demo with local stand-in sets. Not wired to real workout recording. First-person corridor; owner rejected this direction for the set transition in favor of the top-down reference. Retain as historical work, not a candidate implementation of that direction. |

The other four advertised branches are the baseline and merged work:

| Branch | Tip | Status |
| --- | --- | --- |
| `main` | [`7ebe341`](https://github.com/eduter/fitnes/commit/7ebe341f84e8c12cc1c7eb576b9d41ac6474185d) | Canonical baseline at this snapshot. |
| `scaffold/initial` | [`97a3f7e`](https://github.com/eduter/fitnes/commit/97a3f7e85a4b8b3dde1f395394e7efcc063ff00e) | [#1](https://github.com/eduter/fitnes/pull/1) merged; tip is an ancestor of main. |
| `feat/domain-model` | [`c3f3822`](https://github.com/eduter/fitnes/commit/c3f38227cb04f1b4b5bcde7ef764df39b21a4354) | [#2](https://github.com/eduter/fitnes/pull/2) merged; tip is an ancestor of main. The historical audit is [branch-review.md](branch-review.md). |
| `docs/product-context` | [`b0d3d71`](https://github.com/eduter/fitnes/commit/b0d3d71a67cb6ebbd7b1e2312b74f34eaa61bc92) | [#10](https://github.com/eduter/fitnes/pull/10) merged; tip is an ancestor of main. |

### Historical refs no longer advertised

- `cursor/nes-sprite-layer-2fae`: [#8](https://github.com/eduter/fitnes/pull/8)
  closed unmerged on 2026-10-29. Last head
  [`b12fd56`](https://github.com/eduter/fitnes/commit/b12fd56064b265fbaab400133cddc676041990cd)
  was fetched successfully through `refs/pull/8/head`. #11 identifies its
  sprite-aware checks as source material for the replacement checker. Preserve
  this provenance; closure does not mean the whole PR was merged.
- `bkp/feat/domain-model`: mentioned by #2 as a pre-rewrite backup at `606e152`,
  but absent from today's advertised heads. #2 records identical final trees
  before and after the rewrite. This is an audit reference, not a current branch
  to integrate.

These observations establish absence now, not the time or reason a branch was
deleted. No branches or PRs were deleted, closed, merged, or rebased for this
inventory update.

## Dependencies that matter when reusing work

The old chain is dogfood UI → compact UI → NES window UI. Typography research,
the closed sprite-layer experiment, and the four transition concepts branch
from the window UI. The design-system branch forked from an earlier compact
commit and does not contain the current compact tip.

The checker, focused UI, corridor capture, and corridor implementation each
branch from the current main baseline. Capture and implementation are siblings:
the implementation's comments refer to capture files that are not in its tree.
The focused UI copies useful compact behavior and checker code without including
those branch tips as ancestors. Do not infer adoption or dependency solely from
Git ancestry, or merge an old UI's entire domain diff as new work.

## Owner-selected references

The intended uses below are recorded in [the vision](vision.md#design-direction).

| Reference | What to carry forward | Location and verification |
| --- | --- | --- |
| [Preferred mood image: rightmost image in the shared FitNES showcase](https://chatgpt.com/s/m_6aea3a709a188191894ab84e01827e0b) | Rightmost charcoal/steel treatment: dark panels, dimensional metal frames, shaped corners, rivets, industrial gym detail, and warm logo/character accents. Adapt its detail to NES restrictions; menu density and pictured game systems are separate decisions. | The owner attached the blue/green/steel comparison sheet in the project discussion on 2026-11-03, and it was visually inspected there. It is different from the six-screen concept sheet below. No matching standalone image was found among image files in the 14 pre-existing fetched branch tips and their reachable histories. A repository copy of the supplied reference is still needed; the shared URL itself exposes a sign-in shell to the web tool. |
| [Menu capture](https://capture-487s.dw3-capture-preview.pages.dev/) | A few choices at a time, with subsequent menus exposing further options. The owner values its menu organization, not its simple border or final appearance. | Owner-supplied external reference. Its source repository/commit has not been located. Hosted page could not be accessed in this environment; this description records the owner's intent, not an independent visual assessment. |
| [Corridor capture](https://feat-corridor-transition.fitnes-corridor-capture-preview.pages.dev/) | Top-down character movement through the environment for transitioning between workout sets; develop the graphics to fit FitNES. | [Capture source and assets at `20bc327`](https://github.com/eduter/fitnes/tree/20bc3275240d723586f24877838c908bce5ffad3/docs/captures/corridor-transition). The hosted page could not be accessed; its committed HTML and all three contact sheets were inspected. They show top-down character movement through corridors and rooms. |

The corridor manifest calls the footage first-person, but the contact sheets
show a top-down view. The separate interstitial actually implements first-person
nested rectangles. Follow the visual reference when discussing the selected
direction; neither those descriptions nor the demo establish the intended
movement, timing, or final artwork. The captured images were cropped, resized
to 256×192, and palette-mapped; they are reference evidence, not a native NES
asset sheet or an independent compliance certificate.

## Artwork, screenshots, and experiments worth finding again

Paths below are pinned to inspected commits so they remain unambiguous if a
branch moves. These are candidates to retain, not a declaration that each asset
can be used unchanged under the visual contract.

| Material | Pinned source | Notes |
| --- | --- | --- |
| Existing modern concept sheet | [`public/nes-style-reference.png` on #5](https://github.com/eduter/fitnes/blob/f1bca218a5b0905bb688022decf43caa75f29126/public/nes-style-reference.png) | 1024×1536 blue sheet showing six screens, illustrated frames, gym scene, logo, character, and icons. Visually distinct from the owner's preferred three-color comparison sheet; retain as secondary reference/source material. Its depicted XP/streak/goals do not add product requirements. |
| Extracted gym, character, and logo | [`public/artwork/` on #5](https://github.com/eduter/fitnes/tree/f1bca218a5b0905bb688022decf43caa75f29126/public/artwork), [`public/fitnes-logo.png`](https://github.com/eduter/fitnes/blob/f1bca218a5b0905bb688022decf43caa75f29126/public/fitnes-logo.png) | Gym 294×138; fighter 92×132; logo 244×114. The fighter is a single stance, not a walk cycle. |
| Thirteen extracted icons | [`public/pixel-icons/` on #5](https://github.com/eduter/fitnes/tree/f1bca218a5b0905bb688022decf43caa75f29126/public/pixel-icons) | Calendar, chart, clipboard, diamond, dumbbell, fire, gear, heart, home, progress, target, trend, trophy. Actual PNG sizes range from 36–45 pixels wide and 38–43 high, despite the concept's 16/32-pixel label. |
| Palette-reduced artwork | [`src/assets/` on #6](https://github.com/eduter/fitnes/tree/0f811ebbb16fd1df476369675c13c738110a8040/src/assets) | Gym/hero 256×128, logo 224×96, plus five 32×32 navigation images: body, history, home, move, plan. #12 contains byte-identical hero/logo PNGs, not additional versions of that art. |
| Typography/menu study | [Report](https://github.com/eduter/fitnes/blob/385e4a92773e26e82564fd527c8ab4038baa4e1f/docs/design/nes-typography-and-menu-research.md), [specimens and screenshots](https://github.com/eduter/fitnes/tree/385e4a92773e26e82564fd527c8ab4038baa4e1f/docs/design/typography-menu) | Useful evidence for legibility and supported characters; retain independently of the old window UI. |
| Static renderer and example | [`nes/README.md`](https://github.com/eduter/fitnes/blob/4b81ee5ee2516dcbe794d071fa83bfe7042c0d21/nes/README.md), [dashboard JSON and PNGs](https://github.com/eduter/fitnes/tree/4b81ee5ee2516dcbe794d071fa83bfe7042c0d21/nes/examples) | Drawing experiment, distinct from the later standalone compliance checker and actual app UI. |
| Four older set transitions | [Comparison and runnable prototype](https://github.com/eduter/fitnes/tree/40cfd1307322210aef9b32a4f82190e1fe054b30/prototypes/set-transitions) | Includes a copy of #5's fighter and a bob animation. Keep as historical alternatives; do not infer a finished walking system. |
| Focused UI evidence | [Screenshots and reproduction notes](https://github.com/eduter/fitnes/tree/f3df2a3eb2a7bb9337c92e418d6bd34a08511f04/docs/design/focused-ui), [font sources and license notes](https://github.com/eduter/fitnes/tree/f3df2a3eb2a7bb9337c92e418d6bd34a08511f04/public/fonts) | Useful examples of logging and editor states. Saved checker reports are evidence for their captured states, not owner approval of the visuals. |
| Corridor reference | [Video, contact sheets, sampled screens, transition strips, HTML, manifest](https://github.com/eduter/fitnes/tree/20bc3275240d723586f24877838c908bce5ffad3/docs/captures/corridor-transition) | Preserve the source reference independently of the implementation experiment. Original video is linked by the capture page. |
| Corridor implementation experiment | [`src/nes/`](https://github.com/eduter/fitnes/tree/709714a206f2b5e2740db54235627648a045e088/src/nes) | Pure drawing/timing modules, canvas component, and demo. First-person direction rejected by the owner for this flow; not a completed session transition. |

## Verification and maintenance

This snapshot used a complete, paginated GitHub branch listing, all 13 PRs
(open and closed), a fresh fetch of all advertised heads, Git ancestry, tree
and blob comparisons, the previous inventory, and selected source/assets.
It is an inventory, not a new correctness audit of every branch. Historical
test counts and PR claims were not rerun as part of assessing those experiments.

On refresh, compare GitHub heads and PR states again, including branches without
PRs. Update the snapshot date and pinned tips. Keep owner decisions in the
vision. Before pruning an experiment, preserve its useful artwork/reference
material in an agreed location. Remaining reference-location gaps are the menu
capture's source and a durable repository copy of the supplied mood image.
