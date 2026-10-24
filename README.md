# FitNES

Personal, offline-first PWA workout tracker built with Solid.js and TypeScript.

## Development

```bash
npm install
npm run dev
```

## NES screen renderer

`nes/` draws 256×240 screens under NES background, palette, and sprite
limits. `npm run nes:validate` and `npm run nes:render` are documented in
`nes/README.md`. The FitNES reference screen is
`nes/examples/workout-dashboard.json`.

The app uses the same width and no height limit. Its column is 256 logical
pixels, scaled to fill the device width, and the page scrolls for as long
as the workout is.

## Build

```bash
npm run build
npm run preview
```
