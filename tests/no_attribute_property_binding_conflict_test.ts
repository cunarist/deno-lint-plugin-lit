import { noAttributePropertyBindingConflict } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "no-attribute-property-binding-conflict",
  noAttributePropertyBindingConflict,
);

Deno.test("no-attribute-property-binding-conflict: allows one binding per name", () => {
  assertValid(plugin, "const t = html`<x-y .foo=${this.a}></x-y>`;");
  assertValid(plugin, "const t = html`<x-y foo=${this.a}></x-y>`;");
  assertValid(
    plugin,
    "const t = html`<x-y foo=${this.a} .bar=${this.b}></x-y>`;",
  );
});

Deno.test("no-attribute-property-binding-conflict: allows other sigils alongside", () => {
  assertValid(
    plugin,
    "const t = html`<x-y ?foo=${this.a} @foo=${this.b}></x-y>`;",
  );
});

Deno.test("no-attribute-property-binding-conflict: allows the same pair on different elements", () => {
  assertValid(
    plugin,
    "const t = html`<x-y foo=${this.a}></x-y><x-z .foo=${this.b}></x-z>`;",
  );
});

Deno.test("no-attribute-property-binding-conflict: rejects attribute plus property", () => {
  assertInvalid(
    plugin,
    "const t = html`<x-y foo=${this.a} .foo=${this.b}></x-y>`;",
  );
  assertInvalid(plugin, 'const t = html`<x-y .foo=${this.a} foo="b"></x-y>`;');
});

Deno.test("no-attribute-property-binding-conflict: ignores non-html templates", () => {
  assertValid(
    plugin,
    "const t = sql`<x-y foo=${this.a} .foo=${this.b}></x-y>`;",
  );
});

Deno.test("no-attribute-property-binding-conflict: highlights the second binding", () => {
  const code = "const t = html`<x-y foo=${this.a} .foo=${this.b}></x-y>`;";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, ".foo");
});

Deno.test("no-attribute-property-binding-conflict: highlights the attribute when it is second", () => {
  const code = 'const t = html`<x-y .foo=${this.a} foo="b"></x-y>`;';
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "foo");
});
