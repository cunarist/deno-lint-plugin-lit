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
  **accurate-or-silent** (returns false when no cache or the hash no longer
  matches — never an AST guess). The old AST heuristic `astLitComponent` was
  deleted.
- `#scanner` — the builders: `createDenoProgram` (@deno/loader host; no
  `node_modules` required, no subprocess, workspace-aware), `buildCache`, and
  the checker-based `isLitComponent(checker, node)` (follows the base chain
  cross-file). It is internal and has no public package export.
- `#scan-index` — the store (lowest layer): `ScanCache`/`FileFacts` types,
  `setScanFacts`, `scanFacts`, `fileKey`, `hashText`. A module variable, not a
  file. Each file's facts carry a content hash; a rule trusts them only when
  `hashText(ctx.sourceCode.text)` matches — an editor can lint a buffer that no
  longer matches what the scan read.

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

Facts are as fresh as the last plugin load. Refreshing = **Restart Deno Server**
(reloads the plugin → rebuilds), the same mental model as Deno's own LSP. The
actively-edited unsaved buffer is never live — that is LSP territory, out of
scope for a lint plugin.

## Rejected alternatives (do not reintroduce without reason)

- **Separate CLI / `deno task scan`**: dropped — the plugin must be lint-only,
  no separate step for the user to run.
- **Web Worker + `Atomics.wait`** to build inside a sync rule: works under real
  `deno lint` (verified), but blocking the lint thread freezes every other rule.
  Top-level await is simpler and non-antisocial.
- **Writing the facts to a file** (`.lit-scan-cache.json` at the project root):
  built, then removed. Rules share the plugin's isolate, so the file bought
  nothing and left an artifact in the user's repository.
- **Disk cache + hash-incremental rebuild**: the incremental machinery only
  exists to avoid a full rebuild per run; TLA + "Restart Server = re-scan" is
  enough. Incremental (ts `oldProgram`, only viable within a warm long-lived
  process) is a future optimization, not needed now.

See also [[ts7-native-no-api]], [[deno-lint-plugin-facts]].
