/**
 * `no-self-sync`
 *
 * `sync*` is the host's entry point into a controller: the host calls it when
 * its own state changes. A controller calling its own `sync*` re-enters that
 * entry point from the inside, which hides a state change from the host and
 * makes the update order depend on the controller's internals.
 */

import {
  enclosingClass,
  isLitComponent,
  looksLikeReactiveController,
} from "#helpers";

/** A class in scope for the controller rules. */
function isControllerClass(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): boolean {
  return !isLitComponent(node) && looksLikeReactiveController(node);
}

/**
 * Rejects a controller calling its own `sync*` method through `this`.
 */
export const noSelfSync: Deno.lint.Rule = {
  create(ctx) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "MemberExpression" || callee.computed) return;
        if (callee.object.type !== "ThisExpression") return;
        // Private `#sync…` helpers are the sanctioned escape hatch.
        if (callee.property.type !== "Identifier") return;
        const name = callee.property.name;
        if (!name.startsWith("sync")) return;

        const owner = enclosingClass(node);
        if (owner === null || !isControllerClass(owner)) return;

        ctx.report({
          range: node.range,
          message: `Reactive controller calls its own ${name}().`,
          hint:
            "Only the host drives sync. Move the shared work into a private method and call that instead.",
        });
      },
    };
  },
};
