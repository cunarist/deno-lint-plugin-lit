# require-abort-signal-in-fetch

Rejects a `fetch(...)` inside a reactive controller that passes no `signal`
option.

## Why

A controller exists so that everything it starts has a matching stop in
`hostDisconnected`. A request is the clearest case: without a `signal` there is
no handle to cancel, so navigating away leaves the request in flight, the
`await` resumes long after the host is detached, and the continuation writes
state onto an element that is no longer in the document. In the common case that
is a wasted render; in the case where the response drives a redirect or a
dialog, it is a visible bug.

The fix is mechanical — hold an `AbortController`, pass its `signal`, abort it
in `hostDisconnected` — and the rule exists because the failure is invisible in
development, where nothing disconnects fast enough to notice.

## Examples

```ts
// BAD
class DataController implements ReactiveController {
  async load() {
    const response = await fetch("/api/items");
    this.items = await response.json();
  }
}

// GOOD
class DataController implements ReactiveController {
  #aborter = new AbortController();

  async load() {
    const response = await fetch("/api/items", {
      signal: this.#aborter.signal,
    });
    this.items = await response.json();
  }

  hostDisconnected() {
    this.#aborter.abort();
  }
}
```

## Notes

- Scope is the same controller heuristic the other rules in this config use: a
  class that declares `implements ReactiveController`, is named `…Controller`,
  or defines `hostConnected`/`hostDisconnected`. A class extending a Lit base is
  explicitly excluded — see `no-fetch-in-component` for that case.
- Only the global `fetch` counts, written bare or as `globalThis.fetch` /
  `window.fetch` / `self.fetch`. A method named `fetch` on some other object
  (`this.#api.fetch(...)`) is a different function and is not checked.
- The options argument is only inspected when written as an object literal. A
  hoisted `this.#init` or a spread could supply the signal, so both are allowed
  rather than guessed at.
- The rule checks that a `signal` key is _present_, not that it is wired to an
  `AbortController` the controller actually aborts. `signal: undefined` passes.
  Verifying the abort path is beyond what static analysis can do without
  producing noise.
