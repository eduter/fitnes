# FitNES domain-model branch review

## Scope and baseline

### Repository state

- Branch reviewed: `feat/domain-model`
- Base: `origin/main` at `492e6349b0fbd37f2c12da408331de5c1b823063`
- Reviewed branch tip: `08dbf18` before this report
- Merge range: `origin/main...feat/domain-model`
- Working tree before the audit: clean
- Remote tracking branch: `origin/feat/domain-model`

The reviewed range contains these commits:

| Commit | Subject |
| --- | --- |
| `78b54c4` | `chore: add arktype for runtime validation` |
| `75bd10c` | `feat(domain): add shared units and stable entity IDs` |
| `56c4984` | `feat(domain): add exercise definitions with typed capabilities` |
| `f73b1d7` | `feat(domain): add per-set prescriptions and load configuration` |
| `a2a20af` | `feat(domain): add workout templates and template validation` |
| `0779ed1` | `test(domain): cover workout-template validation` |
| `1e143ed` | `feat(domain): add bodyweight history and latest-measurement lookup` |
| `08dbf18` | `feat(domain): add completed sessions with snapshot and result validation` |

The audit covered all 18 files changed from the base: the package manifest and
lockfile, every file under `src/domain`, and `src/test/domainFixtures.ts`. It
also inspected the repository instructions, TypeScript and Biome
configuration, Vitest/Vite configuration, and project vision/backlog.

### Commands run

```text
git status --short --branch
git branch -vv
git log --oneline --decorate -12
git remote -v
git merge-base HEAD origin/main
git diff --stat origin/main...HEAD
git diff --name-status origin/main...HEAD
git show --stat --oneline <each branch commit>
npm run check
npm ci
npm run check
```

The first `npm run check` could not start because this environment had no
installed dependencies (`biome: not found`). `npm ci` installed the existing
lockfile without changing it. The second `npm run check` passed:

- Biome lint: passed, 30 files checked
- TypeScript project typecheck: passed
- Biome format check: passed, 29 files checked
- Vitest: passed, 6 files and 66 tests

There were no pre-existing test, typecheck, lint, or format failures after the
environment was initialized.

## Executive summary

The branch is a substantial and generally readable foundation. It has real
runtime schemas, structured cross-entity errors, per-set prescriptions,
arbitrary sequence ordering, weighted bodyweight support, deterministic
bodyweight lookup, and deep session snapshots. The existing suite exercises
many important paths and is fully green.

It is not yet safe to treat the model as the contract for a UI or persisted
user data. The highest-impact issue is that load capabilities describe
independent components rather than valid configurations. An exercise such as a
pull-up must list both `bodyweight` and `external` to permit a weighted pull-up,
but that also permits an external-only pull-up. The same flaw would permit an
externally loaded plank with its bodyweight component omitted.

Session results are checked only against broad exercise capabilities, not
against the semantic shape of the occurrence's prescription. A result can
silently change from total load to per-hand load, from total repetitions to
per-side repetitions, or from bodyweight-plus-external to another allowed load
mode. Values should be allowed to differ from targets, but changing what the
values mean makes historical comparisons unreliable.

Further confirmed defects allow non-finite bodyweight snapshots, temporally
impossible result timestamps, undeclared fields in discriminated variants, and
planned sets that never occur in the execution sequence. The catalog/template
ownership boundary also remains unresolved: templates embed complete exercise
definitions, so there is no API that adds a catalog exercise by identity
without copying its capabilities.

The recommended approach is incremental. First make valid load configurations
explicit and align actual-result semantics with prescriptions. Then tighten
document shapes and template/session integrity. The sequence and snapshot
representations do not need a wholesale rewrite.

## Findings

### FITNES-001 — Load capabilities permit physically contradictory modes

- Severity: **High**
- Status: Confirmed defect
- Relevant code: `src/domain/exercise.ts` (`loadOption`);
  `src/domain/prescription.ts` (`loadConfiguration`);
  `src/domain/capability.ts` (`loadProblems`, `externalBasisProblems`)

Exercise definitions list `bodyweight` and `external` as independent
capabilities. Prescription validation derives validity from their presence:

- `external` is accepted whenever the exercise has an external option.
- `bodyweightExternal` is accepted whenever both options exist.

