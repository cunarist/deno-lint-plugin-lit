# no-reflect-on-complex-property

Rejects `reflect: true` combined with `{type: Object}` or `{type: Array}`.

## Why

Reflection writes the property back out to the attribute on every change, using
the converter's `toAttribute`. For `Object` and `Array` that is
`JSON.stringify`, so the DOM fills with long quote-escaped blobs that re-parse
into a brand new object on the way back in — a fresh identity on every update,
and an update loop whenever the round trip is not exactly lossless. Values
holding functions, `undefined`, `Map`s, or cycles do not survive the trip at
all. Reflect scalars; keep structured data on the property only.

## Examples

```ts
// BAD
class El extends LitElement {
  @property({ type: Object, reflect: true })
  data = {};
}

// GOOD
class El extends LitElement {
  @property({ type: Object })
  data = {};

  @property({ type: Boolean, reflect: true })
  empty = false;
}
```

## Notes

- Both declaration styles are checked: a `@property({...})` options object and
  an entry of `static properties`.
- Only a literal `reflect: true` fires the rule. `reflect: someFlag` is not
  evaluated.
- The diagnostic points at the `reflect: true` entry, since that is the part to
  delete. If the attribute really is needed, reflect a scalar derived from the
  structure instead — a count, an id, or a presence flag.
