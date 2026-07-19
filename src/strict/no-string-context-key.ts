/**
 * `no-string-context-key`
 *
 * `createContext("theme")` keys the context by that string. Context lookup walks
 * the DOM comparing keys with `===`, and strings compare by value, so any other
 * package that happens to pick `"theme"` silently answers your consumer's
 * request. A `Symbol` is unique by construction and cannot collide.
 */

import { memberPath } from "#helpers";

/** Whether a call is `createContext(…)`, including through a namespace. */
function isCreateContextCall(node: Deno.lint.CallExpression): boolean {
  const path = memberPath(node.callee);
  if (path === null) return false;
  return (path.split(".").pop() ?? path) === "createContext";
}

/**
 * Rejects a string literal as the key passed to `createContext()`.
 */
export const noStringContextKey: Deno.lint.Rule = {
  create(ctx) {
    return {
      CallExpression(node) {
        if (!isCreateContextCall(node)) return;
        const key = node.arguments[0];
        if (!key || key.type !== "Literal") return;
        if (typeof key.value !== "string") return;
        ctx.report({
          node: key,
          message: `Context key "${key.value}" is a string, which is global.`,
          hint: `Use \`createContext(Symbol("${key.value}"))\` instead.`,
        });
      },
    };
  },
};
