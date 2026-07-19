/**
 * `no-index-as-repeat-key`
 *
 * A `repeat` key function that returns its own index parameter, e.g.
 * `repeat(items, (item, i) => i, template)`.
 *
 * Keying by index makes every key stable against reordering by construction:
 * item 0 is always key 0. `repeat` then reuses the DOM in place and re-renders
 * every row, which is exactly the index-based reconciliation it exists to
 * avoid. Key by something that identifies the *item*.
 *
 * `repeat(...)` is matched wherever it is called, not only inside a template —
 * `simple-template-expressions` requires it to be hoisted into a local.
 */

import { memberPath } from "#helpers";

/** Function-like nodes usable as a key function. */
type KeyFunction =
  | Deno.lint.ArrowFunctionExpression
  | Deno.lint.FunctionExpression;

/** The name of the second (index) parameter, when it is a plain identifier. */
function indexParamName(fn: KeyFunction): string | null {
  const param = fn.params[1];
  if (!param || param.type !== "Identifier") return null;
  return param.name;
}

/** The single expression a function returns, or null if it is not that shape. */
function returnedExpression(fn: KeyFunction): Deno.lint.Expression | null {
  const body = fn.body;
  if (body.type !== "BlockStatement") return body;
  const only = body.body.length === 1 ? body.body[0] : null;
  if (!only || only.type !== "ReturnStatement") return null;
  return only.argument ?? null;
}

export const noIndexAsRepeatKey: Deno.lint.Rule = {
  create(ctx) {
    return {
      CallExpression(node) {
        if (memberPath(node.callee) !== "repeat") return;
        const keyFn = node.arguments[1];
        if (!keyFn) return;
        if (
          keyFn.type !== "ArrowFunctionExpression" &&
          keyFn.type !== "FunctionExpression"
        ) {
          return;
        }
        const index = indexParamName(keyFn);
        if (index === null) return;
        const returned = returnedExpression(keyFn);
        if (!returned || returned.type !== "Identifier") return;
        if (returned.name !== index) return;
        ctx.report({
          node: keyFn,
          message: "`repeat` key function returns the item index.",
          hint:
            "Key by something identifying the item (`(item) => item.id`); an index key defeats the point of `repeat`.",
        });
      },
    };
  },
};
