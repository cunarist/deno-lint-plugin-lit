# no-unsafe-css

Bans `unsafeCSS` imported from Lit — both the import specifier and every call
site.

## Why

`css` refuses to interpolate anything that is not already a sanitised
`CSSResult`, which is what stops a value from a template, a config file, or user
input from becoming stylesheet text. `unsafeCSS` exists purely to defeat that
check. Once a string can reach the stylesheet, it can close the current rule and
open its own, which is enough to restyle the page or leak data through attribute
selectors and background URLs.

## Examples

```ts
// BAD
import { css, unsafeCSS } from "lit";
const styles = css`
  p {
    color: ${unsafeCSS(theme.accent)};
  }
`;

// GOOD
import { css } from "lit";
const styles = css`
  p {
    color: var(--accent);
  }
`;
```

## Notes

- Reports twice for a used import: once on the specifier, once on each call.
- Follows renamed imports — `import { unsafeCSS as raw } from "lit"` flags `raw`
  at its call sites too.
- Only `lit`, `lit-html`, and `lit-element` count as the source. An `unsafeCSS`
  imported from your own module is a different function and is left alone.
