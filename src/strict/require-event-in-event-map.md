# require-event-in-event-map

Rejects an event constructed inside a Lit component whose name has no matching
`HTMLElementEventMap` entry in the same file.

## Why

An event name is a public API. `HTMLElementEventMap` is the only place that maps
that name back to a type, and without an entry the compiler falls back to the
base `Event`: `addEventListener("cl-picked", (e) => e.detail)` does not compile,
and the cast that unblocks it is unchecked. Once the augmentation exists, both
sides agree — a renamed event breaks the listener at build time instead of
silently never firing.

Keeping the declaration in the file that dispatches the event is what stops it
drifting, the same argument as `require-tag-name-map`.

## Examples

```ts
// BAD
class PathBar extends LitElement {
  fire() {
    this.dispatchEvent(new CustomEvent("cl-picked", { detail: this.path }));
  }
}

// GOOD
declare global {
  interface HTMLElementEventMap {
    "cl-picked": CustomEvent<string>;
  }
}

class PathBar extends LitElement {
  fire() {
    this.dispatchEvent(new CustomEvent("cl-picked", { detail: this.path }));
  }
}
```

## Notes

- **Same file only.** Deno lint plugins have no cross-file resolution, so an
  augmentation in a shared `events.d.ts` cannot be seen and will still be
  reported. That co-location is the rule's intent, but it is a real constraint
  worth knowing before adopting it.
- The entry may be written before or after the class; the decision is made on
  `Program:exit`.
- Triggers on **construction**, not on `dispatchEvent`. `new CustomEvent("x")`
  inside a component body is reported even if it is never dispatched, and an
  event built outside the component and passed in is not reported. Constructing
  an event is a far more reliable marker than tracing it to a dispatch call.
- Only `Event` and `CustomEvent` are recognised, and only when the name is a
  string literal. A subclass (`class PickedEvent extends CustomEvent`) or a
  computed name is not analysable and is skipped.
- Only classes extending a Lit base are checked.
