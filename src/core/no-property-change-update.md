# no-property-change-update

Rejects assigning to a reactive property inside `update()`.

## Why

Assigning a reactive property schedules an update. Doing it from inside
`update()` schedules another one, which assigns again — the component loops
forever and the page hangs. `willUpdate()` runs before the update is committed
and does not re-trigger the cycle, so the same work belongs there.

## Examples

```ts
// BAD
class El extends LitElement {
  @property()
  name = "";
  update(changed) {
    this.name = "x";
    super.update(changed);
  }
}

// GOOD
class El extends LitElement {
  @property()
  accessor name = "";
  willUpdate() {
    this.name = "x";
  }
}
```

## Notes

- Only reactive properties are flagged. Assigning a plain field such as
  `this.#cache` inside `update()` is fine.
- Both assignments and increments (`this.count++`) are caught.
- Nested callbacks count. An assignment inside a `forEach` callback declared in
  `update()` still fires.
- Properties from `static properties` are recognized alongside decorated ones.
- `updated()` is not checked by this rule — an assignment there is legal, though
  it does trigger a second render pass.
