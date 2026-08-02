/**
 * Type-aware Lit detection, over the program `typescript-deno-lint` builds.
 *
 * Deno lint plugins see one file at a time through the AST, with no types and no
 * cross-file resolution. The checker is the other half: it follows a base class
 * across files, tells Lit's `html` from a same-named local one, and finds the
 * module that registers an element.
 *
 * Everything here takes a checker and answers about TypeScript nodes. `#helpers`
 * is the layer above, where a rule's own lint nodes are handed over.
 *
 * @module
 */

export * from "./lit.ts";
export * from "./project-index.ts";
export * from "./registration.ts";
export * from "./runtime-import.ts";
