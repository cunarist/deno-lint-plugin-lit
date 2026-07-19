# host-constructor

Rejects a controller constructor that is not exactly
`constructor(host: ReactiveControllerHost)`.

## Why

A controller receives its host and nothing else. Extra constructor parameters
capture state at construction time, before the host has ever rendered, so the
controller works from a snapshot that never updates. An optional or untyped
`host` means the controller may be built with no host at all, in which case
registration never happens and the lifecycle hooks never fire.

## Examples

```ts
// BAD
class BarController implements ReactiveController {
  constructor(host: ReactiveControllerHost, count: number) {}
}

// GOOD
class BarController implements ReactiveController {
  constructor(host: ReactiveControllerHost) {
    host.addController(this);
  }
}
```

## Notes

- The host must also be stored as `this.#host` if it is stored at all. Sibling
  rules read the host through that field; under any other name they cannot find
  it and silently stop checking the controller. Storing nothing is fine — a
  controller that only calls `host.addController(this)` needs no field. Each of
  these is reported separately: no constructor at all, a parameter count other
  than one, a parameter not named `host`, an optional `host?`, and a `host`
  whose type annotation is missing or is not `ReactiveControllerHost`.

Everything else the controller needs is handed over afterwards by the host — see
`controller-construction-args`, which enforces the other side of the same rule.
