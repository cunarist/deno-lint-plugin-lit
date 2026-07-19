# no-timers

Rejects `setTimeout`, `setInterval`, `requestAnimationFrame`, and
`queueMicrotask` inside a Lit component.

## Why

A timer started in a component is a handle nobody releases. When the element
disconnects the callback still fires, still touches `this`, and still schedules
renders on a detached node. Timers are also usually there to let state "settle"
— a debounce, a deferred measurement — which means the component is working
around its own render order instead of deriving what it needs. A
`ReactiveController` can start the timer in `hostConnected` and clear it in
`hostDisconnected`, in one file, so the release cannot be forgotten.

## Examples

```ts
// BAD
class El extends LitElement {
  go() {
    setTimeout(() => this.#refresh(), 200);
  }
}

// GOOD
class DebounceController {
  #handle = 0;

  hostConnected() {
    this.#handle = setInterval(this.#tick, 200);
  }

  hostDisconnected() {
    clearInterval(this.#handle);
  }
}
```

## Notes

- Only fires inside a Lit component class body. The same call in a controller, a
  plain class, or module scope is fine — that is the whole point.
- Namespaced calls are caught: `globalThis.setTimeout(...)` fires. The rule
  matches the last name segment, so any `x.setTimeout()` inside a component is
  reported.
- `clearTimeout` / `clearInterval` are not banned, but inside a component they
  imply a timer this rule already rejected.
