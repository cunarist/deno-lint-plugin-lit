/**
 * `lit-reactive-controller` — the ReactiveController contract, and the
 * component lifecycle work that belongs in one.
 *
 * @module
 */

import { constructionArgs } from "./construction-args.ts";
import { hostConstructor } from "./host-constructor.ts";
import { implementsReactiveController } from "./implements-reactive-controller.ts";
import { lifecycleAllowlist } from "./lifecycle-allowlist.ts";
import { noControllerReferences } from "./no-controller-references.ts";
import { noSelfSync } from "./no-self-sync.ts";
import { noSyncInRender } from "./no-sync-in-render.ts";
import { noUnusedHost } from "./no-unused-host.ts";
import { pairedLifecycle } from "./paired-lifecycle.ts";
import { requireAbortSignalInFetch } from "./require-abort-signal-in-fetch.ts";
import { selfRegistration } from "./self-registration.ts";

/** The `lit-reactive-controller` rules, for composing your own plugin. */
export const reactiveControllerRules: Record<string, Deno.lint.Rule> = {
  "construction-args": constructionArgs,
  "host-constructor": hostConstructor,
  "implements-reactive-controller": implementsReactiveController,
  "lifecycle-allowlist": lifecycleAllowlist,
  "no-controller-references": noControllerReferences,
  "no-self-sync": noSelfSync,
  "no-sync-in-render": noSyncInRender,
  "no-unused-host": noUnusedHost,
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
export { constructionArgs } from "./construction-args.ts";
export { hostConstructor } from "./host-constructor.ts";
export { implementsReactiveController } from "./implements-reactive-controller.ts";
export { lifecycleAllowlist } from "./lifecycle-allowlist.ts";
export { noControllerReferences } from "./no-controller-references.ts";
export { noSelfSync } from "./no-self-sync.ts";
export { noSyncInRender } from "./no-sync-in-render.ts";
export { noUnusedHost } from "./no-unused-host.ts";
export { pairedLifecycle } from "./paired-lifecycle.ts";
export { requireAbortSignalInFetch } from "./require-abort-signal-in-fetch.ts";
export { selfRegistration } from "./self-registration.ts";

export default plugin;
