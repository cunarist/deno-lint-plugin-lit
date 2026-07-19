import { requireRepeatKey } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("require-repeat-key", requireRepeatKey);

Deno.test("require-repeat-key: allows the three-argument form", () => {
  assertValid(
    plugin,
    "const rows = repeat(this.items, (item) => item.id, this.#renderRow);",
  );
  assertValid(
    plugin,
    "const rows = repeat(this.items, this.#itemId, this.#renderRow);",
  );
});

Deno.test("require-repeat-key: ignores unrelated calls", () => {
  assertValid(plugin, "const x = other(a, b);");
  assertValid(plugin, "const x = this.repeat(a, b);");
  assertValid(plugin, "const x = str.repeat(2);");
});

Deno.test("require-repeat-key: ignores a spread that could supply the key", () => {
  assertValid(plugin, "const rows = repeat(...args);");
  assertValid(plugin, "const rows = repeat(this.items, ...rest);");
});

Deno.test("require-repeat-key: rejects the two-argument form", () => {
  assertInvalid(plugin, "const rows = repeat(this.items, this.#renderRow);");
});

Deno.test("require-repeat-key: rejects it inside a template too", () => {
  assertInvalid(
    plugin,
    "const t = html`<ul>${repeat(this.items, this.#renderRow)}</ul>`;",
  );
});

Deno.test("require-repeat-key: highlights the whole call", () => {
  const code = "const rows = repeat(this.items, this.#renderRow);";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "repeat(this.items, this.#renderRow)");
});
