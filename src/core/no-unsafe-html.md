# no-unsafe-html

Bans the `unsafeHTML` and `unsafeSVG` directives — both the import specifier and
every call site.

## Why

Every ordinary Lit binding is inserted as text or as an attribute value, so a
string can never become markup. `unsafeHTML` and `unsafeSVG` exist to break that
guarantee: they hand the string to the HTML parser and splice the result into
the DOM. Whatever produced the string — a CMS field, a Markdown renderer, a
server response, a URL parameter — becomes an injection point, and an
`onerror`/`<script>` payload from any of them executes with the page's origin.

The value being "trusted today" is not a property the code can keep. Build the
markup as a nested `html` template instead, so structure comes from the source
file and only the data is interpolated.

## Examples

```ts
// BAD
import { unsafeHTML } from "lit/directives/unsafe-html.js";
const view = html`<div>${unsafeHTML(this.description)}</div>`;

// GOOD
const view = html`<div>${this.description}</div>`;
```

## Notes

- Reports twice for a used import: once on the specifier, once on each call.
- Follows renamed imports — `import { unsafeHTML as raw }` flags `raw` at its
  call sites too.
- Only the Lit directive modules count as the source: `lit/directives/…` and
  `lit-html/directives/…`, with or without the `.js` extension. An `unsafeHTML`
  imported from your own module is a different function and is left alone.
- Detection is import-based, so `await import(...)` of the directive at runtime
  is not seen.
