import { noPrivateProperties } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-private-properties", noPrivateProperties);

Deno.test("no-private-properties: rejects @property on a # field", () => {
  assertInvalid(
    plugin,
    "class El extends LitElement { @property({ type: Boolean }) accessor #open = false; }",
  );
});

Deno.test("no-private-properties: accepts @state on a # field", () => {
  assertValid(
    plugin,
    "class El extends LitElement { @state() accessor #open = false; }",
  );
});

Deno.test("no-private-properties: accepts a public name", () => {
  assertValid(
    plugin,
    "class El extends LitElement { @property({ type: Boolean }) accessor open = false; }",
  );
});

Deno.test("no-private-properties: leaves underscore names alone", () => {
  // A leading underscore is a convention, not a language feature. Some
  // codebases use it for genuinely public fields.
  assertValid(
    plugin,
    "class El extends LitElement { @property({ type: Boolean }) accessor _open = false; }",
  );
});

Deno.test("no-private-properties: checks static properties entries", () => {
  assertInvalid(
    plugin,
    "class El extends LitElement { static properties = { '#open': { type: Boolean } }; }",
  );
});

Deno.test("no-private-properties: ignores non-Lit classes", () => {
  assertValid(
    plugin,
    "class Plain { @property({ type: Boolean }) accessor #open = false; }",
  );
});

Deno.test("no-private-properties: highlights the field name", () => {
  const code =
    "class El extends LitElement { @property({ type: Boolean }) accessor #open = false; }";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "#open");
});
