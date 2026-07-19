import { noUnsafeCss } from "#core";

import {
  assertInvalid,
  assertReportedText,
  assertValid,
  rulePlugin,
} from "./harness.ts";

const plugin = rulePlugin("no-unsafe-css", noUnsafeCss);

Deno.test("no-unsafe-css: allows other lit imports", () => {
  assertValid(plugin, 'import { css, html, LitElement } from "lit";');
  assertValid(
    plugin,
    'import { unsafeHTML } from "lit/directives/unsafe-html.js";',
  );
});

Deno.test("no-unsafe-css: allows unsafeCSS from an unrelated module", () => {
  assertValid(
    plugin,
    ['import { unsafeCSS } from "./local.ts";', "const s = unsafeCSS(x);"].join(
      "\n",
    ),
  );
});

Deno.test("no-unsafe-css: rejects the import", () => {
  assertInvalid(plugin, 'import { unsafeCSS } from "lit";');
  assertInvalid(plugin, 'import { unsafeCSS } from "lit-element";');
  assertInvalid(plugin, 'import { unsafeCSS } from "lit-html";');
});

Deno.test("no-unsafe-css: rejects import and call sites", () => {
  const diagnostics = assertInvalid(
    plugin,
    [
      'import { css, unsafeCSS } from "lit";',
      "const a = unsafeCSS(x);",
      "const b = unsafeCSS(y);",
    ].join("\n"),
    3,
  );
  if (diagnostics[0]?.message !== "`unsafeCSS` imported from Lit.") {
    throw new Error(`unexpected message: ${diagnostics[0]?.message}`);
  }
  if (diagnostics[1]?.message !== "`unsafeCSS(…)` call.") {
    throw new Error(`unexpected message: ${diagnostics[1]?.message}`);
  }
});

Deno.test("no-unsafe-css: follows a renamed import", () => {
  assertInvalid(
    plugin,
    ['import { unsafeCSS as raw } from "lit";', "const a = raw(x);"].join("\n"),
    2,
  );
});

Deno.test("no-unsafe-css: highlights the specifier and the call", () => {
  const code = ['import { unsafeCSS } from "lit";', "const a = unsafeCSS(x);"]
    .join("\n");
  const diagnostics = assertInvalid(plugin, code, 2);
  const [importDiagnostic, callDiagnostic] = diagnostics;
  if (!importDiagnostic || !callDiagnostic) {
    throw new Error("expected two diagnostics");
  }
  assertReportedText(code, importDiagnostic, "unsafeCSS");
  assertReportedText(code, callDiagnostic, "unsafeCSS(x)");
});
