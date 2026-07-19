# require-element-suffix

Requires a registered component class name to end in `Element`.

## Why

A file usually holds a component plus the plain classes it works with. The
suffix says at a glance which one the browser instantiates.

## Examples

```ts
// BAD
@customElement("cl-path-bar")
class PathBar extends LitElement {}

// GOOD
@customElement("cl-path-bar")
class PathBarElement extends LitElement {}
```

## Notes

- Only registered classes are checked. A base class nothing registers is not an
  element yet.
- `tag-matches-class-name` strips a trailing `Element` before comparing, so the
  two rules agree: `cl-path-bar` accepts both `PathBar` and `PathBarElement`.
- This is a naming preference, and the opposite convention is just as common.
