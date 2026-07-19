/**
 * `no-create-ref`
 *
 * `createRef` produces an anonymous box whose `.value` is read later, far from
 * where it was filled. A named ref callback names the moment the element
 * arrives and the moment it leaves.
 */

import { keyName } from "#helpers";

/** Whether a callee resolves to `createRef` (bare or namespaced). */
function isCreateRef(callee: Deno.lint.Expression): boolean {
  if (callee.type === "Identifier") return callee.name === "createRef";
  if (callee.type === "MemberExpression" && !callee.computed) {
    const property = callee.property;
    return property.type === "Identifier" && property.name === "createRef";
  }
  return false;
}

/**
 * Rejects `createRef`, both the import and any call to it.
 */
export const noCreateRef: Deno.lint.Rule = {
  create(ctx) {
    return {
      ImportDeclaration(node) {
        for (const specifier of node.specifiers) {
          if (specifier.type !== "ImportSpecifier") continue;
          if (keyName(specifier.imported) !== "createRef") continue;
          ctx.report({
            node: specifier,
            message: "Import of `createRef`.",
            hint:
              "Use a named ref callback: `ref(this.#onInput)` with a method that stores the element.",
          });
        }
      },
      CallExpression(node) {
        if (!isCreateRef(node.callee)) return;
        ctx.report({
          node: node.callee,
          message: "Call to `createRef`.",
          hint:
            "Use a named ref callback: `ref(this.#onInput)` with a method that stores the element.",
        });
      },
    };
  },
};
