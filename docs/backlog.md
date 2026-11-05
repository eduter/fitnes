# Backlog

## Integration order

Use the [repository inventory](repo-status.md) to find adopted components and
pending source PRs before starting implementation. The [vision](vision.md)
records the selected art, adopted menu and corridor directions, and the compact
preview's behavioral role.

- [ ] Preserve preview data and review import/export behavior before changing
  persistence or replacing the current deployment.
- [ ] Build the application UI around the compact preview's dogfooded workflows
  and the adopted home art, SteelPanel, and BottomTabs components.
- [ ] Review persistence and import/export for validation, atomic replacement,
  and preservation of real data.
- [ ] Implement compact logging, previous-performance display, and navigation
  using the preview's behavior as the reference.
- [ ] Locate and preserve the menu capture's source as a navigation design
  reference; its sequence of a few choices followed by subsequent menus is an
  adopted direction, separate from the compact preview's dogfooded behavior.
- [ ] Review renderer and checker assumptions for sprite rules, tile banks on
  scrolling pages, device scaling, and letterboxing.
- [ ] Choose typography, case, menu hierarchy, and layout.
- [ ] Integrate the pending corridor source package while preserving its
  recorded direction: thin top-down corridor on black, whole-workout travel
  through set doors, provisional character F, with timing and interaction
  deferred for later work.
- [ ] Plan deployment and data transfer before replacing the preview.

## Model policies to resolve

These product decisions remain open; documentation cleanup does not choose a
policy for them.

- [ ] Decide how to attach bodyweight recorded after a session starts or
  backfilled later.
- [ ] Define the session-construction trust boundary.
- [ ] Decide whether tighter string and numeric validation policies are needed.
