# no-duplicate-template-bindings

Rejects the same attribute, property, boolean or event binding appearing twice
on one element.

## Why

The HTML parser keeps the first occurrence and silently drops the rest. So the
second binding — usually the one you just added — does nothing, with no error
anywhere. It is always a bug: either a copy-paste leftover, or an edit applied
to the wrong line.

## Examples

```ts
// BAD
const t = html`<x-y .foo=${this.a} .foo=${this.b}></x-y>`;

// GOOD
const t = html`<x-y .foo=${this.a} .bar=${this.b}></x-y>`;
```

## Notes

- The four sigils are separate namespaces. `foo`, `.foo`, `?foo` and `@foo` may
  all coexist on one element; only a repeat within a namespace is flagged.
- The diagnostic points at the second occurrence.
- Duplicates on different elements are fine.
- `no-invalid-html` deliberately skips this parse error so the two rules do not
  double-report.
