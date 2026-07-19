import { requireAccessorWithDecorators } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin(
  "require-accessor-with-decorators",
  requireAccessorWithDecorators,
);

Deno.test("require-accessor-with-decorators: allows an accessor field", () => {
  assertValid(
    plugin,
    [
      "class PathBar extends LitElement {",
      "  @property({ type: String })",
      "  accessor name = '';",
      "}",
    ].join("\n"),
  );
});

Deno.test("require-accessor-with-decorators: allows an undecorated field", () => {
  assertValid(
    plugin,
    [
      "class PathBar extends LitElement {",
      "  cache = new Map();",
      "}",
    ].join("\n"),
  );
});

Deno.test("require-accessor-with-decorators: ignores static properties", () => {
  assertValid(
    plugin,
    [
      "class PathBar extends LitElement {",
      "  static properties = { name: { type: String } };",
      "}",
    ].join("\n"),
  );
});

Deno.test("require-accessor-with-decorators: ignores non-components", () => {
  assertValid(
    plugin,
    [
      "class Plain {",
      "  @property({ type: String })",
      "  name = '';",
      "}",
    ].join("\n"),
  );
});

Deno.test("require-accessor-with-decorators: rejects a plain @property field", () => {
  const diagnostics = assertInvalid(
    plugin,
    [
      "class PathBar extends LitElement {",
      "  @property({ type: String })",
      "  name = '';",
      "}",
    ].join("\n"),
  );
  if (
    diagnostics[0]?.message !==
      "Reactive property `name` is a plain field, not an accessor."
  ) {
    throw new Error(`unexpected message: ${diagnostics[0]?.message}`);
  }
});

Deno.test("require-accessor-with-decorators: rejects a plain @state field", () => {
  assertInvalid(
    plugin,
    [
      "class PathBar extends LitElement {",
      "  @state()",
      "  #open = false;",
      "}",
    ].join("\n"),
  );
});

Deno.test("require-accessor-with-decorators: reports each field", () => {
  assertInvalid(
    plugin,
    [
      "class PathBar extends LitElement {",
      "  @property() a = 1;",
      "  @state() b = 2;",
      "  accessor c = 3;",
      "}",
    ].join("\n"),
    2,
  );
});

Deno.test("require-accessor-with-decorators: highlights the field name", () => {
  const code = [
    "class PathBar extends LitElement {",
    "  @property({ type: String })",
    "  name = '';",
    "}",
  ].join("\n");
  const diagnostics = assertInvalid(plugin, code);
  const [diagnostic] = diagnostics;
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "name");
});
