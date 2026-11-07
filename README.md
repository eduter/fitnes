# FitNES

[Product vision](docs/vision.md) · [Backlog](docs/backlog.md) · [UI system](src/design-system/README.md) · [Repository inventory](docs/repo-status.md) · [Agent guidance](AGENTS.md)

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

## Application review

[Private application preview](https://fitnes-app-design-system.eduardo-terroso.chatgpt.site) uses the shared UI system
from PR #27. It replaces the screen implementation proposed in PR #26 while
retaining its domain/repository behavior and regression coverage.

Home starts workouts and records weight. The six tabs cover templates, catalog
exercises, weight history, sessions and Settings. Lists use the available height
before paging. Planned sets, exercise definitions and results use bounded shared
editors; numeric/choice controls may open child windows. Valid existing edits
persist immediately. New exercises/templates require Create, new readings use
Save/Cancel, and leaving an unsaved composite asks before discarding it.

`npm run build` creates the offline application. `npm run build:preview` additionally
seeds an unused preview database once with three templates, four completed
sessions and eight weight readings. Existing records are never replaced by the
seed. Preview publication uses `.openai/hosting.json` and a separate Sites origin;
the earlier UI, design-system and compact dogfood deployments remain intact.

Device data stays in IndexedDB at its original origin. Move domain records
explicitly through Settings → Download JSON, then import at the new origin. Import
validates before an atomic replacement of the four domain collections. Legacy
version-1 scaffold workout rows are retained in their store, without automatic
conversion into the current domain format.

`node tools/build-ui-logo.ts` reproduces the indexed logo from the standalone
source using the home's first background palette. This avoids browser filter
rounding and keeps the logo within the same hardware construction as the art.
Generated Chromium captures and construction reports belong in ignored `work/`.
