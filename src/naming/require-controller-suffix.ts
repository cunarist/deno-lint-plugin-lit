/**
 * `require-controller-suffix`
 *
 * A reactive controller is named for what it is. At the call site
 * `#items = new ItemsController(this)` says which of the field's collaborators
 * drives updates; `new Items(this)` does not.
 */

import { isLitComponent, isReactiveController } from "#helpers";

/**
 * Requires a reactive controller class name to end in `Controller`.
 */
export const requireControllerSuffix: Deno.lint.Rule = {
  create(ctx) {
    function check(
      node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
    ): void {
      if (isLitComponent(node, ctx) || !isReactiveController(node)) return;
      const id = node.id;
      if (!id || id.name.endsWith("Controller")) return;
      ctx.report({
        node: id,
        message:
          `Reactive controller "${id.name}" is not named \`…Controller\`.`,
        hint: `Rename it to \`${id.name}Controller\`.`,
      });
    }

    return {
      ClassDeclaration: check,
      ClassExpression: check,
    };
  },
};
