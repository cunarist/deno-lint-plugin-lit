# no-component-disposables

Rejects constructing `AbortController`, `EventSource`, `IntersectionObserver`,
`MutationObserver`, `ResizeObserver`, `WebSocket`, or `Worker` inside a Lit
component, and rejects calling `addEventListener`, `removeEventListener`,
`addEventListener` or `removeEventListener` there.

## Why

A component declares what to render; anything with a lifetime belongs to
something that can release it. An observer created in a component is released —
if at all — in a different method, often a different screenful of code, and when
someone later adds an early return between the two the leak is invisible. A
`ReactiveController` acquires in `hostConnected` and releases in
`hostDisconnected`, adjacent lines in one file, and Lit calls both for you.

## Examples

```ts
// BAD
class El extends LitElement {
  go() {
    this.#observer = new ResizeObserver(this.#onResize);
    this.#el.addEventListener("scroll", this.#onScroll);
  }
}

// GOOD
class SizeController {
  #observer = null;

  hostConnected() {
    this.#observer = new ResizeObserver(this.#onResize);
  }

  hostDisconnected() {
    this.#observer.disconnect();
  }
}
```

## Notes

- Only fires inside a Lit component class body. The identical code in a
  controller is exactly what the rule wants.
- Only `addEventListener` and `removeEventListener` are matched by name. Methods
  like `destroy()` or `dispose()` are not: those names belong to ordinary
  objects — a chart, a database handle — as often as to resources.
- Constructor matching covers the platform classes listed above, by name on any
  receiver, so `globalThis.WebSocket` is caught alongside a bare `WebSocket`.
- `removeEventListener` is banned alongside `addEventListener` on purpose: if
  the release is happening in the component, the acquisition is too.
- Declarative `@click=` bindings in a template are untouched. Those are what you
  should be using; this rule only rejects the imperative form.
