# no-partial-property-binding

Rejects a property, event or boolean binding that is not the entire attribute
value.

## Why

Lit can interleave literal text with bindings only for plain attributes, where
the result is a string. For the other three sigils there is nothing to
concatenate — a handler function or an object has no meaningful string form — so
Lit refuses and throws while preparing the template:

> Property, event, boolean and element bindings must consist of a single
> expression.

That is a hard failure at render time, not a silent one, but it fires from
inside Lit rather than from the template that caused it.

## Examples

```ts
// BAD
const t = html`<x-y .prop="x${this.a}"></x-y>`;

// GOOD
const t = html`<x-y .prop=${this.prefixed}></x-y>`;
```

```ts
// BAD
const t = html`<x-y ?open="${this.a}!"></x-y>`;

// GOOD
const t = html`<x-y ?open=${this.isOpen}></x-y>`;
```

## Notes

- Plain attributes may still compose freely — a quoted value mixing text and
  bindings is fine.
- A static literal such as a quoted `.prop="hello"` is a legitimate one-off
  assignment and is not reported.
- An unquoted binding followed by a second one is reported too. The value stops
  at the whitespace, so the trailing binding lands in attribute-name position
  where nothing can bind it.
- Compute the composed value before the template and interpolate it by name.
