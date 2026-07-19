# no-property-change-in-updated

Rejects assigning to a reactive property inside `updated()` or `firstUpdated()`.

## Why

`updated()` and `firstUpdated()` run at the end of an update, after the DOM has
been committed. Writing a reactive property there marks the component dirty
again, so Lit schedules a second update — which calls `updated()` again, which
writes again. Even when a guard breaks the loop, the component renders twice for
every change, and the intermediate frame is visible. Compute the value in
`willUpdate()`, before the update is committed, so one pass is enough.

## Examples

```ts
// BAD
class El extends LitElement {
  @state()
  label = "";

  updated() {
    this.label = this.name.toUpperCase();
  }
}

// GOOD
class El extends LitElement {
  @state()
  accessor label = "";

  willUpdate() {
    this.label = this.name.toUpperCase();
  }
}
```

## Notes

- Only reactive properties are flagged: those declared with `@property` or
  `@state`, or listed in `static properties`. Writing a plain field is fine.
- Increments (`this.count++`) count as assignments.
- `no-property-change-update` is the same check for `update()`.
- Reading DOM measurements in `updated()` is the hook's purpose; it is only the
  write-back to a reactive property that loops.
