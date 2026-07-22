# no-fetch-in-component

Rejects a `fetch(...)` call inside a Lit component class.

## Why

A component renders; it does not own work with a lifetime. A request started
from a component has nothing that cancels it — `disconnectedCallback` is banned
under this config, and even where it is not, the abort handle and the request
end up in different methods, which is how cancellation quietly stops working.
The response then resolves against a detached element.

Moving the request into a `ReactiveController` puts acquisition and release in
one file and gives the request an owner: the controller aborts it in
`hostDisconnected`, and the component reads the result as ordinary state. This
is the same argument as `no-component-disposables`, applied to the resource a
component reaches for most often.

## Examples

```ts
// BAD
class PathBar extends LitElement {
  async willUpdate() {
    const response = await fetch("/api/items");
    this.items = await response.json();
  }
}

// GOOD
class PathBar extends LitElement {
  #data = new DataController(this);

  render() {
    return html`<ul>${this.#data.items}</ul>`;
  }
}
```

## Notes

- Only the global `fetch` counts, written bare or as `globalThis.fetch` /
  `window.fetch` / `self.fetch`. A method named `fetch` on some other object
  (`this.#api.fetch(...)`) is a different function and is not checked — the
  delegation this rule asks for is not itself a violation.
- Passing a `signal` does not exempt the call. The objection is that the
  component owns the request at all — move it to a controller, where
  `hostDisconnected` can abort it.
- Scope is a class extending a Lit base. A `fetch` at module scope or in a plain
  helper class is not this rule's business.
