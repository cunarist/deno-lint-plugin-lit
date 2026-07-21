/**
 * `static-styles-css-literal`
 *
 * A `static styles` member must be a direct `` css`…` `` tagged template with no
 * `${…}` interpolation. Arrays of stylesheets, references to other variables,
 * every other expression, and a template that composes another value are all
 * rejected: one component, one stylesheet, written in place. Shared values come
 * in through CSS variables, not through interpolation.
 */

import { isCssTemplate, keyName } from "#helpers";

const HINT =
  "Write the rules directly: `static styles = css`…``. No arrays, no references.";

const INTERP_HINT =
  "Share values through CSS variables (`var(--x)`), not `${…}` in the `css` template.";

/**
 * A `static styles` member must be a direct `css` tagged template — not an
 * array, a reference, a call, or a getter — and must hold no `${…}`
 * interpolation.
 */
export const staticStylesCssLiteral: Deno.lint.Rule = {
  create(ctx) {
    return {
      PropertyDefinition(node) {
        if (!node.static) return;
        if (keyName(node.key) !== "styles") return;
        const value = node.value;
        if (!value) return;
        if (
          value.type === "TaggedTemplateExpression" && isCssTemplate(value)
        ) {
          const interpolation = value.quasi.expressions[0];
          if (interpolation) {
            ctx.report({
              node: interpolation,
              message: "`static styles` interpolates into the `css` template.",
              hint: INTERP_HINT,
            });
          }
          return;
        }
        ctx.report({
          node: value,
          message: value.type === "ArrayExpression"
            ? "`static styles` is an array."
            : "`static styles` is not a `css`…`` literal.",
          hint: HINT,
        });
      },
      MethodDefinition(node) {
        if (!node.static || node.kind !== "get") return;
        if (keyName(node.key) !== "styles") return;
        ctx.report({
          node: node.key,
          message: "`static styles` is a getter.",
          hint: HINT,
        });
      },
    };
  },
};
