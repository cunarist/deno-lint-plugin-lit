# construction-args

Rejects a host constructing a controller with anything other than exactly
`this`.

## Why

A host hands a controller its host and nothing else. Passing initial state
through the constructor freezes it at construction time, before the host has
rendered or received any properties, so the controller works from a snapshot
that never tracks the host. Constructing one with no host at all leaves it
unregistered and inert. State handed over afterwards, through a `sync*` method
or a setter, stays reactive.

## Examples

```ts
// BAD
class Bar extends LitElement {
  #barController = new BarController(this, this.value);
}

// GOOD
class Bar extends LitElement {
  #barController = new BarController(this);
  willUpdate(): void {
    this.#barController.sync(this.value);
  }
}
```

## Notes

`new BarController()` and `new BarController(window)` are reported too, with a
distinct message for the missing-host case.

The rule fires only inside a class extending a Lit base class, and only on a
`new` whose callee's last name segment ends in `Controller` — so
`new AbortSignal(1, 2)` is untouched. `controller-host-constructor` enforces the
matching constraint on the controller's own side.
