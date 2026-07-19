# require-property-type

Requires `{type: …}` on every `@property` that has an attribute.

## Why

An attribute is always a string — HTML has no other type. `type` is what tells
Lit to read it as something else. Leave it out and Lit installs the identity
converter, so `<my-el count="3">` leaves `count` holding `"3"` and
`this.count + 1` is `"31"`. TypeScript cannot see this: the field is declared
`number` and the wrong value arrives at runtime.

The rule asks only whether `type` is written; it does not try to work out what
the property holds. Inferring that would mean giving up on aliases, imported
types and generics — the cases where the mistake is hardest to spot.

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
