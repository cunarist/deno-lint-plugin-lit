# no-invalid-escape-sequences

Rejects a malformed `\x` or `\u` escape inside an `html` template.

## Why

A tagged template makes malformed escapes legal to write — the raw strings stay
accessible, so there is no syntax error. But the cooked string for that quasi
becomes `undefined`. Lit renders from the cooked value, so the text around the
bad escape disappears from the output. In markup this is always a typo, or a
regex pasted where it does not belong.

## Examples

```ts
// BAD
const t = html`<div>\xZZ</div>`;

// GOOD
const t = html`<div>\x41</div>`;
```

## Notes

- Only `\x` and `\u` are checked. Every other `\c` is a valid, if redundant,
  escape — so `\d` and `\w` inside an inline `pattern` attribute are left alone.
- Accepted forms: `\x` plus exactly two hex digits, `\u` plus exactly four hex
  digits, or `\u{…}` with at least one hex digit.
- An escaped backslash (`\\x`) consumes the next character and is not flagged.
- Every quasi is scanned, including the parts after a binding.
