# TextInput

A regular native input inside the adopted cut-corner frame with a legend. It retains the
phone's native keyboard and ordinary typing, selection and IME behavior.

```tsx
<TextInput label="Exercise name" value={name()}
    onInput={(event) => setName(event.currentTarget.value)} />
```

Native attributes and refs target the actual input. Classes style the fieldset wrapper. Do not focus it automatically when an editor opens.
See [the shared control documentation](../Controls/README.md).
