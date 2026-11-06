# FitNES design system

Review at https://fitnes-design-system.eduardo-terroso.chatgpt.site
in [PR #27](https://github.com/eduter/fitnes/pull/27).

Use Review to switch between Workout, Weight, Multiple, Fields, Windows,
Palette and Artwork. A (framed fields) is adopted. These are small separate
screens rather than a long scrolling showcase. Windows demonstrates an editor
opening a choice menu or number pad over itself.

## Owner direction

- Keep interfaces compact and menu-driven. Use overlaid windows for deeper
  choices/editors; do not expand rows or introduce accordions. Prefer bounded
  pages of choices over long scrolling catalogs.
- Adopted framed fields size to the widest option plus border/padding, with
  enough room for the legend. They can sit alongside one another.
- Legacy B (no longer offered in Review): right-aligned labels/colons and a small gap before gold values. Its menu
  opens to the right of the label, vertically centered on that label; screen
  edges clamp it or flip it left. A opens below the value, flipping above.
- Choice windows contain only their options: no header, Back action or
  chevrons. Tapping outside or Escape dismisses the top choice window without
  changing the value. Selecting applies immediately and closes.
- Gold signals interactivity. Action chevrons have been removed. Native text
  entry keeps its natural case; actions/options remain uppercase.
- Stacked windows retain the underlying window. Only the top layer is active;
  dismissal restores parent focus and interaction. Outside dismissal is not a
  rollback for existing immediate edits. Composite drafts still need explicit
  commit/cancel semantics before integration.

## Tokens and components

The **complete nine-color palette** is copied exactly from
[the native home image](../../art/home/gym.png) and its
[indexed construction](../../art/home/construction.json): Composite Direct,
whole-frame red emphasis 1, including sprite colors. `palette.ts` inventories
it; `tokens.css` defines source colors and semantic aliases. Palette tests
compare the image, PPU colors, inventory and CSS. No extra UI colors are added.

Proposed roles: black ground, copper passive text, gold actions/editable values,
steel unavailable controls, shadow decorative depth, coral explicit error text.
Source artwork is exempt from UI-text meanings, not hardware constraints.

Typography is the existing CC0 FitNES Pixel grid font, 16px/16px at weight 400.
Logical width is 256px. Spacing tokens are 4/8/12/16px. Choice rows use compact
24px logical targets; native field and number-pad behavior is preserved.

Import `Button`, `OptionPicker`, `Popover`, `Spinner` and `TextInput` through
`components/Controls/index.ts`. OptionPicker's `layout` accepts `stacked`,
`framed`, or `row`; row siblings share `.nes-option-rows`. SteelPanel and
BottomTabs remain adopted assets for larger app compositions.

Popover supports an explicit anchor, `placement="right"` for label-centered
placement, preferred width, viewport clamping and stepped reveal/reverse close.
It keeps nested windows modal through a shared layer stack; both Escape and
outside press close only the top window. Focus returns to `returnFocus`, which
can differ from a passive label anchor.

The native-control boundary test prevents screen-local input/button/select/
textarea/details substitutions. Missing patterns must be reviewed in this
system rather than invented in app screens. TextInput permits only text-entry
types; date, multiline and other widgets require separate reviewed patterns.

## PR #26 coverage

See the [source-based audit](pr26-audit.md) for every UI family inspected,
existing coverage, prohibited expansion patterns, and remaining gaps. Core gaps
are paginated catalogs, bounded form composition, multi-choice membership,
date/multiline entry, draft confirmation, import/export review, validation and
compact workout rows. This foundation does not silently rebuild #26.

## Build and review

`npm run dev` serves `/src/design-system/index.html`.
`node tools/build-design-system.ts` builds `work/design-system-preview/`
without app storage, routing or a service worker. Values are temporary.
`npm run check` runs lint/typecheck/format/tests; `npm run build` checks the app.

`tools/prove-design-system.ts` checks native 256px/DPR 1 screenshots against
home palette/attribute/sprite construction without quantization. Captures must
be checked again after composition changes; earlier 44-crop results describe
the prior scrolling showcase, not this new screen arrangement. Device browser
checks and deterministic construction proofs are distinct from an independent
emulator reproduction.

Dedicated private Sites identity: `appgprj_6aee0a1d90d481918bf7a841adbcdd7c`.
Preserve its owner-only audience and other application previews. Its source
repository includes the GitHub snapshot and isolated build under `dist/`.

Current verification: 219 tests pass. Chromium phone checks cover intrinsic
field widths, right/centered menus, unchanged selection on outside dismissal,
parent/child focus and edits, and zero page scroll for the tested interactions.
Three native 256×240 A/B/menu captures pass pixel-exact construction checks
with the home palettes (at most six sprites and five per scanline):

```sh
node tools/prove-design-system.ts capture.png output-directory ui
```

The `ui` mode allocates every screenshot pixel; the historical default retains
the home image at the top of a scrolling capture. Neither mode quantizes RGB.

## Page examples and daily-use patterns

The showcase starts on **Workout**, a temporary seven-exercise sample with three
compact summaries per page. Each row shows name, sets × reps / kg, and Edit,
Delete, Duplicate. Edit opens a bounded two-page field window, with child number
pads, membership choices and a notes editor. Atomic edits immediately update
the summary; End closes. Delete requires an explicit Delete/Cancel confirmation;
outside dismissal cancels. Duplicate appends a sample record. The preview is
not connected to saved workouts or production data.

**PagedWindow** shows arrows around “1 of N”. An upward swipe on passive content
advances; downward goes back. Native vertical scrolling is disabled on the page
surface. Gestures starting on inputs/actions do not paginate. A single 80ms black
redraw precedes a page change; reduced-motion preference skips the blackout.
Page bounds, duplicate requests during redraw and cleanup are handled by the
component. The demo uses sample lists rather than changing application routes.

**Weight** combines DateSpinner, weight entry and Record. DateSpinner displays
YYYY.MM.DD in a framed field; the stacked arrows advance or rewind one calendar
day. Day arithmetic is independent of DST. The value is YYYY-MM-DD, initialized
from the user's local today. Tapping the date invokes the native date picker.
This rare native-picker escape hatch is explicitly owner-approved; it is not a
ban on older dates. Empty/cancelled picker input does not change the value.

**Multiple** proposes a naturally sized, wrapping framed gold summary: None,
one or two selected labels, then +N for further selections. Selection menus use
text membership marks and remain open on toggle. End closes them; outside
closing also preserves applied membership edits. The summary is a proposal for
owner feedback, not a finalized choice of presentation.

**TextArea** preserves native multiline input in a bounded child window. Notes
currently use an action to open it; a tappable gold copy field is still an
alternative. **ConfirmDialog** has a message and exactly two actions. Prefer
short verbs (Edit/Delete/Duplicate/Record/End) over repeated object names.

A is adopted and used throughout the daily-use examples. Import/export remains low priority; the page examples
do not implement an import flow or persist/delete real app data.

## Adopted frame revision

A is now selected. The Review menu uses **Fields**; B is retained only as a
legacy layout API, not a competing preview. Shared `.nes-frame` uses an 8×8
pixel SVG border image: two-pixel bars, removed outer corner pixels and added
inner diagonal pixels. This applies to choice/date/number/membership/name/note
fields and Popover/confirmation windows. Elaborate SteelPanel artwork remains
a separate adopted material. Text entry no longer uses gold corner brackets.

Date and numeric spinners share a 24px body; two centered 12px arrow rows are
symmetric about the value. Pagination uses rotated spinner triangles close to
a fixed-width page counter; its width follows the digit capacity of page count.
Membership checks occupy a reserved right column, leaving option labels fixed.

ConfirmDialog now exposes Yes/No and snapshots its message at open, preserving
the subject during reverse close even if the caller clears/deletes its state.

Touch pagination uses a non-passive touch-move handler for upward pagination
and downward pagination after page one. Root overscroll containment prevents
browser refresh whenever any active paged window is beyond page one. Returning
to page one (or disposing the window) restores the previous root style and
allows downward native browser refresh. Native Chrome pull-to-refresh UI still
needs the owner's real-phone check; Chromium touch emulation verifies both
page directions and the conditional refresh policy, not the Android toolbar.

Palette verification: final `art/home/gym.png` has exactly nine RGB colors;
`docs/reference-home-screen-image.png` is a richer high-resolution reference.
Tokens match the final approved native artwork pixel-for-pixel.

Latest validation: all 226 tests pass. Phone touch emulation verifies upward
then downward pagination without a reload, later-page overscroll containment
and restoration on page one, stable confirmation text during closing, framed
name entry, and a non-shifting right check column. Four current native captures
(Fields, Weight, multiple-choice window, Workout) reconstruct exactly under the
home palette/attribute/sprite rules, with at most four sprites/two per scanline.