That makes the representative pull-up definition accept all three modes:
bodyweight, external-only, and bodyweight-plus-external. External-only is not a
faithful representation of a pull-up because the user's body mass has not
stopped contributing. Configuring external load for a plank creates the same
problem. Conversely, the model cannot describe an exercise that allows either
bodyweight or external resistance but not their combination.

Reproduction: take the existing `pullUp` fixture and prescribe:

```ts
{
    measurement: { measurement: 'repetitions', countBasis: 'total', reps: 5 },
    executionMode: 'bilateral',
    load: {
        kind: 'external',
        basis: 'total',
        weight: { value: 10, unit: 'kg' },
    },
}
```

`validateWorkoutTemplate` accepts it even though the intended weighted pull-up
shape is `bodyweightExternal`.

Recommended fix: define valid load modes explicitly at exercise-definition
level. Each mode should be one of `none`, `bodyweight`, `external` with allowed
bases, or `bodyweightExternal` with allowed external-load bases. Validate a
prescription against one complete mode instead of inferring combinations from
component membership. Preserve bodyweight and external values as separate
components and do not introduce an “effective load” calculation.

### FITNES-002 — Actual results can change the prescription's meaning

- Severity: **High**
- Status: Confirmed defect
- Relevant code: `src/domain/validateWorkoutSession.ts` (`checkResults`);
  `src/domain/capability.ts` (`measurementProblems`, `loadProblems`)

`checkResults` resolves the occurrence and exercise, then checks the result only
against the exercise's full capability set. It does not compare the result's
measurement/count basis or load kind/basis with that occurrence's
prescription.

For an exercise that supports multiple choices, all of these pass:

- a set prescribed as total repetitions recorded as repetitions per side;
- a set prescribed as 40 kg total recorded as 20 kg per hand;
- a bodyweight-plus-external set recorded as another load mode that the
  exercise supports.

Actual repetition counts, durations, and weights must be allowed to differ from
targets. The discriminant and basis fields determine what those values mean and
must remain aligned unless the product explicitly supports editing the plan
during a session and snapshots that change.

Recommended fix: after resolving the planned set, compare result measurement
type and count basis to `set.prescription.measurement`, and compare result load
kind and external basis to `set.prescription.load`. Continue validating the
result against the exercise as defense in depth. Add focused failures for each
semantic mismatch and tests showing that different numeric values remain valid.

### FITNES-003 — Bodyweight session snapshots accept positive infinity

- Severity: **Medium**
- Status: Confirmed defect
- Relevant code: `src/domain/session.ts` (`bodyweightSnapshot`);
  `src/domain/bodyweight.ts` (`bodyweightMeasurement`);
  `src/domain/units.ts` (`positiveFinite`)

Bodyweight measurements correctly use `positiveFinite`, but the session
snapshot redeclares the value as only `'number > 0'`. ArkType accepts
`Number.POSITIVE_INFINITY`, so `validateWorkoutSession` accepts an infinite
historical bodyweight in memory. This can poison derived calculations and
IndexedDB records. JSON serialization changing infinity to `null` does not make
acceptance before serialization safe.

Recommended fix: reuse `positiveFinite` in `bodyweightSnapshot` and test zero,
negative, `NaN`, and both infinities.

### FITNES-004 — Result completion timestamps are not bounded by the session

- Severity: **Medium**
- Status: Confirmed defect
- Relevant code: `src/domain/validateWorkoutSession.ts`
  (`checkSessionTiming`, `checkResults`)

The validator rejects a session `completedAt` earlier than `startedAt`, but it
does not inspect each result's `completedAt`. A result can therefore precede
the session start or occur after the session completion time.

Reproductions:

- session starts at `1_000`, result completes at `500`: accepted;
- session completes at `1_500`, result completes at `2_000`: accepted.

Recommended fix: require every result timestamp to be greater than or equal to
`startedAt` and, when the session has `completedAt`, less than or equal to it.
Do not require all planned sets to have results merely because the session has
ended; omitted/skipped work and an active partial session are separate
questions.

### FITNES-005 — Runtime schemas accept undeclared fields in union variants

- Severity: **Medium**
- Status: Confirmed defect
- Relevant code: ArkType object schemas in `src/domain/exercise.ts`,
  `src/domain/prescription.ts`, `src/domain/workoutTemplate.ts`,
  `src/domain/session.ts`, and `src/domain/bodyweight.ts`

ArkType's current undeclared-key behavior is not made strict by these schemas.
Extra keys survive validation. This is especially harmful in discriminated
unions:

