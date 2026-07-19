import { noLegacyTemplateSyntax } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-legacy-template-syntax", noLegacyTemplateSyntax);

Deno.test("no-legacy-template-syntax: allows Lit bindings", () => {
  assertValid(plugin, "const t = html`<div>${this.name}</div>`;");
  assertValid(plugin, "const t = html`<div class=${this.cls}></div>`;");
  assertValid(plugin, "const t = html`<div>[ a ]</div>`;");
  assertValid(plugin, "const t = html`<div>{ a }</div>`;");
  assertValid(plugin, "const t = html`<div>${this.a}${this.b}</div>`;");
});

Deno.test("no-legacy-template-syntax: rejects Polymer one-way binding", () => {
  assertInvalid(plugin, "const t = html`<div>[[this.name]]</div>`;");
});

Deno.test("no-legacy-template-syntax: rejects Polymer two-way binding", () => {
  assertInvalid(plugin, "const t = html`<div title={{name}}></div>`;");
});

Deno.test("no-legacy-template-syntax: ignores non-html templates", () => {
  assertValid(plugin, "const t = sql`<div>[[name]]</div>`;");
});

Deno.test("no-legacy-template-syntax: highlights the legacy binding", () => {
  const code = "const t = html`<div>${this.a} [[name]]</div>`;";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "[[name]]");
});
