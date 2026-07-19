import { noUselessTemplateLiterals } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "no-useless-template-literals",
  noUselessTemplateLiterals,
);

Deno.test("no-useless-template-literals: allows templates with markup", () => {
  assertValid(plugin, "const t = html`<div>${x}</div>`;");
  assertValid(plugin, "const t = html`${x}${y}`;");
  assertValid(plugin, "const t = html`text ${x}`;");
  assertValid(plugin, "const t = html``;");
  assertValid(plugin, "const t = html`<div></div>`;");
});

Deno.test("no-useless-template-literals: rejects a lone binding", () => {
  assertInvalid(plugin, "const t = html`${x}`;");
  assertInvalid(plugin, "const t = html`${this.body}`;");
});

Deno.test("no-useless-template-literals: ignores non-html templates", () => {
  assertValid(plugin, "const t = sql`${x}`;");
});

Deno.test("no-useless-template-literals: highlights the whole template", () => {
  const code = "const t = html`${this.body}`;";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "html`${this.body}`");
});
