import { noTemplateResultInAttribute } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "no-template-result-in-attribute",
  noTemplateResultInAttribute,
);

Deno.test("no-template-result-in-attribute: allows a template in child position", () => {
  assertValid(plugin, "const t = html`<div>${html`<b>hi</b>`}</div>`;");
  assertValid(plugin, "const t = html`<div>${this.body}</div>`;");
});

Deno.test("no-template-result-in-attribute: allows a plain attribute value", () => {
  assertValid(plugin, "const t = html`<div title=${this.label}></div>`;");
});

Deno.test("no-template-result-in-attribute: allows a template in a property binding", () => {
  assertValid(plugin, "const t = html`<x-y .body=${html`<b>hi</b>`}></x-y>`;");
});

Deno.test("no-template-result-in-attribute: rejects a template in an attribute", () => {
  assertInvalid(
    plugin,
    "const t = html`<div title=${html`<b>hi</b>`}></div>`;",
  );
});

Deno.test("no-template-result-in-attribute: rejects a template inside a quoted value", () => {
  assertInvalid(
    plugin,
    'const t = html`<div title="a ${html`<b>hi</b>`}"></div>`;',
  );
});

Deno.test("no-template-result-in-attribute: rejects an svg template too", () => {
  assertInvalid(
    plugin,
    "const t = html`<div title=${svg`<circle />`}></div>`;",
  );
});

Deno.test("no-template-result-in-attribute: ignores non-html templates", () => {
  assertValid(plugin, "const t = sql`<div title=${html`<b>hi</b>`}></div>`;");
});

Deno.test("no-template-result-in-attribute: highlights the bound template", () => {
  const code = "const t = html`<div title=${html`<b>hi</b>`}></div>`;";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "html`<b>hi</b>`");
});
