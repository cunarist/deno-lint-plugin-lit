# no-sync-in-render

Rejects a host component calling `this.#someController.sync*()` from `render()`.

## Why

`render()` reads state; it does not change it. Pushing new state into a
controller during the render pass is a write mid-render, and Lit gives no
guarantee that an update triggered from there is ever scheduled — the value may
land one frame late or drive an extra update cycle. Syncing from `willUpdate()`
happens before render, so the template reads state that is already settled.

## Examples

```ts
// BAD
class Bar extends LitElement {
  #barController = new BarController(this);
  render() {
    this.#barController.sync(this.value);
    return html`<div></div>`;
  }
}

// GOOD
class Bar extends LitElement {
  #barController = new BarController(this);
  willUpdate(): void {
    this.#barController.sync(this.value);
  }
  render() {
    return html`<div></div>`;
  }
}
```

## Notes

Reading from a controller in `render()` is the intended direction and is always
allowed — `return this.#barController.items` is fine.

The receiver must be a field of the host that looks like a controller: either
its name ends in `controller` (case-insensitive, leading `#` ignored) or it is
initialized with a `new *Controller(...)`. Fields assigned in the constructor
are detected as well as property definitions. The enclosing class must extend a
Lit base class; a plain class with a `render()` method is ignored.
