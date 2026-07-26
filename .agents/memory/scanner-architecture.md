---
name: scanner-architecture
description: How lint rules get cross-file and type facts — TLA build, cache, sync read
metadata:
  type: project
---

# Scanner architecture

Decided 2026-07-26. Rules that need cross-file or type information
(`isLitComponent`, tag registration) read a **precomputed fact cache**. A
synchronous Deno lint rule cannot build a TypeScript program itself, so a
program is built at plugin load and its facts are left in memory for rules to
read.

## Modules (layer order, top imports below)

- `#build` (`src/build/mod.ts`) — runs at every plugin load via **top-level
  await**. `deno lint` awaits a plugin's top-level await before running any rule
  (verified). Builds the program and publishes the facts through `setScanFacts`.
  Uses `deno.json` when present and falls back to `deno.jsonc`. `#scanner`
  (which pulls in TypeScript) is reached only via a **dynamic import during the
  build**. Imported for its side effect by the plugin barrels.
- `#helpers` — `isLitComponent(node, ctx)` reads the cache;
  **accurate-or-silent** (returns false when there is no cache — never an AST
  guess). The old AST heuristic `astLitComponent` was deleted.
- `#scanner` — the builders: `createDenoProgram` (@deno/loader host; no
  `node_modules` required, no subprocess, workspace-aware), `buildCache`, and
  the checker-based `isLitComponent(checker, node)` (follows the base chain
  cross-file). It is internal and has no public package export.
- `#scan-index` — the store (lowest layer): `ScanCache`/`FileFacts` types,
  `setScanFacts`, `scanFacts`, `currentFileFacts`, `fileKey`, `hashText`. A
  module variable, not a file. Each file's facts carry a content hash, because
  an editor lints a buffer that no longer matches what the scan read;
  `currentFileFacts` rebuilds on a mismatch — see "Freshness model".

**Verified 2026-07-26: `deno lint` runs every rule in the isolate that loaded
the plugin.** A TLA-set module variable reaches all of them, even though files
are processed in parallel (probed with a random value set in TLA and reported
from a rule across six files — one build, one value). So the facts never touch
the disk. An earlier design wrote `.lit-scan-cache.json` into the project root;
that is gone, and a lint run must not write into the project it lints.

## Tests

Building on every plugin import is expensive (~16s on a real Lit app; ~0.8s ×
test isolates on this repo), but tests deliberately exercise the public barrels.
There is no environment-variable guard. Each test isolate runs the real build
before the harness replaces its facts with snippet-specific facts.

## Freshness model

Facts are keyed by **source offset**, so an edit anywhere above them shifts
every offset and stale facts are not merely old but wrong. Each file's facts
carry a content hash to detect that.

On a mismatch the facts are **rebuilt**, not discarded. `createDenoProgram`
returns a `DenoProgram` that keeps the loader, the compiler host, and the
program alive; `rebuild(path, text)` swaps that one file's `SourceFile` and
calls `ts.createProgram(..., oldProgram)`. The host caches every `SourceFile` by
path, so TypeScript is handed back the identical object for every unchanged
file, which is the precondition for reuse — only the edited file is parsed.
`fileFacts` recomputes facts for that one file; calling `buildCache` again would
walk the whole project with a checker that has nothing cached, which is the
entire cost the rebuild exists to avoid.

Measured on `tests/scanner_fixture` (8 files): **~250ms to build, ~3ms to
rebuild**, asserted in `tests/scanner_rebuild_test.ts`.

Discarding instead of rebuilding was the original design and is wrong: one
keystroke anywhere turns off every scanner-backed rule in the file, so the rules
are off exactly while you are writing the code they judge.

`#scan-index` owns `currentFileFacts(filename, text)` — the single entry point
every rule reads through. It returns the scanned facts on a hash hit, otherwise
calls `refresh` and memoizes the result per file and hash, including a failure,
so a rebuild happens once and not once per rule. `refresh` is optional: a test
harness injecting facts directly leaves it undefined and a changed file simply
has none.

The one thing a rebuild cannot do is resolve a specifier the loader never warmed
— an import added since the scan. Warming needs an await, so that import
resolves to nothing and the rest of the file's facts stand.

Restart Deno Server still exists as the way to pick up **other** files' changes;
the rebuild covers the file being linted.

## Rejected alternatives (do not reintroduce without reason)

- **Separate CLI / `deno task scan`**: dropped — the plugin must be lint-only,
  no separate step for the user to run.
- **Web Worker + `Atomics.wait`** to build inside a sync rule: works under real
  `deno lint` (verified), but blocking the lint thread freezes every other rule.
  Top-level await is simpler and non-antisocial.
- **Writing the facts to a file** (`.lit-scan-cache.json` at the project root):
  built, then removed. Rules share the plugin's isolate, so the file bought
  nothing and left an artifact in the user's repository.
- **Disk cache**: a cache file bought nothing, since rules share the isolate.
  (The `oldProgram` half of this entry is no longer rejected — it shipped, see
  "Freshness model".)
- **`ts.createLanguageService`**: the standard answer for repeated edits, and
  probably where this ends up. Not taken yet because it needs a
  `ts.LanguageServiceHost`, which is a rewrite of `program.ts`, and `oldProgram`
  already gets the rebuild to ~3ms. Revisit if rebuild latency ever shows up.

See also [[ts7-native-no-api]], [[deno-lint-plugin-facts]].
