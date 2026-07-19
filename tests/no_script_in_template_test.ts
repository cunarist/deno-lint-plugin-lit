import { noScriptInTemplate } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-script-in-template", noScriptInTemplate);

Deno.test("no-script-in-template: allows templates without scripts", () => {
  assertValid(plugin, "const t = html`<div></div>`;");
  assertValid(plugin, "const t = html`<div>${this.name}</div>`;");
  assertValid(plugin, "const t = html``;");
});

Deno.test("no-script-in-template: does not match a mention in text", () => {
  assertValid(plugin, "const t = html`<p>use a script tag</p>`;");
});

Deno.test("no-script-in-template: ignores non-html templates", () => {
  assertValid(plugin, "const t = sql`<script></script>`;");
});

Deno.test("no-script-in-template: rejects a script element", () => {
  assertInvalid(plugin, "const t = html`<script></script>`;");
  assertInvalid(plugin, "const t = html`<div><script>go();</script></div>`;");
});

Deno.test("no-script-in-template: reports each script", () => {
  assertInvalid(
    plugin,
    "const t = html`<script></script><script></script>`;",
    2,
  );
});

Deno.test("no-script-in-template: highlights the start tag", () => {
  const code = 'const t = html`<script src="x.js"></script>`;';
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, '<script src="x.js">');
});
