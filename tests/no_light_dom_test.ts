import { noLightDom } from "#strict";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-light-dom", noLightDom);

Deno.test("no-light-dom: rejects returning this", () => {
  assertInvalid(
    plugin,
    "class El extends LitElement { createRenderRoot() { return this; } }",
  );
});

Deno.test("no-light-dom: allows other createRenderRoot bodies", () => {
  // Overriding to tweak shadow root options is fine — the shadow root remains.
  assertValid(
    plugin,
    `class El extends LitElement {
      createRenderRoot() { return super.createRenderRoot(); }
    }`,
  );
});

Deno.test("no-light-dom: ignores non-Lit classes", () => {
  assertValid(
    plugin,
    "class Plain { createRenderRoot() { return this; } }",
  );
});

Deno.test("no-light-dom: highlights the override", () => {
  const code =
    "class El extends LitElement { createRenderRoot() { return this; } }";
  const [d] = assertInvalid(plugin, code);
  if (!d) throw new Error("expected a diagnostic");
  assertReportedText(code, d, "createRenderRoot() { return this; }");
});
