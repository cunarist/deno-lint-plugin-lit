# no-self-closing-non-void

Rejects self-closing syntax on a non-void element in a template.

## Why

HTML has no self-closing tags. The parser reads `<div />` as an ordinary start
tag and throws the slash away, so the element stays open and everything after it
becomes a child instead of a sibling. Nothing errors; the layout is just wrong,
often far from the line that caused it.

## Examples

```ts
// BAD
const t = html`<div />`;

// GOOD
const t = html`<div></div>`;
```

```ts
// BAD
const t = html`<my-el .foo=${this.a} />`;

// GOOD
const t = html`<my-el .foo=${this.a}></my-el>`;
```

## Notes

- Void elements are exempt — `<br />`, `<img />`, `<input />` and the rest have
  no end tag anyway, so the slash is decorative.
- SVG and MathML content is exempt: foreign content really does support
  self-closing syntax. An `svg` tagged template is skipped entirely.
- A trailing slash that an unquoted attribute value has swallowed is not
  self-closing and is not reported.
- The diagnostic highlights the whole start tag.
