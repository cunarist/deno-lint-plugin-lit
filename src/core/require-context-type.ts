/**
 * `require-context-type`
 *
 * `createContext()` from `@lit/context` is generic in the value it carries. Call
 * it without a type argument and the context is `Context<unknown, unknown>`, so
 * every `@consume` field silently widens to `unknown` and no provider/consumer
 * mismatch is ever caught.
 */

import { memberPath } from "#helpers";

/**
 * Structural view of the type-argument field. `CallExpression.typeArguments`
 * exists at runtime and is `null` when the call has no `<…>`; it is read
 * through a narrow cast so the rule does not depend on the typings exposing it.
 */
interface WithTypeArguments {
  readonly typeArguments?: unknown;
}

/** Whether a call is `createContext(…)`, including through a namespace. */
function isCreateContextCall(node: Deno.lint.CallExpression): boolean {
  const path = memberPath(node.callee);
  if (path === null) return false;
  return (path.split(".").pop() ?? path) === "createContext";
}

/**
 * Requires `createContext()` from `@lit/context` to be given an explicit
 * type argument.
 */
export const requireContextType: Deno.lint.Rule = {
  create(ctx) {
    return {
      CallExpression(node) {
        if (!isCreateContextCall(node)) return;
        const bag = node as unknown as WithTypeArguments;
        if (bag.typeArguments) return;
        ctx.report({
          node: node.callee,
          message: "`createContext()` has no type argument.",
          hint:
            "Write `createContext<TheContextType>(…)` so consumers get a typed value.",
        });
      },
    };
  },
};
