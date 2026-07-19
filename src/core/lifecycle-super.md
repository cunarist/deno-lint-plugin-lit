# lifecycle-super

Rejects an override of a Lit lifecycle callback that never calls its own `super`
implementation.

## Why

`ReactiveElement` does real work in these callbacks: registering the element,
applying attribute changes, committing the render. An override that skips
`super` silently removes that work. The symptom is never a stack trace — the
component just stops reacting to attributes, or never renders, and the cause
looks unrelated to the method you edited.

## Examples

```ts
// BAD
class El extends LitElement {
  connectedCallback() {
    this.setup();
  }
}

// GOOD
class El extends LitElement {
  connectedCallback() {
    super.connectedCallback();
    this.setup();
  }
}
```

## Notes

- Only six methods are checked: `connectedCallback`, `disconnectedCallback`,
  `attributeChangedCallback`, `adoptedCallback`, `update`, `performUpdate`.
- `willUpdate`, `firstUpdated`, `updated`, `shouldUpdate` and `render` are
  deliberately excluded. Their base implementations are empty hooks meant to be
  replaced, so requiring `super` there would flag idiomatic code.
- The `super` call may be anywhere in the body, including nested inside `if` or
  `try`. A conditional call satisfies the rule.
- The call must chain to the same method. `connectedCallback()` calling
  `super.disconnectedCallback()` still fires.
- `lit-reactive-controller/lifecycle-allowlist` bans these overrides outright.
  With that plugin on this rule has nothing left to catch, and the examples here
  describe a codebase that has not adopted it. The two do not conflict: one says
  "if you override, chain to super", the other says "do not override".
