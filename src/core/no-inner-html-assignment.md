# no-inner-html-assignment

Rejects assignment to `innerHTML` or `outerHTML` on any receiver.

## Why

Assigning to `innerHTML` parses whatever string it is given as markup. It is the
canonical XSS sink: any interpolated value that was not escaped becomes live
HTML, and an `onerror` attribute on an injected `<img>` is enough to run script.

Inside a Lit component it is also a correctness bug independent of security. Lit
tracks the DOM it created through marker comment nodes. Replacing a subtree out
from under it means the next render either erases the injected markup or fails
looking for a marker that is no longer in the tree. Lit renders from templates;
reaching around it with `innerHTML` fights the part of the library doing the
work.

## Examples

```ts
// BAD
this.innerHTML = markup;
this.renderRoot.innerHTML = "";
el.outerHTML = markup;

// GOOD
this.textContent = text;
```

The general fix is to render the content from a template instead, so Lit still
owns the DOM.

## Notes

- Reading `innerHTML` is fine. Only assignment is reported, including compound
  assignment such as `+=`.
- The receiver does not matter — `this`, `this.renderRoot`, and a plain `el` are
  all reported. There is no way to tell a Lit-managed node from an unmanaged one
  statically, and the XSS half of the argument applies either way.
- A computed access with a string key, `el["innerHTML"] = …`, is caught too.
- `insertAdjacentHTML` and `document.write` are the same class of sink but are
  not covered by this rule.
