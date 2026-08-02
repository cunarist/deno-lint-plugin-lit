---
name: scanner-architecture
description: How lint rules get cross-file and type facts — the checker, asked per node
metadata:
  type: project
---

# Scanner architecture

Rewritten 2026-08-02. Rules that need cross-file or type information ask the
**type checker directly, per node**. Building and holding the program is
`@cunarist/typescript-deno-lint`'s job; this package supplies only the
Lit-specific questions.

## Layers

- `@cunarist/typescript-deno-lint/types` — builds the program under a top-level
  await at plugin load and exposes `tryGetTypeServices(ctx)`. Each plugin barrel
  imports it for its side effect; that import is what triggers the build.
- `#helpers` — hands a rule's lint node over:
  `tryGetTypeServices(ctx).getTSNode(node)`. **Accurate-or-silent** — no type
  information returns `false`, never an AST guess. The old AST heuristic
  `astLitComponent` stays deleted.
- `#scanner` — takes a checker, answers about TypeScript nodes:
  `isLitComponent(checker, node)` (follows the base chain cross-file),
  `litTemplateKind`, `collectRegistrations`, `runtimeImportedFiles`.

## What was removed, and why it is not coming back

The previous design walked every file at load, stored the answers **keyed by
source offset**, carried a content hash per file to notice an edit, and rebuilt
one file's facts on mismatch. `#build`, `#scan-index`, `ScanCache`, `FileFacts`,
`fileKey`, `hashText`, `currentFileFacts`, and `buildCache` are all gone.

None of it is needed once a lint node can be mapped to its TypeScript node:
there is no offset to key by, so there is nothing to invalidate. The rebuild
machinery moved into the package, where it belongs — it is a property of holding
a program across edits, not of Lit. Do not reintroduce a fact cache to save
checker calls; the checker memoizes its own work, and the cache existed only
because rules had no way to reach it.

## The two genuine exceptions

`scanner/project-index.ts` memoizes exactly two things, because **no single file
can answer them**:

- `registrationIndex` — which module registers a given tag. Needs every file in
  the program. Memoized per `ts.Program`.
- `runtimeImportIndex` — the runtime-import closure, following `mod.ts`
  re-exports across files. Memoized per `ts.SourceFile`.

Keying on those objects is what makes a rebuilt program or a reparsed file
recompute instead of answering stale. Before adding a third entry, check whether
the checker answers it from the node already in hand — it usually does.

## Tests

Snippets belong to no project, so `tests/harness.ts` builds a program per
snippet and installs it with `useTestProgram`. **With no installed program every
type-aware rule goes silent and every `assertValid` passes vacuously** — that
happened during the migration and only the `assertInvalid` cases caught it.

## Rejected alternatives (do not reintroduce without reason)

- **Separate CLI / `deno task scan`**: the plugin must be lint-only, with no
  separate step for the user to run.
- **Web Worker + `Atomics.wait`** to build inside a sync rule: works under real
  `deno lint` (verified), but blocking the lint thread freezes every other rule.
  Top-level await is simpler and non-antisocial.
- **Writing the facts to a file** (`.lit-scan-cache.json` at the project root):
  built, then removed. Rules share the plugin's isolate, so the file bought
  nothing and left an artifact in the user's repository. A lint run must not
  write into the project it lints.
- **`ts.createLanguageService`**: the standard answer for repeated edits. Now a
  question for the package, not for this repo.

See also [[ts7-native-no-api]], [[deno-lint-plugin-facts]],
[[scanner-runtime-imports]], [[scanner-symbol-identity]].
