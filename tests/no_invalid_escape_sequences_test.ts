import { noInvalidEscapeSequences } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "no-invalid-escape-sequences",
  noInvalidEscapeSequences,
);

Deno.test("no-invalid-escape-sequences: allows valid escapes", () => {
  assertValid(plugin, "const t = html`<div>\\x41</div>`;");
  assertValid(plugin, "const t = html`<div>\\u0041</div>`;");
  assertValid(plugin, "const t = html`<div>\\u{1F600}</div>`;");
  assertValid(plugin, "const t = html`<div>\\n\\t</div>`;");
  assertValid(plugin, "const t = html`<div>\\\\x</div>`;");
});

Deno.test("no-invalid-escape-sequences: leaves regex classes alone", () => {
  assertValid(plugin, 'const t = html`<input pattern="\\d+\\w*">`;');
});

Deno.test("no-invalid-escape-sequences: rejects a bad hex escape", () => {
  assertInvalid(plugin, "const t = html`<div>\\xZZ</div>`;");
});

Deno.test("no-invalid-escape-sequences: rejects a short unicode escape", () => {
  assertInvalid(plugin, "const t = html`<div>\\u00</div>`;");
});

Deno.test("no-invalid-escape-sequences: rejects a bad code point escape", () => {
  assertInvalid(plugin, "const t = html`<div>\\u{ZZ}</div>`;");
});

Deno.test("no-invalid-escape-sequences: checks every quasi", () => {
  assertInvalid(plugin, "const t = html`<div>${this.a}\\xZZ</div>`;");
});

Deno.test("no-invalid-escape-sequences: ignores non-html templates", () => {
  assertValid(plugin, "const t = sql`\\xZZ`;");
});

Deno.test("no-invalid-escape-sequences: highlights the escape", () => {
  const code = "const t = html`<div>\\xZZ</div>`;";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "\\xZZ");
});
