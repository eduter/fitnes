# FitNES design system

This foundation is reviewed separately from the full UI in PR #26. Its source
palette is the owner's approved home image; semantic roles and new patterns
below are proposals to try in the showcase before application integration.

## Try it

Run `npm run dev` and visit `/src/design-system/index.html`, or run
`node tools/build-design-system.ts` to produce `work/design-system-preview/`.
The showcase has no router, database, service worker, or durable storage. It
shows the source image, every source color, text roles, actions, disabled states,
name entry, number-pad/spinner editing, multi-option and on/off selection,
feedback, and a confirmation menu. Demo unit selection changes a label only;
unit conversion and persistence remain application responsibilities.

Private phone review: https://fitnes-design-system.eduardo-terroso.chatgpt.site

Dedicated Sites identity: `appgprj_6aee0a1d90d481918bf7a841adbcdd7c`.
Preserve its owner-private audience and keep it separate from application and
controls previews. Its source repository includes the GitHub source snapshot
and the isolated build in `dist/`; `.openai/hosting.json` declares that directory.

## Source tokens

`tokens.css` is the CSS entry point, imported by the shared controls stylesheet.
`palette.ts` supplies the showcase's inventory. All nine colors are taken from
[the native home image](../../art/home/gym.png) and its
[indexed construction](../../art/home/construction.json), including sprite
colors. Composite Direct RGB with whole-frame red emphasis 1 is preserved.
The palette regression compares every token to both actual image pixels and
PPU-derived RGB; it fails on missing, extra, or changed colors.

| Token suffix | RGB | PPU code | Source use |
| --- | --- | --- | --- |
| black | #000000 | $0F | Background |
| steel | #7d5c4b | $00 | Steel midtone |
| shadow | #451600 | $07 | Deep warm shadow |
| gold | #ffd679 | $38 | Lamp and hazard highlights |
| copper | #d8a082 | $10 | Light material |
| coral | #ff754e | $26 | Warm artwork accent |
| charcoal | #5e4538 | $2D | Dark material |
| orange | #ff8b20 | $27 | Warm sprite accent |
| skin | #ffcc83 | $37 | Light sprite accent |

