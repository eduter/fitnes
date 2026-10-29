# FitNES

[Product vision](docs/vision.md) · [Backlog](docs/backlog.md) · [Agent guidance](AGENTS.md)

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Verify UI changes

```bash
npm run nes:check -- --url http://localhost:5173/ --ready '#root h1'
npm run nes:check -- screenshots/changed-state.png
```

See the [NES visual check](tools/nes/README.md) for reports, exit codes,
Chrome setup, and the constraints (with unlimited distinct tiles).
