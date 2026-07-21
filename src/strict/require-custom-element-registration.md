# require-custom-element-registration

Requires every `LitElement` subclass in a file to be registered, either with
`@customElement` or with `customElements.define`.

## Why

An unregistered custom element class has no tag name, so it can never appear in
a template. Everything about it still looks correct: the module type-checks, the
import resolves, the class is exported. The only symptom is that the element
never renders — the browser treats the unknown tag as an inert
`HTMLUnknownElement` and puts nothing in the console.

The usual cause is a component that was refactored out of another file and left
its `@customElement` line behind.

## Examples

```ts
// BAD
export class PanelElement extends LitElement {}
```

```ts
// GOOD
@customElement("cl-panel")
export class PanelElement extends LitElement {}
```

```ts
// GOOD
export class PanelElement extends LitElement {}
customElements.define("cl-panel", PanelElement);
```

## Notes

- **No cross-file resolution.** A class registered from a different module — a
  barrel file that imports the class and calls `customElements.define`, for
  instance — is invisible to this rule and will be reported as unregistered.
  Register the class in the file that declares it, or exclude the rule.
- `abstract` classes are skipped.
- A class that is both exported and extended by another class in the same file
  is treated as a base class and skipped. A class extended in the same file but
  _not_ exported is still reported, since a purely local base has no reason to
  be one.
- A class counts as a component when it extends `LitElement`/`ReactiveElement`
  (following the superclass chain within the file), has a `render()` returning
  an `html` template, or declares `static styles` built from `css`. A class
  whose only Lit-ness is a base imported from another module, with none of those
  local signals, is not recognisable and is left alone.
