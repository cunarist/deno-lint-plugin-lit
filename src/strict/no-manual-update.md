# no-manual-update

Rejects `this.requestUpdate()`, `this.performUpdate()`, and
`this.scheduleUpdate()` inside a Lit component.

## Why

Reactive properties already schedule renders. A component calling
`this.requestUpdate()` means some state that drives the template is not a
reactive property — it is a plain field, or a mutation inside an array, and the
call is patching over that. Make the state a reactive property and the render
schedules itself.

A `ReactiveController` telling its host to re-render is the one legitimate
caller, and it never trips this rule: the call is on the host, and a controller
is not a component.

## Examples

```ts
// BAD
class El extends LitElement {
  #items = [];
  add(item) {
    this.#items.push(item);
    this.requestUpdate();
  }
}

// GOOD
class El extends LitElement {
  @state()
  accessor items = [];
  add(item) {
    this.items = [...this.items, item];
  }
}
```

A controller nudging its host is fine, under any field name:

```ts
// GOOD
class ClockController implements ReactiveController {
  #host: ReactiveControllerHost;
  constructor(host: ReactiveControllerHost) {
    this.#host = host;
    host.addController(this);
  }
  tick() {
    this.#host.requestUpdate();
  }
}
```

## Notes

- Only `this.<method>()` inside a Lit component is rejected.
  `super.performUpdate()` (delegation), a bare `element.requestUpdate()` outside
  any component, and a controller nudging its host are all left alone. The
  component is detected by `isLitComponent` — extends a Lit base (with same-file
  chain), `@customElement`, `render()` returning `html`, or `static styles` from
  `css` — so a class whose only Lit-ness is an off-file base with none of those
  signals is not seen.
- One legitimate `this.requestUpdate()` remains inside a component: a custom
  reactive-property accessor, where you write the setter yourself and Lit needs
  the call (`this.requestUpdate("foo", old)`). This rule still flags it; exclude
  the rule if you use that pattern.
- `lifecycle-allowlist` separately bans overriding `requestUpdate`,
  `performUpdate`, and `scheduleUpdate`; this rule covers calling them.
