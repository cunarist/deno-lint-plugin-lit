# Agent memory

One durable fact or decision per file. Read the relevant ones before working.

- [scanner-architecture.md](scanner-architecture.md) — how rules get cross-file
  and type facts (TLA build → cache → sync read). The big one.
- [ts7-native-no-api.md](ts7-native-no-api.md) — why we can't upgrade the
  scanner to the TypeScript 7 native port yet.
- [deno-lint-plugin-facts.md](deno-lint-plugin-facts.md) — verified facts about
  how Deno lint plugins execute and resolve imports.
- [npm-conditional-types.md](npm-conditional-types.md) — why the scanner maps
  npm runtime export targets back to their `types` condition.
- [no-barrel-bypass.md](no-barrel-bypass.md) — tests must exercise the public
  plugin barrels rather than importing rule files directly.
- [scanner-symbol-identity.md](scanner-symbol-identity.md) — registration and
  component facts require checker identity and go silent when ambiguous.
- [scanner-runtime-imports.md](scanner-runtime-imports.md) — registration
  imports are direct, except through an imported `mod.ts`.
