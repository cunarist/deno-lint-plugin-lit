/**
 * `no-legacy-template-syntax`
 *
 * Polymer's `[[oneWay]]` and `{{twoWay}}` bindings mean nothing to Lit; they
 * render as literal text. Use `${…}` instead.
 *
 * This scans the raw quasis rather than the placeholder-substituted text, since
 * the binding placeholder itself is spelled with double braces.
 */

import { bindingPlaceholder, isHtmlTemplate, templateSource } from "#helpers";

const LEGACY = /\[\[[^\][]+\]\]|\{\{[^{}]+\}\}/g;

/**
 * Rejects Polymer-style `[[oneWay]]` and `{{twoWay}}` bindings inside an
 * `html` template.
 */
export const noLegacyTemplateSyntax: Deno.lint.Rule = {
  create(ctx) {
    return {
      TaggedTemplateExpression(node) {
        if (!isHtmlTemplate(node, ctx)) return;
        const source = templateSource(node);
        const quasis = node.quasi.quasis;
        const expressions = node.quasi.expressions;

        // Offset of each quasi within the placeholder-substituted text.
        let textOffset = 0;
        for (let index = 0; index < quasis.length; index += 1) {
          const quasi = quasis[index];
          if (!quasi) continue;
          const raw = quasi.raw;
          LEGACY.lastIndex = 0;
          let match = LEGACY.exec(raw);
          while (match !== null) {
            const start = textOffset + match.index;
            const kind = match[0].startsWith("[[") ? "[[…]]" : "{{…}}";
            ctx.report({
              range: source.toSourceRange(start, start + match[0].length),
              message: `Legacy Polymer binding \`${kind}\` in a Lit template.`,
              hint: "Lit only interpolates `${…}`; this renders as plain text.",
            });
            match = LEGACY.exec(raw);
          }
          textOffset += raw.length;
          if (index < expressions.length) {
            textOffset += bindingPlaceholder(index).length;
          }
        }
      },
    };
  },
};
