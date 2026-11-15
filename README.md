# FitNES

[Product vision](docs/vision.md) · [Backlog](docs/backlog.md) · [UI system](src/design-system/README.md) · [Repository inventory](docs/repo-status.md) · [Agent guidance](AGENTS.md)

## Development

```bash
npm install
npm run dev
```

For native artwork changes, use the [local NES artwork editor](tools/art-editor/README.md)
(`npm run art:editor`). Drafts and backups stay local; Save artwork replaces the
selected current image and construction after verification.

## Build

```bash
npm run build
npm run preview
```

## Application review

[Private application preview](https://fitnes-app-design-system.eduardo-terroso.chatgpt.site) uses the shared UI system
from PR #27. It replaces the screen implementation proposed in PR #26 while
retaining its domain/repository behavior and regression coverage.

Home starts workouts and records weight. The six tabs cover workouts, catalog
exercises, weight history, sessions and Settings. Lists use the available height
before paging. Planned sets, exercise definitions and results use bounded shared
editors; numeric/choice controls may open child windows. Valid existing edits
persist immediately. New exercises/workouts require Create, new readings use
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

Home uses the owner-edited `art/home/gym.png` and the direct-color
`art/logo/logo.png` from PR #30. Original references remain under `docs/`;
there are no tracked alternate app-image versions or runtime logo filters. Both steel and copper frames use native-size
PNG assets at runtime to retain the Android border-image painting fix. Editable
SVG sources remain alongside them. Generated Chromium captures and construction
reports belong in ignored `work/`.

## Dropbox synchronization

Dropbox sync is optional. Settings offers connection, status and explicit conflict
choices; Recovery copies lists local backups for download or confirmed restore.
Edits save locally first, including offline. Logged progress follows the dataset;
running timers, unlogged inputs and the mass-unit preference stay device-local.

Use a **separate Dropbox app**, with App Folder access and these scopes:
`account_info.read`, `files.metadata.read`, `files.content.read`,
`files.content.write`. Configure its public app key as `VITE_DROPBOX_APP_KEY`
when building. GitHub Pages reads repository variable `DROPBOX_APP_KEY`. No
client secret is used or shipped. With no key, the app stays local-only.

Register the exact callback URL formed by the deployment origin and Vite base,
including its trailing slash: production is `https://eduter.github.io/fitnes/`;
a root-base development build normally uses `http://localhost:5173/`. OAuth
uses PKCE, one-use state and refresh tokens. Credentials remain in browser storage
and are excluded from data exports and recovery copies.

The sync file is `/fitnes/data.json` within the app folder. Before the first
overwrite each UTC day, `/fitnes/backups/daily-YYYY-MM-DD.json` preserves the
downloaded bytes. Explicit conflict overwrites also preserve an exact revision
copy. Dropbox backups are immutable and are not automatically pruned in v1.
Locally, the newest 20 routine replacement backups are retained; current
unresolved conflict copies are pinned until resolved or superseded. If backup
storage fails, replacement stops and local data remains available. Legacy scaffold
`workouts` rows stay local and untouched.

The engine compares canonical content with the last shared baseline. Both sides
changing differently pauses sync for a complete-dataset choice. A stale upload
revision causes a fresh comparison. Incoming replacement waits for editors and
tracking screens in every tab to close; local writes and safe uploads continue.
An upload journal reconciles requests whose response was lost. Disconnect clears
credentials and stops requests, retaining local records and recovery data. An
already accepted in-flight upload may finish remotely; reconnect reconciles it
before another write. A device cannot receive edits that the source device has
not yet uploaded.

The generic engine has no UI, fitness, IndexedDB or Dropbox dependency. The
Dropbox adapter and FitNES persistence adapter implement its small storage
interfaces; no shared package is published yet.

`npm run check` runs the unit/component/adapter suite. `npm run test:browser`
builds the app with a test-only key and runs Chromium flows against intercepted
Dropbox requests; unrelated external requests are blocked. Install its browser
with `npx playwright install chromium`, or set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an installed Chromium executable. These
tests never use a Dropbox account or production data.

For an unseeded, isolated review deployment, build with
`VITE_SYNC_DEMO=true VITE_PREVIEW_DATA=false npm run build`. It uses browser-local
simulated remote storage and never contacts Dropbox. Keep its origin separate
from production. The older seeded `build:preview` workflow deliberately disables
Dropbox sync.
