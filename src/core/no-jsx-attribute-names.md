# no-jsx-attribute-names

Rejects the JSX attribute names `className` and `htmlFor` in a template.

## Why

JSX renames `class` and `for` because they are reserved words in JavaScript. A
Lit template is real HTML, so no rename is needed — and the JSX spellings are
set verbatim as attributes named `classname` and `htmlfor`, which no browser
does anything with. The element simply goes unstyled or the label stops
targeting its control.

## Examples

```ts
// BAD
const t = html`<div className=${this.classes}></div>`;

// GOOD
const t = html`<div class=${this.classes}></div>`;
```

```ts
// BAD
const t = html`<label htmlFor=${this.id}></label>`;

// GOOD
const t = html`<label for=${this.id}></label>`;
```

## Notes

- Property bindings are left alone. `.className=` and `.htmlFor=` name real DOM
  properties and work correctly.
- `no-camelcase-attribute` deliberately skips these two names so the two rules
  do not double-report.
- The diagnostic highlights the attribute name.
