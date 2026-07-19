# require-controller-suffix

Requires a reactive controller class name to end in `Controller`.

## Why

The call site is where the name earns its keep.
`#items = new ItemsController(this)` says which collaborator drives updates;
`new Items(this)` reads like a value.

## Examples

```ts
// BAD
class Items implements ReactiveController {}

// GOOD
class ItemsController implements ReactiveController {}
```

## Notes

- Controllers are identified by `implements ReactiveController`, never by their
  name — that is the point. A class without the clause is not checked.
- This is a naming preference. Nothing else in this package reads the class
  name, so skipping the rule costs no coverage elsewhere.
