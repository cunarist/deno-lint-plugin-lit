# no-array-mutation-without-reassign

Rejects calling a mutating array method on a reactive property.

## Why

Lit decides whether a property changed with `!==` by default. A mutating method
such as `push` alters the array in place and leaves its identity untouched, so
the comparison says nothing changed and no update is scheduled. The data really
did change, so the component's state and its DOM silently disagree until some
unrelated property forces a render. Assign a new array instead — that is what
Lit's change detection is designed to see.

## Examples

```ts
// BAD
class El extends LitElement {
  @property({ type: Array })
  items = [];

  add(item) {
    this.items.push(item);
  }
}

// GOOD
class El extends LitElement {
  @property({ type: Array })
  accessor items = [];

  add(item) {
    this.items = [...this.items, item];
  }
}
```

## Notes

- Mutating methods checked: `push`, `pop`, `shift`, `unshift`, `splice`, `sort`,
  `reverse`, `fill`, `copyWithin`.
- Only a direct `this.<prop>` receiver whose property is reactive is flagged —
  declared with `@property` or `@state`, or listed in `static properties`.
  Mutating a local array or a plain field is fine, so building the next array
  locally and assigning it once is the recommended fix for a large batch.
- `this.items = this.items.sort()` is still flagged, and correctly so: `sort`
  returns the same array, so the assignment does not change identity either. Use
  `[...this.items].sort()`.
- A property with a custom `hasChanged` could legitimately mutate in place. The
  rule cannot see that and will report a false positive there.
