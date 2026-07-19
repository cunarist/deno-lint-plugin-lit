# no-private-properties

Rejects `@property` on a field declared with a `#` private name.

## Why

`#count` is private at the language level: nothing outside the class can read or
write it, and the runtime enforces that. `@property` declares the opposite — a
public attribute that markup and parent components are expected to set. The two
statements contradict each other, and the attribute wins in the sense that Lit
still creates it, pointing at a field no one can reach.

## Examples

```ts
// BAD
class El extends LitElement {
  @property({ type: Boolean })
  accessor #open = false;
}

// GOOD
class El extends LitElement {
  @state()
  accessor #open = false;
}
```

## Notes

- Only the `#` spelling is checked. A leading underscore is a convention, not a
  language feature — some codebases use `_id` for a genuinely public field, so
  keying on it would report correct code.
- `@state` on a `#` field is correct and never reported: internal reactive state
  is exactly what a private name is for.
- Entries of a `static properties` object are checked the same way.
