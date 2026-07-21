# no-unused-host

Rejects a controller that stores its host in a field but never reads it.

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

The stored field is found by following the constructor's
`ReactiveControllerHost` parameter to its `this.<field> = host` assignment — so
`#host`, `_host`, or any other name is tracked, and the rule does not depend on
`host-constructor`. Only a non-static property definition of that name is
watched; a host stored via an alias, destructuring, or a nested target is
unanalyzable and left alone.

A read anywhere in the class body satisfies the rule, including inside an
arrow-function field. Appearing as the left-hand side of `this.<field> = …` is a
write, not a read.
