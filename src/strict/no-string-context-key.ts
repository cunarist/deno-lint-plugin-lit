/**
 * `no-string-context-key`
 *
 * `createContext("theme")` keys the context by that string. Context lookup walks
 * the DOM comparing keys with `===`, and strings compare by value, so any other
 * package that happens to pick `"theme"` silently answers your consumer's
 * request. A `Symbol` is unique by construction and cannot collide.
 */

import { importedLocalName, isContextModule, memberPath } from "#helpers";

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
 * Rejects a string literal as the key passed to `createContext()`.
 */
export const noStringContextKey: Deno.lint.Rule = {
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
