# no-unused-host

Rejects a controller that stores `host` or `#host` as a field but never reads
it.

## Why

Storing the host means one thing: the controller pushes updates back to it, via
`this.#host.requestUpdate()`. A stored host that is only ever written advertises
a relationship that does not exist, and the next reader has to check every
method to find out the controller is actually one-way. Registration alone does
not require a field — `host.addController(this)` uses the constructor parameter
directly.

## Examples

```ts
// BAD
class BarController implements ReactiveController {
  #host: ReactiveControllerHost;
  constructor(host: ReactiveControllerHost) {
    this.#host = host;
    host.addController(this);
  }
}

// GOOD
class BarController implements ReactiveController {
  constructor(host: ReactiveControllerHost) {
    host.addController(this);
  }
}
```

Storing it is correct as soon as it is read:

```ts
class BarController implements ReactiveController {
  #host: ReactiveControllerHost;
  constructor(host: ReactiveControllerHost) {
    this.#host = host;
    host.addController(this);
  }
  hostConnected(): void {
    this.#host.requestUpdate();
  }
  hostDisconnected(): void {}
}
```

## Notes

`host-constructor` requires the host to be stored as `this.#host`, so that is
the field this rule looks at. Without that rule on, a controller keeping the
host under another name is not checked.

Only `this.#host` and `this.host` count as the stored host, and only a
non-static property definition declares one. A read anywhere in the class body
satisfies the rule, including inside an arrow-function field. Appearing as the
left-hand side of `this.#host = …` is a write, not a read.
