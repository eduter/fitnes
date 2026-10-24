/** Visible NES picture width in pixels. */
const SCREEN_WIDTH = 256;
/** Visible NES picture height in pixels (NTSC renders 240 lines). */
const SCREEN_HEIGHT = 240;
const TILE_SIZE = 8;
/** Nametable size: 32 × 30 tiles. */
const TILE_COLS = SCREEN_WIDTH / TILE_SIZE;
const TILE_ROWS = SCREEN_HEIGHT / TILE_SIZE;

/** One background subpalette is chosen per 16 × 16 pixel (2 × 2 tile) region. */
const ATTRIBUTE_REGION_SIZE = 16;
const ATTRIBUTE_COLS = SCREEN_WIDTH / ATTRIBUTE_REGION_SIZE;
/**
 * 240 / 16 = 15 region rows. Attribute bytes cover 32 × 32 pixels, so the
 * eighth byte row covers only one visible region row; its lower half would
 * describe rows 30–31 of the nametable, which do not exist.
 */
const ATTRIBUTE_ROWS = SCREEN_HEIGHT / ATTRIBUTE_REGION_SIZE;
const ATTRIBUTE_TABLE_BYTES = 64;

const SUBPALETTE_COUNT = 4;
/** Colors chosen per subpalette; entry 0 is always the shared universal color. */
const SUBPALETTE_COLORS = 3;

/** A pattern table holds 256 tiles; backgrounds and sprites each select one. */
const PATTERN_TABLE_TILES = 256;
const MAX_SPRITES = 64;
const MAX_SPRITES_PER_SCANLINE = 8;

export {
    ATTRIBUTE_COLS,
    ATTRIBUTE_REGION_SIZE,
    ATTRIBUTE_ROWS,
    ATTRIBUTE_TABLE_BYTES,
    MAX_SPRITES,
    MAX_SPRITES_PER_SCANLINE,
    PATTERN_TABLE_TILES,
    SCREEN_HEIGHT,
    SCREEN_WIDTH,
    SUBPALETTE_COLORS,
    SUBPALETTE_COUNT,
    TILE_COLS,
    TILE_ROWS,
    TILE_SIZE,
};
