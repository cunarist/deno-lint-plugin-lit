# no-manual-update

Rejects `requestUpdate`, `performUpdate`, and `scheduleUpdate` unless called on
`this.host` or `this.#host`.

## Why

Reactive properties already schedule renders. A hand-written `requestUpdate()`
means some state that drives the template is not a reactive property — it is a
private field, or a mutation inside an array, and the call is patching over
that. The fix is almost always to make the state reactive, not to nudge the
scheduler. The one legitimate caller is a `ReactiveController` telling its host
that controller-owned state changed, because that state genuinely lives outside
the host's property table.

## Examples

```ts
// BAD
class El extends LitElement {
  go() {
    this.#items.push(item);
    this.requestUpdate();
  }
}

// GOOD
class SizeController {
  #host;
  #width = 0;

  measure(width) {
    this.#width = width;
    this.#host.requestUpdate();
  }
}
```

## Notes

- Deliberately **not** gated to Lit components. The permitted form lives in a
  controller, which is not a component, so gating on the component class would
  make the escape hatch unreachable. The consequence is that this fires on any
  file in the project, including non-Lit code that happens to call a method with
  one of these names.
- Only the exact receivers `this.host` and `this.#host` are accepted.
  `this.owner.requestUpdate()` is rejected even if `owner` really is the host —
  the rule matches on spelling, not on resolution.
- `lifecycle-allowlist` separately bans overriding `requestUpdate`,
  `performUpdate`, and `scheduleUpdate`; this rule covers calling them.
