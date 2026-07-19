# static-styles-css-literal

A `static styles` member must be a direct `css` tagged template — not an array,
a reference, a call, or a getter.

## Why

One component, one stylesheet, written where the component is. An array of
shared stylesheets means the rules that apply to an element are spread across
files, and changing a shared entry silently restyles every consumer. A
reference, a factory call, or a getter each hide the actual CSS behind a name,
so you cannot read a component's styles without chasing the definition.

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

// GOOD
class D extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
  `;
}
```

## Notes

- Non-static `styles`, other static members, and a `declare static styles`
  type-only declaration are all ignored.
- An array gets its own message (`static styles is an array.`) since that is the
  common case; everything else reports as not being a `css` literal.
- The tag must literally be `css`. An `html` template assigned to
  `static styles` is also rejected.
- Share rules through custom properties or a plain `css` literal you inline, not
  through a stylesheet array.
