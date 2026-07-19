# require-tag-prefix

Requires a custom element name to carry a namespace segment.

## Why

The custom element registry is global to the page. Two libraries that both
define `<button-group>` cannot be loaded together — the second
`customElements.define()` throws. A prefix makes the collision impossible.

## Examples

```ts
// BAD
@customElement("path-bar")
class PathBar extends LitElement {}

// GOOD
@customElement("cl-path-bar")
class PathBar extends LitElement {}
```

## Notes

- Which prefix is not checked, only that one is present: a lint rule takes no
  options, so it cannot be told your project's. Consistency across files is not
  checked either, for the same reason.
- The test is whether any leading segment remains once the class name is
  accounted for, with or without a trailing `Element`.
