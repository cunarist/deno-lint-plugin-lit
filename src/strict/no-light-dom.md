# no-light-dom

Rejects `createRenderRoot()` returning `this`, which renders the component into
the light DOM.

## Why

Returning `this` turns off the shadow root for the whole component.
`static
styles` stops being scoped, so the component's CSS leaks out and the
page's CSS leaks in. Internals become reachable by outside selectors, so a
refactor of your own markup can break someone else's stylesheet.

Light DOM is a real Lit feature with real uses — form participation, inheriting
a design system's global styles — which is why this is opt-in rather than a
correctness rule.

## Examples

```ts
// BAD
class El extends LitElement {
  createRenderRoot() {
    return this;
  }
}

// GOOD
class El extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
  `;
}
```

## Notes

- Only a `this` return is reported. Overriding `createRenderRoot` for other
  reasons — adjusting `shadowRootOptions`, adding an adopted stylesheet — keeps
  the shadow root and is left alone.
- `lifecycle-allowlist` deliberately does **not** cover `createRenderRoot`, so
  the two rules never both fire on the same line.
