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

## Build

```bash
npm run build
npm run preview
```
