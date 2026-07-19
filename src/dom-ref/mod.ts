/**
 * `lit-dom-ref` — reach the DOM through a named `ref` callback, nothing else.
 */

import { noCreateRef } from "./no-create-ref.ts";
import { noDomQuery } from "./no-dom-query.ts";
import { noQueryDecorators } from "./no-query-decorators.ts";

/** The `lit-dom-ref` rules, for composing your own plugin. */
export const domRefRules: Record<string, Deno.lint.Rule> = {
  "no-create-ref": noCreateRef,
  "no-dom-query": noDomQuery,
  "no-query-decorators": noQueryDecorators,
};

const plugin: Deno.lint.Plugin = {
  name: "lit-dom-ref",
  rules: domRefRules,
};

// Individual rules, re-exported for composition.
export { noCreateRef } from "./no-create-ref.ts";
export { noDomQuery } from "./no-dom-query.ts";
export { noQueryDecorators } from "./no-query-decorators.ts";

export default plugin;
