/**
 * `lit-naming` — what elements and controllers are called.
 *
 * @module
 */

import { requireControllerSuffix } from "./require-controller-suffix.ts";
import { requireElementSuffix } from "./require-element-suffix.ts";
import { requireTagPrefix } from "./require-tag-prefix.ts";
import { tagMatchesClassName } from "./tag-matches-class-name.ts";

/** The `lit-naming` rules, for composing your own plugin. */
export const namingRules: Record<string, Deno.lint.Rule> = {
  "require-controller-suffix": requireControllerSuffix,
  "require-element-suffix": requireElementSuffix,
  "require-tag-prefix": requireTagPrefix,
  "tag-matches-class-name": tagMatchesClassName,
};

/**
 * The `lit-naming` plugin: every rule in this module, ready for `deno.json`.
 */
const plugin: Deno.lint.Plugin = {
  name: "lit-naming",
  rules: namingRules,
};

// Individual rules, re-exported for composition.
export { requireControllerSuffix } from "./require-controller-suffix.ts";
export { requireElementSuffix } from "./require-element-suffix.ts";
export { requireTagPrefix } from "./require-tag-prefix.ts";
export { tagMatchesClassName } from "./tag-matches-class-name.ts";

export default plugin;
