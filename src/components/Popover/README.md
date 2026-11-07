# Popover

Use for an anchored choice window, bounded editor or child window with the
adopted two-pixel cut-corner frame. It opens below its anchor, flips above when
needed, clamps to the visible viewport and tracks resizing/scrolling. Pass
`mount` inside the logical-pixel screen and `returnFocus` for a stable trigger.

Default focus is the dialog surface. Choice/number components may explicitly
focus a safe control. Do not focus text inputs automatically on open. The stack
makes only the top window interactive, and outside/Escape closes that window
without activating content beneath it. Reverse closing preserves the content
until animation completes. Keep the editor selection separate from its open
flag so dismissing it does not clear the fields during that animation. Inputs
own their values; dismissal is not rollback.

Never put PagedWindow inside a dialog. Put common form fields together; place
notes directly in the form rather than adding an unnecessary nested window.
Single-choice menus and number pads have no visible header. Accessible `label`
is still required. End closes an editor; confirmations use Yes/No.
