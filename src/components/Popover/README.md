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

Tall editors resolve their full frame to the available viewport height in whole
animation steps before opening. The painted frame and clipping viewport share
that same resolved target; do not cap a larger border using CSS max-height.
Only the inner content scrolls. Its scroll events do not reposition the frame;
viewport changes and ancestor scrolling still update placement, including child
windows anchored inside a scrolling parent.

The window uses opaque five-pixel native corner PNGs and repeated two-pixel
edge strips cut from the shared frame artwork. This avoids Chromium's loss of
long stretched border-image edges under CSS zoom. Generate them together with
the field frame using `node tools/build-field-frame.ts`; do not stretch the
window edge strips. Fieldset legends retain their existing frame painting.
