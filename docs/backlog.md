# Backlog

## Design-system foundation

The [UI system contract](../src/design-system/README.md) defines the adopted
components and composition rules. [PR #26](https://github.com/eduter/fitnes/pull/26)
is retained as workflow evidence; its screen implementation is superseded by
the application integration in this branch.

- [x] Establish shared palette tokens, framed fields, layered windows,
  date/multiline/membership entry, confirmations and page pagination.
- [x] Verify sampled overview, editor and nested number-pad compositions against
  NES attribute/palette/sprite rules using the home construction. New screens
  and states still require their own proofs.
- [x] Rebuild the application using the merged system, reusing useful #26 model
  and repository behavior. Preserve earlier preview deployments and device data.
- [x] Build catalog selection with bounded page-level lists and child editors;
  preserve the selected page/row when a child closes.
- [x] Complete home/session workflows, compact workout rows, previous-performance
  columns and result summaries while preserving measurement/load meanings.
- [x] Define composite Create/Save/Cancel flows, including dismissal of unsaved
  batches. Existing atomic edits remain immediate.
- [x] Add compact empty/loading/error/status feedback and validation paths.
- [ ] Refine field-linked validation and review all imported numeric extremes.
- [ ] Dogfood the new application on the owner's Android phone; collect UI feedback.
- [ ] Review native Android refresh behavior on a real device. Page one permits
  refresh; later pages use downward swipes for previous-page navigation.

Inline expansion and modal pagination are prohibited. Common edit fields and
notes belong together in a bounded form. Import/export workflow polish remains
lower priority; preserving real data is still a prerequisite to persistence or
deployment changes.

## Integration order

Use the [repository inventory](repo-status.md) to find adopted components and
retained design sources before starting implementation. The [vision](vision.md)
records the selected art, adopted menu and corridor directions, and the compact
preview's behavioral role.

- [ ] Preserve preview data and review import/export behavior before changing
  persistence or replacing the current deployment.
- [x] Build the application UI around the compact preview's dogfooded workflows
  and the adopted home art, SteelPanel, BottomTabs, and reusable controls.
- [ ] Review persistence and import/export for validation, atomic replacement,
  and preservation of real data.
- [x] Implement compact logging, previous-performance display, and navigation
  using the preview's behavior as the reference.
- [ ] Locate and preserve the menu capture's source as a navigation design
  reference; its sequence of a few choices followed by subsequent menus is an
  adopted direction, separate from the compact preview's dogfooded behavior.
- [ ] Review renderer and checker assumptions for sprite rules, tile banks on
  scrolling pages, device scaling, and letterboxing.
- [x] Extract the selected button, animated thin popover, number-pad spinner and
  native text-input controls into reusable components.
- [x] Retain the corridor art, editable sources and owner decisions in the
  [reference package](design/corridor-interstitial/README.md).
- [ ] Choose the broader screen typography, menu hierarchy, and layout while
  preserving the selected controls' case and interaction rules.
- [ ] Implement the workout UI in small changes, checking native-resolution
  output and the actual phone experience.
- [ ] Design and integrate the between-set flow after earlier backlog work,
  starting from the retained corridor sources: thin top-down corridor on black,
  whole-workout travel through set doors, and provisional character F. Keep all
  character alternatives available; timing and detailed interaction remain open.
- [ ] Plan deployment and data transfer before replacing the preview.

## Guided workout tracking

Owner-approved direction is detailed in the [vision](vision.md). Review the
[actual complete app](https://fitnes-pr33-app.eduardo-terroso.chatgpt.site), not
the historical standalone prototype.

- [x] Integrate current-step tracking with real session snapshots and persistence;
  successful Log advances to the next unfinished step.
- [x] Add Start, preparation countdowns, remaining time, paced repetitions,
  pause/resume and screen wake lock with fixed element positions.
- [x] Persist exercise preparation/rep-duration defaults and independent workout
  overrides; permit session-only timing edits before starting a set.
- [x] Add explicit rest steps to the ordered execution sequence and workout
  editing, duplication and movement. Preserve circuits and supersets.
- [x] Preserve previous results, count/load meanings and independent per-side
  performance; recover unlogged timer/result drafts after refresh.
- [x] Publish the full application from the PR source with no preview seeding.
- [ ] Review/refine pause, early logging, skip, rest auto-start and Next behavior
  on the owner's Android phone. These are functional initial choices for review.
- [ ] Simplify the internal set/reference storage into the proposed single array
  of set/rest objects. The working integration extends the existing sequence
  compatibly; old exports still import. Manual JSON conversion is acceptable
  when that later representation changes; no automatic migration is required.
- [ ] Add the corridor later; it is not required for the first guided version.

## Model policies to resolve

These product decisions remain open; documentation cleanup does not choose a
policy for them.

- [ ] Decide how to attach bodyweight recorded after a session starts or
  backfilled later.
- [ ] Define the session-construction trust boundary.
- [ ] Decide whether tighter string and numeric validation policies are needed.
