# event-name-case

Requires the name given to `new CustomEvent(...)` or `new Event(...)` to be
kebab-case — lowercase words joined by dashes, no underscores.

## Why

Every event name the platform defines is lowercase: `click`, `pointerdown`,
`animationend`. Custom events are matched the same way — as a plain string, by
`addEventListener` and by Lit's `@name=` binding. Nothing checks the spelling. A
component that dispatches `"itemSelected"` and a listener written as
`@itemselected=` simply never talk to each other, with no error anywhere.

Kebab-case removes the question of where the capital letters went, and picks one
spelling so `"item_selected"` and `"item-selected"` cannot both float around.

## Examples

```ts
// BAD
new CustomEvent("itemSelected");
new Event("before_close");

// GOOD
new CustomEvent("item-selected");
new Event("before-close");
```

## Notes

- Only string literals are checked. `new CustomEvent(name)` is left alone.
- Dashes, colons, and dots are fine; uppercase and underscores are not. A
  namespaced `"cl:item-selected"` passes, `"item_selected"` does not.
- `DOMContentLoaded` is allowed, since it is a platform name that really is
  mixed-case.
- The hint suggests a kebab-case form, turning camel humps and underscores into
  dashes, so `"itemSelected"` and `"item_selected"` both suggest
  `"item-selected"`.
