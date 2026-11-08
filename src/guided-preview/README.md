# Guided workout preview

Isolated prototype of the owner-approved current-set direction. It imports the
adopted controls and SteelPanel, but no application database, router or service
worker. It uses sample data in memory and resets on reload. Existing workout
schemas, deployments and stored sessions are unchanged.

Build with `node tools/build-guided-preview.ts`; output defaults to
`work/guided-preview/dist`. Serve that directory to try it on a phone.

The prototype uses one ordered array of set/rest steps. Plan allows adding,
editing, deleting and reordering individual steps. Timing exposes exercise
preparation/rep-pace defaults and independent workout overrides, shared by all
sets of that exercise. Sequence edits are locked after training starts; Restart
clears sample results and unlocks them.

Start runs preparation followed by time remaining or reps completed. A rep is
counted after its full configured duration. Pause freezes both phases; Resume
continues. Timing uses elapsed wall-clock time so background throttling does
not slow the workout. Screen Wake Lock is requested when available and reacquired
on return to the page; a message reports when manual screen settings are needed.

Provisional behavior for review: the timer stops at the target and waits for Log;
actual reps/seconds can be corrected then. Logging early records completed reps
or elapsed work seconds. Log advances to the next step and automatically starts
an explicit rest. Completed rest waits for Next. Skip records a skipped step.
Opening Plan pauses running work. There are no audio cues or corridor animation.
These interaction choices are prototype assumptions, not settled product policy.

The existing persistent model's separate sequence remains unchanged. Replacing
it with an ordered set/rest array and manually converting the owner's JSON is a
proposed follow-up, not an automatic migration implemented by this preview.
