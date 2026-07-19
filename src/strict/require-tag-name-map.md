# require-tag-name-map

Rejects a component registered with `@customElement` that has no matching
`HTMLElementTagNameMap` entry in the same file.

## Why

Without the augmentation, `document.querySelector("cl-path-bar")` types as
`Element` and every property access on it is either a cast or an error. The
declaration exists precisely so the tag string maps back to the class, and the
only place it can be kept honest is next to the class it names. Putting it in a
central types file means it drifts the first time someone renames a component.

## Examples

```ts
// BAD
@customElement("cl-path-bar")
export class PathBar extends LitElement {}

// GOOD
declare global {
  interface HTMLElementTagNameMap {
    "cl-path-bar": PathBar;
  }
}

@customElement("cl-path-bar")
export class PathBar extends LitElement {}
```

## Notes

- The entry may come before or after the class; the rule decides on
  `Program:exit`.
- A wrong mapping is reported too, with its own message: if the interface maps
  `"cl-path-bar"` to `SideBar` while the decorator sits on `PathBar`, that
  fires.
- Only `@customElement`-registered Lit components are checked. A component
  registered by a `customElements.define(...)` call is not detected.
- Cross-file resolution does not exist in Deno lint plugins, so the entry must
  be in the same file. That is the rule's intent, not a limitation.
- `tag-matches-class-name` separately checks that the tag string actually names
  the class.
