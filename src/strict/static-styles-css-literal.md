# static-styles-css-literal

A `static styles` member must be a direct `css` tagged template — not an array,
a reference, a call, or a getter — and must hold no `${…}` interpolation.

## Why

CSS variables are the standard way to build a theme system and to share styling
across components. Set a token once on an ancestor and every descendant sees it;
each component reads it with `var(--app-accent)` and keeps its own rules in one
readable `css` literal.

One component, one stylesheet, written where the component is — coherent and
readable in one place.

## Examples

```ts
// BAD
class A extends LitElement {
  static styles = [base, css`p {}`];
}

class B extends LitElement {
  static styles = sharedStyles;
}

class C extends LitElement {
  static get styles() {
    return css`p {}`;
  }
}

class D extends LitElement {
  static styles = css`
    ${base} p {}
  `;
}

// GOOD
class Z extends LitElement {
  static styles = css`
    :host {
      display: block;
      color: var(--app-accent);
    }
  `;
}
```

## Notes

- Non-static `styles`, other static members, and a `declare static styles`
  type-only declaration are all ignored.
- An array and an interpolating `css` template each get their own message; every
  other shape reports as not being a `css` literal.
- The tag must literally be `css`. An `html` template assigned to
  `static styles` is also rejected.
- Theme and share styles through CSS variables, not a stylesheet array.
- When a whole stylesheet must reach the shadow root — a third-party sheet CSS
  variables cannot express — adopt it in `createRenderRoot`, not through
  `static styles`:

  ```ts
  protected override createRenderRoot() {
    const root = super.createRenderRoot();
    root.adoptedStyleSheets = [newStyleSheet, ...root.adoptedStyleSheets];
    return root;
  }
  ```
