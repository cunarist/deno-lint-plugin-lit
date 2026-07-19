import { noDuplicateTemplateBindings } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "no-duplicate-template-bindings",
  noDuplicateTemplateBindings,
);

Deno.test("no-duplicate-template-bindings: allows distinct bindings", () => {
  assertValid(plugin, "const t = html`<x-y a=${this.a} b=${this.b}></x-y>`;");
  assertValid(plugin, "const t = html`<x-y></x-y><x-y></x-y>`;");
  assertValid(plugin, 'const t = html`<div a="1"></div><div a="2"></div>`;');
});

Deno.test("no-duplicate-template-bindings: sigils are separate namespaces", () => {
  assertValid(
    plugin,
    "const t = html`<x-y foo=${this.a} .foo=${this.b} ?foo=${this.c} @foo=${this.d}></x-y>`;",
  );
});

Deno.test("no-duplicate-template-bindings: rejects a repeated attribute", () => {
  assertInvalid(plugin, 'const t = html`<div a="1" a="2"></div>`;');
});

Deno.test("no-duplicate-template-bindings: rejects a repeated property", () => {
  assertInvalid(
    plugin,
    "const t = html`<x-y .foo=${this.a} .foo=${this.b}></x-y>`;",
  );
});

Deno.test("no-duplicate-template-bindings: rejects a repeated listener", () => {
  assertInvalid(
    plugin,
    "const t = html`<x-y @go=${this.a} @go=${this.b}></x-y>`;",
  );
});

Deno.test("no-duplicate-template-bindings: ignores non-html templates", () => {
  assertValid(plugin, 'const t = sql`<div a="1" a="2"></div>`;');
});

Deno.test("no-duplicate-template-bindings: highlights the second binding", () => {
  const code = "const t = html`<x-y .foo=${this.a} .foo=${this.b}></x-y>`;";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, ".foo");
});
