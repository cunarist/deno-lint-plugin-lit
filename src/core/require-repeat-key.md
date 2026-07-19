# require-repeat-key

Rejects `repeat(items, template)` — the two-argument form, with no key function.

## Why

`repeat` exists to reconcile a list by identity instead of by index, so that
reordering moves DOM rather than re-rendering it. Called without a key function
it falls back to index-based reconciliation, which is exactly what binding the
array directly already does. The call then costs an import and a directive for
no behavioural change: reordering still re-renders every item, and per-item DOM
state — focus, scroll position, an open menu — is still destroyed.

## Examples

```ts
// BAD
const rows = repeat(this.items, this.#renderRow);

// GOOD
const rows = repeat(this.items, (item) => item.id, this.#renderRow);
```

## Notes

- `repeat(...)` is matched wherever it is called, not only inside a template.
  This codebase hoists directive calls into a local before the `return`, so
  requiring it to appear in template position would miss every real use — see
  `simple-template-expressions`.
- Matched by name: a bare `repeat` callee. `this.repeat(a, b)` and
  `str.repeat(2)` are not touched.
- A spread argument could supply the key at runtime, so the arity is unknowable
  and the call is skipped.
