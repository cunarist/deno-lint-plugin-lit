# require-accessor-with-decorators

Reports a `@property` or `@state` decorator on a plain class field instead of an
`accessor` field.

## Why

Under standard (TC39) decorators, a field decorator can replace the field's
initialiser but cannot turn the field into a getter/setter pair. `@property`
therefore has nothing to hook: the field stays a plain data property, writes to
it never call `requestUpdate`, and the component simply stops re-rendering when
the value changes. Nothing errors — the property still holds the right value, so
the bug looks like a rendering problem rather than a declaration problem.

`accessor` gives the decorator the getter and setter it needs. With it, the
declaration works identically under both decorator modes, which is the reason to
prefer it even before the project has to choose.

## Examples

```ts
// BAD
class PathBar extends LitElement {
  @property({ type: String })
  name = "";
}

// GOOD
class PathBar extends LitElement {
  @property({ type: String })
  accessor name = "";
}
```

## Notes

- **The right answer depends on the project's decorator mode, and a lint rule
  cannot see it.** Under TypeScript's legacy `experimentalDecorators`, a plain
  field is the correct and idiomatic form — `@property() name = ""` works, and
  `accessor` is what breaks. Under standard decorators (TypeScript 5's default
  when `experimentalDecorators` is off, which is the mode Lit 3 targets),
  `accessor` is required. A lint plugin has no access to `tsconfig` or
  `deno.json` compiler options, so it cannot distinguish the two.
- Consequently this rule is **opt-in**, correct only for a project that has
  committed to standard decorators. On an `experimentalDecorators` codebase it
  is wrong on every reactive property and should be excluded.
- Scope is instance fields on a class extending a Lit base, decorated with
  `@property` or `@state`. `static properties` is a different declaration style
  and is not this rule's business — see `prefer-decorators`.
- Fields already declared `accessor` arrive as a different node type and are
  never reported.
