# no-dom-query

Rejects `querySelector` and `querySelectorAll` inside a Lit component.

## Why

A selector is a string that duplicates the template. Rename a class, swap a
`<div>` for a `<span>`, or wrap something in a conditional, and the selector
silently returns `null` — no compile error, no lint error, just a crash at
runtime or, worse, a feature that quietly stops working. The `ref` directive
carries the element reference from the template itself, so the link breaks at
the template when you change the template.

## Examples

```ts
// BAD
class El extends LitElement {
  focusInput() {
    this.renderRoot.querySelector("input").focus();
  }
}

// GOOD
class El extends LitElement {
  #input = createRef<HTMLInputElement>();

  focusInput() {
    this.#input.value?.focus();
  }

  render() {
    const inputRef = ref(this.#input);
    return html`<input ${inputRef}>`;
  }
}
```

## Notes

- Only fires inside a Lit component class body — including `ReactiveElement`
  subclasses. Querying from a controller or a plain module is not this rule's
  business.
- Any receiver counts inside a component, not just the render root:
  `document.querySelector(...)` in a component is reported too.
- Pairs with `no-query-decorators`, which bans the decorator form of the same
  idea, and `prefer-create-ref`, which turns a bare stash callback into a
  `createRef`.
