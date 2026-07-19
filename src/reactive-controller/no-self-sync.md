# no-self-sync

Rejects a controller calling its own `sync*` method through `this`.

## Why

`sync*` is the host's entry point into a controller: the host calls it when the
host's own state changes. A controller calling its own `sync*` re-enters that
entry point from the inside, so a state change happens that the host never
initiated and cannot see. Update order then depends on the controller's
internals, and a `sync*` that also requests a host update can drive a loop.

## Examples

```ts
// BAD
class BarController implements ReactiveController {
  reload(): void {
    this.syncItems([]);
  }
}

// GOOD
class BarController implements ReactiveController {
  sync(value: string): void {
    this.#syncInternal(value);
  }
  #syncInternal(value: string): void {}
}
```

## Notes

A private `#sync*` helper is the sanctioned escape hatch and is never reported —
only calls on a public, identifier-named `sync*` member are. Shared work belongs
in such a helper, called from both the public `sync*` and wherever else it is
needed.

Any method name starting with `sync` counts, so `this.syncItems()` is reported
alongside `this.sync()`. Hosts are out of scope: a `LitElement` calling
`this.sync()` is not this rule's concern.
