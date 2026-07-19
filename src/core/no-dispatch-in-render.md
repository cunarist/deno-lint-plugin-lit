# no-dispatch-in-render

Rejects calling `dispatchEvent(...)` from `render()`.

## Why

`render()` must be a pure function of the component's state. Lit may call it
more than once per update and does not guarantee when, so an event dispatched
there fires an unpredictable number of times. Worse, a listener that reacts by
writing back to a reactive property schedules another render, which dispatches
again — a loop with no obvious cause in the stack trace. Dispatch from the event
handler that caused the change, or from `updated()` once the DOM is committed.

## Examples

```ts
// BAD
class El extends LitElement {
  render() {
    this.dispatchEvent(new CustomEvent("rendered"));
    return html`<p></p>`;
  }
}

// GOOD
class El extends LitElement {
  updated() {
    this.dispatchEvent(new CustomEvent("rendered"));
  }
}
```

## Notes

- Any receiver is flagged, not just `this` — `window.dispatchEvent(...)` and
  `target.dispatchEvent(...)` are side effects too.
- Nested callbacks count. A dispatch inside a `forEach` callback declared in
  `render()` still fires.
