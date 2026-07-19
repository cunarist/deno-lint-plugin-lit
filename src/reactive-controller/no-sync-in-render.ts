/**
 * `no-sync-in-render`
 *
 * `render()` reads state; it does not change it. Pushing new state into a
 * controller from render is a write during the render pass, and Lit gives no
 * guarantee the resulting update is ever scheduled. Sync from a property
 * setter or from `willUpdate()` instead.
 */

import {
  enclosingClass,
  isInsideMethod,
  isLitComponent,
  keyName,
  memberPath,
} from "#helpers";

/** Whether an expression constructs something named `*Controller`. */
function isControllerConstruction(
  node: Deno.lint.Expression | null | undefined,
): boolean {
  if (!node || node.type !== "NewExpression") return false;
  const name = memberPath(node.callee);
  if (name === null) return false;
  return (name.split(".").pop() ?? name).endsWith("Controller");
}

/** Names of the fields on a host that hold reactive controllers. */
function controllerFields(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): Set<string> {
  const fields = new Set<string>();

  function consider(
    name: string | null,
    value: Deno.lint.Expression | null,
  ): void {
    if (name === null) return;
    const bare = name.replace(/^#/, "").toLowerCase();
    if (isControllerConstruction(value) || bare.endsWith("controller")) {
      fields.add(name);
    }
  }

  for (const member of node.body.body) {
    if (member.type === "PropertyDefinition") {
      consider(keyName(member.key), member.value);
      continue;
    }
    if (member.type !== "MethodDefinition" || member.kind !== "constructor") {
      continue;
    }
    const body = member.value.body;
    if (!body) continue;
    for (const statement of body.body) {
      if (statement.type !== "ExpressionStatement") continue;
      const expression = statement.expression;
      if (
        expression.type !== "AssignmentExpression" ||
        expression.operator !== "=" ||
        expression.left.type !== "MemberExpression" ||
        expression.left.object.type !== "ThisExpression"
      ) {
        continue;
      }
      consider(memberPath(expression.left.property), expression.right);
    }
  }
  return fields;
}

export const noSyncInRender: Deno.lint.Rule = {
  create(ctx) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "MemberExpression" || callee.computed) return;
        if (callee.property.type !== "Identifier") return;
        const method = callee.property.name;
        if (!method.startsWith("sync")) return;

        const receiver = callee.object;
        if (
          receiver.type !== "MemberExpression" ||
          receiver.computed ||
          receiver.object.type !== "ThisExpression"
        ) {
          return;
        }
        const field = memberPath(receiver.property);
        if (field === null) return;

        if (!isInsideMethod(node, "render")) return;
        const owner = enclosingClass(node);
        if (owner === null || !isLitComponent(owner)) return;
        if (!controllerFields(owner).has(field)) return;

        ctx.report({
          range: node.range,
          message: `render() calls ${method}() on a reactive controller.`,
          hint:
            "Sync from a property setter or willUpdate(); render() must not change state.",
        });
      },
    };
  },
};
