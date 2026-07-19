/**
 * `require-context-type`
 *
 * `createContext()` from `@lit/context` is generic in the value it carries. Call
 * it without a type argument and the context is `Context<unknown, unknown>`, so
 * every `@consume` field silently widens to `unknown` and no provider/consumer
 * mismatch is ever caught.
 */

import { importedLocalName, isContextModule, memberPath } from "#helpers";

/**
 * Structural view of the type-argument field. `CallExpression.typeArguments`
 * exists at runtime and is `null` when the call has no `<…>`; it is read
 * through a narrow cast so the rule does not depend on the typings exposing it.
 */
interface WithTypeArguments {
  readonly typeArguments?: unknown;
}

/**
 * Whether a call goes to `createContext` imported from `@lit/context`.
 *
 * The local binding is required: without it the rule reports any function
 * called `createContext`, React's included.
 */
function isCreateContextCall(
  node: Deno.lint.CallExpression,
  locals: ReadonlySet<string>,
): boolean {
  const path = memberPath(node.callee);
  if (path === null) return false;
  return locals.has(path);
}

/**
 * Requires `createContext()` from `@lit/context` to be given an explicit
 * type argument.
 */
export const requireContextType: Deno.lint.Rule = {
  create(ctx) {
    /** Local names bound to `createContext` from the module we mean. */
    const locals = new Set<string>();

    return {
      ImportDeclaration(node) {
        const local = importedLocalName(node, isContextModule, "createContext");
        if (local !== null) locals.add(local);
      },

      CallExpression(node) {
        if (!isCreateContextCall(node, locals)) return;
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