- a repetitions measurement containing both `reps` and `seconds` is accepted;
- a bodyweight load carrying a spurious `weight` is accepted;
- arbitrary unknown fields on imported templates and sessions are accepted.

This undermines the claim that alternatives are mutually exclusive and leaves
consumers free to interpret contradictory data differently.

Recommended fix: configure rejection of undeclared keys on persisted domain
objects and their nested union variants using the installed ArkType API. Add
tests for contradictory variant fields and unknown top-level/nested fields.
Apply this coherently across the wire format; tightening only one variant would
leave inconsistent import behavior.

### FITNES-006 — Planned sets may be absent from the execution sequence

- Severity: **Medium**
- Status: Confirmed integrity gap
- Relevant code: `src/domain/validateWorkoutTemplate.ts`
  (`checkSequenceReferences`)

The model explicitly says each sequence entry is an occurrence, each planned
set may appear at most once, and repeated work is represented by distinct
planned sets. The validator enforces the “at most once” half but not “exactly
once.” A non-empty `sets` array with an empty sequence, or one orphaned set,
passes validation.

This leaves unreachable prescriptions in a supposedly valid workout and makes
set counts disagree with executable work. It also complicates session
completion and migration logic.

Recommended fix: under the existing distinct-set occurrence rule, require each
planned-set ID to appear exactly once in the sequence. Report the issue at the
orphaned set's ID. If draft templates intentionally need incomplete sequences,
use a separate draft validation mode instead of weakening persisted/executable
template validation.

### FITNES-007 — Catalog ownership is duplicated inside every template

- Severity: **Medium**
- Status: Confirmed requirement/design mismatch
- Relevant code: `src/domain/workoutTemplate.ts` (`workoutTemplate.exercises`);
  `src/domain/validateWorkoutTemplate.ts`

The requirement describes an exercise as a reusable catalog definition that is
defined once. A `WorkoutTemplate` instead requires complete embedded exercise
definitions. There is no domain API for adding a catalog exercise by ID; a
caller must copy its capabilities into the template. Definitions can then
drift between the catalog and different templates while retaining the same
exercise ID.

Embedding definitions does have one benefit: templates validate and serialize
without an external lookup, and sessions need immutable definitions for
historical interpretation. That benefit should be retained deliberately rather
than conflated with the editable catalog's source of truth.

Recommended fix: first decide ownership. A minimal approach is a template
creation function that accepts catalog definitions, verifies references, and
creates an explicit immutable definition snapshot automatically. Name the
embedded collection to communicate snapshot semantics. A larger alternative is
to validate editable templates with a catalog context and embed definitions
only when starting a session. Do not silently allow independent editing of
multiple records with the same catalog identity.

### FITNES-008 — Session source references can contradict their snapshots

- Severity: **Medium**
- Status: Confirmed integrity gap
- Relevant code: `src/domain/session.ts` (`workoutSession`,
  `bodyweightSnapshot`); `src/domain/validateWorkoutSession.ts`

`createSessionFromTemplate` produces consistent references, but imported
sessions are allowed to contain:

- a `templateId` different from `snapshot.id`;
- `bodyweight.measurementId` without `measuredAt`, or the reverse;
- a source bodyweight `measuredAt` later than the session start.

The first two are internally contradictory trace metadata. A future bodyweight
measurement is also incompatible with “the bodyweight used at session start”
unless callers may intentionally backfill a session, which is not documented.

Recommended fix: require `templateId`, when present, to match `snapshot.id`.
Model bodyweight source metadata as an all-or-nothing union. Decide and test
whether future measurements are invalid; absent a backfill requirement, reject
`measuredAt > startedAt`.

### FITNES-009 — Session creation can return an invalid `WorkoutSession`

- Severity: **Low**
- Status: Design concern
- Relevant code: `src/domain/session.ts` (`createSessionFromTemplate`)

The function accepts compile-time domain types and returns
`WorkoutSession` without runtime validation. Type-safe internal callers are
fine, but a caller that casts imported data or bypasses template validation can
receive an invalid session bearing the trusted return type.

Recommended fix: establish and document the boundary. Prefer accepting only the
successful output of template validation at import/persistence edges, or have
session creation return `ValidationResult<WorkoutSession>` if it is itself a
public untrusted-data boundary. Do not duplicate all validation inside every
constructor.

### FITNES-010 — Identifier and numeric policies are only minimally constrained

