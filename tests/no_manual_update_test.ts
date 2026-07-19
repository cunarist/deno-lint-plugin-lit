import { noManualUpdate } from "#strict";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-manual-update", noManualUpdate);

Deno.test("no-manual-update: allows a controller nudging its host", () => {
  assertValid(plugin, "class C { sync() { this.host.requestUpdate(); } }");
  assertValid(plugin, "class C { sync() { this.#host.requestUpdate(); } }");
  assertValid(plugin, "class C { sync() { this.#host.performUpdate(); } }");
  assertValid(plugin, "class C { sync() { this.host.scheduleUpdate(); } }");
});

Deno.test("no-manual-update: ignores unrelated calls", () => {
  assertValid(plugin, "this.host.requestSomethingElse();");
  assertValid(plugin, "this.render();");
});

Deno.test("no-manual-update: rejects a component scheduling itself", () => {
  assertInvalid(
    plugin,
    "class A extends LitElement { go() { this.requestUpdate(); } }",
  );
});

Deno.test("no-manual-update: rejects every scheduling method", () => {
  for (const name of ["requestUpdate", "performUpdate", "scheduleUpdate"]) {
    assertInvalid(plugin, `element.${name}();`);
  }
});

Deno.test("no-manual-update: rejects an indirect host reference", () => {
  assertInvalid(plugin, "class C { sync() { this.owner.requestUpdate(); } }");
});

Deno.test("no-manual-update: highlights the callee", () => {
  const code = "class A extends LitElement { go() { this.requestUpdate(); } }";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "this.requestUpdate");
});
