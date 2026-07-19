import { directiveAllowlist } from "#strict";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("directive-allowlist", directiveAllowlist);

Deno.test("directive-allowlist: allows ref and repeat", () => {
  assertValid(plugin, 'import { ref } from "lit/directives/ref.js";');
  assertValid(plugin, 'import { repeat } from "lit/directives/repeat.js";');
});

Deno.test("directive-allowlist: ignores non-directive imports", () => {
  assertValid(plugin, 'import { html, css, LitElement } from "lit";');
  assertValid(plugin, 'import { customElement } from "lit/decorators.js";');
  assertValid(plugin, 'import { classMap } from "./directives/class-map.ts";');
});

Deno.test("directive-allowlist: rejects other lit directives", () => {
  for (
    const source of [
      "lit/directives/class-map.js",
      "lit/directives/style-map.js",
      "lit/directives/when.js",
      "lit/directives/unsafe-html.js",
      "lit/directives/live.js",
    ]
  ) {
    assertInvalid(plugin, `import { x } from "${source}";`);
  }
});

Deno.test("directive-allowlist: rejects legacy directive paths", () => {
  assertInvalid(plugin, 'import { ref } from "lit-html/directives/ref.js";');
});

Deno.test("directive-allowlist: highlights the module specifier", () => {
  const code = 'import { when } from "lit/directives/when.js";';
  const [diagnostic] = assertInvalid(plugin, code);
  if (!diagnostic) throw new Error("expected a diagnostic");
  assertReportedText(code, diagnostic, '"lit/directives/when.js"');
});
