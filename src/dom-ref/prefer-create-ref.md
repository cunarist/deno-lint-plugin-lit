# prefer-create-ref

Rejects a `ref` callback that only stashes the element, in favour of
`createRef`.

## Why

A callback whose whole body is `this.#input = el` is a `createRef` written the
long way. `createRef()` holds the same reference with no method to name, no
`?? null` to normalise, and `.value` reads it back. The callback earns its place
only when it does something on attach or detach — focus the element, add a
listener, start an observer. A bare stash does none of that.

## Examples

```ts
// BAD
import { ref } from "lit/directives/ref.js";

class El extends LitElement {
  #input = null;

  #onInput = (el) => {
    this.#input = el ?? null;
  };

  render() {
    const inputRef = ref(this.#onInput);
    return html`<input ${inputRef}>`;
  }
}

// GOOD
import { createRef, ref } from "lit/directives/ref.js";

class El extends LitElement {
  #input = createRef<HTMLInputElement>();

  render() {
    const inputRef = ref(this.#input);
    return html`<input ${inputRef}>`;
  }
}
```

## Notes

- Only a bare stash fires: the callback's one assignment must store the element
  itself — reached through any cast, `!`, `?? …`, or a `?:` whose branch is the
  element (so `el ?? null` and an `instanceof` type-narrow both count). Storing
  a value _derived_ from it (`el.offsetWidth`) is not a stash: `createRef` holds
  the element, not a projection of it, so those callbacks are left alone.
- The callback is resolved within the same file. An inline arrow is read
  directly; `ref(this.#store)` looks up the class member; a free identifier is
  traced to its declaration. Anything ambiguous — reassigned, a parameter, or
  imported from another module — is passed over rather than guessed.
- Fires wherever the `ref(...)` call sits, inline in the template or hoisted to
  a local.
- The report points at the `ref(...)` usage. If the same method is also called
  imperatively, moving to `createRef` is not a straight deletion — keep the
  method for those callers and fill the ref separately.
