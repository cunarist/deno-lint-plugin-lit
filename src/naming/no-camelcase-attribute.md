# no-camelcase-attribute

Rejects an attribute name containing uppercase letters.

## Why

The HTML parser lowercases every attribute name before Lit ever sees it, so
`myProp=${v}` sets an attribute called `myprop`. A component declaring `myProp`
never observes it, and the binding does nothing at all — no error, no warning.

Either use the kebab-case attribute the component actually exposes, or bind the
property directly, which is case-sensitive.

## Examples

```ts
// BAD
const t = html`<x-y myProp=${this.v}></x-y>`;

// GOOD
const t = html`<x-y .myProp=${this.v}></x-y>`;
```

```ts
// BAD
const t = html`<x-y itemCount="3"></x-y>`;

// GOOD
const t = html`<x-y item-count="3"></x-y>`;
```

## Notes

- The three sigils are exempt. `.myProp=`, `@myEvent=` and `?myFlag=` are
  resolved by Lit rather than by the HTML parser and keep their case.
- Foreign content is exempt: SVG genuinely has `viewBox`, `gradientUnits` and
  friends. An `svg` tagged template is skipped entirely.
- `className` and `htmlFor` belong to `no-jsx-attribute-names`, which gives a
  more specific message; they are skipped here.
- The diagnostic highlights the attribute name.
