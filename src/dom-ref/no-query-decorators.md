# no-query-decorators

Rejects `@query`, `@queryAll`, `@queryAsync`, `@queryAssignedElements`, and
`@queryAssignedNodes`, and their imports from the Lit decorator modules.

## Why

A query decorator is a selector against the render root, evaluated lazily every
time the getter is read. It has no compile-time link to the template: rename a
class in the markup and the field starts returning `null` with no error
anywhere. A `ref` directive carries the element from the template itself, so the
link breaks at the template when you change the template, not silently at
runtime.

## Examples

```ts
// BAD
import { query } from "lit/decorators.js";

class El extends LitElement {
  @query("input")
  input;

  focusInput() {
    this.input.focus();
  }
}

// GOOD
import { createRef, ref } from "lit/directives/ref.js";

class El extends LitElement {
  #input = createRef<HTMLInputElement>();

  focusInput() {
    this.#input.value?.focus();
  }

  render() {
    const inputRef = ref(this.#input);
    return html`<input ${inputRef}>`;
  }
}
```

## Notes

- `@query` is a supported Lit decorator, not a mistake. This ruleset rejects it
  anyway: a query is a selector string resolved at call time, so a renamed id
  fails silently, whereas a `ref` is a reference the compiler checks. Other Lit
  rulesets recommend `@query` over `querySelector` — here both give way to
  `ref`.
- The import and the usage are reported separately, so a file that does both
  produces two diagnostics.
- Decorator usage is only checked inside Lit component classes; the import is
  checked anywhere. A same-named `query` imported from your own module is not
  touched.
- Checked import sources: `lit/decorators.js`, `lit/decorators`, and
  `lit-element/decorators.js`.
- The cost is real for slot-based components: `@queryAssignedElements` has no
  direct `ref` equivalent, and replacing it means a controller that listens for
  `slotchange`.
