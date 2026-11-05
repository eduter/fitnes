# FitNES pixel fonts

Pixel Operator and Pixel Operator 8 are by Jayvee Enaguas, released under CC0.
The complete license is in FONT-LICENSE.txt.

Source: https://github.com/ericoporto/pixel-utf8-fonts/tree/main/pixeloperator
and https://github.com/ericoporto/pixel-utf8-fonts/tree/main/pixeloperator8.
Original file blobs: 34fe947b8d4e7efa8e57798512ff15b232a763de and
f9146acf8f80a26e384080fd3289364c50a76a2d.

The grid derivatives preserve the source glyphs at their native 16px and 8px
sizes, convert their monochrome masks into square TrueType outlines, and retain
integer advances. Small arrows, check and close marks are hand-drawn on the same
grid. They add no antialiasing colors in normal Chromium rendering. Swedish
å, ä and ö are retained. These are licensed homebrew letterforms, not fonts
traced from a commercial game. The application does not suppress Chromium's
normal antialiasing or quantize its screenshots.

Each glyph also has a COLR v0 foreground-color layer (palette index 0xffff)
using the same outlines. This makes Chrome use shape rasterization instead of
LCD text rasterization, which can introduce RGB fringes even at native sizes.
The layer inherits the normal text color; it adds no color of its own. Both
regular Chromium and Google Chrome with RGB subpixel font configuration are
covered by the captured UI checks. Browser antialiasing remains enabled.
