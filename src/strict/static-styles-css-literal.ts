/**
 * `static-styles-css-literal`
 *
 * A `static styles` member must be a direct `` css`…` `` tagged template.
 * Arrays of stylesheets, references to other variables, and every other
 * expression are rejected: one component, one stylesheet, written in place.
 */

import { isCssTemplate, keyName } from "#helpers";

const HINT =
  "Write the rules directly: `static styles = css`…``. No arrays, no references.";

/**
 * A `static styles` member must be a direct `css` tagged template — not an
 * array, a reference, a call, or a getter.
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
