# no-duplicate-slot-names

Rejects two `<slot>` elements with the same `name` in one template.

## Why

Slot assignment matches each light-DOM child against the **first** slot whose
name it requests. A second slot with that name is valid markup, renders its
fallback content, and stays permanently empty — so the duplicate reads as a
second insertion point that silently never fills. Nothing warns at runtime.

## Examples

```ts
// BAD
const t = html`<slot name="a"></slot><slot name="a"></slot>`;

// GOOD
const t = html`<slot name="a"></slot><slot name="b"></slot>`;
```

## Notes

- Each template is checked on its own. The same slot name in two different
  templates is fine — they are different shadow roots.
- A bound name (`name=` with a `${…}`) is unknowable statically and is skipped
  rather than guessed at.
- Every slot after the first with a given name is reported, so three duplicates
  produce two diagnostics.
- The diagnostic highlights the offending `name="…"` attribute, not the whole
  tag.
