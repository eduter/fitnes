# TextInput

A regular native input with corner marks and a visible label. It retains the
phone's native keyboard and ordinary typing, selection and IME behavior.

```tsx
<TextInput label="Exercise name" value={name()}
    onInput={(event) => setName(event.currentTarget.value)} />
```

Native attributes and refs target the actual input. Classes style the wrapper.
See [the shared control documentation](../Controls/README.md).
