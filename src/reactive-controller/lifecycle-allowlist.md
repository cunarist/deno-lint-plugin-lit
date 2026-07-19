# lifecycle-allowlist

Rejects any lifecycle override on a Lit component other than `styles` and
`render`.

## Why

`connectedCallback` and `disconnectedCallback` are where components acquire
things — listeners, observers, sockets — and where people forget to release
them. `firstUpdated` and `updated` are where DOM measurement leaks in, so
rendering stops being a pure function of state. Confining a component to
`styles` and `render` means the only lifetime a component manages is its own
render. `willUpdate` is banned too: pushing state into a controller belongs in a
property setter, where it runs when the value actually changes. Everything else
moves into a `ReactiveController`, where `hostConnected` and `hostDisconnected`
sit next to each other and the release is visible.

## Examples

```ts
// BAD
class El extends LitElement {
  connectedCallback() {
    super.connectedCallback();
    this.#observer.observe(this);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer.disconnect();
  }
}

// GOOD
class El extends LitElement {
  #size = new SizeController(this);

  static styles = css``;

  render() {
    return html``;
  }
}
```

## Notes

- This supersedes the advice in several `lit-core` rules. Where they say to
  derive a value in `willUpdate()`, do it in the setter that receives the input;
  where they say to dispatch from `updated()`, dispatch from the handler that
  caused the change. Their own examples are written that way.
- The full banned set: `connectedCallback`, `disconnectedCallback`,
  `firstUpdated`, `updated`, `shouldUpdate`, `update`, `performUpdate`,
  `requestUpdate`, `scheduleUpdate`.
- Fields count, not just methods — `createRenderRoot = () => this` is rejected
  too.
- Only Lit component classes are checked. A plain class or a bare
  `extends HTMLElement` is ignored, so a controller's `hostConnected` is fine.
- Each override is reported separately.
- This supersedes `lifecycle-super` from the `recommended` config. Under this
  rule those overrides do not exist, so there is nothing left for
  `lifecycle-super` to check.
- The cost is real: light-DOM rendering via `createRenderRoot` and any
  post-render measurement become controller work. That is the trade.
