# no-index-as-repeat-key

Rejects a `repeat` key function that returns its own index parameter.

## Why

Keying by index makes every key stable against reordering by construction: item
0 is always key 0, whatever item currently sits there. `repeat` therefore sees
no list movement at all, reuses each row's DOM in place, and re-renders its
contents — the index-based reconciliation the directive exists to avoid. Worse
than useless, since it looks like the list is properly keyed. Key by something
that identifies the item.

## Examples

```ts
// BAD
const rows = repeat(this.items, (item, i) => i, this.#renderRow);

// GOOD
const rows = repeat(this.items, (item) => item.id, this.#renderRow);
```

## Notes

- `repeat(...)` is matched wherever it is called, not only inside a template —
  this codebase hoists directive calls into a local. See
  `simple-template-expressions`.
- Matched by name: a bare `repeat` callee. `this.repeat(…)` is not touched.
- Both expression bodies and a block body whose single statement returns the
  index are detected, for arrow functions and function expressions alike.
- Only a direct return of the index parameter is flagged. An index laundered
  through another expression, such as a string conversion, is not detected — the
  rule stays precise rather than guessing.
