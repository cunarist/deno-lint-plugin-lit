# require-dashed-tag

Rejects a custom element name the registry will not accept.

## Why

`customElements.define()` throws on an invalid name, so the component is never
registered. Nothing renders, and the tag sits in the DOM as an
`HTMLUnknownElement` — no error in the console, no clue in the markup.

The rules come from the HTML spec: the name must contain a hyphen, start with a
lowercase letter, contain no uppercase, and not be one of a handful of reserved
names.

## Examples

```ts
// BAD
@customElement("editor")
class Editor extends LitElement {}

// GOOD
@customElement("cl-editor")
class Editor extends LitElement {}
```

## Notes

- Four rejections are reported: no hyphen, a leading character that is not a
  lowercase letter, any uppercase letter, and the spec's reserved names
  (`annotation-xml`, `color-profile`, the `font-face*` family, `missing-glyph`).
- Only a string literal is checked. A tag built at runtime is not read.
