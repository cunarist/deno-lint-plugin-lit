# binding-positions

Rejects a `${…}` binding used as a tag name, in a closing tag, or as an
attribute name.

## Why

Lit compiles a template once and can only bind attribute values, properties,
events, and child content. A binding in any other position is not a binding at
all — the expression is never evaluated, and the markup around it is parsed as
literal text. The element you meant to create simply does not appear.

## Examples

```ts
// BAD
const t = html`<${this.tag}>`;
const t2 = html`</${this.tag}>`;
const t3 = html`<div ${this.attr}="x"></div>`;

// GOOD
const t = html`<div class=${this.cls}></div>`;
const t2 = html`<div @click=${this.onClick}></div>`;
const t3 = html`<x-y .prop=${this.value}></x-y>`;
```

## Notes

- At most one diagnostic is reported per template — the rule stops at the first
  bad position it finds.
- Dynamic tag names have no supported form in Lit. Branch on the tag with
  separate templates instead.
