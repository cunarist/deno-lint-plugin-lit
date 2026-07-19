# no-template-result-in-attribute

Rejects a template bound into attribute position.

## Why

A template evaluates to a `TemplateResult`, which is a description of DOM rather
than a value. Lit turns one into real nodes only in child position. Bound to an
attribute it is coerced to a string, so the attribute is set to
`[object Object]`.

## Examples

```ts
// BAD
const t = html`<div title=${html`<b>hi</b>`}></div>`;

// GOOD
const t = html`<div title=${this.label}></div>`;
```

```ts
// GOOD — child position renders it
const t = html`<div>${this.body}</div>`;
```

## Notes

- Property bindings are exempt. Passing a `TemplateResult` as a property to a
  component that renders it later is a normal pattern.
- `svg` templates count as templates here too.
- The diagnostic highlights the bound expression rather than the attribute, so
  it points at the template itself.
