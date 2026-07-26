---
name: scanner-runtime-imports
description: Registration import facts are direct imports plus an imported mod.ts within its own folder
metadata:
  type: project
---

# Registration imports are direct, except through `mod.ts`

Decided 2026-07-27. `FileFacts.imports` holds the modules a file runs through
its own import and re-export statements, plus what an imported `mod.ts` runs
from inside its own directory tree — following `mod.ts` to `mod.ts` down the
tree. Nothing else is followed.

A fully transitive graph was tried first and reverted: it let any barrel
anywhere satisfy the rule, which is the borrowed import
`require-direct-registration-import` exists to reject. A `mod.ts` is the
exception because it stands for the folder it sits in, so it is always an
ancestor folder of what it exports.

An import a `mod.ts` makes outside its own folder (`../other.ts`) is not
followed. Fully type-only imports and re-exports are excluded because they never
execute the target module. Traversal tracks visited source files so cycles
terminate.
