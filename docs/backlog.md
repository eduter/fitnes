# Backlog

## Design-system foundation

The [UI system contract](../src/design-system/README.md) defines the adopted
components and composition rules. [PR #26](https://github.com/eduter/fitnes/pull/26)
remains open for application integration and useful workflow evidence.

- [x] Establish shared palette tokens, framed fields, layered windows,
  date/multiline/membership entry, confirmations and page pagination.
- [x] Verify sampled overview, editor and nested number-pad compositions against
  NES attribute/palette/sprite rules using the home construction. New screens
  and states still require their own proofs.
- [ ] Revise #26 using the system while preserving useful app behavior and
  existing data. Integrate the available components before adding patterns.
- [ ] Build catalog selection with bounded page-level lists and child editors;
  preserve the selected page/row when a child closes.
- [ ] Complete home/session workflows, compact workout rows, previous-performance
  columns and result summaries while preserving measurement/load meanings.
- [ ] Define composite Create/Save/Cancel flows, including dismissal of unsaved
  batches. Existing atomic edits remain immediate.
- [ ] Add field-linked validation and compact empty/loading/error/status examples.
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
- [ ] Build the application UI around the compact preview's dogfooded workflows
  and the adopted home art, SteelPanel, BottomTabs, and reusable controls.
- [ ] Review persistence and import/export for validation, atomic replacement,
  and preservation of real data.
- [ ] Implement compact logging, previous-performance display, and navigation
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

## Model policies to resolve

These product decisions remain open; documentation cleanup does not choose a
policy for them.

- [ ] Decide how to attach bodyweight recorded after a session starts or
  backfilled later.
- [ ] Define the session-construction trust boundary.
- [ ] Decide whether tighter string and numeric validation policies are needed.
