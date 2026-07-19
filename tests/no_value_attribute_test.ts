import { noValueAttribute } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-value-attribute", noValueAttribute);

Deno.test("no-value-attribute: allows the property binding", () => {
  assertValid(plugin, "const t = html`<input .value=${this.v}>`;");
  assertValid(
    plugin,
    "const t = html`<textarea .value=${this.v}></textarea>`;",
  );
});

Deno.test("no-value-attribute: allows a static default value", () => {
  assertValid(plugin, 'const t = html`<input value="5">`;');
});

Deno.test("no-value-attribute: ignores non-form elements", () => {
  assertValid(plugin, "const t = html`<div value=${this.v}></div>`;");
  assertValid(plugin, "const t = html`<x-y value=${this.v}></x-y>`;");
});

Deno.test("no-value-attribute: rejects a bound value attribute", () => {
  assertInvalid(plugin, "const t = html`<input value=${this.v}>`;");
  assertInvalid(plugin, "const t = html`<select value=${this.v}></select>`;");
  assertInvalid(
    plugin,
    "const t = html`<textarea value=${this.v}></textarea>`;",
  );
});

Deno.test("no-value-attribute: ignores non-html templates", () => {
  assertValid(plugin, "const t = sql`<input value=${this.v}>`;");
});

Deno.test("no-value-attribute: highlights the whole attribute", () => {
  const code = "const t = html`<input value=${this.v}>`;";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "value=${this.v}");
});
