# require-property-type

Requires `{type: …}` on a `@property` whose value is not a string.

## Why

Lit's default attribute converter is the identity function: whatever the
attribute says arrives as a `string`. So `@property() count = 0` holds the
string `"3"` the moment anyone writes a `count="3"` attribute, and arithmetic on
it starts concatenating. Booleans are worse — the attribute value `"false"` is a
truthy string, so the property is `true` however the markup is written. Naming
the type installs the matching converter and the value arrives parsed.

## Examples

```ts
// BAD
class El extends LitElement {
  @property()
  count = 0;

  @property()
  items: string[] = [];
}

// GOOD
class El extends LitElement {
  @property({ type: Number })
  accessor count = 0;

  @property({ type: Array })
  accessor items: string[] = [];
}
```

## Notes

- The property's shape is read from its type annotation first, then from its
  initialiser. A property with neither — or with a shape that needs type
  resolution, such as `: Foo` or a union — is left alone rather than guessed at.
- `converter:` and `attribute: false` both satisfy the rule: the first replaces
  the conversion, the second means the value never comes from markup at all. A
  spread in the options object is assumed to carry one of them.
- `@state` is never checked. State has no attribute, so no conversion happens.
