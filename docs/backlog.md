# Backlog

## Design-system review first

Owner direction (2026-11-06): pause broad UI integration to review the separate
[design-system foundation](../src/design-system/README.md). Keep #26 open as
workflow evidence and a source for useful reusable pieces.

- [ ] Review the complete home-image source palette, semantic roles, typography,
  geometry and restricted component vocabulary in the phone showcase.
- [ ] Approve/refine action text, editable values and popover choice menus,
  including on/off choices; identify remaining patterns before screen use.
- [x] Verify sampled closed-showcase compositions against NES attribute/palette/
  sprite rules using the home construction; new screens and menu states still
  require their own proofs.
- [ ] After the foundation merges, revise #26 using the system while preserving
  useful app behavior and existing data.

See the [PR #26 UI audit](../src/design-system/pr26-audit.md) before further
integration. Prioritize paginated catalogs, bounded editor windows, date and
multiline entry, multi-choice membership, draft confirmation, import/export
review, validation, and compact workout rows. Inline expansion is prohibited.

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
