# no-this-in-static-styles

Rejects `this` inside a `static styles` initialiser.

## Why

`static styles` is evaluated once, on the class, when the module loads. There is
no instance in that scope, so `this` is the constructor rather than a component
— every instance field read through it is `undefined`. Lit also adopts the
resulting stylesheet once per class and shares it across every instance, so even
if a value were readable there it could not vary per component. Use a CSS custom
property set from the template for anything instance-specific.

## Examples

```ts
// BAD
class El extends LitElement {
  static styles = css`
    :host {
      color: ${this.color};
    }
  `;
}

// GOOD
class El extends LitElement {
  static styles = css`
    :host {
      color: var(--el-color);
    }
  `;
}
```

## Notes

- Arrow functions inside the initialiser inherit the static `this`, so they are
  flagged too. A non-arrow `function` rebinds `this` and is not.
- Only a member literally named `styles` and declared `static` is checked. A
  `this` reference in an instance field initialiser is legitimate.