- Severity: **Low**
- Status: Design concern, not a demonstrated failure
- Relevant code: `src/domain/ids.ts`, `src/domain/units.ts`,
  `src/domain/bodyweight.ts`

IDs and names reject only empty strings, so whitespace-only values are valid.
Positive durations and masses have no domain upper bounds. The requirements
ask for sensible bounds, but neither the code nor product documentation defines
what those bounds should be. Arbitrary hard-coded physiological limits would
reject legitimate users and exercises.

Recommended fix: reject whitespace-only identifiers/names if these values may
come from users or imports. Do not add numeric maxima until product semantics
are decided; finite positive values are safer than speculative limits. If IDs
are always generated, validate the generated format instead.

## Model decisions

### Existing measurement semantics

- `measurement` is `repetitions` or `duration`.
- Repetitions store a positive integer `reps`.
- Duration stores positive finite `seconds`; fractional seconds are currently
  valid.
- `countBasis: total` means one value for the whole set.
- `countBasis: perSide` means the stated value applies once to each side.
- Count basis is intentionally independent of execution mode. A unilateral set
  can use a total count, for example when recording an alternating movement as
  one combined total.

This separation is coherent. A `perSide` prescription can unambiguously mean
“8 repetitions on each side.” The current actual-result model cannot record
asymmetric left/right results (for example 8 left and 6 right); no requirement
establishes whether that is needed. The representative half-crimp fixture uses
duration per side, while row and wrist-curl fixtures use a total count even
when unilateral execution is available. Those choices are valid configurations,
not universal rules inferred from exercise names.

Recommended decision: retain independence between execution mode and count
basis. Document `total` as a single aggregate set value and `perSide` as the
same target/value applying to every performed side. Add a separate per-side
breakdown only if asymmetric actual recording becomes a product requirement.

### Existing execution semantics

- `bilateral` means both sides are used together.
- `unilateral` means one side is worked at a time.
- An exercise may list both without duplicating its ID.
- The selected execution mode lives on each prescription. Actual results
  inherit it through their sequence occurrence and do not repeat it.

This is coherent as long as actual results cannot silently detach from the
occurrence's prescription (FITNES-002).

### Existing load semantics

- `bodyweight` denotes the user's body mass and carries no value in the
  prescription/result; the session bodyweight snapshot supplies that value.
- `external` carries an explicit weight and basis.
- `bodyweightExternal` keeps body mass and additional external weight separate.
- `none` means no modeled load.
- `total` means the external weight value is the complete external load.
- `perHand` means the value applies to each hand-held implement.
- `perSide` means the value applies to each worked/body side.
- Values are never converted implicitly. `totalLoad` combines only a
  total-basis external load and bodyweight with the same unit.
- Zero external weight is intentionally valid and represents no added weight,
  distinct from omitting the external component.

The distinction between a 40 kg total barbell and two 20 kg per-hand dumbbells
is preserved. `perHand` and `perSide` overlap for some exercises but describe
different facts: equipment distribution versus body-side attribution. The
current model does not encode implement count, so neither basis should be
automatically converted to total.

The defect is not the basis vocabulary; it is deriving whole load
configurations from independent capability components (FITNES-001).

### Existing sequence semantics

Sequence entries are individual execution occurrences. Each entry has its own
stable ID and points to one planned set. The same exercise may appear anywhere
through multiple planned sets, so arbitrary orders such as
`H C R H C R H P H P H P` are representable. A planned set is currently
forbidden from appearing twice; repeated work must use distinct planned-set and
sequence-entry IDs so every result has an unambiguous occurrence.

Recommended decision: retain this simple rule and enforce exactly one sequence
occurrence per planned set (FITNES-006). Reusable planned-set references would
save some duplicated prescriptions but would require occurrence overrides and
more complex result identity without a demonstrated need.

### Genuine ambiguities

- Whether completed sessions may omit results because sets were skipped. The
  current representation supports ended sessions with partial results but
  cannot distinguish skipped from not yet performed without `completedAt`.
- Whether a bodyweight reading entered after a workout may be deliberately
  backdated/attached to that workout.
- Whether actual unilateral performance needs separate left/right values.
- Whether editable templates should be permanently self-contained snapshots or
  should resolve definitions from a catalog until session start.
- Whether whitespace-only IDs/names and product-specific numeric maxima require
  rejection.

These need product/domain decisions; they should not be “fixed” by guessing.

## Test coverage gaps

