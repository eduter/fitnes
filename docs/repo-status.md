# Useful existing work

Updated 2026-11-04. Use [the vision](vision.md#design-direction) for the selected
visual and interaction references, and [the backlog](backlog.md) for next tasks.

Selected assets: [style reference](style-reference.png) (rightmost charcoal/steel
design) and [standalone logo](fitnes-logo.png).

Selected bottom tabs: [six PNG icons and the steel bar](../src/components/BottomTabs/README.md).
Home C; Templates, Exercises, Weight, History and Settings A. The final demo and
hardware proof share the home artwork's palettes and use 59 sprites, including
two window overlays. App integration remains open.

Reusable [input controls](../src/components/Controls/README.md): Button, Popover,
Spinner and TextInput. The spinner uses the selected number pad; the thin
popover incorporates PR #23's stepped opening and reverse closing. The isolated
[phone preview](https://fitnes-numeric-preview.eduardo-terroso.chatgpt.site/)
uses these Solid components directly. Workout-app integration remains open.

Future corridor art: the [self-contained reference package](design/corridor-interstitial/README.md)
records the owner's decisions and preserves both corridor versions with native
tiles, indexed sources, proof samples, sprites and all character sheets. F is a
provisional preference; A — Basement supplies the material direction. The preferred
layout follows DW3: a thin vertical corridor seen from above on black. Implementation
remains deferred behind earlier backlog work. See [PR #22](https://github.com/eduter/fitnes/pull/22).

| Branch / PR | Useful material |
| --- | --- |
| `feat/compact-workout-ui` · [#4](https://github.com/eduter/fitnes/pull/4) | Compact logging, previous-performance display, navigation, and persistence. Source for the [preview in use](https://feat-compact-workout-ui.fitnes-preview.pages.dev/). |
| `cursor/nes-design-system-31db` · [#5](https://github.com/eduter/fitnes/pull/5) | [Gym and character art](https://github.com/eduter/fitnes/tree/f1bca218a5b0905bb688022decf43caa75f29126/public/artwork), [13 icons](https://github.com/eduter/fitnes/tree/f1bca218a5b0905bb688022decf43caa75f29126/public/pixel-icons), and a [secondary concept sheet](https://github.com/eduter/fitnes/blob/f1bca218a5b0905bb688022decf43caa75f29126/public/nes-style-reference.png). |
| `cursor/nes-window-ui-81c6` · [#6](https://github.com/eduter/fitnes/pull/6) | [Palette-reduced gym, logo, and five navigation images](https://github.com/eduter/fitnes/tree/0f811ebbb16fd1df476369675c13c738110a8040/src/assets) to assess for reuse. |
| `cursor/nes-typography-menu-research-33d8` · [#7](https://github.com/eduter/fitnes/pull/7) | [Readability research](https://github.com/eduter/fitnes/blob/385e4a92773e26e82564fd527c8ab4038baa4e1f/docs/design/nes-typography-and-menu-research.md) and [font specimens](https://github.com/eduter/fitnes/tree/385e4a92773e26e82564fd527c8ab4038baa4e1f/docs/design/typography-menu). |
| `feat/nes-ui-check` · [#11](https://github.com/eduter/fitnes/pull/11) | [PNG and live-Chrome compliance checker](https://github.com/eduter/fitnes/blob/c910349a6cd90d29766ebd69fb64ec6032a5cc0c/tools/nes/README.md). Review its scope against the visual contract before adopting it. |
| `feat/focused-nes-ui` · [#12](https://github.com/eduter/fitnes/pull/12) | Current-set logging, editors, and import/export flows; [screenshots and reproduction notes](https://github.com/eduter/fitnes/tree/f3df2a3eb2a7bb9337c92e418d6bd34a08511f04/docs/design/focused-ui) and [fonts](https://github.com/eduter/fitnes/tree/f3df2a3eb2a7bb9337c92e418d6bd34a08511f04/public/fonts). Assess functionality separately from the selected art direction. |
| `feat/corridor-transition` · [#13](https://github.com/eduter/fitnes/pull/13) | [Top-down movement reference](https://feat-corridor-transition.fitnes-corridor-capture-preview.pages.dev/) and [committed video, contact sheets, and frames](https://github.com/eduter/fitnes/tree/20bc3275240d723586f24877838c908bce5ffad3/docs/captures/corridor-transition). |
