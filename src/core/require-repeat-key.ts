/**
 * `require-repeat-key`
 *
 * `repeat(items, template)` — the two-argument form, with no key function.
 *
 * Without a key, `repeat` reconciles by index, which is precisely what the
 * default array binding already does. The call adds an import and a directive
 * for no behavioural change: reordering still re-renders every item and still
 * destroys per-item DOM state. The three-argument form is the only one worth
 * writing.
 *
 * `repeat(...)` is matched wherever it is called, not only inside a template —
 * `simple-template-expressions` requires it to be hoisted into a local.
 */

import { importedLocalName, isRepeatModule, memberPath } from "#helpers";

/**
 * Rejects `repeat(items, template)` — the two-argument form, with no key
 * function.
 */
export const requireRepeatKey: Deno.lint.Rule = {
  create(ctx) {
    /** Local names bound to `repeat` from the module we mean. */
    const locals = new Set<string>();

    return {
      ImportDeclaration(node) {
        const local = importedLocalName(node, isRepeatModule, "repeat");
        if (local !== null) locals.add(local);
      },

      CallExpression(node) {
        const callee = memberPath(node.callee);
        if (callee === null || !locals.has(callee)) return;
        if (node.arguments.length !== 2) return;
        // A spread could supply the key at runtime; the arity is unknowable.
        if (node.arguments.some((arg) => arg.type === "SpreadElement")) return;
        ctx.report({
          node,
          message: "`repeat(…)` called without a key function.",
          hint:
            "Pass the key function as the second argument: `repeat(items, (item) => item.id, (item) => html`…`)`.",
        });
      },
    };
  },
};
