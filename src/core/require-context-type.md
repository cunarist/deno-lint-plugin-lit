# require-context-type

Requires `createContext()` from `@lit/context` to be given an explicit type
argument.

## Why

`createContext` is generic in the value the context carries. Called without a
type argument it produces a `Context<unknown, unknown>`, so every field that
consumes it widens to `unknown` and every provider accepts anything. The whole
point of a typed context — that a provider and its consumers agree on a shape —
is lost, and the mismatch surfaces at runtime as a property that is not there.

## Examples

```ts
// BAD
const boardContext = createContext(Symbol("board"));

// GOOD
const boardContext = createContext<BoardContext>(Symbol("board"));
```

## Notes

- Only the presence of a type argument is checked. Whether it matches the
  consumer's declared type needs the type checker, which a lint rule does not
  have.
- Namespaced calls such as `context.createContext(...)` are matched on the last
  segment, so an `import * as context` style import is covered.
- Write the context type out by name. Deriving it (`ContextType<typeof x>`)
  satisfies this rule but reads backwards.
