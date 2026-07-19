# no-legacy-imports

Rejects imports from the Lit 1 module paths `lit-html` and `lit-element`, and
imports of names that Lit 2 removed.

## Why

Lit 1 shipped as two packages; Lit 2 and later ship as `lit`. In a mixed install
both still resolve, so the old path keeps working and nothing warns you. The
result is two copies of lit-html in the bundle with separate template caches —
templates created by one are not recognized by the other, and elements re-render
from scratch instead of updating.

## Examples

```ts
// BAD
import { html } from "lit-html";
import { repeat } from "lit-html/directives/repeat.js";
import { internalProperty } from "lit";

// GOOD
import { html } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { state } from "lit/decorators.js";
```

## Notes

- Subpaths are matched on the package segment, so
  `lit-html/directives/repeat.js` is flagged too.
- Two renamed exports are checked wherever they are imported from a Lit core
  path: `UpdatingElement` is now `ReactiveElement`, and `internalProperty` is
  now `state`.
- A legacy name imported from a legacy path produces two diagnostics — one for
  the path, one for the name.
- The names are only flagged on Lit imports. `internalProperty` from
  `./local.ts` is left alone.
