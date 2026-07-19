import { requireTagPrefix } from "#naming";

import { assertInvalid, assertValid, rulePlugin } from "./harness.ts";

const plugin = rulePlugin("require-tag-prefix", requireTagPrefix);

Deno.test("require-tag-prefix: accepts a prefixed tag", () => {
  assertValid(
    plugin,
    '@customElement("cl-path-bar")\nclass PathBar extends LitElement {}',
  );
  assertValid(
    plugin,
    '@customElement("cl-md-slash-menu")\nclass SlashMenu extends LitElement {}',
  );
});

Deno.test("require-tag-prefix: accepts an Element-suffixed class", () => {
  assertValid(
    plugin,
    '@customElement("cl-path-bar")\nclass PathBarElement extends LitElement {}',
  );
});

Deno.test("require-tag-prefix: rejects a bare tag", () => {
  assertInvalid(
    plugin,
    '@customElement("path-bar")\nclass PathBar extends LitElement {}',
  );
});
