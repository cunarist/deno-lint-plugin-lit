/**
 * `no-this-in-static-styles`
 *
 * `static styles` is evaluated on the class, not on an instance. `this` there
 * is the constructor, so any per-instance value read through it is undefined.
 */

import { enclosingClass, isLitComponent, keyName } from "#helpers";

/** Any node reachable while walking up `parent` links. */
type WithParent = { readonly parent?: unknown };

/**
 * Whether `node` sits directly inside a `static styles` initialiser.
 *
 * The walk stops at a non-arrow function boundary: `this` is rebound there, so
 * it no longer refers to the static context.
 */
function inStaticStylesInitializer(node: Deno.lint.Node): boolean {
  let current: Deno.lint.Node | undefined = node;
  let child: Deno.lint.Node | undefined;
  while (current) {
    if (
      current.type === "FunctionExpression" ||
      current.type === "FunctionDeclaration"
    ) {
      return false;
    }
    if (current.type === "PropertyDefinition") {
      if (!current.static) return false;
      if (keyName(current.key) !== "styles") return false;
      // Only the initialiser counts, not a computed key.
      return current.value !== null && current.value === child;
    }
    child = current;
    current = (current as WithParent).parent as Deno.lint.Node | undefined;
  }
  return false;
}

/**
 * Rejects `this` inside a `static styles` initialiser.
 */
export const noThisInStaticStyles: Deno.lint.Rule = {
  create(ctx) {
    return {
      ThisExpression(node) {
        if (!inStaticStylesInitializer(node)) return;
        const classNode = enclosingClass(node);
        if (!classNode || !isLitComponent(classNode, ctx)) return;
        ctx.report({
          node,
          message: "`this` is used inside static styles.",
          hint:
            "static styles is evaluated once on the class, where there is no " +
            "instance. Use a CSS custom property set from the template for " +
            "per-instance values.",
        });
      },
    };
  },
};
