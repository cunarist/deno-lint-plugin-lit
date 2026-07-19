# attribute-value-entities

Rejects an unescaped `&`, `<`, `>` or `"` inside a static attribute value in an
`html` template.

## Why

These characters are significant to the HTML parser. An unescaped `"` ends the
attribute value early, so the rest of the text becomes stray attributes. A bare
`&` is parsed as the start of a character reference and can swallow the
following word. The template still parses, so the damage shows up as garbled
rendered output rather than an error.

## Examples

```ts
// BAD
const t = html`<a title="a & b"></a>`;

// GOOD
const t = html`<a title="a &amp; b"></a>`;
```

## Notes

- Bindings are excluded. Each `${…}` is replaced by a placeholder before the
  scan, so `title=${this.a && this.b}` and `title="${this.a > this.b}"` are
  fine. Static text around a binding is still checked.
- A well-formed character reference is accepted, whether named (`&amp;`),
  decimal (`&#38;`), or hex (`&#x26;`). Only a `&` that does not start one is
  flagged.
- Valueless attributes are skipped.
