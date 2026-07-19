# event-name-case

Requires the name given to `new CustomEvent(...)` or `new Event(...)` to be all
lowercase.

## Why

Every event name the platform defines is lowercase: `click`, `pointerdown`,
`animationend`. Custom events are matched the same way — as a plain string, by
`addEventListener` and by Lit's `@name=` binding. Nothing checks the spelling. A
component that dispatches `"itemSelected"` and a listener written as
`@itemselected=` simply never talk to each other, with no error anywhere.

Sticking to lowercase, or lowercase with dashes, removes the question of where
the capital letters went.

## Examples

```ts
// BAD
new CustomEvent("itemSelected");
new Event("beforeClose");

// GOOD
new CustomEvent("item-selected");
new Event("before-close");
```

## Notes

- Only string literals are checked. `new CustomEvent(name)` is left alone.
- Dashes, colons, dots, and underscores are all fine — the rule only cares that
  no character is uppercase. A namespaced `"cl:item-selected"` passes.
- `DOMContentLoaded` is allowed, since it is a platform name that really is
  mixed-case.
- The hint suggests a dashed lowercase form derived from the camel humps, so
  `"itemSelected"` suggests `"item-selected"`.
