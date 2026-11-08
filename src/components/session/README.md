# Integrated guided session tracking

SessionPage uses GuidedSession for the first unfinished step of a real session.
The full application is available at
https://fitnes-pr33-app.eduardo-terroso.chatgpt.site . Build with `npm run build`;
there is no sample-data seeding in the normal build. The historical standalone
prototype is not the app review URL.

Exercise `timing` stores optional `prepSeconds` and `secondsPerRep` defaults.
Workout `timingOverrides` independently overrides each field by exercise ID.
The workout editor's More → Timing edits these values; session More → Timing
changes only its snapshot and is available before starting. Old plans use
initial editable defaults of five seconds prep and three seconds per rep.
Embedded definitions keep the existing snapshot policy; workout Refresh takes
new catalog defaults. No existing data is rewritten automatically.

An execution-sequence entry has exactly one of `plannedSetId` or `restSeconds`.
Rest is an explicit movable step, separate from preparation. This compatible
extension preserves existing set definitions and references; collapsing those
two arrays into self-contained steps remains separate work. Session results
still address set occurrences by sequence ID. `completedRestIds` records rest
completion without inventing exercise measurements. These fields round-trip
through JSON import/export and session snapshots. New exports use version 2;
version-1 exports still import, while older app builds reject the newer format
instead of silently losing timing or rests.

Start runs preparation then timed work or paced repetitions. Rep counts advance
after each full configured interval. All phases use fixed slots. Pause freezes
elapsed time; Resume continues. Wall-clock anchors survive throttling/refresh.
Transient timers, side selection, manual edits and unlogged performance are
cached per session step in local storage; failed saves retain them. Validated
results and rest completion use IndexedDB. Full database replacement clears
old transient caches. Clearing a recorded result also clears its cached timer draft. Wake lock is requested when available and reacquired
when the page becomes visible, with a manual-screen fallback message.

Initial behavior for Android review: Log without starting records the displayed
planned/edited result. Early Log records completed reps or elapsed work seconds
unless the count was manually corrected. Completed timers wait for Log; actual
performance can be adjusted in place or with More → Result, including external
load and independent side values. Per-side measurements guide left then right;
Next side keeps the left result and prepares the right. Skip records zero work
for a set, or completes a rest early. A rest auto-starts on entering its step;
Next completes it, including early. Logging advances only after successful
persistence. After the last step, Complete finishes the session. More → Review
shows the existing list for review/edit/clear; Track returns to unfinished work.

The exercise name is the main heading. No generic Workout heading, Current set
label or Ready when you are message appears during tracking. No corridor or
audio cues are implemented. Real Android review remains necessary.
