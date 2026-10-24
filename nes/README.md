# NES screen renderer

A deterministic drawing tool for FitNES screens. It enforces the graphics
limits that make a picture look like an NES game: a 256×240 framebuffer,
8×8 two-bit tiles, four background subpalettes, and one subpalette per
16×16 attribute region.

It is not an emulator. There is no CPU, no audio, no controllers, no
mappers, and no PPU timing. Screens are JSON documents. A coding agent
edits the JSON, runs a command, and reads the PNG.

## Commands

```bash
npm install
npm run nes:validate -- nes/examples/workout-dashboard.json
npm run nes:render -- nes/examples/workout-dashboard.json --out nes/examples/workout-dashboard.png
npm run nes:render -- nes/examples/workout-dashboard.json \
  --out nes/examples/workout-dashboard.png \
  --preview nes/examples/workout-dashboard@3.png
```

`nes:validate` prints every problem and exits 1 when the screen is invalid.
It does not rewrite the file. `nes:render` writes a PNG only when validation
passes, and exits 1 otherwise.

`--out` is native 256×240 unless `--scale N` enlarges it. `N` is an integer
of 1 or more. Each source pixel becomes an `N`×`N` block; nothing is blended.
`--preview` writes a second file at the screen's `preview.scale` (1–8,
default 3). The same input produces the same bytes.

The workout dashboard lives at `nes/examples/workout-dashboard.json`, with
`workout-dashboard.png` (native) and `workout-dashboard@3.png` (3×) beside it.

## What a screen is

Three separate pieces:

1. **Assets** (`nes/assets/*.json`): background tiles, sprite tiles, metatiles, and fonts.
2. **Layout** (the screen JSON): palettes, layers, and sprites. Layers only place tiles.
3. **The renderer** (`nes/*.ts`): validation and rasterization. Screens do not import it.

A screen lists asset paths relative to itself:

```json
{
    "name": "rest",
    "width": 256,
    "height": 240,
    "assets": ["../assets/fitnes.json"],
    "palettes": {
        "universal": "$0F",
        "background": [
            ["$0C", "$00", "$30"],
            ["$02", "$21", "$30"],
            ["$08", "$28", "$30"],
            ["$01", "$11", "$30"]
        ]
    },
    "layers": [
        { "op": "fill", "x": 0, "y": 0, "w": 32, "h": 30, "tile": "fill", "palette": 0 },
        { "op": "text", "x": 2, "y": 2, "text": "REST", "font": "hud", "palette": 0, "ink": 3, "paper": 1 }
    ]
}
```

`width` and `height` must be 256 and 240. Coordinates on layers are **tiles**
(32×30). Sprite `x` and `y` are **pixels**, and `y` is the top row of the
sprite on that 240-line picture.

### Palettes

`universal` is one master-palette index. It is color 0 of every background
subpalette, on every tile. Each of the four `background` entries lists the
other three colors, indexes `$00`–`$3F`. Strings are hex (`"$0F"`, `"0F"`,
`"0x0F"`). A JSON number is decimal, so `15` and `"$0F"` are the same color
and `"10"` is `$10`, not 10.

A tile pixel is only `0`, `1`, `2`, or `3` (`.` means 0). It selects an entry
of whichever subpalette the attribute region assigned. Pixel 0 is always the
universal color, so a tile cannot carry its own backdrop. Sprite pixel 0 is
transparent instead, and sprites have their own four subpalettes.

The RGB values are not from the console. The PPU does not emit RGB. This
tool displays logical indexes `$00`–`$3F` with the FCEUX default palette
(`fceux.pal`), stored in `nes/palette.json` and cited there. `$0D` is warned
about: on NTSC hardware it is an out-of-range signal, and here it is black.
`$20` and `$30` are the same near-white in this table. `$0E`, `$1D`, `$2E`,
`$3E`, and the `$xF` entries are black in this table.

### Tiles, text, and helpers

Background art is rows of 2-bit pixels.

- A **tile** is exactly 8×8.
- A **metatile** is any multiple of 8 on both sides. It is sliced into tiles named `name[row,col]` and placed as a unit.
- A **font** glyph is the same kind of art, drawn with `0` (paper) and `3` (ink). `text` can set `ink` and `paper` to 0–3 and `scale` to 1–4. Scaling repeats pixels into new tiles; it does not draw freehand.

