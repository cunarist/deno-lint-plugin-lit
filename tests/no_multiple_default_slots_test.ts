import { noMultipleDefaultSlots } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-multiple-default-slots", noMultipleDefaultSlots);

Deno.test("no-multiple-default-slots: allows a single default slot", () => {
  assertValid(plugin, "const t = html`<slot></slot>`;");
  assertValid(
    plugin,
    'const t = html`<slot></slot><slot name="a"></slot>`;',
  );
  assertValid(
    plugin,
    'const t = html`<slot name="a"></slot><slot name="b"></slot>`;',
  );
  assertValid(plugin, "const t = html`<div></div>`;");
});

Deno.test("no-multiple-default-slots: allows one default slot per template", () => {
  assertValid(
    plugin,
    "const a = html`<slot></slot>`;\nconst b = html`<slot></slot>`;",
  );
});

Deno.test("no-multiple-default-slots: ignores bound names", () => {
  assertValid(
    plugin,
    "const t = html`<slot name=${this.a}></slot><slot name=${this.b}></slot>`;",
  );
});

Deno.test("no-multiple-default-slots: ignores non-html templates", () => {
  assertValid(plugin, "const t = sql`<slot></slot><slot></slot>`;");
});

Deno.test("no-multiple-default-slots: rejects two unnamed slots", () => {
  assertInvalid(plugin, "const t = html`<slot></slot><slot></slot>`;");
});

Deno.test("no-multiple-default-slots: treats an empty name as default", () => {
  assertInvalid(plugin, 'const t = html`<slot></slot><slot name=""></slot>`;');
});

Deno.test("no-multiple-default-slots: reports every slot after the first", () => {
  assertInvalid(
    plugin,
    "const t = html`<slot></slot><div><slot></slot></div><slot></slot>`;",
    2,
  );
});

Deno.test("no-multiple-default-slots: highlights the second start tag", () => {
  const code = "const t = html`<slot></slot><slot></slot>`;";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "<slot>");
  if (diagnostic.range[0] !== code.lastIndexOf("<slot>")) {
    throw new Error("expected the second slot to be reported");
  }
});
