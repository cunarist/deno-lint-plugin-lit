# property-type-matches-declaration

Rejects a `{type: …}` option that contradicts the field's declared type.

## Why

The `type` option picks the converter Lit runs on the attribute string, and that
converter decides what the property actually holds at runtime. If it disagrees
with the TypeScript annotation, the annotation is a lie: a field declared
`label: string` under a `Number` type option is handed a `number` as soon as the
attribute is set, and every consumer that trusted the annotation is wrong.
TypeScript cannot catch this on its own — the decorator's options object is
untyped with respect to the field it decorates.

## Examples

```ts
// BAD
class El extends LitElement {
  @property({ type: Number })
  label: string = "x";
}

// GOOD
class El extends LitElement {
  @property({ type: String })
  accessor label: string = "x";
}
```

## Notes

- `Object` and `Array` are treated as interchangeable. Both of Lit's converters
  are `JSON.parse`, so declaring one where the other applies is harmless and is
  not reported.
- Only the five converters Lit ships are understood: `String`, `Number`,
  `Boolean`, `Array`, `Object`. A custom converter function is not checked.
- The field's shape comes from its type annotation, falling back to its
  initialiser. Shapes needing type resolution — a named interface, a union — are
  undecidable here and skipped.
- The `static properties` form is checked by matching each entry against a class
  field of the same name. Without such a field there is nothing to compare
  against and the entry is skipped.
