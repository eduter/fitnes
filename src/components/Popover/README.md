# Popover

A thin-bordered stacked window with stepped reveal/reverse close. Pass `anchor`
and `returnFocus` explicitly; they can differ when a passive label anchors the
window. `placement="right"` aligns to the label's right edge and vertical center,
flipping left/clamping at viewport edges. Default placement prefers below,
then above. `width` specifies logical width; viewport bounds can reduce it.

Only the uppermost layer is interactive. Outside primary press (including the
margins around the scaled screen) or Escape dismisses that layer. Closing
restores parent interaction/focus. Underlying windows stay mounted. Consumers
own values and drafts; dismissal itself does not mutate or roll them back.
Choice menus should contain only options, without headers or Back actions.
