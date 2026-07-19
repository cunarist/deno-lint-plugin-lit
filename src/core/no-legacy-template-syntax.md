# no-legacy-template-syntax

Rejects Polymer-style `[[oneWay]]` and `{{twoWay}}` bindings inside an `html`
template.

## Why

Lit only interpolates `${…}`. Polymer's binding syntax means nothing to it, so
the double brackets render as literal text — the user sees `[[this.name]]` on
the page. Nothing errors, and the value is never read.

## Examples

```ts
// BAD
const t = html`<div>[[this.name]]</div>`;
const t2 = html`<div title={{name}}></div>`;

// GOOD
const t = html`<div>${this.name}</div>`;
const t2 = html`<div title=${this.name}></div>`;
```

## Notes

- The scan runs on the raw quasis rather than the placeholder-substituted text,
  because the internal binding placeholder is itself spelled with double braces.
- Single brackets and single braces are not flagged: `[ a ]` and `{ a }` are
  ordinary text.
- The delimiters must contain at least one character and no nested bracket of
  the same kind.
