/**
 * `no-fetch-in-component`
 *
 * A component renders; it does not own a request. Nothing in a component's
 * lifecycle cancels an in-flight `fetch`, so the response arrives on a
 * disconnected element. The request belongs to a `ReactiveController` that
 * aborts it in `hostDisconnected`.
 */

import { enclosingClass, isLitComponent, memberPath } from "#helpers";

/** Whether the callee is the global `fetch`, however it is qualified. */
function isFetchCallee(callee: Deno.lint.Expression): boolean {
  const path = memberPath(callee);
  if (path === null) return false;
  return path === "fetch" || path === "globalThis.fetch" ||
    path === "window.fetch" || path === "self.fetch";
}

/**
 * Rejects a `fetch(...)` call inside a Lit component class.
 */
export const noFetchInComponent: Deno.lint.Rule = {
  create(ctx) {
    return {
      CallExpression(node) {
        if (!isFetchCallee(node.callee)) return;
        const owner = enclosingClass(node);
        if (owner === null || !isLitComponent(owner)) return;
        ctx.report({
          node: node.callee,
          message: "Lit component calls `fetch`.",
          hint:
            "Move the request into a ReactiveController that aborts it in `hostDisconnected`, and read the result from the controller.",
        });
      },
    };
  },
};
