# no-property-named-like-lifecycle

Rejects a class field or reactive property named after a Lit lifecycle member.

## Why

`render`, `update`, `updated`, `requestUpdate` and their siblings are methods on
`ReactiveElement.prototype`. A class _field_ of the same name is an own property
installed by `Object.defineProperty` at construction time, so it hides the
prototype method instead of overriding it. Lit then calls the field: `render`
returns whatever the field holds instead of a template, and `requestUpdate`
throws because a string is not a function. The component dies on its first
update, far from the declaration that caused it.

## Examples

```ts
// BAD
class El extends LitElement {
  @property({ type: Boolean })
  updated = false;
}

// GOOD
class El extends LitElement {
  @property({ type: Boolean, attribute: "has-updated" })
  accessor hasUpdated = false;
}
```

## Notes

- Methods are untouched. Overriding a lifecycle method is the supported way to
  hook it, and `render() { … }` is the whole point of the class.
- Field declarations and `accessor` declarations are both reported, decorated or
  not, along with `static properties` entries that name a lifecycle member.
- `declare` is type-only and emits nothing, so it shadows nothing and is
  accepted.
- The names checked are Lit's full lifecycle surface: `connectedCallback`,
  `disconnectedCallback`, `attributeChangedCallback`, `adoptedCallback`,
  `createRenderRoot`, `firstUpdated`, `updated`, `shouldUpdate`, `update`,
  `willUpdate`, `performUpdate`, `requestUpdate`, `scheduleUpdate`, `render`.
