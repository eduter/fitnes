# Product decisions

This file distinguishes owner decisions, existing model behavior, and open design
questions. An implementation or an agent's recommendation does not by itself
approve a product direction.

## Confirmed product direction

| Decision | Consequence |
| --- | --- |
| Personal, offline-first PWA | Keep workout data local and core flows usable offline. |
| Phone use during training | Validate readability and interaction on Chrome for Android. |
| NES visual constraints by default | Use 256 logical pixels across, palette/tile rules, and appropriate sprite limits. |
| Width constraint only for page dimensions | Allow vertical scrolling; do not force every app page into 240 pixels of height. |
| Only the owner approves visual exceptions | Show the UX problem and ask before relaxing a constraint. |
| Compact preview is temporary | Preserve its usefulness without adopting its appearance as the target design. |
| Existing model is a good starting point | Carry its behavior into UI work; raise concrete gaps separately. |

The fidelity policy was explicitly confirmed by the owner on 2026-10-28.
No additional exception is approved by this document.

## Established model behavior

PR [#2](https://github.com/eduter/fitnes/pull/2) consolidated the model used by
the compact preview into the main branch. Its schemas, tests, and construction
helpers define the current implementation. Important semantics to preserve:

- Measurement count basis is independent of execution mode.
- Bodyweight and added external load remain separate; units and load bases are
  explicit and are not silently converted.
- External-load bases are `total` and `perSide`; do not restore `perHand`
  from an older branch.
- Planned per-side targets are symmetric; actuals can record left and right
  separately. Actual measurements can be zero; planned targets remain positive.
- Templates snapshot exercise definitions. Catalog changes are adopted through
  an explicit refresh, not an automatic rewrite of saved plans.
- Execution sequences support arbitrary interleaving, with stable identities
  linking prescribed work to results. Sessions preserve their plan snapshot.
- Actual numeric values may differ from targets while retaining the prescribed
  measurement and load meaning.

This section is a guide to the code, not a second schema specification.
If an implementation conflicts with it, investigate and surface the discrepancy.

## Open questions

| Question | Guidance until resolved |
| --- | --- |
| Character movement and set progression | Explore the existing prototypes; do not select an author's preferred concept on the owner's behalf. |
| Typeface, case, menu hierarchy, and final layout | Evaluate the existing research inside the fidelity policy; no font or layout is approved here. |
| Device scaling and letterboxing | Demonstrate crispness and usability on a real phone; do not assume an earlier branch's scaling is final. |
| Tile-bank management for long pages | Review the renderer's assumptions; no unlimited-pattern exception is approved here. |
| Sprite-aware picture checking | Evaluate PR #8 as a candidate implementation, not authority to change the visual contract. |
| Post-start or backfilled bodyweight attachment | Keep the domain audit's remaining policy question explicit. |
| Trusted-input boundary and tighter string/numeric policies | Review the current API and tests before changing validation behavior. |

## Updating decisions

Record an owner-approved change with its rationale and the scope of any
exception. A visual exception must say which rule is relaxed and where it applies.
Keep experiments labeled as experiments until the owner adopts them.

When a decision changes behavior, update its owning code, tests, and these notes
in the same logical change. Consult the current checkpoint in
[the domain audit](branch-review.md); later checkpoints supersede its older
"next task" statements.
