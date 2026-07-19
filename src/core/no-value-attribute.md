# no-value-attribute

Rejects a bound `value=${…}` attribute on a form control; use the property
binding `.value=${…}`.

## Why

`value=` sets the HTML attribute, which browsers treat as the control's
_default_ value only. Once the user has typed into the field, the attribute no
longer drives what is displayed. The binding keeps firing and the DOM keeps
updating, but the visible value stays whatever the user last typed — so
programmatic resets silently do nothing.

## Examples

```ts
// BAD
const t = html`<input value=${this.v}>`;

// GOOD
const t = html`<input .value=${this.v}>`;
```

## Notes

- Only bound values are flagged. A static `value="5"` is a legitimate default
  and passes.
- Checked elements: `button`, `data`, `input`, `li`, `meter`, `option`,
  `output`, `param`, `progress`, `select`, `textarea`. Everything else,
  including custom elements, is ignored — `<x-y value=${this.v}>` is fine.
