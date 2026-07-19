import { noUpdateComplete } from "#strict";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-update-complete", noUpdateComplete);

Deno.test("no-update-complete: allows unrelated members", () => {
  assertValid(plugin, "class A extends LitElement { go() { this.items; } }");
  assertValid(plugin, "const done = this.complete;");
});

Deno.test("no-update-complete: allows a same-named computed key", () => {
  assertValid(plugin, 'const done = this["updateComplete"];');
});

Deno.test("no-update-complete: rejects awaiting it", () => {
  assertInvalid(
    plugin,
    "class A extends LitElement { async go() { await this.updateComplete; } }",
  );
});

Deno.test("no-update-complete: rejects a then chain", () => {
  assertInvalid(plugin, "this.updateComplete.then(() => this.measure());");
});

Deno.test("no-update-complete: rejects it on a controller host", () => {
  assertInvalid(plugin, "class C { sync() { this.#host.updateComplete; } }");
});

Deno.test("no-update-complete: highlights the member access", () => {
  const code =
    "class A extends LitElement { async go() { await this.updateComplete; } }";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "this.updateComplete");
});
