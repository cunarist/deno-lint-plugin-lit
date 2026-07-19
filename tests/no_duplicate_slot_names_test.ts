import { noDuplicateSlotNames } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-duplicate-slot-names", noDuplicateSlotNames);

Deno.test("no-duplicate-slot-names: allows distinct names", () => {
  assertValid(
    plugin,
    'const t = html`<slot name="a"></slot><slot name="b"></slot>`;',
  );
  assertValid(plugin, 'const t = html`<slot name="a"></slot>`;');
  assertValid(plugin, "const t = html`<slot></slot>`;");
  assertValid(plugin, "const t = html`<div></div>`;");
});

Deno.test("no-duplicate-slot-names: allows the same name in separate templates", () => {
  assertValid(
    plugin,
    'const a = html`<slot name="x"></slot>`;\nconst b = html`<slot name="x"></slot>`;',
  );
});

Deno.test("no-duplicate-slot-names: ignores bound names", () => {
  assertValid(
    plugin,
    "const t = html`<slot name=${this.a}></slot><slot name=${this.b}></slot>`;",
  );
});

Deno.test("no-duplicate-slot-names: ignores non-html templates", () => {
  assertValid(
    plugin,
    'const t = sql`<slot name="a"></slot><slot name="a"></slot>`;',
  );
});

Deno.test("no-duplicate-slot-names: rejects a repeated name", () => {
  assertInvalid(
    plugin,
    'const t = html`<slot name="a"></slot><slot name="a"></slot>`;',
  );
});

Deno.test("no-duplicate-slot-names: rejects a repeat nested elsewhere", () => {
  assertInvalid(
    plugin,
    'const t = html`<slot name="a"></slot><div><slot name="a"></slot></div>`;',
  );
});

Deno.test("no-duplicate-slot-names: reports every slot after the first", () => {
  assertInvalid(
    plugin,
    'const t = html`<slot name="a"></slot><slot name="a"></slot><slot name="a"></slot>`;',
    2,
  );
});

Deno.test("no-duplicate-slot-names: highlights the repeated name attribute", () => {
  const code = 'const t = html`<slot name="a"></slot><slot name="a"></slot>`;';
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, 'name="a"');
  // The *second* occurrence, not the first.
  if (diagnostic.range[0] <= code.indexOf('name="a"')) {
    throw new Error("expected the second slot to be reported");
  }
});