Every layer goes through the same nametable write, so a helper cannot dodge the rules. Ops, all in tile units:

| `op` | What it places |
| --- | --- |
| `fill` | A rectangle of one tile |
| `map` | `rows` of characters looked up in `legend`. `null` leaves the cell alone |
| `metatile` | A named metatile |
| `text` | Glyphs from `font`, left to right, `\n` moving down |
| `panel` | A frame of `<frame>.tl .t .tr .l .r .bl .b .br`, optional `fill` inside. At least 2×2 |
| `hline` / `vline` | A run of one tile, with optional `start` and `end` tiles |
| `meter` | `w` cells, `round(value / max * w)` of them using `full` and the rest `empty` |

Later layers replace earlier cells, including the subpalette the cell asks for. A misspelled field is an error.

### Attribute regions

Background subpalettes are not chosen per tile. The picture is divided into
16×16 regions, two tiles by two tiles, and every non-blank tile in a region
must ask for the same subpalette (0–3). Blank tiles (every pixel 0) show
only the universal color, so they do not conflict.

The screen is 240 pixels tall, so there are **15** region rows, not 16.
Region row 14 is tile rows 28–29, pixels y 224–239. Those two rows are a
normal, fully enforced region. They are the top half of the last row of
attribute bytes; the bottom half of those bytes would describe tile rows
30–31, which are not on a 240-line picture and are not stored. An
`attributes` grid, if you declare one, is 15 strings of 16 digits and is
checked against the tiles.

Tiles in neighboring regions may use different subpalettes. A vertical split
inside a region may not. Plan bands in multiples of two tile rows, and
horizontal splits on even tile columns.

### Sprites

`spriteSize` is `"8x8"` (the default) or `"8x16"`. An 8×16 sprite names
`tile` and `below` rather than relying on even/odd pattern addresses.
`priority` is `"front"` or `"back"`. A back sprite is hidden where the
background pixel is not the universal color. `flipX` and `flipY` apply.

At most 64 sprites. At most eight sprites touch any scanline, counted by
vertical overlap even when they are clipped in x. Index 0 is painted last
and wins overlaps. Passing either limit is an error; sprites are not
silently dropped. Sprite tiles come from `spriteTiles`, a separate pattern
table from the background, also capped at 256 patterns.

### Pattern tables

Distinct background patterns actually placed on the screen, including
recolored and scaled glyphs, must fit in 256 slots. Identical patterns share
a slot. The blank tile is one slot when anything uses it. The error names
the first tiles that do not fit.

### Reading an error

```text
error attribute-conflict nes/examples/workout-dashboard.json layers[4] "set-3": attribute region (0,9) at pixels x 0–15, y 144–159 mixes subpalettes: tile (0,18) 'fill' from layers[3] "current-band" uses 2; tile (1,19) 'hud:A' from layers[4] "set-3" uses 0. All four tiles of a 16×16 region share one subpalette
```

`error` or `warning`, then a stable code, the file, a JSON path, and a
message with coordinates and names. Codes include `screen-dimensions`,
`palette-index`, `palette-shape`, `palette-reference`, `tile-size`,
`tile-pixel`, `tile-reference`, `missing-glyph`, `attribute-grid`,
`attribute-conflict`, `pattern-limit`, `sprite-limit`,
`sprite-scanline-limit`, `out-of-bounds`, and `schema`. A layer with a bad
field is skipped, so it does not also invent a pile of bogus placements.
Fix the named field and validate again.

## Adding art

In an asset file:

```json
{
    "tiles": {
        "pip-on": ["11111111", "12222221", "12222221", "12222221", "12222221", "12222221", "12222221", "11111111"]
    },
    "spriteTiles": {
        "mark": ["00033000", "00333300", "03333330", "33333333", "03333330", "00333300", "00033000", "00000000"]
    },
    "fonts": {
        "hud": { "glyphs": { "A": ["03333300", "33000330", "33000330", "33333330", "33000330", "33000330", "33000330", "00000000"] } }
    }
}
```

Names are global across the asset files a screen loads. A duplicate name is
an error. Glyphs in one font must share a height. Pixel `4`, a short row, or
a tile that is not 8×8 fails with the row and the pixel coordinate.

