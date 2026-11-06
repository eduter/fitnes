# UI coverage audit: PR #26

Reviewed the UI source at commit `8794aa5bd3ba2538458200e7392dab6807024d55`
([PR #26](https://github.com/eduter/fitnes/pull/26)). This is a pattern audit,
not an approval of those screens or a change to that branch.

Paths below are relative to `src/` in that commit. The shared containers,
fields, dialog wrappers and all page components were inspected.

| Pattern and source | Coverage / required treatment |
| --- | --- |
| Text actions across pages; `components/Button` | Covered. Gold uppercase text, now without the leading chevron. |
| Native name entry, `components/fields.tsx:TextField` | Covered by TextInput. Preserve phone keyboard and mixed case. |
| Numeric editing, `NumberField`, `CompactNumberField`, `session/ExerciseBlock.tsx` | Spinner/number pad covered. Compact workout row layout, previous-performance columns, units and result summaries still need a reusable composition. |
| Small single choices, `SelectField`, prescription/load configuration | Covered by OptionPicker; Boolean choices use the same list. A/B remain review alternatives. |
| `StartSessionPage.tsx` three radio choices | Replace with a single option list; subsequent entry opens a window rather than expanding the page. |
| `fields.tsx:CheckboxGroup`, exercise measurement options | Multi-choice membership still needs a reviewed pattern, e.g. a small menu of individually editable On/Off values. Do not pretend this is a single-choice list. |
| `template/TemplateForm.tsx` native exercise select | Needs a paginated exercise chooser with selection opening the next overlay; long catalogs must not become huge scrolling dropdowns. |
| `template/TemplateForm.tsx` expanded planned-set editor | Prohibited inline expansion. A selected set opens an overlaid editor, whose prescription/load choices open further windows. Include add, duplicate, remove and reorder actions in a small action menu. |
| `BodyweightPage.tsx` expandable reading rows | Prohibited inline expansion. Open a reading editor window, retaining the underlying history window. |
| `StartSessionPage.tsx` history details; `RawDocument.tsx` details/summary | Prohibited accordions. Use separate windows/pages with bounded content; raw data need not appear in normal product flows. |
| `fields.tsx:DateField`, `dialog/RecordWeightForm.tsx` | Native date picker exists in #26 but is not a reviewed design-system date pattern. Needs a compact date-entry proposal and explicit treatment of any platform UI. |
| `fields.tsx:TextAreaField`, exercise/template notes | Multiline editing remains missing. Needs a dedicated bounded editor window with native keyboard support. |
| `DataPage.tsx` 14-row JSON textarea / download | Import/export document entry, review, validation summary and download actions need a dedicated bounded workflow. Current source uses pasted JSON and a download, not a file-upload control. |
| Native `confirm()` in Data, ExerciseEdit, TemplateEdit, Session pages | Replace browser confirmation with a compact system window. Preserve destructive/draft cancellation semantics; do not discard unsaved batches on outside dismissal without an explicit policy. |
| `dialog/MenuDialog.tsx` and Home menu workflows | Stacked Popover lifecycle is now covered and demonstrated in Windows. Strip decorative menu headings and Back options from choice lists; outside dismissal closes only the top window. Complex recording drafts still need a reviewed Save/Cancel composition. |
| PageHeader, list links in exercise/template/session pages | Heading/action primitives exist; bounded paginated list navigation remains missing as a reusable pattern. Preserve selected page/row when a child closes. |
| ValidationErrors; empty, loading, missing-record and status text | Passive text/live regions exist; field-linked errors and compact error/status windows need reviewed examples. |
| Home artwork, logo, SteelPanel, BottomTabs | Existing art/navigation assets exist. The isolated showcase displays the palette/art separately. Full app chrome and tabs still require assembled-screen validation and a compact layout review. |
| Exercise/Template forms, session-start construction | Field primitives are only partial coverage. Break long forms into small menu-driven windows; create/save applies composite drafts, while atomic edits retain existing persistence policy. |

The shared missing pieces are a paginated list/chooser, a bounded form/editor
window, multi-choice membership, date entry, multiline text, confirmation/draft
semantics, import/export review, field-linked validation, and compact workout
rows. Implement and review these in the system before rewriting #26. No
accordion/inline expansion or long scrolling form should fill a pattern gap.

The showcase now offers small screens via the Review selector and a real
parent-editor → choice menu / number-pad overlay example. This proves the
stacking primitive; it does not claim the remaining domain workflows are built.
