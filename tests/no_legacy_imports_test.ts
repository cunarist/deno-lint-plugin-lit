import { noLegacyImports } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-legacy-imports", noLegacyImports);

Deno.test("no-legacy-imports: allows modern lit imports", () => {
  assertValid(plugin, 'import { LitElement, html, css } from "lit";');
  assertValid(plugin, 'import { property, state } from "lit/decorators.js";');
  assertValid(plugin, 'import { repeat } from "lit/directives/repeat.js";');
});

Deno.test("no-legacy-imports: ignores unrelated packages", () => {
  assertValid(plugin, 'import { html } from "preact";');
  assertValid(plugin, 'import { internalProperty } from "./local.ts";');
});

Deno.test("no-legacy-imports: rejects lit-element", () => {
  assertInvalid(plugin, 'import { LitElement } from "lit-element";');
});

Deno.test("no-legacy-imports: rejects lit-html", () => {
  assertInvalid(plugin, 'import { html } from "lit-html";');
});

Deno.test("no-legacy-imports: rejects legacy subpaths", () => {
  assertInvalid(
    plugin,
    'import { repeat } from "lit-html/directives/repeat.js";',
  );
});

Deno.test("no-legacy-imports: rejects renamed exports from lit", () => {
  assertInvalid(plugin, 'import { UpdatingElement } from "lit";');
  assertInvalid(plugin, 'import { internalProperty } from "lit";');
});

Deno.test("no-legacy-imports: reports path and name separately", () => {
  assertInvalid(
    plugin,
    'import { UpdatingElement } from "lit-element";',
    2,
  );
});

Deno.test("no-legacy-imports: highlights the module specifier", () => {
  const code = 'import { html } from "lit-html";';
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, '"lit-html"');
});

Deno.test("no-legacy-imports: highlights the renamed export", () => {
  const code = 'import { internalProperty } from "lit";';
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, "internalProperty");
});
