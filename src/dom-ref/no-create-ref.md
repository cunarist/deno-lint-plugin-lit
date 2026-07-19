# no-create-ref

Rejects `createRef`, both the import and any call to it.

## Why

`createRef()` produces an anonymous box. The element is put into `.value` by
Lit, somewhere, and read back somewhere else, and nothing in between names the
moment it arrived or the moment it left. A named ref callback is a method that
runs with the element on attach and with `undefined` on detach — so the code
that cares about the element's lifetime is a function you can read, set a
breakpoint in, and clean up from.

## Examples

```ts
// BAD
import { createRef, ref } from "lit/directives/ref.js";

class El extends LitElement {
  #input = createRef();

  focusInput() {
    this.#input.value?.focus();
  }
}

// GOOD
import { ref } from "lit/directives/ref.js";

class El extends LitElement {
  #input = null;

  #onInput = (el) => {
    this.#input = el ?? null;
  };

  focusInput() {
    this.#input?.focus();
  }
}
```

## Notes

- `ref` itself is fine and is one of the two directives `directive-allowlist`
  permits — it is only `createRef` that is banned.
- Not gated to components: any `createRef` call is reported, including a
  namespaced one like `refs.createRef()`.
- The import and the call are reported separately.
