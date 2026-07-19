import { noIndexAsRepeatKey } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-index-as-repeat-key", noIndexAsRepeatKey);

Deno.test("no-index-as-repeat-key: allows an item-derived key", () => {
  assertValid(
    plugin,
    "const rows = repeat(this.items, (item) => item.id, this.#renderRow);",
  );
  assertValid(
    plugin,
    "const rows = repeat(this.items, (item, i) => item.id, this.#renderRow);",
  );
  assertValid(
    plugin,
    "const rows = repeat(this.items, this.#itemId, this.#renderRow);",
  );
});

Deno.test("no-index-as-repeat-key: ignores unrelated calls", () => {
  assertValid(plugin, "const x = other(a, (item, i) => i, c);");
  assertValid(plugin, "const x = this.repeat(a, (item, i) => i, c);");
});

Deno.test("no-index-as-repeat-key: ignores a key using the first parameter", () => {
  assertValid(
    plugin,
    "const rows = repeat(this.items, (item) => item, this.#renderRow);",
  );
});

Deno.test("no-index-as-repeat-key: rejects an index key", () => {
  assertInvalid(
    plugin,
    "const rows = repeat(this.items, (item, i) => i, this.#renderRow);",
  );
  assertInvalid(
    plugin,
    "const rows = repeat(this.items, (_, index) => index, this.#renderRow);",
  );
});

Deno.test("no-index-as-repeat-key: rejects a block-bodied index key", () => {
  assertInvalid(
    plugin,
    "const rows = repeat(this.items, (item, i) => { return i; }, this.#renderRow);",
  );
  assertInvalid(
    plugin,
    "const rows = repeat(this.items, function (item, i) { return i; }, this.#renderRow);",
  );
});

Deno.test("no-index-as-repeat-key: rejects it inside a template too", () => {
  assertInvalid(
    plugin,
    "const t = html`<ul>${repeat(this.items, (item, i) => i, this.#renderRow)}</ul>`;",
  );
});

Deno.test("no-index-as-repeat-key: highlights the key function", () => {
  const code =
    "const rows = repeat(this.items, (item, i) => i, this.#renderRow);";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "(item, i) => i");
});
