/**
 * `no-this-assign-in-render`
 *
 * `render()` must be a pure function of the component's state. Mutating `this`
 * from it makes rendering order-dependent and can loop the update cycle.
 *
 * The check is purely lexical — anything inside `render()`, at any nesting
 * depth, counts. That is exact here rather than approximate because
 * `simple-template-expressions` forbids anonymous functions in template
 * bindings, so a deferred callback (`@click=${() => this.x++}`) cannot be
 * written inside `render()` in the first place. Both rules ship in
 * `recommended`; keep them together.
 */

import {
  enclosingClass,
  isInsideMethod,
  isLitComponent,
  memberPath,
} from "#helpers";

/** Whether an assignment target bottoms out at `this`. */
function targetsThis(node: Deno.lint.Node): boolean {
  let current: Deno.lint.Node = node;
  while (current.type === "MemberExpression") current = current.object;
  return current.type === "ThisExpression";
}

/**
 * Rejects assigning to anything reached through `this` inside `render()`.
 */
export const noThisAssignInRender: Deno.lint.Rule = {
  create(ctx) {
    /** Report if `target` mutates `this` inside `render()`. */
    function check(node: Deno.lint.Node, target: Deno.lint.Node): void {
      if (!isInsideMethod(node, "render")) return;
      const classNode = enclosingClass(node);
      if (!classNode || !isLitComponent(classNode, ctx)) return;
      if (!targetsThis(target)) return;
      const path = memberPath(target as Deno.lint.Expression);
      ctx.report({
        node,
        message: `${path ?? "this"} is assigned inside render().`,
        hint:
          "render() must be pure. Derive the value where the input arrives, and read it here.",
      });
    }

    return {
      AssignmentExpression(node) {
        check(node, node.left);
      },
      UpdateExpression(node) {
        check(node, node.argument);
      },
    };
  },
};
