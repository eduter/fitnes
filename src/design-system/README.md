# FitNES design system

Review at https://fitnes-design-system.eduardo-terroso.chatgpt.site
in [PR #27](https://github.com/eduter/fitnes/pull/27).

Use the Review value to switch between A: Framed, B: Rows, Windows, Palette,
and Artwork. These are small separate screens rather than one long scrolling
showcase. A and B share Sound, Unit and Routine values. Windows demonstrates
an exercise editor opening a choice menu or number pad over itself.

## Owner direction

- Keep interfaces compact and menu-driven. Use overlaid windows for deeper
  choices/editors; do not expand rows or introduce accordions. Prefer bounded
  pages of choices over long scrolling catalogs.
- A: thin framed fields size to the widest option plus border/padding, with
  enough room for the legend. They can sit alongside one another.
- B: right-aligned labels/colons and a small gap before gold values. Its menu
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
