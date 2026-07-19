import { requireElementSuffix } from "#naming";

import { assertInvalid, assertValid, rulePlugin } from "./harness.ts";

const plugin = rulePlugin("require-element-suffix", requireElementSuffix);

Deno.test("require-element-suffix: accepts the suffix", () => {
  assertValid(
    plugin,
    '@customElement("cl-path-bar")\nclass PathBarElement extends LitElement {}',
  );
});

Deno.test("require-element-suffix: rejects a bare name", () => {
  assertInvalid(
    plugin,
    '@customElement("cl-path-bar")\nclass PathBar extends LitElement {}',
  );
});

Deno.test("require-element-suffix: ignores unregistered classes", () => {
  // A base class is not an element until something registers it.
  assertValid(plugin, "class PathBar extends LitElement {}");
});
