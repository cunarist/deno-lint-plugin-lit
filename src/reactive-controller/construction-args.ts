/**
 * `construction-args`
 *
 * A host constructs a controller with `this` and nothing else. Passing initial
 * state through the constructor makes the controller's behaviour depend on
 * data captured before the host has ever rendered; hand it over afterwards,
 * through a `sync*` method or a setter, where it stays reactive.
 */

import { enclosingClass, isLitComponent, memberPath } from "#helpers";

/** Whether a `new` expression constructs something named `*Controller`. */
function isControllerConstruction(node: Deno.lint.NewExpression): boolean {
  const name = memberPath(node.callee);
  if (name === null) return false;
  return (name.split(".").pop() ?? name).endsWith("Controller");
}

export const constructionArgs: Deno.lint.Rule = {
  create(ctx) {
    return {
      NewExpression(node) {
        if (!isControllerConstruction(node)) return;
        const owner = enclosingClass(node);
        if (owner === null || !isLitComponent(owner)) return;

        const args = node.arguments;
        const first = args[0];
        if (args.length === 1 && first?.type === "ThisExpression") return;

        const last = args[args.length - 1];
        ctx.report({
          range: first && last ? [first.range[0], last.range[1]] : node.range,
          message: args.length === 0
            ? "Controller is constructed without its host."
            : "Controller is constructed with more than its host.",
          hint:
            "Pass only `this`; hand over state afterwards via a sync method.",
        });
      },
    };
  },
};
