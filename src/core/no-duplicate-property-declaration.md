# no-duplicate-property-declaration

Rejects a property declared by both a decorator and a `static properties` entry.

## Why

`@property()` and `static properties` are two spellings of the same call — both
end up in `ReactiveElement.createProperty`. Declaring one property both ways
means one options object silently wins, whichever the decorator transform and
the static initialiser happen to apply last. The `type`, `reflect`, and
`converter` written in the losing declaration have no effect while still reading
as though they do, so the class documents behaviour it does not have.

## Examples

```ts
// BAD
class El extends LitElement {
  static properties = { count: { type: Number } };

  @property({ type: Number })
  count = 0;
}

// GOOD
class El extends LitElement {
  @property({ type: Number })
  accessor count = 0;
}
```

## Notes

- `@state` counts as a decorator declaration, so a `@state` name repeated in
  `static properties` is reported too.
- The diagnostic points at the `static properties` key, which is usually the
  redundant one — but either declaration can be the one to remove.
- Disjoint names across the two styles are fine. Mixing styles in one class is
  not itself an error here; only the overlap is. `lit-strict/prefer-decorators`
  takes the stronger position.
