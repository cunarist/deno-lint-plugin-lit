# no-boolean-property-default-true

Rejects a boolean reactive property initialised to `true`.

## Why

Lit's `Boolean` converter follows the HTML rule: an attribute's _presence_ is
`true` and its absence is `false`. There is no markup that says false —
`disabled="false"` and `disabled=""` both parse as `true`. So a boolean property
defaulting to `true` can never be turned off from a template; the only way to
unset it is imperative property access, which defeats the point of having an
attribute at all. Name the property for its non-default state and default it to
`false`.

## Examples

```ts
// BAD
class El extends LitElement {
  @property({ type: Boolean })
  enabled = true;
}

// GOOD
class El extends LitElement {
  @property({ type: Boolean })
  disabled = false;
}
```

## Notes

- Fires on an explicit `{type: Boolean}` and also on a field whose annotation or
  initialiser is a boolean, since the converter Lit picks makes no difference to
  the markup problem.
- `attribute: false` is accepted. Such a property is never set from markup, so
  the asymmetry does not arise.
- `@state` is never checked, for the same reason.
- The `static properties` form is checked by matching each entry against a class
  field of the same name; the default value lives on the field.
