/**
 * `require-abort-signal-in-fetch`
 *
 * A controller that starts a request owns cancelling it. Without a `signal`,
 * `hostDisconnected` has nothing to abort, the request outlives the host, and
 * the response lands on a detached element.
 */

import {
  enclosingClass,
  isLitComponent,
  looksLikeReactiveController,
  memberPath,
} from "#helpers";

const HINT =
  "Pass `{ signal: … }` from an AbortController the controller aborts in `hostDisconnected`.";

/** Whether the callee is the global `fetch`, however it is qualified. */
function isFetchCallee(callee: Deno.lint.Expression): boolean {
  const path = memberPath(callee);
  if (path === null) return false;
  return path === "fetch" || path === "globalThis.fetch" ||
    path === "window.fetch" || path === "self.fetch";
}

/**
 * Whether an options argument is known to carry a signal. A spread counts,
 * since the spread object may supply one; anything not written as an object
 * literal is unanalysable and is left alone.
 */
function carriesSignal(argument: Deno.lint.Node | undefined): boolean {
  if (!argument) return false;
  if (argument.type !== "ObjectExpression") return true;
  for (const property of argument.properties) {
    if (property.type === "SpreadElement") return true;
    if (property.computed) return true;
    const key = property.key;
    if (key.type === "Identifier" && key.name === "signal") return true;
    if (key.type === "Literal" && key.value === "signal") return true;
  }
  return false;
}

/**
 * Rejects a `fetch(...)` inside a reactive controller that passes no
 * `signal` option.
 */
export const requireAbortSignalInFetch: Deno.lint.Rule = {
  create(ctx) {
    return {
      CallExpression(node) {
        if (!isFetchCallee(node.callee)) return;
        const owner = enclosingClass(node);
        if (owner === null) return;
        if (isLitComponent(owner)) return;
        if (!looksLikeReactiveController(owner)) return;
        // `fetch(...args)` hides its options; there is nothing to check.
        if (node.arguments.some((a) => a.type === "SpreadElement")) return;
        if (carriesSignal(node.arguments[1])) return;
        ctx.report({
          node: node.callee,
          message: "`fetch` in a reactive controller without a `signal`.",
          hint: HINT,
        });
      },
    };
  },
};
