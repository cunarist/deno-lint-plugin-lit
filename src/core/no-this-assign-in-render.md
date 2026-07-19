# no-this-assign-in-render

Rejects assigning to anything reached through `this` inside `render()`.

## Why

`render()` must be a pure function of the component's state. Lit may call it
more than once per update and does not guarantee when, so a mutation there makes
the output depend on how many times it ran. If the mutated field is reactive,
the assignment schedules another render and the update cycle loops.

## Examples

```ts
// BAD
class El extends LitElement {
  render() {
    this.count = 1;
    return html``;
  }
}

// GOOD
class El extends LitElement {
  @state()
  accessor count = 0;

  #onClick = () => {
    this.count += 1;
  };

  render() {
    return html``;
  }
}
```

## Notes

- Any assignment target that bottoms out at `this` is flagged, at any depth:
  `this.count`, `this.state.count`, and `this.items[0]` all fire. This is
  broader than the name suggests — it is not limited to reactive properties.
- Increments (`this.count++`) count as assignments.
- The check is lexical: anything inside `render()`, at any nesting depth, is
  reported. A callback declared there counts, including
  `[1].forEach(() => { this.count = 1; })`.
- That is exact rather than approximate because `simple-template-expressions`
  requires a bare name in every binding, so an inline handler
  (`@click=${() => this.count++}`) cannot be written inside `render()` to begin
  with. Move the handler to a class field and both rules are satisfied:

  ```ts
  class El extends LitElement {
    #onClick = () => {
      this.count++;
    };
  }
  ```

- Reading from `this` is fine, as is assigning to a local variable.
