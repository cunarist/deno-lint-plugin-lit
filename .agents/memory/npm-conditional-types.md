---
name: npm-conditional-types
description: Why scanner npm resolution maps runtime exports to package types
metadata:
  type: project
---

# NPM conditional exports need their `types` target

Verified 2026-07-26. `@deno/loader.resolveSync` follows runtime conditions. For
example, `@lit/reactive-element` resolves to `node/reactive-element.js`, while
its declaration is selected by the same package export's `types` condition at
`development/reactive-element.d.ts`. A same-directory `.d.ts` guess therefore
loads the minified runtime class (`g`) and loses the `ReactiveElement` symbol.

`src/scanner/program.ts` first checks a sibling declaration, then finds the
nearest `package.json`, locates the export branch containing the resolved
runtime target, and loads that branch's `types` target. Do not compensate by
matching minified symbols or class-name heuristics.
