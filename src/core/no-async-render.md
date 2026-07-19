# no-async-render

Rejects an `async render()` on a Lit component.

## Why

An `async` method returns a Promise, and Lit commits whatever `render()` returns
directly into the DOM. A Promise is not a renderable value, so the component
renders nothing at all — not a loading state, not stale markup, nothing. The
awaited work still runs, so the bug looks like a data problem rather than a
rendering one. Fetch the data elsewhere, store it in a reactive property, and
render that synchronously.

## Examples

```ts
// BAD
class El extends LitElement {
  async render() {
    const items = await this.load();
    return html`<p>${items}</p>`;
  }
}

// GOOD
class El extends LitElement {
  @state()
  items = [];

  render() {
    return html`<p>${this.items}</p>`;
  }
}
```

## Notes

- Only `render` is checked. Async lifecycle hooks are covered by
  `no-async-lifecycle`.
- A `static render()` is not a lifecycle method and is ignored.
