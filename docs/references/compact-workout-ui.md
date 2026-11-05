# Compact workout UI reference

The owner dogfooded the Cloudflare preview to evaluate workout workflows and
navigation:

https://feat-compact-workout-ui.fitnes-preview.pages.dev/

The corresponding source snapshot is commit
[`4b81ee5ee2516dcbe794d071fa83bfe7042c0d21`](https://github.com/eduter/fitnes/tree/4b81ee5ee2516dcbe794d071fa83bfe7042c0d21), also retained as the
`reference/compact-dogfood` Git tag. This is the known branch source revision;
the deployed preview's SHA was not independently verified.

Useful workflows in that source include:

- Home shows in-progress sessions to continue, workout templates to start, and
  recent completed sessions.
- Templates and exercises have list, create, edit, and delete flows. Starting a
  template can attach no bodyweight, the latest measurement, or a new
  measurement.
- A session records each planned set, shows previous performance, supports
  editing or clearing results, and can be completed, reopened, or deleted.
- The Weight destination records and removes bodyweight measurements. Data
  exports the local database as JSON and imports by replacing the full local
  database after confirmation.
- Five frequent destinations stay in a fixed bottom bar; the less frequent
  Data destination stays in the header.

The source stores workout data in browser IndexedDB and has no account or
cross-device sync. Users must export their data for a portable backup. On
startup it seeds example exercises whenever the exercise catalog is empty, so
an intentionally emptied catalog is repopulated. The preview appearance is a
temporary UI reference; this note preserves workflows, not its styling or a
claim that the preview is still live.
