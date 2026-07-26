---
name: scanner-symbol-identity
description: Scanner facts use checker identity and exact source positions
metadata:
  type: project
---

# Scanner facts require symbol identity

Decided 2026-07-26. Cross-file facts must not treat spelling alone as evidence.

- A `customElements.define` call counts only when both `customElements` and
  `define` resolve to declarations in TypeScript's DOM library.
- A `customElement` decorator counts only when its resolved symbol is Lit's
  decorator declaration. Import aliases work; a same-named local decorator does
  not count.
- An `HTMLElementTagNameMap` entry counts only when the interface symbol merges
  with the real DOM interface. A module-local interface with that name does not.
- Component facts use the source offset of each class name. Different scopes may
  reuse a class name without ambiguity because the lint AST and TypeScript AST
  agree on the name token's offset for identical source text.
- Template facts use the source offset of the tag expression and its checker-
  resolved Lit kind (`html`, `svg`, or `css`). Import aliases and namespace
  imports work; same-named local functions do not count.

The scanner intentionally prefers a false negative over a false positive when
identity is unavailable.
