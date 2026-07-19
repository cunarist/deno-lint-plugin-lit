# value-after-constraints

Rejects a `value` binding that appears before a validity constraint attribute on
the same form control.

## Why

Lit applies bindings in source order. If the value is set before `min`, `max`,
`pattern` or the rest, the browser validates it against the constraints in force
at that moment — which is to say, none. The control can end up reporting itself
valid when it is not, and the stale validity persists until something else
re-triggers a check.

## Examples

```ts
// BAD
const t = html`<input .value=${this.v} min="1">`;

// GOOD
const t = html`<input min="1" .value=${this.v}>`;
```

## Notes

- Constraint attributes checked: `min`, `max`, `step`, `pattern`, `maxlength`,
  `minlength`, `required`. A constraint written with a `?` or `.` sigil is
  recognized too.
- Both spellings of the value binding are checked, `value` and `.value`.
- Only `input`, `select` and `textarea` are checked — these are the elements
  with constraint validation.
- At most one diagnostic per element, even when the value precedes several
  constraints.
- A control with no constraints, or with the value last, passes.
