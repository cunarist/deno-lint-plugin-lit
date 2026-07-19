# simple-template-expressions

Every `${…}` binding in an `html` template must be an identifier, `this`, or a
non-computed member chain — nothing else.

## Why

A template that only interpolates names reads as markup, so you can see the
shape of the DOM without evaluating anything. Inline arrows and `.bind(this)`
allocate a new function on every render, which forces Lit to tear down and
re-attach the listener each time. Calls, ternaries, and `.map(…)` chains hide
real logic inside a string literal where it cannot be named, typed at a glance,
or tested. Moving all of it above the `return` costs one local and makes both
halves legible.

## Examples

```ts
// BAD
html`<div>${repeat(this.items, k, v)}</div>`; // directive call
html`<div @click=${() => this.go()}></div>`; // arrow
html`<div @click=${this.go.bind(this)}></div>`; // .bind
html`<ul>${this.items.map((i) => i.name)}</ul>`; // .map
html`<div>${cond ? a : b}</div>`; // conditional
html`<div>${a && b}</div>`; // logical
html`<div>${this.items[0]}</div>`; // computed member access
html`<div>${this.label()}</div>`; // call
html`<div .x=${{ a: 1 }}></div>`; // object literal
html`<div>${await this.load()}</div>`; // await

// GOOD
const renderedItems = repeat(
  this.items,
  (i) => this.itemId(i),
  this.#renderNode,
);
html`<div>${renderedItems}</div>`;

html`<div>${name}</div>`;
html`<div>${this.a.b.c.d}</div>`;
html`<div @click=${this.#onClick}></div>`;
```

Directives get no exemption. `repeat(…)` is a call like any other and is hoisted
into a local before the `return`, exactly like `this.label()` would be. The
diagnostic names the directive so the message is clear, but the fix is the same
hoist.

The rule also checks the returned expression of `render()`:

```ts
class Bad extends LitElement {
  render() {
    return this.open ? html`<a></a>` : html`<b></b>`;
  }
}

class Good extends LitElement {
  render() {
    if (this.open) {
      return html`<a></a>`;
    }
    return html`<b></b>`;
  }
}
```

## Notes

- Each offending binding is reported separately, with a message naming its shape
  — call, directive call, arrow, function expression, `.bind`, `.map`, nested
  tagged template, conditional, logical, template literal, object literal, array
  literal, `await`, computed member access, binary, or `new`.
- Member chains of any depth are fine (`this.a.b.c.d`). Only _computed_ access
  (`this.items[0]`) is rejected — hoist the indexed value.
- Only `html` and `svg` tagged templates are checked. Other tags are ignored.
- The `render()` check applies to a conditional returned directly. An early
  `return` inside an `if` is the intended alternative and is always allowed. A
  conditional returned from any other method is not this rule's business.
- This rule subsumes upstream `no-template-arrow`, `no-template-bind`, and
  `no-template-map`; those are not separate rules here.
- Which directives may be imported at all is governed by
  `lit-disciplined/directive-allowlist`. Being on that allowlist does not buy a
  directive a place inside a template.
