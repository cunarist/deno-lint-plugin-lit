import { requireControllerSuffix } from "#naming";

import { assertInvalid, assertValid, rulePlugin } from "./harness.ts";

const plugin = rulePlugin(
  "require-controller-suffix",
  requireControllerSuffix,
);

Deno.test("require-controller-suffix: accepts the suffix", () => {
  assertValid(plugin, "class ItemsController implements ReactiveController {}");
});

Deno.test("require-controller-suffix: rejects a bare name", () => {
  assertInvalid(plugin, "class Items implements ReactiveController {}");
});

Deno.test("require-controller-suffix: ignores classes that are not controllers", () => {
  assertValid(plugin, "class Items {}");
  assertValid(plugin, "class PathBar extends LitElement {}");
});
