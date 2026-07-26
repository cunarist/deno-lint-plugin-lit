import { assertEquals } from "@std/assert";

import { requireDirectRegistrationImport } from "#core";
import { hashText, type ScanCache, setScanFacts } from "#scan-index";

const plugin: Deno.lint.Plugin = {
  name: "lit",
  rules: {
    "require-direct-registration-import": requireDirectRegistrationImport,
  },
};

const USES_WIDGET =
  "const html = (s: TemplateStringsArray) => s;\nexport const v = html`<cl-widget></cl-widget>`;";

/** Runs the rule over source seen as `bad.ts`, against injected facts. */
function lintWith(cache: ScanCache): Deno.lint.Diagnostic[] {
  setScanFacts({ root: Deno.cwd(), cache });
  try {
    return Deno.lint.runPlugin(plugin, "bad.ts", USES_WIDGET);
  } finally {
    setScanFacts(null);
  }
}

/** Facts placing `cl-widget` in `element.ts` and `bad.ts` importing `imports`. */
function factsFor(imports: readonly string[]): ScanCache {
  return {
    registrations: { "cl-widget": "element.ts" },
    files: {
      "bad.ts": {
        hash: hashText(USES_WIDGET),
        components: [],
        templates: [{ kind: "html", start: USES_WIDGET.indexOf("html`") }],
        imports,
      },
    },
  };
}

Deno.test("require-direct-registration-import: flags an unimported tag", () => {
  const diagnostics = lintWith(factsFor([]));
  assertEquals(diagnostics.length, 1);
  assertEquals(diagnostics[0]?.id, "lit/require-direct-registration-import");
});

Deno.test("require-direct-registration-import: passes when imported", () => {
  assertEquals(lintWith(factsFor(["element.ts"])), []);
});

Deno.test("require-direct-registration-import: stays silent when the hash differs", () => {
  // The facts' hash is from other content, so they must not be trusted.
  const diagnostics = lintWith({
    registrations: { "cl-widget": "element.ts" },
    files: {
      "bad.ts": {
        hash: "stale",
        components: [],
        templates: [],
        imports: [],
      },
    },
  });
  assertEquals(diagnostics, []);
});

Deno.test("require-direct-registration-import: does nothing with no facts", () => {
  setScanFacts(null);
  assertEquals(Deno.lint.runPlugin(plugin, "bad.ts", USES_WIDGET), []);
});
