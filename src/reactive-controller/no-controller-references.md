# no-controller-references

Rejects a controller that names, constructs, accepts, or forwards another
reactive controller.

## Why

Controllers are siblings, not a graph. Each one talks to its host and to nothing
else, which is what makes it independently testable and reusable across
components. A controller holding another controller creates an ordering
dependency the host cannot see: the host registers both, but now one must be
constructed and synced before the other, and nothing in the host says so.

## Examples

```ts
// BAD
class BarController implements ReactiveController {
  #other: FooController;
}

// GOOD
class BarController implements ReactiveController {
  #host: ReactiveControllerHost;
  constructor(host: ReactiveControllerHost) {
    this.#host = host;
    host.addController(this);
  }
}
```

Constructing one, taking one as a parameter, and passing one along are all
reported too:

```ts
// BAD
class BarController implements ReactiveController {
  #other = new FooController(this);
  attach(other: FooController): void {}
  run(): void {
    register(this.#fooController);
  }
}
```

## Notes

Detection is a name heuristic: an identifier, member path, or type reference
whose last segment ends in `Controller`. For value references the segment is
capitalized first, so `this.#fooController` matches.

Platform and Lit types ending in `Controller` are explicitly excluded:
`ReactiveController`, `ReactiveControllerHost`, `AbortController`,
`ReadableStreamDefaultController`, `ReadableByteStreamController`,
`WritableStreamDefaultController`, and `TransformStreamDefaultController`. A
controller owning an `AbortController` is the encouraged pattern — it is exactly
the matched acquire/release shape these rules exist to support:

```ts
class ItemsController implements ReactiveController {
  #abort: AbortController | undefined;
  hostConnected() {
    this.#abort = new AbortController();
  }
  hostDisconnected() {
    this.#abort?.abort();
  }
}
```

The rule only applies inside a controller class. A host component holding
several controllers is fine.
