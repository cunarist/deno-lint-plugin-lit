import { noUnsafeHtml } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-unsafe-html", noUnsafeHtml);

Deno.test("no-unsafe-html: allows other directive imports", () => {
  assertValid(plugin, 'import { ref } from "lit/directives/ref.js";');
  assertValid(plugin, 'import { html, LitElement } from "lit";');
});

Deno.test("no-unsafe-html: allows unsafeHTML from an unrelated module", () => {
  assertValid(
    plugin,
    [
      'import { unsafeHTML } from "./local.ts";',
      "const a = unsafeHTML(x);",
    ].join("\n"),
  );
});

Deno.test("no-unsafe-html: rejects the imports", () => {
  assertInvalid(
    plugin,
    'import { unsafeHTML } from "lit/directives/unsafe-html.js";',
  );
  assertInvalid(
    plugin,
    'import { unsafeSVG } from "lit/directives/unsafe-svg.js";',
  );
  assertInvalid(
    plugin,
    'import { unsafeHTML } from "lit-html/directives/unsafe-html.js";',
  );
});

Deno.test("no-unsafe-html: rejects import and call sites", () => {
  const diagnostics = assertInvalid(
    plugin,
    [
      'import { unsafeHTML } from "lit/directives/unsafe-html.js";',
      "const a = unsafeHTML(x);",
      "const b = unsafeHTML(y);",
    ].join("\n"),
    3,
  );
  if (diagnostics[0]?.message !== "`unsafeHTML` imported from Lit.") {
    throw new Error(`unexpected message: ${diagnostics[0]?.message}`);
  }
  if (diagnostics[1]?.message !== "`unsafeHTML(…)` call.") {
    throw new Error(`unexpected message: ${diagnostics[1]?.message}`);
  }
});

Deno.test("no-unsafe-html: follows a renamed import", () => {
  assertInvalid(
    plugin,
    [
      'import { unsafeSVG as raw } from "lit/directives/unsafe-svg.js";',
      "const a = raw(x);",
    ].join("\n"),
    2,
  );
});

Deno.test("no-unsafe-html: highlights the specifier and the call", () => {
  const code = [
    'import { unsafeHTML } from "lit/directives/unsafe-html.js";',
    "const a = unsafeHTML(x);",
  ].join("\n");
  const diagnostics = assertInvalid(plugin, code, 2);
  const [importDiagnostic, callDiagnostic] = diagnostics;
  if (!importDiagnostic || !callDiagnostic) {
    throw new Error("expected two diagnostics");
  }
  assertReportedText(code, importDiagnostic, "unsafeHTML");
  assertReportedText(code, callDiagnostic, "unsafeHTML(x)");
});
