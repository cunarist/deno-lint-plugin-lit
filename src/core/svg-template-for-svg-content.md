# svg-template-for-svg-content

Rejects SVG-only elements written directly in an `html` template with no
enclosing `<svg>`.

## Why

Lit builds a template's nodes by parsing it in the HTML namespace. A bare
`<path>` there becomes an _HTML_ element named `path`, not an SVG one. It is
created, it is inserted, and it renders absolutely nothing — no error, no
warning, just a blank space where the graphic should be. The `` svg`…` `` tag
parses in the SVG namespace and fixes it.

## Examples

```ts
// BAD
const t = html`<path d=${this.d}></path>`;

// GOOD
const t = svg`<path d=${this.d}></path>`;

// GOOD — a complete svg element switches namespace for its children
const t2 = html`
  <svg>
    <path d=${this.d}></path>
  </svg>
`;
```

## Notes

- A full `<svg>…</svg>` inside an `html` template is fine and is not reported.
  The parser switches namespace at the `<svg>` start tag, so everything below it
  is created correctly.
- Only unwrapped fragments are flagged — an SVG-only element with no `<svg>`
  ancestor in the same template.
- Tag names shared with HTML (`title`, `a`, `style`, `script`, `image`) are
  deliberately not in the list; they are legal in an `html` template on their
  own terms.
- `svg` templates are the fix, so they are skipped entirely.
