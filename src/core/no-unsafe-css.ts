/**
 * `no-unsafe-css`
 *
 * `unsafeCSS` bypasses Lit's CSS sanitisation and lets arbitrary strings reach
 * the stylesheet. Both the import and every call site are reported.
 */

import { LIT_CORE_SOURCES } from "#helpers";

const BANNED = "unsafeCSS";

/**
 * Bans `unsafeCSS` imported from Lit — both the import specifier and every
 * call site.
 */
export const noUnsafeCss: Deno.lint.Rule = {
  create(ctx) {
    const locals = new Set<string>();
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== "string") return;
        if (!LIT_CORE_SOURCES.includes(source)) return;
        for (const specifier of node.specifiers) {
          if (specifier.type !== "ImportSpecifier") continue;
          const imported = specifier.imported;
          const name = imported.type === "Identifier"
            ? imported.name
            : typeof imported.value === "string"
            ? imported.value
            : null;
          if (name !== BANNED) continue;
          locals.add(specifier.local.name);
          ctx.report({
            node: specifier,
            message: "`unsafeCSS` imported from Lit.",
            hint:
              "Write the rules literally in a `css`…`` template; `unsafeCSS` defeats CSS sanitisation.",
          });
        }
      },
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "Identifier") return;
        if (!locals.has(callee.name)) return;
        ctx.report({
          node,
          message: "`unsafeCSS(…)` call.",
          hint:
            "Write the rules literally in a `css`…`` template; `unsafeCSS` defeats CSS sanitisation.",
        });
      },
    };
  },
};
