---
name: add-scanner-rule
description: Add a lint rule that needs cross-file or type facts from the scanner
---

# Add a scanner-backed rule

For a rule that needs to know a class is a Lit component, which module registers
a tag, or any cross-file fact. Read
[scanner-architecture](../../memory/scanner-architecture.md) first.

## The rule reads facts; it never computes them

- Gate on a cross-file component check with `isLitComponent(node, ctx)` from
  `#helpers` — it reads the cache and is **accurate-or-silent** (does nothing
  without a cache or on a hash mismatch).
- For registration/import facts, read `scanFacts()` from `#scan-index` and use
  `facts.cache` (guard on the file's `hash` vs `hashText(ctx.sourceCode.text)`
  first).
- Never add an AST fallback. Never build a program in a rule — it is
  synchronous.

## If a new fact is needed

Add it to `FileFacts`/`ScanCache` in `src/scan-index/mod.ts`, populate it in
`buildCache` (`src/scanner/facts.ts`) using the checker, and read it in the
rule.

## Register and document

- Add the rule to its group barrel (e.g. `src/core/mod.ts`): import, add to the
  `*Rules` record, and re-export it. Keep entries alphabetical.
- Add `src/<group>/<rule-id>.md` (matching the file name) and a README table
  row. Its `// GOOD` snippet is linted by the whole ruleset in
  `tests/docs_consistency_test.ts`.

## Test it

Rule tests use `tests/harness.ts`, which builds a real cache for each snippet so
the cache-backed check fires — you do not inject a cache by hand. Write normal
`assertValid`/`assertInvalid` cases with `class X extends LitElement { … }`
snippets. Then run the [verify](../verify/SKILL.md) skill.
