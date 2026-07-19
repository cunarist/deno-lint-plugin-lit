# no-property-assignment-in-constructor

Rejects assigning a reactive property inside `constructor()`.

## Why

Writing a reactive property in the constructor happens before the element is
connected, so Lit records it as a change with `undefined` as the old value and
schedules an update that has nothing to react to. It is also the one write SSR
hydration cannot see: the server rendered from the values the markup carried,
and the client constructor then overwrites them before the first `update()`, so
hydration mismatches and the server DOM is thrown away and rebuilt. A field
initialiser runs at the same moment but is treated as the property's default
rather than as a change.

## Examples

```ts
// BAD
class El extends LitElement {
  @property()
  label!: string;

  constructor() {
    super();
    this.label = "";
  }
}

// GOOD
class El extends LitElement {
  @property()
  accessor label = "";
}
```

## Notes

- Only reactive properties of the same class are reported — those declared by
  `@property`/`@state` or listed in `static properties`. Assigning a private
  field or an ordinary instance member in the constructor is fine.
- Assignments nested in an `if` or `try` inside the constructor count. Ones
  inside a callback the constructor merely registers do not: that code runs
  later, not during construction.
- This conflicts with one of the fixes `no-classfield-shadowing` suggests. When
  a field must not be emitted, prefer `declare` over a constructor assignment —
  it satisfies both rules.
- There is no cross-file resolution, so a property inherited from a base class
  in another module is invisible here.
