# prefer-static-styles

Rejects a `<style>` element inside an `html` template.

## Why

Styles written in the template are part of the rendered markup, so they are
re-parsed by the browser for every instance of the component instead of once for
the class. A `static styles` member compiles to a single constructable
stylesheet that every instance adopts, which is both faster and the only form
Lit can share across shadow roots.

## Examples

```ts
// BAD
class Card extends LitElement {
  render() {
    return html`
      <div>
        <style>p { color: red; }</style>
        <p>hi</p>
      </div>
    `;
  }
}

// GOOD
class Card extends LitElement {
  static styles = css`
    p {
      color: red;
    }
  `;

  render() {
    return html`
      <div>
        <p>hi</p>
      </div>
    `;
  }
}
```

## Notes

- The template is parsed as HTML, so the word "style" in text content or a
  `style=` attribute binding does not trigger the rule. Only a real `<style>`
  element does.
- The diagnostic highlights the opening `<style>` tag, not the whole element.
- Only `html` and `svg` tagged templates are checked.
- The replacement must itself be a direct `css` literal — see
  `lit-strict/static-styles-css-literal`.
