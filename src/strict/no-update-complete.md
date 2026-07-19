# no-update-complete

Rejects any access to `updateComplete`.

## Why

`await this.updateComplete` means "let the DOM settle, then read it back". That
turns rendering into a two-phase process where the second phase depends on
timing, and it is how render loops and flaky tests start — the awaited read
feeds a write that schedules another update. Anything you would learn by waiting
is either already in reactive state or belongs to a `ReactiveController` that
observes the DOM and reports back.

## Examples

```ts
// BAD
class El extends LitElement {
  async go() {
    await this.updateComplete;
    this.#width = this.renderRoot.querySelector("input").offsetWidth;
  }
}

// GOOD
class El extends LitElement {
  #size = new SizeController(this);

  render() {
    return html``;
  }
}
```

## Notes

- The member access itself is banned, not the `await` around it, so
  `this.updateComplete.then(...)` and passing it around are caught too.
- Deliberately **not** gated to Lit components — a controller reaching for
  `this.#host.updateComplete` is the same mistake, and gating on the component
  would let it through.
- Computed access (`this["updateComplete"]`) is not detected. This is a style
  rule, not a sandbox.
- The cost: post-render measurement and "wait for render" test helpers have to
  be rewritten. In tests, drive the component through its properties and assert
  on those instead.
