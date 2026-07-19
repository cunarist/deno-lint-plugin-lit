# no-classfield-shadowing

Rejects a plain class field whose name matches a reactive property.

## Why

Under `useDefineForClassFields` — the default on modern targets — a class field
compiles to `Object.defineProperty`, not an assignment. That overwrites the
accessor Lit installed for the reactive property. The property keeps its value
but stops reacting: setting it no longer schedules an update, and the component
renders stale.

## Examples

```ts
// BAD
class Base extends LitElement {
  @property()
  name = "";
}
class El extends Base {
  name = "x";
}

// GOOD
class Base extends LitElement {
  @property()
  accessor name = "";
}
class El extends Base {
  declare name: string;
}
```

## Notes

- Two shapes are caught: a field shadowing a reactive property on an ancestor
  class, and a field shadowing an entry of the same class's `static properties`.
- `declare` is type-only and emits nothing, so it is accepted. Setting the value
  in the constructor also works. `accessor` is likewise not flagged.
- There is no cross-file resolution. The superclass chain is only followed
  through classes declared in the same module, up to 16 levels. A base class
  imported from another file is invisible to this rule.
- If the chain never reaches a Lit component, the class is ignored entirely.