The existing tests cover representative exercise capabilities, invalid enum
values, duplicate capabilities, missing capabilities, prescription/exercise
compatibility, weighted pull-ups, per-set variation, arbitrary interleaving,
duplicate and dangling IDs, duplicate sequence occurrences, invalid units and
numbers, deterministic historical bodyweight lookup, nested snapshot cloning,
result occurrence references, partial sessions, and valid JSON round trips.

Important missing behaviors:

1. A pull-up or loaded plank must reject external-only load while accepting
   bodyweight plus explicitly allowed external load (FITNES-001).
2. Actual numeric values may differ from targets, but measurement type,
   count basis, load kind, and load basis must match the occurrence
   prescription (FITNES-002).
3. Session bodyweight snapshots reject all non-finite values (FITNES-003).
4. Result timestamps cannot precede session start or follow session completion
   (FITNES-004).
5. Repetitions cannot carry `seconds`, duration cannot carry `reps`, bodyweight
   cannot carry `weight`, and unknown fields are rejected at nested and
   top-level paths (FITNES-005).
6. Every planned set occurs exactly once in the sequence (FITNES-006).
7. Session `templateId` matches its snapshot and bodyweight trace fields are
   consistent (FITNES-008).
8. A no-load exercise validates end to end with `load: none`; current coverage
   checks the exercise definition but not template/session behavior.
9. `bodyweightExternal` rejection paths are not directly tested for exercises
   missing either required capability.
10. Wrong count bases and valid `perSide` load bases need direct tests.
11. JSON round-trip tests should include every load union variant and
    representative per-side measurements, not only row fixtures.
12. `validateWorkoutSession` should directly cover malformed/non-object input.
13. Bodyweight history has no collection validator or duplicate-ID policy.
14. Deep snapshot testing mutates sets and sequence but not nested exercise
    capability arrays. `structuredClone` is correct, but mutating those arrays
    would lock the historical-integrity requirement more explicitly.

Several implementation bugs pass all 66 tests, so the green suite is not a
readiness signal for the persistence contract yet.

## Prioritized implementation plan

### Essential correctness fixes

1. **FITNES-001:** replace component-based exercise load capabilities with
   explicit valid load modes. This is foundational because result alignment
   depends on well-defined modes.
2. **FITNES-002:** validate actual-result semantic shape against the occurrence
   prescription while allowing numeric variance.
3. **FITNES-005:** make persisted schemas reject undeclared keys and lock
   discriminated-union exclusivity.
4. **FITNES-006:** require every planned set to appear exactly once.
5. **FITNES-003:** reuse finite-positive bodyweight validation.
6. **FITNES-004:** enforce result timestamp bounds.
7. **FITNES-008:** enforce session source/snapshot consistency after resolving
   the bodyweight backfill question.

Each item should begin with a failing observable-behavior test and land as a
separate, green commit. FITNES-001 will require fixture migration; avoid mixing
unrelated validation tightening into that mechanical change.

### Design/API follow-up

8. **FITNES-007:** decide catalog versus template ownership, then provide a
   construction API that avoids manual capability duplication while preserving
   historical snapshots.
9. **FITNES-009:** document or encode the trusted-input boundary for session
   creation.
10. **FITNES-010:** tighten strings; add numeric maxima only after a product
    decision.
11. Add collection-level bodyweight validation if history is imported as a
    document rather than individual records.

## Handoff checklist

### Verified

- [x] Audited every production and test file in `origin/main...HEAD`.
- [x] Confirmed no pre-existing uncommitted work before writing this report.
- [x] Confirmed all existing checks pass after `npm ci`.
- [x] Confirmed templates support arbitrary exercise interleaving.
- [x] Confirmed session snapshots use `structuredClone`.
- [x] Confirmed bodyweight lookup excludes future measurements and returns no
      fabricated fallback.
- [x] Confirmed bodyweight and external load values remain separate.
- [x] Confirmed load-unit conversion is not implicit.

### Must be fixed before relying on the model for UI/persistence

- [ ] FITNES-001 explicit valid load modes.
- [ ] FITNES-002 result/prescription semantic alignment.
- [ ] FITNES-003 finite bodyweight snapshots.
- [ ] FITNES-004 result timestamp bounds.
- [ ] FITNES-005 undeclared-key rejection.
- [ ] FITNES-006 exact planned-set sequence coverage.
- [ ] FITNES-008 source/snapshot consistency.

### Remaining decisions

