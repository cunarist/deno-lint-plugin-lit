/**
 * `no-event-target-subclass`
 *
 * Extending `EventTarget` builds a state bus that Lit knows nothing about.
 * Shared state belongs in a context.
 */

import { memberPath } from "#helpers";

function check(
  ctx: Deno.lint.RuleContext,
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): void {
  const superClass = node.superClass;
  if (!superClass) return;
  if (memberPath(superClass) !== "EventTarget") return;
  ctx.report({
    node: superClass,
    message: "Class extends EventTarget.",
    hint:
      "Provide the state through a context instead; Lit re-renders consumers for you.",
  });
}

export const noEventTargetSubclass: Deno.lint.Rule = {
  create(ctx) {
    return {
      ClassDeclaration(node) {
        check(ctx, node);
      },
      ClassExpression(node) {
        check(ctx, node);
      },
    };
  },
};
