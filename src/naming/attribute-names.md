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
// BAD - the attribute silently becomes "myprop"
class El extends LitElement {
  @property()
  accessor myProp = "";
}

// GOOD
class El extends LitElement {
  @property({ type: String, attribute: "my-prop" })
  accessor myProp = "";
}
```

## Notes

- **`attribute: false` is not the same fix.** It silences the rule by removing
  the attribute, so `<my-el my-prop="x">` stops working. Reach for it only when
  the property is never set from markup; otherwise name the attribute.
- All-lowercase names are fine as-is; only names containing uppercase are
  checked.
- `@state` and undecorated fields are ignored — they have no attribute.
- Other options do not satisfy the rule.
  `@property({ type: Boolean, reflect: true }) isOpen` still fires, because none
  of those options name the attribute.
- Entries of a `static properties` object are checked the same way.
- A spread inside the options object is assumed to carry `attribute`, so it is
  not flagged.
