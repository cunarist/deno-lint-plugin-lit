---
name: ts7-native-no-api
description: TypeScript 7 native port can't power the scanner — no programmatic API
metadata:
  type: reference
---

# TypeScript 7 native port is not usable for the scanner (yet)

Checked 2026-07-26. `npm:@typescript/native-preview` (v7.0.0-dev.20260707.2, the
Go-based "10x faster" port) ships only the `tsgo` binary plus a version stub.
Its JS module exports exactly `{ default, version, versionMajorMinor }` — **no
`createProgram`, `createCompilerHost`, `TypeChecker`, or `createSourceFile`**.

The scanner depends on the programmatic API: `ts.createProgram` with a custom
`CompilerHost.resolveModuleNameLiterals` (per-importer Deno resolution) plus the
type checker. None of that exists in the native preview, so it cannot build our
program. The `tsgo` subprocess is a checker/emitter CLI, not a queryable fact
API, so it can't extract our facts either.

Stay on `npm:typescript@^5`. Revisit when Microsoft ships a JS-compatible
compiler API on the native port — our code uses standard `ts` APIs, so it may
then be close to a drop-in. See [[scanner-architecture]].
