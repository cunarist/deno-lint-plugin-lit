# no-invalid-html

Rejects markup inside an `html` template that does not parse as valid HTML.

## Why

Lit parses templates as HTML and builds the DOM from the parse result, not from
what you wrote. A stray `<` becomes text, a truncated tag swallows everything
after it, and an unclosed element absorbs its following siblings as children.
None of this raises an error at runtime — the component renders, just with the
wrong tree, and CSS and event listeners then miss their targets.

## Examples

```ts
// BAD
const t = html`<div><span></div>`;
const t2 = html`<div>a < b</div>`;

// GOOD
const t = html`<div><span></span></div>`;
const t2 = html`<div>a &lt; b</div>`;
```

## Notes

- Unclosed elements are detected structurally, not as a parse error: an element
  with a start tag, no end tag, that is neither void nor self-closing.
- Void elements (`br`, `hr`, `img`, `input`, …) need no end tag.
- Elements whose end tag HTML makes optional (`li`, `td`, `tr`, `option`, `p`,
  …) are not flagged, so `<ul><li>a<li>b</ul>` passes.
- Duplicate attributes are a parse error too, but they are delegated to
  `no-duplicate-template-bindings` and not reported here.
- Diagnostic offsets are clamped so end-of-input errors still land on visible
  text.
