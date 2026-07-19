import { noPartialPropertyBinding } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "no-partial-property-binding",
  noPartialPropertyBinding,
);

Deno.test("no-partial-property-binding: allows a whole-value binding", () => {
  assertValid(plugin, "const t = html`<x-y .prop=${this.a}></x-y>`;");
  assertValid(plugin, 'const t = html`<x-y .prop="${this.a}"></x-y>`;');
  assertValid(plugin, "const t = html`<x-y @go=${this.onGo}></x-y>`;");
  assertValid(plugin, "const t = html`<x-y ?open=${this.open}></x-y>`;");
});

Deno.test("no-partial-property-binding: allows a static property literal", () => {
  assertValid(plugin, 'const t = html`<x-y .prop="hello"></x-y>`;');
});

Deno.test("no-partial-property-binding: allows composed plain attributes", () => {
  assertValid(plugin, 'const t = html`<div class="a ${this.b}"></div>`;');
  assertValid(
    plugin,
    'const t = html`<div class="${this.a} ${this.b}"></div>`;',
  );
});

Deno.test("no-partial-property-binding: rejects a literal prefix", () => {
  assertInvalid(plugin, 'const t = html`<x-y .prop="x${this.a}"></x-y>`;');
});

Deno.test("no-partial-property-binding: rejects a literal suffix", () => {
  assertInvalid(plugin, "const t = html`<x-y .prop=${this.a}px></x-y>`;");
});

Deno.test("no-partial-property-binding: rejects two expressions in one value", () => {
  assertInvalid(
    plugin,
    'const t = html`<x-y .prop="${this.a}${this.b}"></x-y>`;',
  );
});

Deno.test("no-partial-property-binding: rejects a trailing unquoted binding", () => {
  assertInvalid(
    plugin,
    "const t = html`<x-y .prop=${this.a} ${this.b}></x-y>`;",
  );
});

Deno.test("no-partial-property-binding: applies to event and boolean bindings", () => {
  assertInvalid(plugin, 'const t = html`<x-y @go="x${this.a}"></x-y>`;');
  assertInvalid(plugin, 'const t = html`<x-y ?open="${this.a}!"></x-y>`;');
});

Deno.test("no-partial-property-binding: ignores non-html templates", () => {
  assertValid(plugin, 'const t = sql`<x-y .prop="x${this.a}"></x-y>`;');
});

Deno.test("no-partial-property-binding: highlights the whole binding", () => {
  const code = 'const t = html`<x-y .prop="x${this.a}"></x-y>`;';
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, '.prop="x${this.a}"');
});

Deno.test("no-partial-property-binding: highlights through the stray binding", () => {
  const code = "const t = html`<x-y .prop=${this.a} ${this.b}></x-y>`;";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, ".prop=${this.a} ${this.b}");
});
