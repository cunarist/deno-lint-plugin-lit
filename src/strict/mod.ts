/**
 * `lit-strict` — demanding but correct. Strongly recommended, not required.
 *
 * @module
 */

import "#build";

import { directiveAllowlist } from "./directive-allowlist.ts";
import { noBooleanPropertyDefaultTrue } from "./no-boolean-property-default-true.ts";
import { noEventTargetSubclass } from "./no-event-target-subclass.ts";
import { noLightDom } from "./no-light-dom.ts";
import { noManualUpdate } from "./no-manual-update.ts";
import { noPropertyAssignmentInConstructor } from "./no-property-assignment-in-constructor.ts";
import { noStringContextKey } from "./no-string-context-key.ts";
import { noUpdateComplete } from "./no-update-complete.ts";
import { preferContextDecorators } from "./prefer-context-decorators.ts";
import { preferDecorators } from "./prefer-decorators.ts";
import { requireCustomElementRegistration } from "./require-custom-element-registration.ts";
import { requireEventInEventMap } from "./require-event-in-event-map.ts";
import { requireTagNameMap } from "./require-tag-name-map.ts";

/** The `lit-strict` rules, for composing your own plugin. */
export const strictRules: Record<string, Deno.lint.Rule> = {
  "directive-allowlist": directiveAllowlist,
  "no-boolean-property-default-true": noBooleanPropertyDefaultTrue,
  "no-event-target-subclass": noEventTargetSubclass,
  "no-light-dom": noLightDom,
  "no-manual-update": noManualUpdate,
  "no-property-assignment-in-constructor": noPropertyAssignmentInConstructor,
  "no-string-context-key": noStringContextKey,
  "no-update-complete": noUpdateComplete,
  "prefer-context-decorators": preferContextDecorators,
  "prefer-decorators": preferDecorators,
  "require-custom-element-registration": requireCustomElementRegistration,
  "require-event-in-event-map": requireEventInEventMap,
  "require-tag-name-map": requireTagNameMap,
};

/**
 * The `lit-strict` plugin: every rule in this module, ready for `deno.json`.
 */
const plugin: Deno.lint.Plugin = {
  name: "lit-strict",
  rules: strictRules,
};

// Individual rules, re-exported for composition.
export { directiveAllowlist } from "./directive-allowlist.ts";
export { noBooleanPropertyDefaultTrue } from "./no-boolean-property-default-true.ts";
export { noEventTargetSubclass } from "./no-event-target-subclass.ts";
export { noLightDom } from "./no-light-dom.ts";
export { noManualUpdate } from "./no-manual-update.ts";
export { noPropertyAssignmentInConstructor } from "./no-property-assignment-in-constructor.ts";
export { noStringContextKey } from "./no-string-context-key.ts";
export { noUpdateComplete } from "./no-update-complete.ts";
export { preferContextDecorators } from "./prefer-context-decorators.ts";
export { preferDecorators } from "./prefer-decorators.ts";
export { requireCustomElementRegistration } from "./require-custom-element-registration.ts";
export { requireEventInEventMap } from "./require-event-in-event-map.ts";
export { requireTagNameMap } from "./require-tag-name-map.ts";

export default plugin;
