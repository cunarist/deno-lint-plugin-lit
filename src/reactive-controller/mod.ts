/**
 * `lit-reactive-controller` — the ReactiveController contract, and the
 * component lifecycle work that belongs in one.
 *
 * @module
 */

import "#build";

import { hostConstructor } from "./host-constructor.ts";
import { lifecycleAllowlist } from "./lifecycle-allowlist.ts";
import { noComponentDisposables } from "./no-component-disposables.ts";
import { noFetchInComponent } from "./no-fetch-in-component.ts";
import { noTimers } from "./no-timers.ts";
import { pairedLifecycle } from "./paired-lifecycle.ts";
import { selfRegistration } from "./self-registration.ts";

/** The `lit-reactive-controller` rules, for composing your own plugin. */
export const reactiveControllerRules: Record<string, Deno.lint.Rule> = {
  "host-constructor": hostConstructor,
  "lifecycle-allowlist": lifecycleAllowlist,
  "no-component-disposables": noComponentDisposables,
  "no-fetch-in-component": noFetchInComponent,
  "no-timers": noTimers,
  "paired-lifecycle": pairedLifecycle,
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
export { noComponentDisposables } from "./no-component-disposables.ts";
export { noFetchInComponent } from "./no-fetch-in-component.ts";
export { noTimers } from "./no-timers.ts";
export { pairedLifecycle } from "./paired-lifecycle.ts";
export { selfRegistration } from "./self-registration.ts";

export default plugin;
