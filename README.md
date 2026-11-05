# FitNES

[Product vision](docs/vision.md) · [Backlog](docs/backlog.md) · [Repository inventory](docs/repo-status.md) · [Agent guidance](AGENTS.md)

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

## UI preview

`npm run build:preview` builds a separate, seeded preview. On a fresh origin it
adds three workout templates, four completed workouts, and eight weight readings.
Seeding is atomic, happens only once, and never replaces existing records.
`npm run build` keeps seeding disabled. Both builds store workout data on-device.

The home screen uses the selected gym artwork, `SteelPanel`, and `BottomTabs`.
The adopted Button, Popover, Spinner and TextInput supply all app actions and
quantity/name entry. Start workout opens the template chooser (including resume options); Record
weight opens a reading form. The other screens reuse the compact dogfood flows.
The Settings tab holds JSON import/export.
