# Spinner

Controlled fixed-mask numerical input with borderless steps and a number-pad
popover. See the [UI system contract](../../design-system/README.md).

```tsx
<Spinner label="Reps" value={reps()} onChange={setReps} integerDigits={2} />
<Spinner label="Weight (kg)" value={weight()} onChange={setWeight}
    step={equipmentIncrement()} integerDigits={3} fractionDigits={2} />
```

`onChange` applies immediately. `popoverMount` identifies the surrounding
logical-pixel surface when scaled. No numerical text input or system keyboard
is used. The internal NumberPad is shared by all Spinner instances.

The pad has no visible title/header and closes with End. Its accessible name
and live readout retain the field label. It never opens the virtual keyboard.
