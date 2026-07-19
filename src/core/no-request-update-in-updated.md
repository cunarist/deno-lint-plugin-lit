# no-request-update-in-updated

Rejects calling `this.requestUpdate()` inside `updated()` or `firstUpdated()`.

## Why

`requestUpdate()` unconditionally schedules another update cycle, and
`updated()` runs at the end of every cycle. Calling one from the other is an
infinite loop: the requested update commits, calls `updated()`, and requests
another. Unlike a reactive property write there is no dirty check to stop it, so
nothing converges — the component re-renders on every frame forever. If a second
pass really is needed, work out why before the update and make the first pass
correct.

## Examples

```ts
// BAD
class El extends LitElement {
  updated() {
    this.width = this.offsetWidth;
    this.requestUpdate();
  }
}

// GOOD
class El extends LitElement {
  @state()
  accessor width = 0;

  set measurer(value: Measurer) {
    this.width = value.width;
  }
}
```

## Notes

- Only `this.requestUpdate()` and a bare `requestUpdate()` are flagged. A call
  through another object, such as `this.host.requestUpdate()` from a controller,
  is a different component's cycle and is allowed.
- Nested blocks and callbacks count — a call guarded by an `if` still fires,
  because the rule cannot know the guard ever becomes false.
