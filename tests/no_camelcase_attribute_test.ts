import { noCamelcaseAttribute } from "#naming";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-camelcase-attribute", noCamelcaseAttribute);

Deno.test("no-camelcase-attribute: allows lowercase attributes", () => {
  assertValid(plugin, "const t = html`<x-y my-prop=${this.v}></x-y>`;");
  assertValid(plugin, 'const t = html`<div data-id="1" tabindex="0"></div>`;');
});

Deno.test("no-camelcase-attribute: allows the case-sensitive sigils", () => {
  assertValid(plugin, "const t = html`<x-y .myProp=${this.v}></x-y>`;");
  assertValid(plugin, "const t = html`<x-y @myEvent=${this.v}></x-y>`;");
  assertValid(plugin, "const t = html`<x-y ?myFlag=${this.v}></x-y>`;");
});

Deno.test("no-camelcase-attribute: allows camelCase in SVG content", () => {
  assertValid(plugin, 'const t = html`<svg viewBox="0 0 1 1"></svg>`;');
  assertValid(
    plugin,
    'const t = html`<svg><linearGradient gradientUnits="userSpaceOnUse"></linearGradient></svg>`;',
  );
});

Deno.test("no-camelcase-attribute: defers className to no-jsx-attribute-names", () => {
  assertValid(plugin, "const t = html`<div className=${this.a}></div>`;");
  assertValid(plugin, "const t = html`<label htmlFor=${this.id}></label>`;");
});

Deno.test("no-camelcase-attribute: rejects a camelCase attribute", () => {
  assertInvalid(plugin, "const t = html`<x-y myProp=${this.v}></x-y>`;");
  assertInvalid(plugin, 'const t = html`<x-y itemCount="3"></x-y>`;');
});

Deno.test("no-camelcase-attribute: reports each offender", () => {
  assertInvalid(
    plugin,
    "const t = html`<x-y aBc=${this.v} dEf=${this.w}></x-y>`;",
    2,
  );
});

Deno.test("no-camelcase-attribute: ignores non-html templates", () => {
  assertValid(plugin, "const t = sql`<x-y myProp=${this.v}></x-y>`;");
});

Deno.test("no-camelcase-attribute: highlights the attribute name", () => {
  const code = "const t = html`<x-y myProp=${this.v}></x-y>`;";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "myProp");
});
