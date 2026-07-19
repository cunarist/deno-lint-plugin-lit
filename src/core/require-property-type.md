# require-property-type

Requires `{type: …}` on every `@property` that has an attribute.

## Why

An attribute is always a string — HTML has no other type. `type` is what tells
Lit to read it as something else. Leave it out and Lit installs the identity
converter, so `<my-el count="3">` leaves `count` holding `"3"` and
`this.count + 1` is `"31"`. TypeScript cannot see this: the field is declared
`number` and the wrong value arrives at runtime.

The check is syntactic — it asks whether `type` is written, not what the
property's declared type is. An earlier version inferred the type from the
initialiser, which meant it passed `accessor count: number;` and
`accessor total: Count;` — the cases where the mistake is easiest to make and
hardest to spot. A rule that is right about a narrow slice and silent elsewhere
is worse than one that always asks.

## Examples

```ts
// BAD
class El extends LitElement {
  @property()
  accessor count = 0;
}

// GOOD
class El extends LitElement {
  @property({ type: Number })
  accessor count = 0;
}
```

## Notes

- `{ type: String }` is required on string properties too. It is redundant to
  Lit — String is the default — but writing it is what makes the rule exhaustive
  rather than a guess.
- Exempt, because no conversion can run: `attribute: false`, `@state`, and a
  custom `converter`, which replaces whatever `type` would have selected.
- A spread in the options object is assumed to carry `type`, so it is left alone
  rather than guessed at.
- This rule does not check that the declared `type` is _correct_. That would
  need real type resolution, which a lint plugin does not have.
