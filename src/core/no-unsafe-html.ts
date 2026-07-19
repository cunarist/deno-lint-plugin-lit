/**
 * `no-unsafe-html`
 *
 * `unsafeHTML` and `unsafeSVG` parse a string as markup and insert it into the
 * DOM, which is exactly the injection sink Lit's normal bindings avoid. Both
 * the import and every call site are reported.
 */

import { keyName } from "#helpers";

/** Directive names that put an unparsed string into the DOM. */
const BANNED: readonly string[] = ["unsafeHTML", "unsafeSVG"];

/** Module specifiers that export the unsafe markup directives. */
const UNSAFE_SOURCES: readonly string[] = [
  "lit/directives/unsafe-html.js",
  "lit/directives/unsafe-html",
  "lit/directives/unsafe-svg.js",
  "lit/directives/unsafe-svg",
  "lit-html/directives/unsafe-html.js",
  "lit-html/directives/unsafe-html",
  "lit-html/directives/unsafe-svg.js",
  "lit-html/directives/unsafe-svg",
];

const HINT =
  "Bind the value normally so Lit escapes it, or build the markup as a nested `html` template.";

export const noUnsafeHtml: Deno.lint.Rule = {
  create(ctx) {
    /** Local binding name -> the directive it was imported as. */
    const locals = new Map<string, string>();
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== "string") return;
        if (!UNSAFE_SOURCES.includes(source)) return;
        for (const specifier of node.specifiers) {
          if (specifier.type !== "ImportSpecifier") continue;
          const name = keyName(specifier.imported);
          if (name === null || !BANNED.includes(name)) continue;
          locals.set(specifier.local.name, name);
          ctx.report({
            node: specifier,
            message: `\`${name}\` imported from Lit.`,
            hint: HINT,
          });
        }
      },
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "Identifier") return;
        const name = locals.get(callee.name);
        if (name === undefined) return;
        ctx.report({
          node,
          message: `\`${name}(…)\` call.`,
          hint: HINT,
        });
      },
    };
  },
};
