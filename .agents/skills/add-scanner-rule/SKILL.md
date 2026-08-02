---
name: add-scanner-rule
description: Add a lint rule that needs cross-file or type facts from the checker
---

# Add a type-aware rule

For a rule that needs to know a class is a Lit component, which module registers
a tag, or any other fact one file's AST cannot supply. Read
[scanner-architecture](../../memory/scanner-architecture.md) first.

## The rule asks the checker; it never builds a program

- Gate on a cross-file component check with `isLitComponent(node, ctx)` from
  `#helpers`. It is **accurate-or-silent** — no type information means it does
  nothing.
- For anything else about the node in hand, go through the services:

```ts
const services = tryGetTypeServices(ctx);
if (services === null) return {};
const declaration = services.getTSNode(node);
const type = services.getTypeAtLocation(node);
```

- Never add an AST fallback. Never build a program in a rule — it is
  synchronous, and the program is already built at plugin load.

## If a whole-program fact is needed

First check that it really is one. Almost everything is answerable from the node
being visited, and a per-node checker call needs no cache. Only if the answer
requires walking every file — as `registrationIndex` does — add it to
`src/scanner/project-index.ts`, memoized on the `ts.Program` or `ts.SourceFile`
it came from so a rebuild recomputes rather than answering stale.

## Register and document

- Add the rule to its group barrel (e.g. `src/core/mod.ts`): import, add to the
  `*Rules` record, and re-export it. Keep entries alphabetical.
- Add `src/<group>/<rule-id>.md` (matching the file name) and a README table
  row. Its `// GOOD` snippet is linted by the whole ruleset in
  `tests/docs_consistency_test.ts`.

## Test it

Rule tests use `tests/harness.ts`, which builds a real program for each snippet
and installs it, so the type-aware check fires. Write normal
`assertValid`/`assertInvalid` cases with `class X extends LitElement { … }`
snippets.

**Always write at least one `assertInvalid` case.** With no installed program
every type-aware rule goes silent, and a file of `assertValid` cases passes
without testing anything. Then run the [verify](../verify/SKILL.md) skill.
