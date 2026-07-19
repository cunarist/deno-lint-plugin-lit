# attribute-names

Rejects a camelCase reactive property that does not declare an explicit
`attribute` option.

## Why

HTML attribute names are ASCII case-insensitive, so Lit lowercases them. A
property named `myProp` is observed as the attribute `myprop` — not `myProp` and
not `my-prop`. Someone writing `<my-el my-prop="x">` in markup gets no error and
no effect; the property just never updates. Saying what the attribute is, or
that there is none, makes the mapping explicit.

## Examples

```ts
// BAD
class El extends LitElement {
  @property()
  myProp = "";
}

// GOOD
class El extends LitElement {
  @property({ attribute: "my-prop" })
  accessor myProp = "";
  @property({ attribute: false })
  accessor internalValue = "";
  @property()
  accessor label = "";
}
```

## Notes

- All-lowercase names are fine as-is; only names containing uppercase are
  checked.
- `@state` and undecorated fields are ignored — they have no attribute.
- Other options do not satisfy the rule.
  `@property({ type: Boolean, reflect: true }) isOpen` still fires, because none
  of those options name the attribute.
- Entries of a `static properties` object are checked the same way.
- A spread inside the options object is assumed to carry `attribute`, so it is
  not flagged.