`nes/assets/fitnes.json` is the dashboard's font (uppercase, digits, space,
and `. , : ! ? ' - / + ( ) #`), frame, meter pips, and barbell. Reuse it or
add a glyph there. Do not trace a commercial game's font.

## Extending the renderer

New shortcuts belong as layer ops in `nes/layout.ts`. They must call `put`,
which is the only nametable write, so the attribute check, the pattern-table
cap, and the 8×8 rule still apply. Do not add a path that stores arbitrary
RGB, anti-aliases, or chooses a subpalette per tile. A per-tile palette is a
different machine (MMC5-style extended attributes) and would stop the
pictures from being drawable on an unmodified NES background.

Sprites already have their own palettes and can overlap a region boundary.
That is the supported way to put a color somewhere the background cannot.

## What this does not model

Enforced, because they change a still picture:

- 256×240, nearest-neighbor integer scale only
- 8×8 tiles, four colors each, at most 256 background patterns and 256 sprite patterns
- One universal background color shared by every subpalette's entry 0
- Four background subpalettes and four sprite subpalettes
- One subpalette for each 16×16 region, including the bottom 16 pixels
- Sprite transparency, front-to-back order, 64 sprites, eight per scanline
- 8×8 and 8×16 sprites

Approximations and omissions, stated so they are not mistaken for hardware:

- RGB bytes are the FCEUX palette, not a measurement of a 2C02.
- Sprite `y` is the top pixel. The PPU stores a value one less than that.
- 8×16 sprites name both patterns. Hardware derives the second from an even tile index.
- Background tiles cannot flip. Sprite flips are supported.
- Palette-RAM mirrors (`$3F04`, `$3F08`, `$3F0C`, `$3F10`, and so on) are not separate colors. Entry 0 is the one universal color.
- Tile rows 30–31 and the lower half of the last attribute-byte row are absent.
- Color emphasis, hue artifacts, and the `$0D` sync glitch are not simulated. `$0D` is black plus a warning.
- Sprite overflow is rejected instead of dropping the later sprites the way the PPU would.
- There is no sprite-0 hit, no sprite-to-sprite collision, and no scanline split of the palette.
- Identical tile bytes share a pattern slot. Two names with the same pixels do not cost two slots.
- No CRT shader, no subpixel placement, and no system-font rendering in the PNG.

## Rendered pages

`assessPicture` (`nes/pictureCheck.ts`) scores a finished RGB picture as a
still frame an unmodified NES could draw: a background layer, with sprites
layered on top where the background cannot hold the color.

The column is 256 pixels wide and the height is a multiple of 16, because a
page scrolls past 240. Every pixel is an FCEUX master-palette color. The
background is still four subpalettes sharing one universal color, one
subpalette for each 16×16 region, three colors of its own plus that shared
color. That is 13 background colors. Tiles stay 8×8 and four colors. A
per-tile attribute, the MMC5 kind, is still rejected.

Sprites are the other layer. Games stack them on the background to show a
color the attribute region does not have: a cursor, an icon, a figure. The
checker keeps a pixel on the background when that pixel's color fits the
region's subpalette. Colors that already cover a wide run, more than 64
pixels on one line, stay on the background too, because eight sprites cannot
cover them. The leftovers are sprite pixels, and they have to fit the stock
sprite hardware:

- four sprite subpalettes of three colors each, so 12 sprite colors
- one subpalette per sprite, in either 8×8 or 8×16 for the whole frame
- eight sprites on a scanline, at most 64 sprite pixels on that line
- 64 sprites in any 240-line window, because OAM is one screen and a
  scrolling page can reuse those slots further down

A fifth color in one tile is legal when a sprite covers it. The same color
stretched across the screen is not. There is still no mid-frame palette
swap, so one background palette set and one sprite palette set cover the
whole picture.

The 256-tile pattern table is a CHR bank, not a rule about how a color
may be used. The scrolling app does not keep one bank for a whole page,
so the page check turns that cap off. The JSON screen tool still enforces
it. A tile hidden by a sprite is charged as if the sprite pixels were the
universal color, which is the background those pixels would show if the
sprite moved.

`nes/pagePicture.test.ts` opens the shell routes in Chrome at 256 CSS
pixels, where one logical pixel is one screenshot pixel, and runs that
check. Height may run past 240 because the page scrolls. `npm run check`
includes it. The workflow installs Chrome and passes its path as
`CHROME_PATH`.
