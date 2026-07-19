/**
 * `no-dom-query`
 *
 * A component must not reach into its own rendered DOM by selector. Selectors
 * silently break when the template changes; a `ref` does not.
 */

import { enclosingClass, isLitComponent } from "#helpers";

/** DOM lookup methods banned inside a component. */
const QUERY_METHODS: readonly string[] = ["querySelector", "querySelectorAll"];

/** Whether the node sits inside a Lit component class body. */
function inLitComponent(node: Deno.lint.Node): boolean {
  const owner = enclosingClass(node);
  return owner !== null && isLitComponent(owner);
}

/**
 * Rejects `querySelector` and `querySelectorAll` inside a Lit component.
 */
export const noDomQuery: Deno.lint.Rule = {
  create(ctx) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "MemberExpression" || callee.computed) return;
        const property = callee.property;
        if (property.type !== "Identifier") return;
        if (!QUERY_METHODS.includes(property.name)) return;
        if (!inLitComponent(node)) return;
        ctx.report({
          node: callee,
          message: `DOM lookup via \`${property.name}\`.`,
          hint:
            "Use the `ref` directive with a named ref callback instead of querying the render root.",
        });
      },
    };
  },
};
