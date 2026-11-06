# Button

See the [controls API](../Controls/README.md#components) for the immediate
`onPress` callback, native attributes and `action` / `plain` variants.

```tsx
<Button onPress={addSet}>Add set</Button>
<Button variant="plain" aria-label="Digit 5" onPress={() => choose(5)}>5</Button>
```

Owner revision: action buttons use uppercase gold text without a leading
chevron. The plain variant retains caller casing for values/digits. Both keep
the same pointer/keyboard semantics; color identifies interactivity.
