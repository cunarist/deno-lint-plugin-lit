/**
 * `lit-reactive-controller` — the ReactiveController contract, and the
 * component lifecycle work that belongs in one.
 *
 * @module
 */

import { hostConstructor } from "./host-constructor.ts";
import { lifecycleAllowlist } from "./lifecycle-allowlist.ts";
import { pairedLifecycle } from "./paired-lifecycle.ts";
import { requireAbortSignalInFetch } from "./require-abort-signal-in-fetch.ts";
import { selfRegistration } from "./self-registration.ts";

/** The `lit-reactive-controller` rules, for composing your own plugin. */
export const reactiveControllerRules: Record<string, Deno.lint.Rule> = {
  "host-constructor": hostConstructor,
  "lifecycle-allowlist": lifecycleAllowlist,
  "paired-lifecycle": pairedLifecycle,
  "require-abort-signal-in-fetch": requireAbortSignalInFetch,
  "self-registration": selfRegistration,
};

/**
 * The `lit-reactive-controller` plugin: every rule in this module, ready for
 * `deno.json`.
 */
const plugin: Deno.lint.Plugin = {
  name: "lit-reactive-controller",
  rules: reactiveControllerRules,
};

// Individual rules, re-exported for composition.
export { hostConstructor } from "./host-constructor.ts";
export { lifecycleAllowlist } from "./lifecycle-allowlist.ts";
export { pairedLifecycle } from "./paired-lifecycle.ts";
export { requireAbortSignalInFetch } from "./require-abort-signal-in-fetch.ts";
export { selfRegistration } from "./self-registration.ts";

export default plugin;
