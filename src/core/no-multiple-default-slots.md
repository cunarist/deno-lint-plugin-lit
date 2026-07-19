# no-multiple-default-slots

Rejects two or more unnamed `<slot>` elements in one template.

## Why

Light-DOM children with no `slot` attribute all go to the **first** default
slot. Any further unnamed slot renders its fallback content and never receives
anything, so it reads as a second insertion point that silently does nothing.

## Examples

```ts
// BAD
const t = html`<slot></slot><slot></slot>`;

// GOOD
const t = html`<slot></slot><slot name="footer"></slot>`;
```

## Notes

- `name=""` counts as a default slot; it is how the default slot is named
  explicitly.
- A bound name (`name=` with a `${…}`) may or may not be empty at runtime, so
  such a slot is neither counted nor reported.
- Each template is checked on its own — one default slot per shadow root.
- Every default slot after the first is reported, wherever it sits in the tree.
