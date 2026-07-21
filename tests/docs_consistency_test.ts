/**
 * Every `// GOOD` snippet in the docs is linted by the whole ruleset.
 *
 * This is what catches a rule whose advice another rule forbids. It found five
 * docs telling people to derive values in `willUpdate()`, which
 * `lifecycle-allowlist` bans — including that rule's own example.
 */

import { assertEquals } from "@std/assert";

import { coreRules } from "#core";
import { domRefRules } from "#dom-ref";
import { namingRules } from "#naming";
import { reactiveControllerRules } from "#reactive-controller";
import { strictRules } from "#strict";

const everything: Deno.lint.Plugin = {
  name: "lit",
  rules: {
    ...coreRules,
    ...strictRules,
    ...domRefRules,
    ...reactiveControllerRules,
    ...namingRules,
  },
};

/**
 * Rules that fire only because a snippet leaves out unrelated boilerplate.
 *
 * A doc example teaches one thing. Adding `@customElement`, a tag-name-map
 * augmentation, an `Element` suffix and an event-map entry to every snippet
 * would bury the line the reader came for.
 */
const SNIPPET_NOISE: ReadonlySet<string> = new Set([
  "lit/require-custom-element-registration",
  "lit/require-tag-name-map",
  "lit/require-element-suffix",
  "lit/require-event-in-event-map",
]);

/**
 * Snippets that must keep a construct another rule rejects.
 *
 * `lifecycle-super` is about overriding a lifecycle callback correctly, so its
 * example has to override one — which `lifecycle-allowlist` forbids outright.
 * The two disagree by design: one says "if you override, chain to super", the
 * other says "do not override". Both docs say so.
 */
const EXPECTED: ReadonlySet<string> = new Set([
  "src/core/lifecycle-super.md: lit/lifecycle-allowlist",
]);

async function docFiles(): Promise<string[]> {
  const files = ["README.md"];
  for (
    const group of [
      "core",
      "strict",
      "dom-ref",
      "reactive-controller",
      "naming",
    ]
  ) {
    for await (const entry of Deno.readDir(`src/${group}`)) {
      if (entry.isFile && entry.name.endsWith(".md")) {
        files.push(`src/${group}/${entry.name}`);
      }
    }
  }
  return files;
}

Deno.test("docs: every GOOD example passes the whole ruleset", async () => {
  const problems: string[] = [];
  let checked = 0;

  for (const file of await docFiles()) {
    const text = await Deno.readTextFile(file);
    for (const block of text.matchAll(/```ts\n([\s\S]*?)```/g)) {
      const source = block[1] ?? "";
      const start = source.indexOf("// GOOD");
      if (start < 0) continue;
      checked += 1;

      let diagnostics: Deno.lint.Diagnostic[] = [];
      try {
        diagnostics = Deno.lint.runPlugin(
          everything,
          "snippet.ts",
          source.slice(start),
        );
      } catch {
        // A fragment that does not parse on its own is not this test's concern.
        continue;
      }

      for (const diagnostic of diagnostics) {
        if (SNIPPET_NOISE.has(diagnostic.id)) continue;
        if (EXPECTED.has(`${file}: ${diagnostic.id}`)) continue;
        problems.push(`${file}: ${diagnostic.id} — ${diagnostic.message}`);
      }
    }
  }

  if (checked === 0) throw new Error("found no GOOD examples to check");
  assertEquals(
    problems,
    [],
    `A GOOD example violates the ruleset:\n  ${problems.join("\n  ")}`,
  );
});
