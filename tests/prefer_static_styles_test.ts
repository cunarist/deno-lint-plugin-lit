import { preferStaticStyles } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("prefer-static-styles", preferStaticStyles);

Deno.test("prefer-static-styles: allows templates without a style element", () => {
  assertValid(plugin, "const t = html`<div>${this.name}</div>`;");
  assertValid(plugin, "const t = html`<div style=${this.css}></div>`;");
  assertValid(plugin, "const t = html`<p>the style tag</p>`;");
});

Deno.test("prefer-static-styles: rejects a style element", () => {
  assertInvalid(plugin, "const t = html`<style>p { color: red; }</style>`;");
  assertInvalid(plugin, "const t = html`<div><style>p{}</style></div>`;");
});

Deno.test("prefer-static-styles: ignores non-html templates", () => {
  assertValid(plugin, "const t = sql`<style>p{}</style>`;");
});

Deno.test("prefer-static-styles: highlights the opening style tag", () => {
  const code = "const t = html`<div><style>p{}</style></div>`;";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "<style>");
});
