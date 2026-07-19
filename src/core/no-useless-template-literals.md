# no-useless-template-literals

Rejects an `html` template whose entire content is one binding and no markup.

## Why

A template that is nothing but `${x}` produces no elements, no text, and no
attributes. It wraps the value in a `TemplateResult` for no reason, costing a
template instantiation and a diff on every render. Use the value directly.

## Examples

```ts
// BAD
const t = html`${this.body}`;

// GOOD
const t = this.body;
```

## Notes

- Only the exact shape fires: two empty quasis around a single binding. Anything
  else is fine — a template with surrounding markup, one with surrounding text,
  one with two bindings, and an empty `html` template are all valid.
- Only `html` and `svg` tagged templates are checked.
- An empty `html` template is deliberately allowed — it is a legitimate way to
  render nothing, alongside Lit's `nothing` sentinel.
