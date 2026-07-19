/**
 * `no-dispatch-in-render`
 *
 * `render()` must be free of side effects. Dispatching an event from it fires
 * once per render pass, at a moment the component does not control.
 */

import {
  enclosingClass,
  isInsideMethod,
  isLitComponent,
  memberPath,
} from "#helpers";

/** Whether a callee refers to `dispatchEvent`, at any depth. */
function isDispatchCallee(callee: Deno.lint.CallExpression["callee"]): boolean {
  if (callee.type === "Identifier") return callee.name === "dispatchEvent";
  if (callee.type !== "MemberExpression" || callee.computed) return false;
  const property = callee.property;
  return property.type === "Identifier" && property.name === "dispatchEvent";
}

export const noDispatchInRender: Deno.lint.Rule = {
  create(ctx) {
    return {
      CallExpression(node) {
        if (!isDispatchCallee(node.callee)) return;
        if (!isInsideMethod(node, "render")) return;
        const classNode = enclosingClass(node);
        if (!classNode || !isLitComponent(classNode)) return;
        const path = memberPath(node.callee) ?? "dispatchEvent";
        ctx.report({
          node,
          message: `${path}() is called inside render().`,
          hint: "render() must be side-effect free. Dispatch from an event " +
            "handler, or from updated() once the change is committed.",
        });
      },
    };
  },
};
