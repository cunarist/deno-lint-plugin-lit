/**
 * `no-legacy-imports`
 *
 * Lit 1 shipped as `lit-html` and `lit-element`; Lit 2+ ships as `lit`. The old
 * module paths still resolve in mixed installs, so the mistake is silent. A few
 * exported names were renamed at the same time and are flagged wherever they are
 * imported from.
 */

import { LEGACY_LIT_SOURCES, LIT_CORE_SOURCES } from "#helpers";

/** Names removed in Lit 2, mapped to their replacement. */
const LEGACY_NAMES: Readonly<Record<string, string>> = {
  UpdatingElement: "ReactiveElement",
  internalProperty: "state",
};

/** The package part of a module specifier, ignoring any subpath. */
function packageOf(source: string): string {
  return source.split("/")[0] ?? source;
}

export const noLegacyImports: Deno.lint.Rule = {
  create(ctx) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== "string") return;
        const pkg = packageOf(source);

        if (LEGACY_LIT_SOURCES.includes(pkg)) {
          ctx.report({
            node: node.source,
            message: `"${source}" is a Lit 1 module path.`,
            hint: 'Import from "lit" instead.',
          });
        }

        if (!LIT_CORE_SOURCES.includes(pkg)) return;
        for (const specifier of node.specifiers) {
          if (specifier.type !== "ImportSpecifier") continue;
          const imported = specifier.imported;
          if (imported.type !== "Identifier") continue;
          const replacement = LEGACY_NAMES[imported.name];
          if (replacement === undefined) continue;
          ctx.report({
            node: imported,
            message: `"${imported.name}" was removed in Lit 2.`,
            hint: `Import "${replacement}" instead.`,
          });
        }
      },
    };
  },
};
