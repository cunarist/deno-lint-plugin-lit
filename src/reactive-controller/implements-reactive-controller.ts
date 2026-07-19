/**
 * `implements-reactive-controller`
 *
 * A class that looks like a reactive controller must say so: the
 * `implements ReactiveController` clause is what makes the contract — the two
 * host hooks and the host registration — visible at the declaration site.
 */

import {
  hasReactiveControllerInterface,
  isLitComponent,
  looksLikeReactiveController,
} from "#helpers";

/** A class in scope for the controller rules. */
function isControllerClass(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): boolean {
  return !isLitComponent(node) && looksLikeReactiveController(node);
}

export const implementsReactiveController: Deno.lint.Rule = {
  create(ctx) {
    function check(
      node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
    ): void {
      if (!isControllerClass(node)) return;
      if (hasReactiveControllerInterface(node)) return;
      ctx.report({
        range: node.id?.range ?? node.range,
        message: "Reactive controller does not declare its interface.",
        hint: "Add `implements ReactiveController` to the class declaration.",
      });
    }

    return {
      ClassDeclaration: check,
      ClassExpression: check,
    };
  },
};
