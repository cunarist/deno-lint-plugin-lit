# no-duplicate-tag-registration

Rejects registering the same custom element tag twice in one file.

## Why

`customElements.define` throws `NotSupportedError` when the tag is already in
the registry, and `@customElement` is a thin wrapper around it. Two
registrations of one tag is a copy-paste slip that takes the entire module down
at import time — before anything has rendered, and usually with a stack trace
pointing at whichever module happened to import it first rather than at the
duplicate.

## Examples

```ts
// BAD
@customElement("cl-panel")
class Panel extends LitElement {}

@customElement("cl-panel")
class OtherPanel extends LitElement {}
```

```ts
// GOOD
@customElement("cl-panel")
class Panel extends LitElement {}

@customElement("cl-side-panel")
class SidePanel extends LitElement {}
```

## Notes

- Decorator registrations and `customElements.define("x-y", ...)` calls are
  collected together, so a decorator plus a matching `define` is flagged too.
- Registrations are ordered by position in the file, so the first one is left
  alone and every later one is reported.
- Only one file is visible. The same tag registered from two different modules
  still throws at runtime and this rule cannot see it — there is no cross-file
  resolution.
- A computed tag, as in `customElements.define(tag, X)`, is skipped.
