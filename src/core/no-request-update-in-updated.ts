/**
 * `no-request-update-in-updated`
 *
 * `updated()` and `firstUpdated()` run at the end of an update. Asking for
 * another one from there schedules an update that will call the hook again.
 */

import { enclosingClass, isInsideMethod, isLitComponent } from "#helpers";

/** Hooks that run after the update has been committed. */
const POST_UPDATE_HOOKS: readonly string[] = ["updated", "firstUpdated"];

/** Whether a callee is `this.requestUpdate` or a bare `requestUpdate`. */
function isRequestUpdateCallee(
  callee: Deno.lint.CallExpression["callee"],
): boolean {
  if (callee.type === "Identifier") return callee.name === "requestUpdate";
  if (callee.type !== "MemberExpression" || callee.computed) return false;
  if (callee.object.type !== "ThisExpression") return false;
  const property = callee.property;
  return property.type === "Identifier" && property.name === "requestUpdate";
}

/** The post-update hook enclosing `node`, or null. */
function enclosingPostUpdateHook(node: Deno.lint.Node): string | null {
  for (const hook of POST_UPDATE_HOOKS) {
    if (isInsideMethod(node, hook)) return hook;
  }
  return null;
}

/**
 * Rejects calling `this.requestUpdate()` inside `updated()` or
 * `firstUpdated()`.
 */
export const noRequestUpdateInUpdated: Deno.lint.Rule = {
  create(ctx) {
    return {
      CallExpression(node) {
        if (!isRequestUpdateCallee(node.callee)) return;
        const hook = enclosingPostUpdateHook(node);
        if (hook === null) return;
        const classNode = enclosingClass(node);
        if (!classNode || !isLitComponent(classNode, ctx)) return;
        ctx.report({
          node,
          message: `requestUpdate() is called inside ${hook}().`,
          hint:
            `The requested update runs ${hook}() again, which requests another ` +
            "one. Compute what you need in willUpdate() so a second pass is " +
            "not required.",
        });
      },
    };
  },
};