- [ ] Resolve catalog versus template definition ownership (FITNES-007).
- [ ] Decide future/backfilled bodyweight attachment policy (FITNES-008).
- [ ] Decide whether skipped-set status needs to be explicit.
- [ ] Decide whether asymmetric per-side actuals are in scope.

### Commands for the next agent

```text
git status --short --branch
git log --oneline --decorate -12
npm run check
```

Then start with a failing test for FITNES-001. Keep one logical fix per commit,
update the implementation-status section below after each increment, and push
each green checkpoint.

## Implementation status

The original audit was committed before implementation changes. Status updates
below preserve the original findings and rationale.

### Checkpoint after FITNES-001

- Fixed: FITNES-001 in `62c75c8` (`fix(domain): make load capabilities explicit`).
- Exercise definitions now enumerate complete load modes. `none` is explicit,
  and `bodyweightExternal` has its own allowed external-load bases.
- The pull-up fixture allows `bodyweight` and `bodyweightExternal`, so an
  external-only pull-up is rejected.
- Empty load-capability lists are rejected.
- Verification: `npm run check` passed (6 test files, 69 tests).
- Still open: FITNES-002 through FITNES-010.
- Next task: add failing session tests for result/prescription semantic
  alignment (FITNES-002), then compare discriminants and bases in
  `checkResults`.

### Checkpoint after FITNES-002

- Fixed: FITNES-002 in `71277c0` (`fix(domain): align results with
  prescriptions`).
- Actual repetition, duration, and weight values may differ from prescribed
  targets, but measurement type, count basis, load kind, and external-load
  basis must match the sequence occurrence's prescription.
- Exercise-capability failures remain the primary error when an actual result
  violates both the exercise and prescription, avoiding duplicate field
  diagnostics.
- Verification: `npm run check` passed (6 test files, 74 tests).
- Still open: FITNES-003 through FITNES-010.
- Next task: reject undeclared fields across persisted ArkType schemas and add
  discriminated-union exclusivity tests (FITNES-005).

### Checkpoint after FITNES-005

- Fixed: FITNES-005 in `60bb3a1` (`fix(domain): reject undeclared data
  fields`).
- Persisted schemas now use ArkType's undeclared-key rejection recursively.
  Repetition/duration and load union variants reject fields belonging to other
  variants, and unknown fields are rejected at document and nested levels.
- Added direct prescription-schema coverage in addition to template/session
  integration coverage.
- Verification: `npm run check` passed (7 test files, 81 tests).
- Still open: FITNES-003, FITNES-004, and FITNES-006 through FITNES-010.
- Next task: require every planned set to occur exactly once in the execution
  sequence (FITNES-006).

### Checkpoint after FITNES-006

- Fixed: FITNES-006 in `c0c25ab` (`fix(domain): require every set in
  sequence`).
- Template validation now enforces both sides of the occurrence rule: every
  sequence reference resolves, and every planned set appears exactly once.
- Missing occurrences are reported at the orphaned planned-set ID; dangling
  sequence references and all resulting orphaned sets are reported together.
- Verification: `npm run check` passed (7 test files, 83 tests).
- Still open: FITNES-003, FITNES-004, and FITNES-007 through FITNES-010.
- Next task: reuse finite-positive validation for bodyweight session snapshots
  (FITNES-003).

### Checkpoint after FITNES-003

- Fixed: FITNES-003 in `fe4a478` (`fix(domain): reject non-finite bodyweight
  snapshots`).
- Session bodyweight snapshots now reuse the same `positiveFinite` schema as
  bodyweight-history measurements.
- Verification: `npm run check` passed (7 test files, 84 tests).
- Still open: FITNES-004 and FITNES-007 through FITNES-010.
- Next task: enforce result completion timestamps within session bounds
  (FITNES-004).

### Checkpoint after FITNES-004

- Fixed: FITNES-004 in `723550e` (`fix(domain): bound result completion
  times`).
- Every result must complete at or after the session start and, for an ended
  session, at or before the session completion time. Boundary equality is
  explicitly tested.
- Verification: `npm run check` passed (7 test files, 87 tests).
- Essential confirmed defects remaining: FITNES-008 source/snapshot
  consistency. FITNES-007, FITNES-009, and FITNES-010 require design/API
  decisions or lower-priority policy work.
- Next task: enforce the unambiguous parts of session source/snapshot
  consistency (FITNES-008) without guessing the bodyweight backfill policy.
