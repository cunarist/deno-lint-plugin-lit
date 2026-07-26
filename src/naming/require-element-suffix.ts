/**
 * `require-element-suffix`
 *
 * A component class is named for what it is, the same way a controller is. The
 * suffix separates the element from the plain classes around it.
 */

import { customElementTag, isLitComponent } from "#helpers";

/**
 * Requires a registered component class name to end in `Element`.
 */
export const requireElementSuffix: Deno.lint.Rule = {
  create(ctx) {
    function check(
      node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
    ): void {
      if (!isLitComponent(node, ctx)) return;
      // Only registered elements: a base class is not an element yet.
      if (customElementTag(node) === null) return;
      const id = node.id;
      if (!id || id.name.endsWith("Element")) return;
      ctx.report({
        node: id,
        message: `Component "${id.name}" is not named \`…Element\`.`,
        hint: `Rename it to \`${id.name}Element\`.`,
      });
    }

    return {
      ClassDeclaration: check,
      ClassExpression: check,
    };
  },
};
