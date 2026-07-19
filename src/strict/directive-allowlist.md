# directive-allowlist

Rejects every import from a Lit `directives/` module except
`lit/directives/ref.js` and `lit/directives/repeat.js`.

## Why

Directives put control flow and state inside the template. `when` and `choose`
are conditionals written in a place where you cannot read them as code;
`classMap` and `styleMap` are object construction hidden in an attribute;
`unsafeHTML` is an injection hole; `live`, `guard`, and `until` each add a
caching or scheduling rule that only shows up as a bug. Computing the value
before the `return` makes all of it ordinary TypeScript that the type checker
and the debugger can see. `ref` and `repeat` survive because neither has a
plain-code equivalent: `ref` is how you get an element, `repeat` is how you get
keyed reconciliation.

## Examples

```ts
// BAD
import { classMap } from "lit/directives/class-map.js";
import { when } from "lit/directives/when.js";

// GOOD
import { ref } from "lit/directives/ref.js";
import { repeat } from "lit/directives/repeat.js";
```

## Notes

- The check is on the module specifier, so anything under `lit/directives/`,
  `lit-html/directives/`, or `lit-element/directives/` is matched. Only the two
  exact `lit/…` paths above pass — the legacy spelling
  `lit-html/directives/ref.js` is rejected, use the `lit` path.
- A directive of your own from a local path is not touched.
- Importing `repeat` does not grant it a place inside a template.
  `simple-template-expressions` in the `strict` config still requires the
  `repeat(...)` call to be hoisted above the `return` and interpolated by name.
- The name is a leftover: the allowlist is fixed, not configurable, because Deno
  lint rules take no options. If you need a different set, exclude this rule and
  write your own.
- Replacing `classMap` and `styleMap` is the cost most people feel. Build the
  string or use `static styles` with reactive-property-driven attribute
  selectors.
- `ifDefined` is the other one worth naming. It exists to drop an attribute when
  the value is `undefined`, and it is implemented as `value ?? nothing`. Write
  that yourself and hoist it:

  ```ts
  const src = this.src ?? nothing;
  return html`<img src=${src}>`;
  ```

  This ruleset does not ban `nothing`, precisely so that this replacement
  exists.
