# no-event-target-subclass

Rejects a class that extends `EventTarget`.

## Why

Subclassing `EventTarget` builds a state bus that Lit knows nothing about.
Nothing re-renders when it fires, so every consumer has to add a listener and
call `requestUpdate()` by hand — and remove the listener when it disconnects,
which is the step people forget. The event name is a string and the payload is
untyped, so a typo surfaces at runtime.

A context does the same job with none of that: `@provide` publishes the value,
`@consume` re-renders on change, and Lit handles the teardown.

## Examples

```ts
// BAD
class SettingsStore extends EventTarget {
  #theme = "dark";
  set theme(value: string) {
    this.#theme = value;
    this.dispatchEvent(new Event("change"));
  }
}

// GOOD
class Root extends LitElement {
  @provide({ context: settingsContext })
  accessor settings = initialSettings;
}
```

## Notes

- Only a direct `extends EventTarget` is reported. `LitElement` reaches
  `EventTarget` through `HTMLElement`, and that indirect inheritance is fine.
- Dispatching events from a component is not affected — see
  `require-dispatch-on-this`. This rule is about state buses, not about events.
- A pure utility emitter unrelated to app state is a legitimate use, which is
  why this sits in `strict` rather than `core`.
