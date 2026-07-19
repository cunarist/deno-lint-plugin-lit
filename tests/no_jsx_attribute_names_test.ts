import { noJsxAttributeNames } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-jsx-attribute-names", noJsxAttributeNames);

Deno.test("no-jsx-attribute-names: allows the HTML spellings", () => {
  assertValid(plugin, 'const t = html`<div class="a"></div>`;');
  assertValid(plugin, "const t = html`<label for=${this.id}></label>`;");
  assertValid(plugin, "const t = html`<div class=${this.classes}></div>`;");
});

Deno.test("no-jsx-attribute-names: allows the property bindings", () => {
  assertValid(plugin, "const t = html`<div .className=${this.a}></div>`;");
  assertValid(plugin, "const t = html`<label .htmlFor=${this.id}></label>`;");
});

Deno.test("no-jsx-attribute-names: rejects className", () => {
  assertInvalid(plugin, "const t = html`<div className=${this.a}></div>`;");
  assertInvalid(plugin, 'const t = html`<div classname="a"></div>`;');
});

Deno.test("no-jsx-attribute-names: rejects htmlFor", () => {
  assertInvalid(plugin, "const t = html`<label htmlFor=${this.id}></label>`;");
});

Deno.test("no-jsx-attribute-names: ignores non-html templates", () => {
  assertValid(plugin, 'const t = sql`<div className="a"></div>`;');
});

Deno.test("no-jsx-attribute-names: highlights the attribute name", () => {
  const code = "const t = html`<div className=${this.a}></div>`;";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "className");
});
