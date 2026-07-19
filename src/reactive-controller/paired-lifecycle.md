# paired-lifecycle

Rejects a controller that defines `hostConnected` or `hostDisconnected` but not
both.

## Why

The pair is what makes a controller worth extracting: acquisition and release
sit in one file, next to each other, and cannot drift apart. Whatever
`hostConnected` starts — a `document` listener, a subscription, an observer —
`hostDisconnected` has to stop. A controller with only `hostConnected` leaks
that resource every time its host is detached and re-attached, and the leak
compounds silently.

## Examples

```ts
// BAD
class BarController implements ReactiveController {
  hostConnected(): void {}
}

// GOOD
class BarController implements ReactiveController {
  constructor(host: ReactiveControllerHost) {
    host.addController(this);
  }

  hostConnected(): void {}
  hostDisconnected(): void {}
}
```

## Notes

Defining neither hook is fine — a controller that owns no resource needs no
teardown. Only defining exactly one is an error.

Both method syntax and arrow-function fields count, so
`hostConnected = (): void => {}` satisfies the rule. Static members do not.
