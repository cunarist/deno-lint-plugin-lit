# no-attribute-property-binding-conflict

Rejects the same name bound as both an attribute and a property on one element.

## Why

For a reactive property the attribute is not an independent channel — it feeds
the property. Binding both means two sources write the same field, and which one
survives depends on the order Lit commits them in. Reordering the bindings, or
changing whether one of them updates on a given render, silently changes the
result.

One of the two is always redundant, and it is not obvious which.

## Examples

```ts
// BAD
const t = html`<x-y foo=${this.a} .foo=${this.b}></x-y>`;

// GOOD
const t = html`<x-y .foo=${this.b}></x-y>`;
```

## Notes

- Only the attribute/property pair conflicts. `?foo` and `@foo` address separate
  things and may coexist with either.
- Names are compared case-insensitively, since the HTML parser lowercases
  attribute names — see `no-camelcase-attribute`.
- The diagnostic highlights whichever of the two comes second.
- Duplicates within a single namespace are `no-duplicate-template-bindings`.
