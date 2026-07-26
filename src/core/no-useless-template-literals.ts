/**
 * `no-useless-template-literals`
 *
 * An `html` template whose entire content is a single binding and nothing else
 * (`` html`${x}` ``) produces no markup. Use the value directly.
 */

import { isHtmlTemplate } from "#helpers";

/**
 * Rejects an `html` template whose entire content is one binding and no
 * markup.
 */
export const noUselessTemplateLiterals: Deno.lint.Rule = {
  create(ctx) {
    return {
      TaggedTemplateExpression(node) {
        if (!isHtmlTemplate(node, ctx)) return;
        const quasis = node.quasi.quasis;
        if (quasis.length !== 2 || node.quasi.expressions.length !== 1) return;
        const before = quasis[0];
        const after = quasis[1];
        if (!before || !after) return;
        if (before.raw !== "" || after.raw !== "") return;
        ctx.report({
          node,
          message: "Template contains only a single binding.",
          hint:
            "The template adds no markup — use the interpolated value directly.",
        });
      },
    };
  },
};
