/**
 * The type-aware foundation that builds facts for the lint rules.
 *
 * Deno lint plugins see one file at a time through the AST, with no types and no
 * cross-file resolution. The scanner is the other half: it builds a real
 * TypeScript program resolved the way Deno resolves modules, so it can follow a
 * base class across files, tell Lit's `html` from a same-named local one, and
 * find the module that registers an element. Its facts reach a synchronous lint
 * rule through `#scan-index`.
 *
 * @module
 */

export * from "./facts.ts";
export * from "./lit.ts";
export * from "./program.ts";
export * from "./registration.ts";
