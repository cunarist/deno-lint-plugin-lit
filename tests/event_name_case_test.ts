import { eventNameCase } from "#naming";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("event-name-case", eventNameCase);

Deno.test("event-name-case: allows lowercase names", () => {
  assertValid(plugin, 'new CustomEvent("itemselected");');
  assertValid(plugin, 'new CustomEvent("item-selected");');
  assertValid(plugin, 'new Event("close");');
  assertValid(plugin, 'new CustomEvent("cl:item-selected");');
});

Deno.test("event-name-case: allows a computed name", () => {
  assertValid(plugin, "new CustomEvent(name);");
});

Deno.test("event-name-case: allows the platform's mixed-case name", () => {
  assertValid(plugin, 'new Event("DOMContentLoaded");');
});

Deno.test("event-name-case: ignores other constructors", () => {
  assertValid(plugin, 'new Thing("itemSelected");');
});

Deno.test("event-name-case: rejects a camelCase CustomEvent name", () => {
  assertInvalid(plugin, 'new CustomEvent("itemSelected");');
});

Deno.test("event-name-case: rejects a camelCase Event name", () => {
  assertInvalid(plugin, 'new Event("itemSelected");');
});

Deno.test("event-name-case: rejects a PascalCase name", () => {
  assertInvalid(plugin, 'new CustomEvent("ItemSelected", { bubbles: true });');
});

Deno.test("event-name-case: suggests a dashed lowercase name", () => {
  const [diagnostic] = assertInvalid(
    plugin,
    'new CustomEvent("itemSelected");',
  );
  if (!diagnostic) throw new Error("expected a diagnostic");
  if (!diagnostic.hint?.includes('"item-selected"')) {
    throw new Error(`unexpected hint: ${diagnostic.hint}`);
  }
});

Deno.test("event-name-case: highlights the name literal", () => {
  const code = 'this.dispatchEvent(new CustomEvent("itemSelected"));';
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, '"itemSelected"');
});
