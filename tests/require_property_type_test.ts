import { requirePropertyType } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("require-property-type", requirePropertyType);

Deno.test("require-property-type: requires type when there is an attribute", () => {
  assertInvalid(
    plugin,
    'class El extends LitElement { @property() accessor name = ""; }',
  );
  assertInvalid(
    plugin,
    "class El extends LitElement { @property() accessor count = 0; }",
  );
  assertInvalid(
    plugin,
    "class El extends LitElement { @property({ reflect: true }) accessor open = false; }",
  );
});

Deno.test("require-property-type: catches what inference used to miss", () => {
  // A declared type the rule cannot resolve is exactly where the mistake is
  // easiest to make, so it must still be reported.
  assertInvalid(
    plugin,
    "class El extends LitElement { @property() accessor count: number; }",
  );
  assertInvalid(
    plugin,
    "class El extends LitElement { @property() accessor total: Count; }",
  );
  assertInvalid(
    plugin,
    "class El extends LitElement { @property() accessor cfg = makeConfig(); }",
  );
});

Deno.test("require-property-type: accepts a declared type", () => {
  assertValid(
    plugin,
    "class El extends LitElement { @property({ type: Number }) accessor count = 0; }",
  );
  assertValid(
    plugin,
    'class El extends LitElement { @property({ type: String }) accessor name = ""; }',
  );
});

Deno.test("require-property-type: accepts a custom converter", () => {
  // A converter replaces whatever `type` would have selected.
  assertValid(
    plugin,
    "class El extends LitElement { @property({ converter: dateConverter }) accessor at; }",
  );
});

Deno.test("require-property-type: exempts properties with no attribute", () => {
  assertValid(
    plugin,
    "class El extends LitElement { @property({ attribute: false }) accessor onEdit = () => {}; }",
  );
  assertValid(
    plugin,
    "class El extends LitElement { @state() accessor internal = 0; }",
  );
});

Deno.test("require-property-type: leaves a spread alone", () => {
  // The spread could carry `type`; guessing would invent a false positive.
  assertValid(
    plugin,
    "class El extends LitElement { @property({ ...shared }) accessor x = 0; }",
  );
});

Deno.test("require-property-type: ignores non-Lit classes", () => {
  assertValid(plugin, "class Plain { @property() accessor x = 0; }");
});

Deno.test("require-property-type: highlights the property name", () => {
  const code =
    "class El extends LitElement { @property() accessor count = 0; }";
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "count");
});
