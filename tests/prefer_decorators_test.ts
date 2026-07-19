import { preferDecorators } from "#strict";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("prefer-decorators", preferDecorators);

Deno.test("prefer-decorators: allows decorated fields", () => {
  assertValid(
    plugin,
    'class A extends LitElement { @property() name = ""; @state() open = false; }',
  );
});

Deno.test("prefer-decorators: allows other static members", () => {
  assertValid(plugin, "class A extends LitElement { static styles = css``; }");
  assertValid(plugin, "class A extends LitElement { properties = {}; }");
});

Deno.test("prefer-decorators: ignores non-Lit classes", () => {
  assertValid(plugin, "class A { static properties = {}; }");
});

Deno.test("prefer-decorators: rejects a static properties field", () => {
  assertInvalid(
    plugin,
    "class A extends LitElement { static properties = { name: {} }; }",
  );
});

Deno.test("prefer-decorators: rejects a static properties getter", () => {
  assertInvalid(
    plugin,
    "class A extends LitElement { static get properties() { return { name: {} }; } }",
  );
});

Deno.test("prefer-decorators: highlights the member name", () => {
  const code = "class A extends LitElement { static properties = { a: {} }; }";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "properties");
});
