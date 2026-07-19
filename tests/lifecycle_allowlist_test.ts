import { lifecycleAllowlist } from "#reactive-controller";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("lifecycle-allowlist", lifecycleAllowlist);

Deno.test("lifecycle-allowlist: allows styles and render", () => {
  assertValid(
    plugin,
    `class A extends LitElement {
      static styles = css\`\`;
      render() { return html\`\`; }
    }`,
  );
});

Deno.test("lifecycle-allowlist: rejects willUpdate", () => {
  // Pushing state into a controller belongs in a property setter, not a hook.
  assertInvalid(
    plugin,
    `class A extends LitElement {
      willUpdate(changed) {}
      render() { return html\`\`; }
    }`,
  );
});

Deno.test("lifecycle-allowlist: allows ordinary members", () => {
  assertValid(
    plugin,
    "class A extends LitElement { #items = []; #onClick() {} }",
  );
});

Deno.test("lifecycle-allowlist: ignores non-Lit classes", () => {
  assertValid(plugin, "class A { connectedCallback() {} }");
  assertValid(plugin, "class A extends HTMLElement { connectedCallback() {} }");
});

Deno.test("lifecycle-allowlist: rejects connect/disconnect overrides", () => {
  assertInvalid(
    plugin,
    "class A extends LitElement { connectedCallback() {} }",
  );
  assertInvalid(
    plugin,
    "class A extends LitElement { disconnectedCallback() {} }",
  );
});

Deno.test("lifecycle-allowlist: rejects the whole banned set", () => {
  const banned = [
    "connectedCallback",
    "disconnectedCallback",
    "firstUpdated",
    "updated",
    "shouldUpdate",
    "update",
    "performUpdate",
    "requestUpdate",
    "scheduleUpdate",
  ];
  for (const name of banned) {
    assertInvalid(plugin, `class A extends LitElement { ${name}() {} }`);
  }
});

Deno.test("lifecycle-allowlist: rejects a lifecycle field, not just a method", () => {
  assertInvalid(
    plugin,
    "class A extends LitElement { updated = () => {}; }",
  );
});

Deno.test("lifecycle-allowlist: reports each override separately", () => {
  assertInvalid(
    plugin,
    "class A extends LitElement { firstUpdated() {} updated() {} }",
    2,
  );
});

Deno.test("lifecycle-allowlist: highlights the member name", () => {
  const code = "class A extends LitElement { firstUpdated() {} }";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "firstUpdated");
});
