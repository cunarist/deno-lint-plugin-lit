/**
 * `lit-dom-ref` — reach the DOM through a `createRef` ref, nothing else.
 *
 * @module
 */

import { noDomQuery } from "./no-dom-query.ts";
import { noQueryDecorators } from "./no-query-decorators.ts";
import { preferCreateRef } from "./prefer-create-ref.ts";

/** The `lit-dom-ref` rules, for composing your own plugin. */
export const domRefRules: Record<string, Deno.lint.Rule> = {
  "no-dom-query": noDomQuery,
  "no-query-decorators": noQueryDecorators,
  "prefer-create-ref": preferCreateRef,
};

/**
 * The `lit-dom-ref` plugin: every rule in this module, ready for `deno.json`.
 */
const plugin: Deno.lint.Plugin = {
  name: "lit-dom-ref",
  rules: domRefRules,
};

// Individual rules, re-exported for composition.
export { noDomQuery } from "./no-dom-query.ts";
export { noQueryDecorators } from "./no-query-decorators.ts";
export { preferCreateRef } from "./prefer-create-ref.ts";

export default plugin;
