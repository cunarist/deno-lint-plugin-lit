# prefer-decorators

Rejects a `static properties` declaration on a Lit component.

## Why

`static properties` lists property names as strings in one place and the fields
themselves in another. The two drift: a renamed field leaves a dead entry, a new
field silently fails to be reactive, and neither mistake produces an error.
`@property()` on the field keeps the declaration, the initializer, and the
TypeScript type on one line, so there is nothing to keep in sync.

## Examples

```ts
// BAD
class El extends LitElement {
  static properties = { name: {}, open: { state: true } };
}

// GOOD
class El extends LitElement {
  @property()
  accessor name = "";
  @state()
  accessor open = false;
}
```

## Notes

- Both forms are rejected — the static field and `static get properties()`.
- Only Lit component classes are checked, and only `static` members. A
  non-static field named `properties` is left alone.
- This requires decorator support in your build. If you cannot enable
  decorators, exclude this rule; there is no configuration for it.
- `attribute-names` in the `recommended` config checks entries of a
  `static properties` object as well, so the two overlap by design.
