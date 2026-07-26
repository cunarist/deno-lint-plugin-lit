---
name: no-barrel-bypass
description: Tests must exercise rules through the public plugin barrels
metadata:
  type: project
---

# Do not bypass plugin barrels in tests

Rule tests import their plugins and rules through the public group barrels
(`#core`, `#strict`, `#dom-ref`, `#reactive-controller`, `#naming`). Do not
change tests to import individual rule source files or add test-only barrels to
avoid entry-point side effects.

The barrels are part of the behavior under test: they define the shipped rule
records and trigger `#build`. Tests do not suppress that build. After it runs,
`tests/harness.ts` injects scanner facts for each snippet.
