import { valueAfterConstraints } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("value-after-constraints", valueAfterConstraints);

Deno.test("value-after-constraints: allows value last", () => {
  assertValid(plugin, 'const t = html`<input min="1" .value=${this.v}>`;');
  assertValid(
    plugin,
    'const t = html`<input type="number" min="1" max="9" value="5">`;',
  );
  assertValid(plugin, "const t = html`<input .value=${this.v}>`;");
  assertValid(plugin, 'const t = html`<input min="1" max="9">`;');
});

Deno.test("value-after-constraints: ignores non-form elements", () => {
  assertValid(plugin, 'const t = html`<x-y value="5" max="9"></x-y>`;');
});

Deno.test("value-after-constraints: rejects value before a constraint", () => {
  assertInvalid(plugin, 'const t = html`<input .value=${this.v} min="1">`;');
  assertInvalid(plugin, 'const t = html`<input value="5" pattern="\\\\d+">`;');
  assertInvalid(
    plugin,
    'const t = html`<textarea .value=${this.v} maxlength="9"></textarea>`;',
  );
});

Deno.test("value-after-constraints: reports once per element", () => {
  assertInvalid(
    plugin,
    'const t = html`<input .value=${this.v} min="1" max="9">`;',
    1,
  );
});

Deno.test("value-after-constraints: ignores non-html templates", () => {
  assertValid(plugin, 'const t = sql`<input .value=${this.v} min="1">`;');
});

Deno.test("value-after-constraints: highlights the value binding", () => {
  const code = 'const t = html`<input .value=${this.v} min="1">`;';
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, ".value=${this.v}");
});
