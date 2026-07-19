# no-string-context-key

Rejects a string literal as the key passed to `createContext()`.

## Why

Context resolution works by dispatching a `context-request` event that bubbles
up the tree; a provider answers it when its own key matches the requested one.
Strings compare by value, so the key is effectively a global name. Any other
component on the page — including one from a dependency you did not write — that
picks `"theme"` or `"config"` will answer your consumer's request, and it will
look like your provider simply returned the wrong value.

A `Symbol` is unique per call site. Two packages can both create a context named
`"theme"` and they will never collide.

## Examples

```ts
// BAD
const boardContext = createContext<BoardContext>("board");

// GOOD
const boardContext = createContext<BoardContext>(Symbol("board"));
```

## Notes

- The string passed to `Symbol()` is a description only. It shows up in
  debugging output and takes no part in matching, so keeping the old name there
  is free.
- Non-literal keys are left alone: `createContext<T>(BOARD_KEY)` is not flagged,
  because the rule cannot see what `BOARD_KEY` holds.
- Migrating an existing string key is a breaking change for anyone already
  providing or consuming it — every provider and consumer must move together.
