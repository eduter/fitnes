# FitNES controls

The [UI system contract](../../design-system/README.md) is the authoritative
component registry, usage guide and list of prohibited patterns. Import controls
and their types from `Controls/index.ts` or their component directories.

Use the single framed-field style: OptionPicker (including On/Off), MultiPicker,
Spinner, DateSpinner, TextInput and TextArea. Popover supports layered bounded
windows; ConfirmDialog uses Yes/No. PagedWindow is for full-page lists only.
Button uses gold text without an action chevron. Native text entry and the rare
native date-picker escape hatch preserve the phone keyboard/calendar.

Choice menus have no visible header. NumberPad has no visible header and ends
with End. MultiPicker reserves a check immediately after each label and puts End
at bottom right. Popover focuses its surface by default, so opening an editor
does not raise the virtual keyboard. TextArea belongs directly in the form.

Controls own presentation/interaction, not database writes. Keep atomic edits
immediate and preserve application measurement semantics. The component tests
cover numeric precision/masks, pointer/keyboard behavior, focus, cancellation,
calendar arithmetic, modal lifecycle and paging.

The old isolated controls page remains a small mechanical development fixture;
use `src/design-system/index.html` for current owner-facing review. Historical
four-color captures/old geometry are not the current design specification.
