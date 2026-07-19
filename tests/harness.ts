/** Shared test harness for rule tests. */

import { assertEquals } from "@std/assert";

export interface Case {
  /** Source snippet to lint. */
  readonly code: string;
  /** Expected diagnostic messages, in order. Empty means "no diagnostics". */
  readonly expected?: readonly string[];
  /** Expected substrings of the reported source text, in order. */
  readonly reported?: readonly string[];
}

/** Run a plugin over a snippet and return its diagnostics. */
export function lint(
  plugin: Deno.lint.Plugin,
  code: string,
  filename = "component.ts",
): Deno.lint.Diagnostic[] {
  return Deno.lint.runPlugin(plugin, filename, code);
}

/** Assert a snippet produces no diagnostics. */
export function assertValid(plugin: Deno.lint.Plugin, code: string): void {
  const diagnostics = lint(plugin, code);
  assertEquals(
    diagnostics.map((d) => d.message),
    [],
    `expected no diagnostics for:\n${code}`,
  );
}

/** Assert a snippet produces exactly `count` diagnostics. */
export function assertInvalid(
  plugin: Deno.lint.Plugin,
  code: string,
  count = 1,
): Deno.lint.Diagnostic[] {
  const diagnostics = lint(plugin, code);
  assertEquals(
    diagnostics.length,
    count,
    `expected ${count} diagnostic(s), got ${diagnostics.length} for:\n${code}\n` +
      diagnostics.map((d) => `  - ${d.message}`).join("\n"),
  );
  return diagnostics;
}

/**
 * Assert the source text a diagnostic points at. This is what catches
 * broken template-location mapping — a rule can fire correctly while
 * highlighting the wrong characters.
 */
export function assertReportedText(
  code: string,
  diagnostic: Deno.lint.Diagnostic,
  expected: string,
): void {
  const actual = code.slice(diagnostic.range[0], diagnostic.range[1]);
  assertEquals(
    actual,
    expected,
    `diagnostic highlighted ${JSON.stringify(actual)}, expected ${
      JSON.stringify(expected)
    }`,
  );
}

/** Wrap a single rule in a throwaway plugin. */
export function rulePlugin(
  name: string,
  rule: Deno.lint.Rule,
): Deno.lint.Plugin {
  return { name: "lit", rules: { [name]: rule } };
}
