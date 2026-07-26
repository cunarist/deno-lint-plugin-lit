---
name: scanner-runtime-imports
description: Registration import facts follow the transitive runtime module graph
metadata:
  type: project
---

# Registration imports are transitive

Decided 2026-07-27. `FileFacts.imports` contains every module reachable through
static runtime imports and re-exports, not only immediate dependencies. A
component is therefore available when a file imports a barrel or registration
module that imports the component module.

Fully type-only imports and re-exports are excluded because they never execute
the target module. Traversal tracks visited source files so cycles terminate.
