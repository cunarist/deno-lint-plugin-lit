---
name: deno-lint-plugin-facts
description: Verified facts about how Deno lint plugins execute and resolve imports
metadata:
  type: reference
---

# Deno lint plugin execution and resolution facts

Verified on Deno 2.9.3, 2026-07-26.

- **Rules are synchronous, AST-only.** One AST traversal per file dispatches all
  rules' visitors in sequence. An `async` handler's `report` is dropped. There
  is no type checker in the plugin context (`deno doc --builtin` exposes no
  `getTypeChecker`/`typeAt`; that is a typescript-eslint feature, not Deno's).
- **Parallelism is per file, but not across isolates.** Every rule invocation,
  for every file, runs in the isolate that loaded the plugin — probed with a
  random value set in top-level await and reported from a rule over six files:
  one build, one value. So a module variable set at load reaches every rule, and
  a plugin never needs to write state to disk to share it. See
  [[scanner-architecture]].
- **`Deno.readTextFileSync` works** inside a rule under real `deno lint`.
- **Top-level `await` in a plugin module is awaited** before rules run — so a
  plugin can do async setup (e.g. build a program) at load. Basis of the program
  build in `@cunarist/typescript-deno-lint`.
- **`new Worker` + `Atomics.wait` (main-thread) work** under real `deno lint`
  (Deno allows main-thread `Atomics.wait`, unlike browsers). But blocking
  freezes the whole lint thread, so we don't use it. See
  [[scanner-architecture]].
- **Plugin imports resolve in the loading context.** A plugin loaded from a
  local path (`file:///…`) from another project resolves its imports against the
  **consumer's** import map, so the plugin's own `#`/bare aliases fail
  (`Import "#x" not a dependency`) — verified. A **fully-qualified specifier**
  (`npm:`/`jsr:`) needs no import map and always works. When the plugin is
  consumed the normal way (`jsr:@scope/pkg/...`), JSR bakes the package's import
  map so its aliases resolve. We assume jsr consumption, so aliases are fine;
  reach for a full specifier only for code that runs outside normal resolution.
