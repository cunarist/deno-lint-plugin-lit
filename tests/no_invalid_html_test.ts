import { noInvalidHtml } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-invalid-html", noInvalidHtml);

Deno.test("no-invalid-html: allows well-formed markup", () => {
  assertValid(plugin, "const t = html`<div></div>`;");
  assertValid(plugin, "const t = html`<div>${this.name}</div>`;");
  assertValid(plugin, "const t = html`<x-y .prop=${this.value}></x-y>`;");
  assertValid(plugin, "const t = html`<input .value=${this.v}>`;");
  assertValid(plugin, "const t = html`<br/><hr>`;");
  assertValid(plugin, "const t = html`<ul><li>a<li>b</ul>`;");
  assertValid(plugin, "const t = html`<div>a &amp; b</div>`;");
  assertValid(plugin, "const t = html``;");
});

Deno.test("no-invalid-html: rejects an unclosed tag", () => {
  assertInvalid(plugin, "const t = html`<div>`;");
  assertInvalid(plugin, "const t = html`<div><span></div>`;");
});

Deno.test("no-invalid-html: rejects a stray `<`", () => {
  assertInvalid(plugin, "const t = html`<div>a < b</div>`;");
});

Deno.test("no-invalid-html: rejects a truncated tag", () => {
  assertInvalid(plugin, "const t = html`<div`;");
});

Deno.test("no-invalid-html: leaves duplicate attributes to its own rule", () => {
  assertValid(plugin, 'const t = html`<div a="1" a="2"></div>`;');
});

Deno.test("no-invalid-html: ignores non-html templates", () => {
  assertValid(plugin, "const t = sql`<div>`;");
});

Deno.test("no-invalid-html: highlights the unclosed start tag", () => {
  const code = "const t = html`<div><span></div>`;";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "<span>");
});

Deno.test("no-invalid-html: highlights the stray `<`", () => {
  const code = "const t = html`<div>a < b</div>`;";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "<");
});
