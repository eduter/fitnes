# Popover

A thin bordered, controlled modal with the stepped reveal and reverse closing
from PR #23. See [animation and lifecycle](../Controls/README.md#pr-23-animation).

```tsx
<Popover open={open()} onOpenChange={setOpen} label="Options" height={96}>
    <Button onPress={() => setOpen(false)}>Close</Button>
</Popover>
```

Pass `mount` to keep it inside a positioned/scaled logical-pixel surface. The
component owns focus containment, background inertness and close lifecycle;
callers own open state and content.

Pass `anchor={() => trigger}` for placement beside a trigger. The menu flips and
clamps to the visual viewport and follows scrolling/resizing in scaled surfaces.
Outside taps are passive; include an explicit Back/Close action. Escape closes
and focus returns to the trigger after reverse closing finishes.
