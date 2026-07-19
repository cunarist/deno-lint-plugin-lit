# no-native-attributes

Rejects a reactive property named after a global HTML attribute.

## Why

`HTMLElement` already defines an accessor for `id`, `title`, `role` and the
rest. Declaring a reactive property with the same name replaces it, so Lit's
accessor and the platform's fight over the same slot. The DOM, CSS selectors,
and assistive technology all read the native attribute and get something other
than what you set.

## Examples

```ts
// BAD
class El extends LitElement {
  @property()
  title = "";
}

// GOOD
class El extends LitElement {
  @property()
  label = "";
  @property()
  headingId = "";
}
```

## Notes

- The banned names are `role`, `title`, `id`, `slot`, `style`, `class`,
  `hidden`, `lang`, `dir`, `tabindex`.
- Matching is case-insensitive, so `tabIndex` is flagged as `tabindex`.
- Only reactive properties count — `@property`, `@state`, and
  `static properties` entries. An undecorated field named `title` or a private
  `#role` is left alone.
- Names that merely contain a native name are fine; `headingId` does not match
  `id`.
