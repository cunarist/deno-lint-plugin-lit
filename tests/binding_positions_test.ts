import { bindingPositions } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("binding-positions", bindingPositions);

Deno.test("binding-positions: allows normal bindings", () => {
  assertValid(plugin, "const t = html`<div>${this.name}</div>`;");
  assertValid(plugin, "const t = html`<div class=${this.cls}></div>`;");
  assertValid(plugin, "const t = html`<div @click=${this.onClick}></div>`;");
  assertValid(plugin, "const t = html`<x-y .prop=${this.value}></x-y>`;");
});

Deno.test("binding-positions: rejects binding as tag name", () => {
  assertInvalid(plugin, "const t = html`<${this.tag}></div>`;");
});

Deno.test("binding-positions: rejects binding in closing tag", () => {
  assertInvalid(plugin, "const t = html`<div></${this.tag}>`;");
});

Deno.test("binding-positions: rejects binding as attribute name", () => {
  assertInvalid(plugin, 'const t = html`<div ${this.attr}="x"></div>`;');
});

Deno.test("binding-positions: ignores non-html templates", () => {
  assertValid(plugin, "const t = sql`<${this.tag}>`;");
});

Deno.test("binding-positions: highlights the offending binding", () => {
  const code = "const t = html`<div></${this.tag}>`;";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "${this.tag}");
});
