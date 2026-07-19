import { composedRequiresBubbles } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("composed-requires-bubbles", composedRequiresBubbles);

Deno.test("composed-requires-bubbles: allows composed with bubbles", () => {
  assertValid(
    plugin,
    'new CustomEvent("close", { bubbles: true, composed: true });',
  );
  assertValid(
    plugin,
    'new Event("close", { composed: true, bubbles: true });',
  );
});

Deno.test("composed-requires-bubbles: allows bubbles alone", () => {
  assertValid(plugin, 'new CustomEvent("close", { bubbles: true });');
});

Deno.test("composed-requires-bubbles: allows no init object", () => {
  assertValid(plugin, 'new CustomEvent("close");');
  assertValid(plugin, 'new CustomEvent("close", init);');
});

Deno.test("composed-requires-bubbles: allows a computed bubbles value", () => {
  assertValid(
    plugin,
    'new CustomEvent("close", { composed: true, bubbles: shouldBubble });',
  );
});

Deno.test("composed-requires-bubbles: allows a spread it cannot see through", () => {
  assertValid(plugin, 'new CustomEvent("close", { ...base, composed: true });');
});

Deno.test("composed-requires-bubbles: rejects composed without bubbles", () => {
  assertInvalid(plugin, 'new CustomEvent("close", { composed: true });');
});

Deno.test("composed-requires-bubbles: rejects composed with bubbles false", () => {
  assertInvalid(
    plugin,
    'new CustomEvent("close", { composed: true, bubbles: false });',
  );
});

Deno.test("composed-requires-bubbles: rejects on a plain Event", () => {
  assertInvalid(
    plugin,
    'new Event("close", { composed: true, detail: 1 });',
  );
});

Deno.test("composed-requires-bubbles: highlights the composed option", () => {
  const code =
    'this.dispatchEvent(new CustomEvent("close", { composed: true }));';
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "composed: true");
});
