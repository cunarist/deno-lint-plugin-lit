# require-dispatch-on-this

Requires a component's events to be dispatched on the component itself.

## Why

A parent listens with `@edit=${this.#onEdit}`, which adds the listener to that
element. An event dispatched anywhere else never reaches it. The code looks
right, the handler simply never runs, and there is nothing in the console.

## Examples

```ts
// BAD
class El extends LitElement {
  #commit() {
    this.#bus.dispatchEvent(new CustomEvent("edit"));
  }
}

// GOOD
class El extends LitElement {
  #commit() {
    this.dispatchEvent(new CustomEvent("edit", { detail: this.value }));
  }
}
```

## Notes

- `this.renderRoot.dispatchEvent(...)` is accepted; the event still reaches the
  host through the shadow boundary when `composed` is set.
- A receiver the rule cannot resolve — a call result, a computed index — is left
  alone rather than guessed at.
- Only Lit components are checked.
