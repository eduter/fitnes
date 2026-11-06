# Working notes for agents on this repo

## Product context

Read [the vision](docs/vision.md) before changing product behavior or visuals.
Use [the backlog](docs/backlog.md) when choosing the next task.
Update the owning document when an owner-approved decision changes.

## Interface foundation

Use the [design system](src/design-system/README.md) before changing UI. Its
source tokens contain the full home-image palette; semantic roles and new
patterns are review proposals until the owner approves them. Use its existing
component vocabulary. Missing patterns must be added to the system/showcase
before application integration; do not invent native selects, checkboxes,
radios, switches, or web-style substitutes in screens. The primitive-boundary
test enforces the native-control implementation allowlist.

Use compact menu-driven windows. Never use inline expansion, accordions, or
`details` to reveal editors. Deeper menus/editors overlay the previous window.
Single-choice lists have no heading, Back action or chevrons; outside press dismisses
only the top window. See the PR #26 coverage audit before integrating screens.

Multi-choice lists apply membership changes without closing and finish with
End. Use DateSpinner for bodyweight dates (native calendar on date press is
owner-approved), ConfirmDialog for destructive confirmation, and PagedWindow
for bounded lists. Keep exercise/workout summaries compact with short verbs.

## Tech and conventions

- **Android / Chromium only.** The sole user has no Apple devices — do not
  add Safari or WebKit workarounds. Target current Chrome for Android and
  desktop.
- **TypeScript everywhere.**
- **Tests.** `npm run check` runs lint, typecheck, `format:check`, and tests.
  Use it to check your changes before committing them.
- **TDD:** Whenever applicable, use red/green TDD.
- **One logical change per commit.** Commits are reviewable and
  bisectable in isolation. Each commit must build, typecheck, and
  pass tests on its own — no "fixup the previous one" commits.
  Unrelated cleanups, refactors, and bug fixes that happen to land
  in the same working tree get split into separate commits, even
  when it'd be faster to mash them together. If you find yourself
  writing a commit message with "and" in it, that's two commits.
- **Commit as you go.** Unless the user says otherwise, land work
  in commits as each logical unit is finished — do not leave the
  full diff uncommitted at the end of a session.
- **Solve problems in code, not in docs.** A problem detected and
  explained at the moment of failure beats the same problem
  documented in the README.

## Cloud agents

Cloud agents work on a feature branch, never on `main`. They are expected
to carry a change all the way to review, not to stop at a local commit:

- **Push** the feature branch to `origin`.
- **Open a pull request** against the default branch (`main`) describing
  the change, and update the same PR on follow-up commits rather than
  opening a new one.
- **Deploy a preview** for runtime changes so they can be tried on a real
  device, and link the preview URL in the PR (body or a single, updated
  comment). Use an origin separate from production. Documentation-only changes
  do not need a preview. Do not push to `gh-pages` or change the Pages source
  to serve a preview.

Never push or merge directly to `main`; all changes reach it through a PR.

## Code style

Formatting and the mechanical lint rules are Biome's job.
The rules below are the things Biome can't enforce,
plus the structural conventions a reader should be able to count on.
New code matches existing code; if you want to deviate, change this
list first.

Most of the code was written before the Code style section.
When making significant changes to an existing function or file, you can
use that opportunity to refactor it to conform to these guidelines.
Aside from that, don't refactor code according to the guidelines unless
explicitly instructed to.

### File layout

Top-down by importance. The headline export comes first; helpers
follow in roughly the order the headline reaches them. Both `function`
and `interface` / `type` declarations hoist, so nothing has to come
first for the compiler — order for the reader, not the parser.

Types aren't a separate category. A type belongs next to the function
that produces it (the one whose return shape it is), not at the top of
the file. Inputs that aren't produced anywhere in the file sit next to
their consumer.

Module-level `const`s sit near the top with the imports.

### Functions, types, exports

- **`function` declarations for module-level functions.** Arrow
  functions are for callbacks and one-expression locals, not the main
  API of a module.
- **`interface` for object shapes; `type` for unions, intersections,
  and aliases.** Reach for `type` when `interface` can't express it,
  not by default.
- **Explicit return types on exported functions.** Inferred is fine
  for short locals.
- **Named exports at the bottom of the file**, never inline. Values in
  `export { ... };`, types in a separate `export type { ... };`. The
  split isn't cosmetic: `verbatimModuleSyntax` requires every
  type-only export to be marked, and a separate statement is the
  least error-prone way to do it.
- **No default exports.** They make rename refactors and grep worse.

### Imports

- **`node:` prefix on built-in imports** (`node:fs`, `node:http`).
  Disambiguates from npm packages.

### Function body shape

The shape of a function body is more load-bearing than its
formatting. Across the codebase:

- **Destructure inputs on the first line.** Include a `...rest`
  capture if the function passes through unknown fields.
- **Guard with early returns, one precondition per branch.** Specific
  error messages per branch beat a combined `if`.
- **Split the work into named sections, separated by blank lines.**
  Each section gets a sentence-case comment with no trailing period
  describing the *intent* of the next few lines. A reader should be
  able to skim the comments and understand what the function does;
  if they can't, the function is doing too much. Skip the header on a
  section that's a single self-explanatory line — see "Comments" below.
- **One `return` on the happy path, at the bottom.** Early returns
  are for failure.

### Comments

The rule for every comment: it answers *why*, not *what*. Restating
what the code already says is noise that ages out of sync with the
code; comments that explain a constraint, a workaround, or a
non-obvious decision stay valuable.

- **Workarounds always get a comment.** A `rmSync` before `mkdirSync`
  looks paranoid until the comment explains pid reuse after a crash.
  An empty `catch` reads as a swallowed bug until the comment says
  "lost the race; the next reap retries". One short line at the line
  in question is enough.
- **Non-obvious constraints belong in JSDoc on the function that owns
  them**, not in a file-header block. Future maintainers grep for the
  function they're editing and read its doc; file headers get treated
  as boilerplate and skipped. If a fact is load-bearing for one
  function ("path must live under $HOME because Colima can't bind-
  mount /var/folders"), put it on that function's JSDoc.
- **No file headers.** No "this file does X" preamble — the exports
  and their JSDoc are the file's API. If you find yourself writing a
  header that summarises the file, the summary belongs on the most
  important export's JSDoc instead.
- **Short, where it matters; nothing, where it doesn't.** A 3-line
  helper whose name says everything gets no comment. A 20-line
  function with a single non-obvious branch gets a one-line comment
  at that branch.

### Errors

- **Throw for programmer errors, return / reject for expected
  failures.** Don't use exceptions for control flow.
- **Errors carry context.** `throw new Error(\`failed to resolve
  secret '${path}': ${cause}\`)`, not `throw new Error('failed')`.
  The agent reads error messages too.

### JSDoc

Required on:

- Every exported function (one-line summary, `@param` / `@returns`
  only when not obvious from the types).
- Every exported type or interface (one-line summary).
- Non-exported functions whose invariants aren't obvious from the
  name and signature.

Inline comments inside a function body are the section headers
described under "Function body shape" — not JSDoc.

### Persistence

Existing, atomic, reversible edits persist immediately. No primary
button. A primary button is only for creating a new composite thing,
or committing a batch that can hurt.

Copy: **Add** = append an item; **Create** = first persist of a
composite; **Save** = commit a draft or batch. Do not use **Update**.
