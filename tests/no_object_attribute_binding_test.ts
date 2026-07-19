import { noObjectAttributeBinding } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "no-object-attribute-binding",
  noObjectAttributeBinding,
);

Deno.test("no-object-attribute-binding: allows a string attribute value", () => {
  assertValid(plugin, "const t = html`<div title=${this.label}></div>`;");
  assertValid(plugin, 'const t = html`<div title="static"></div>`;');
});

Deno.test("no-object-attribute-binding: allows an object in a property binding", () => {
  assertValid(plugin, "const t = html`<x-y .config=${{ a: 1 }}></x-y>`;");
  assertValid(plugin, "const t = html`<x-y .items=${[1, 2]}></x-y>`;");
});

Deno.test("no-object-attribute-binding: allows an object in child position", () => {
  assertValid(plugin, "const t = html`<div>${this.node}</div>`;");
});

Deno.test("no-object-attribute-binding: rejects an object literal attribute", () => {
  assertInvalid(plugin, "const t = html`<x-y config=${{ a: 1 }}></x-y>`;");
});

Deno.test("no-object-attribute-binding: rejects an array literal attribute", () => {
  assertInvalid(plugin, "const t = html`<x-y items=${[1, 2]}></x-y>`;");
});

Deno.test("no-object-attribute-binding: rejects one inside a quoted value", () => {
  assertInvalid(plugin, 'const t = html`<x-y data="${{ a: 1 }}"></x-y>`;');
});

Deno.test("no-object-attribute-binding: ignores non-html templates", () => {
  assertValid(plugin, "const t = sql`<x-y config=${{ a: 1 }}></x-y>`;");
});

Deno.test("no-object-attribute-binding: highlights the literal", () => {
  const code = "const t = html`<x-y config=${{ a: 1 }}></x-y>`;";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "{ a: 1 }");
});
