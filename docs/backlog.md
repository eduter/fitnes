# Backlog

This is the proposed order for consolidating existing work. It is not permission
to merge every experimental PR or to resolve open product decisions silently.

## Foundation

- [x] Consolidate the preview's domain model through PR #2.
- [ ] Review and adopt the product vision and agent guidance in this docs PR.
- [ ] Review persistence and data import/export from #3 against the consolidated
  model, including validation, atomic replacement, and preservation of real data.
- [ ] Review useful compact-UI behavior from #4 separately from its rendering tool.

## Intended NES interface

- [ ] Assess #5 and #6 against the visual contract; retain useful art and behavior
  without adopting either branch wholesale.
- [ ] Review renderer/checker assumptions, including background versus sprite
  rules, tile banks for scrolling pages, and device scaling.
- [ ] Prototype readable typography and menu hierarchy within the NES constraints,
  using #7 as research rather than a prescribed implementation.
- [ ] Agree with the owner on how character movement communicates set progress;
  compare the #9 concepts before selecting or replacing one.
- [ ] Implement and verify the chosen workout UI in small changes. Show native
  logical-pixel output and the actual phone experience.
- [ ] Make a deliberate deployment and data-transfer plan when the intended UI
  is ready to replace the temporary preview.

## Remaining model policies

- [ ] Resolve post-start/backfilled bodyweight attachment.
- [ ] Review the session-construction trust boundary.
- [ ] Decide whether tighter string/numeric policies are needed.

See [product decisions](product-decisions.md) for settled behavior and open
questions, and [repository status](repo-status.md) for the source branches.