Use `--nes-color-<suffix>` for artwork construction, and semantic aliases in UI.
The full palette is available; its presence does not permit nine arbitrary
colors in one tile. Screen composition still obeys shared NES palettes,
background attributes, sprite budgets, emphasis, and native pixel resolution.
See [the visual contract](../../docs/vision.md#nes-visual-contract).

## Proposed semantic roles

| Alias | Source token | Meaning |
| --- | --- | --- |
| `--nes-ground` | black | Main surface and control background |
| `--nes-ink` | copper | Passive names, labels, prose, readouts, headings, thin borders |
| `--nes-action` | gold | Enabled action text, chevrons, editable values, editable input text |
| `--nes-muted` | steel | Unavailable controls; never essential body copy |
| `--nes-shadow` | shadow | Decorative depth |
| `--nes-error` | coral | Error text, always including an explicit error message |

Gold is reserved for an interaction in UI text. Passive field labels remain
copper; values that open menus are gold. An action uses uppercase text with the
approved leading chevron. An editable choice uses uppercase gold text without
a web-style select box or switch track. Native text-entry values and numerical
values retain their natural case/format. Disabled actions lose gold and use the
native `disabled` attribute. Focus and press do not change the palette.

Color is reinforced by action casing, chevrons, value framing where appropriate,
real button/input semantics, accessible names, `aria-expanded`, and explicit
status/error copy. Artwork uses source colors without assigning those meanings
to scenery. Further success, warning, and destructive-action conventions remain
open; do not invent traffic-light colors or assign new roles ad hoc.

## Geometry and typography

- Logical content width: `--nes-content-width`, 256px. Pages scroll vertically.
- Font: the existing CC0 grid-aligned FitNES Pixel font, weight 400, 16px size
  and 16px line height. No synthetic bold or smoothing-based decoration.
- Spacing: 4, 8, 12, 16 logical pixels through `--nes-space-1` through `-4`.
- Buttons: at least 36 logical pixels high via `--nes-target-size`; existing
  spinner geometry is retained. Do not shrink hit targets to glyph bounds.
- The showcase scales in whole device-pixel multiples and centers the logical
  surface. Native 256px/DPR 1 captures are the reference for pixel checks.
- Use SteelPanel for top-level framed groups. Popovers use the existing thin
  one-pixel border and stepped 16px reveal/reversed close. No rounded cards,
  gradients, browser widget chrome, or extra metal frames around each field.

## Compare editable choice layouts

The showcase includes two owner-requested alternatives using the same Sound,
Demo unit and Routine values. Editing either example updates the other, so the
comparison changes presentation rather than behavior:

- **A: Framed fields** — `layout="framed"` uses a real fieldset and legend. The
  copper label interrupts the top edge of a thin copper border; the gold value
  sits inside and opens the choice menu when tapped.
- **B: Status rows** — `layout="row"` inside `.nes-option-rows` shares two grid
  columns. Copper labels and colons align to the right, followed by an 8px gap
  and left-aligned gold values. There is no field border. The shared grid keeps
  the value column aligned as label lengths change.

The original stacked layout remains the default. Both alternatives retain the
same press behavior, selection/cancellation and focus restoration. They are
comparison candidates, not an adopted winner or a decision that they must be
mutually exclusive. Boolean values are ordinary On/Off option lists.

Choice menus explicitly anchor to their value trigger. They open below when
space permits, flip above otherwise, and clamp inside the visual viewport as
needed. Choice menus use a 160px logical width so compact right-column values
do not always open a screen-wide panel; numerical pads retain 240px. Scroll
and resize reposition the panel relative to the current trigger bounds.

## Component vocabulary

Import controls from `src/components/Controls/index.ts`.

| Need | Component / pattern | Contract |
| --- | --- | --- |
| Action | `Button` | Uppercase text + chevron; `onPress`; native disabled |
| Editable name | `TextInput` | Mixed-case native text entry and phone keyboard |
| Quantity | `Spinner` | Fixed mask, exact steps, selected number pad |
| One choice from a small set | `OptionPicker` | Label + gold current value; tap opens Popover; choose applies and closes |
| Boolean preference | `OptionPicker` with On/Off | Same interaction as other choices; no checkbox/radio/switch |
| Menu / confirmation | `Popover` + `Button` | Focus containment/return, Escape, explicit Back/close; background taps are passive |
| Major framed group | `SteelPanel` | Adopted steel material and corners |
| App navigation | `BottomTabs` | Existing six approved icons and bar; not exercised by this isolated showcase |
| Readout / empty state | Passive text | Copper mixed-case text; live region when changes need announcing |
| Error | Explicit error text | Coral plus words; connect to the relevant input in the consuming screen |

The option picker adapts PR #26's controlled-choice structure, simplified to the
owner's text-value pattern. Popover placement and viewport tests are extracted
from that PR: menus flip/clamp near the trigger and reposition on scroll,
resize, or visual viewport changes. The current choice receives initial focus
and `aria-pressed`; selection is immediate, Back/Escape preserve the old value.
Long menus scroll within the available panel. This is intended for small sets;
searchable selection, date editing, multiline entry, and bulk selection require
an explicit pattern proposal before application use.

Controls do not own storage. Preserve immediate persistence for existing atomic,
reversible edits. Reserve Save/Create for drafts and composite creation per
AGENTS.md. Selecting an option calls `onChange` once and closes; dismissing a
menu does not manufacture a change.

## Rules for agents

Use the vocabulary above. Do not substitute a native select, checkbox, radio,
range, switch, or a new CSS imitation when a pattern is missing. Describe the
specific gap and add/review it in this system and showcase before screen use.
`contract.test.ts` prevents raw native buttons, inputs, selects and textareas
outside the existing implementation allowlist. `TextInput` limits its `type`
to text-entry variants so it cannot serve as an escape hatch for other widgets.
A new primitive requires an intentional contract/allowlist change, not a local
screen workaround. Preserve the established native text keyboard.

This PR establishes a foundation, not a completed component library or an
approval of the full UI. Keep #26 as workflow/gap evidence. Once this foundation
is approved and merged, rebuild/refactor its screens using these tokens and
components, preserving useful app behavior and existing data.

## Validation

`npm run check` covers source-palette provenance, the primitive boundary, option
selection/cancellation/disabled behavior, plus existing controls and placement
regressions. `node tools/build-design-system.ts` builds the isolated showcase;
`npm run build` checks the application still builds.

Capture the showcase at native 256px / DPR 1 after its font loads, then run:

```sh
node tools/prove-design-system.ts work/design-system-review/native.png work/design-system-review/proof
```

This reconstructs the unmodified screenshot with the home's **same four
background and three sprite palettes**, emphasis and MMC5 8×8 attribute profile.
It preserves the original home construction and allocates any additional UI
colors to checked sprite tiles. Each crop (at most 240 rows) must reconstruct
pixel-for-pixel and fit palette, attribute, 64-sprite and eight-per-scanline
budgets; no quantization occurs. The closed showcase, both open layout menus, and the open number pad pass 44
crops in total, with at most 57 sprites and eight on a scanline. The old four-material
screenshot recipe in the Controls README predates gold interactive text and
must not certify this composition. New screen compositions and other menu states
need their own captures/proofs. This is a deterministic construction check,
not a new independent emulator reproduction.
