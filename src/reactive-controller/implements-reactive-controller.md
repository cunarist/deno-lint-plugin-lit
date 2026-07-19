# implements-reactive-controller

Rejects a class that behaves like a reactive controller but does not declare
`implements ReactiveController`.

## Why

A `ReactiveController` is a unit of behaviour with no UI, and the whole point is
that its contract — the two host hooks plus host registration — is visible where
the class is declared. Without the `implements` clause, nothing tells a reader
or the type checker that `hostConnected` and `hostDisconnected` are hooks rather
than ordinary methods. Renaming or dropping a hook then compiles cleanly and
silently stops running.

## Examples

```ts
// BAD
class BarController {
  hostConnected(): void {}
  hostDisconnected(): void {}
}

// GOOD
class BarController implements ReactiveController {
  hostConnected(): void {}
  hostDisconnected(): void {}
}
```

## Notes

A class is treated as a controller if it has a `ReactiveController` implements
clause, or its name ends in `Controller`, or it defines `hostConnected` or
`hostDisconnected`. Lit components — classes extending `LitElement`,
`ReactiveElement`, or `UpdatingElement` — are always excluded, as are unrelated
classes like `class Store`.

The same detection is shared by every rule in the `controllers` config.
