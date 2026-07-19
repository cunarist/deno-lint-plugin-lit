# no-inline-event-attribute

Rejects HTML inline event handler attributes such as `onclick` inside an `html`
template.

## Why

An `onclick="doThing()"` attribute is compiled by the browser into a function
evaluated in global scope. It cannot see the component instance, so the handler
people expect to reach `this.doThing()` reaches a global `doThing` that does not
exist. Every strict Content-Security-Policy also blocks the attribute outright,
so the same markup that works in development silently does nothing in
production.

Written as a binding it is worse. `onclick=${this.go}` is an _attribute_
binding, so Lit stringifies the function and assigns the source text of it as
the attribute value.

Lit's `@click=${…}` binding attaches a real listener, with the component as
`this`, and is removed when the element is torn down.

## Examples

```ts
// BAD
html`<button onclick="doThing()">Go</button>`;
```

```ts
// GOOD
html`<button @click=${this.#onClick}>Go</button>`;
```

## Notes

- Attribute names are matched against an explicit list of HTML event handler
  attributes rather than an `on` prefix, so ordinary attributes that begin with
  those letters — `once`, `only` — are not flagged.
- Both a string value and a bound value are reported; both are broken, for the
  reasons above.
- Attribute names are case-insensitive in HTML, so `onMouseOver` is caught as
  `onmouseover`.
- The diagnostic highlights the whole attribute, name and value together.
