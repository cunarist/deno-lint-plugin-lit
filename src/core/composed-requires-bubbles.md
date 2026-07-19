# composed-requires-bubbles

Requires `bubbles: true` whenever an event is constructed with `composed: true`.

## Why

`composed` does not make an event propagate. It only says "when propagation
reaches a shadow boundary, keep going". Propagation upward is what `bubbles`
turns on. So a composed event that does not bubble is dispatched at its target,
goes nowhere, and never reaches the boundary that `composed` was there to cross.

The failure is quiet in exactly the wrong way: the flag that was added to make
the event escape the component is the one that does nothing, and the listener on
the host element never fires.

## Examples

```ts
// BAD
new CustomEvent("item-selected", { composed: true });
new CustomEvent("item-selected", { composed: true, bubbles: false });

// GOOD
new CustomEvent("item-selected", { bubbles: true, composed: true });
```

## Notes

- Only a definite mistake is reported: `composed: true` with no `bubbles` key,
  or with a literal `bubbles: false`. A computed value such as
  `bubbles: shouldBubble` could be `true` at runtime, so it is left alone.
- An init object containing a spread is skipped entirely — `bubbles` could be
  arriving through it.
- The rule does not require `composed`. Dropping it is the other correct fix if
  the event is meant to stay inside the component.
