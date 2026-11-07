# Button

`onPress` activates on the primary pointer press or a keyboard/screen-reader
click. Native attributes pass through to the button. The default `action`
variant uses uppercase gold text; `plain` preserves caller casing for values
and digits. Both use the same press semantics. See the
[UI system contract](../../design-system/README.md#available-components-and-when-to-use-them).

```tsx
<Button onPress={addSet}>Add set</Button>
<Button variant="plain" aria-label="Digit 5" onPress={() => choose(5)}>5</Button>
```
