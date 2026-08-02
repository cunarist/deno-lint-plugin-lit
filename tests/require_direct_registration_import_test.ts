import { createDenoProgram } from "@cunarist/typescript-deno-lint/program";
import {
  clearTestProgram,
  useTestProgram,
} from "@cunarist/typescript-deno-lint/testing";
import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";

import { requireDirectRegistrationImport } from "#core";

/**
 * This rule is the one place the whole program matters, so it is tested over a
 * real fixture project rather than a snippet: `bad.ts` uses `<cl-b>` without
 * importing the module that registers it, `good.ts` imports both.
 */
const plugin: Deno.lint.Plugin = {
  name: "lit",
  rules: {
    "require-direct-registration-import": requireDirectRegistrationImport,
  },
};

const fixture = (name: string): string =>
  fromFileUrl(new URL(`./scanner_fixture/${name}`, import.meta.url))
    .replaceAll("\\", "/");

const config = fixture("deno.json");
const bad = fixture("bad.ts");
const good = fixture("good.ts");

const { program } = await createDenoProgram([bad, good], config);

/** Runs the rule over one fixture file, against the fixture's own program. */
function lintFixture(file: string): Deno.lint.Diagnostic[] {
  useTestProgram(program);
  try {
    return Deno.lint.runPlugin(plugin, file, Deno.readTextFileSync(file));
  } finally {
    clearTestProgram();
  }
}

Deno.test("require-direct-registration-import: flags an unimported tag", () => {
  const diagnostics = lintFixture(bad);
  assertEquals(diagnostics.length, 1);
  assertEquals(diagnostics[0]?.id, "lit/require-direct-registration-import");
  assertEquals(
    diagnostics[0]?.message,
    "`<cl-b>` is used without importing the module that registers it.",
  );
});

Deno.test("require-direct-registration-import: passes when imported", () => {
  assertEquals(lintFixture(good), []);
});

Deno.test("require-direct-registration-import: does nothing without a program", () => {
  clearTestProgram();
  assertEquals(
    Deno.lint.runPlugin(plugin, bad, Deno.readTextFileSync(bad)),
    [],
  );
});
