# no-object-attribute-binding

Rejects an object or array literal bound to a plain attribute.

## Why

An attribute value is a string. Binding an object literal to one stringifies it
to `[object Object]`; an array becomes its comma-joined elements, losing every
distinction between nesting and separators. Neither survives a round trip, and
the consumer sees garbage rather than data.

Pass structured data as a property, where the value arrives intact.

## Examples

```ts
// BAD
const t = html`<x-y config=${{ a: 1 }}></x-y>`;

// GOOD
const config = { a: 1 };
const t = html`<x-y .config=${config}></x-y>`;
```

```ts
// BAD
const t = html`<x-y items=${[1, 2]}></x-y>`;

// GOOD
const items = [1, 2];
const t = html`<x-y .items=${items}></x-y>`;
```

## Notes

- Only literals are detected. A variable holding an object cannot be recognised
  without type information, so `no-reflect-on-complex-property` and review cover
  that case.
- Property, event and boolean bindings are exempt.
- If the attribute really is the interface — for interop with a non-Lit consumer
  — serialise it deliberately before the template instead.
- The diagnostic highlights the literal.
