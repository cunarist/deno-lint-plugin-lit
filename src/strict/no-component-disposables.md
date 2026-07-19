# no-component-disposables

Rejects constructing `AbortController`, `EventSource`, `IntersectionObserver`,
`MutationObserver`, `ResizeObserver`, `WebSocket`, or `Worker` inside a Lit
component, and rejects calling `addEventListener`, `removeEventListener`,
`destroy`, `disconnect`, `dispose`, or any `stream*` method there.

## Why

This is the rule the whole `disciplined` config is built around: a component
declares what to render, and anything with a lifetime belongs to something that
can release it. An observer created in a component is released — if at all — in
a different method, often a different screenful of code, and when someone later
adds an early return between the two the leak is invisible. A
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
- `stream*` means the literal prefix `stream` plus at least one more character,
  so `api.streamFileWatch(...)` and `api.streamTaskProgress()` are rejected but
  a bare `api.stream()` is allowed. The assumption is that a named stream opens
  a subscription while a bare `stream()` is a one-shot.
- Method matching is by name only, on any receiver. A `dispose()` or
  `disconnect()` that has nothing to do with resources will still fire if it is
  called from a component.
- `removeEventListener` is banned alongside `addEventListener` on purpose: if
  the release is happening in the component, the acquisition is too.
- Declarative `@click=` bindings in a template are untouched. Those are what you
  should be using; this rule only rejects the imperative form.
