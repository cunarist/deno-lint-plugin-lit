import { attributeValueEntities } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("attribute-value-entities", attributeValueEntities);

Deno.test("attribute-value-entities: allows escaped values", () => {
  assertValid(plugin, 'const t = html`<a title="a &amp; b"></a>`;');
  assertValid(plugin, 'const t = html`<a title="a &lt; b"></a>`;');
  assertValid(plugin, 'const t = html`<a title="&#38;"></a>`;');
  assertValid(plugin, 'const t = html`<a title="&#x26;"></a>`;');
  assertValid(plugin, 'const t = html`<a title="plain"></a>`;');
  assertValid(plugin, "const t = html`<a title></a>`;");
});

Deno.test("attribute-value-entities: ignores binding values", () => {
  assertValid(plugin, "const t = html`<a title=${this.a && this.b}></a>`;");
  assertValid(plugin, 'const t = html`<a title="${this.a > this.b}"></a>`;');
  assertValid(plugin, "const t = html`<a @click=${this.onClick}></a>`;");
});

Deno.test("attribute-value-entities: rejects a bare ampersand", () => {
  assertInvalid(plugin, 'const t = html`<a title="a & b"></a>`;');
});

Deno.test("attribute-value-entities: rejects unescaped angle brackets", () => {
  assertInvalid(plugin, 'const t = html`<a title="a > b"></a>`;');
});

Deno.test("attribute-value-entities: flags text around a binding", () => {
  assertInvalid(plugin, 'const t = html`<a title="${this.a} & b"></a>`;');
});

Deno.test("attribute-value-entities: ignores non-html templates", () => {
  assertValid(plugin, 'const t = sql`<a title="a & b"></a>`;');
});

Deno.test("attribute-value-entities: highlights the offending character", () => {
  const code = 'const t = html`<a title="a & b"></a>`;';
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "&");
});
