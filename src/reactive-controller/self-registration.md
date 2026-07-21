# self-registration

Rejects a controller that does not call `host.addController(this)` in its
constructor.

## Why

A controller registers itself; the host constructs it and forgets about it. If
registration is left to the host, every construction site becomes a place to
forget it, and an unregistered controller is inert — `hostConnected` and
`hostDisconnected` never fire, so setup never runs and cleanup never runs
either. Registering anywhere other than the constructor means the window between
construction and registration can miss a connect.

## Examples

```ts
// BAD
class BarController implements ReactiveController {
  constructor(host: ReactiveControllerHost) {}
}

// GOOD
class BarController implements ReactiveController {
  constructor(host: ReactiveControllerHost) {
    host.addController(this);
  }
}
```

## Notes

Accepted receivers are the host parameter itself and the field it is stored in.
Both are found by the `ReactiveControllerHost` type, not by name, so a renamed
parameter (`controllerHost.addController(this)`) or a renamed field
(`this._host.addController(this)`) still counts. `host`, `this.host`, and
`this.#host` are always accepted as the conventional spellings. Registering
through a stored host works:

```ts
class BarController implements ReactiveController {
  #host: ReactiveControllerHost;
  constructor(host: ReactiveControllerHost) {
    this.#host = host;
    this.#host.addController(this);
  }
}
```

The argument must be exactly `this`. `host.addController(other)` does not count,
and neither does a registration made from `hostConnected` or any other method.
