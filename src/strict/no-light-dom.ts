/**
 * `no-light-dom`
 *
 * `createRenderRoot()` returning `this` renders into the light DOM, which drops
 * style and DOM encapsulation for the whole component.
 */

import { isLitComponent, keyName } from "#helpers";

/** Whether a function body returns `this`, directly or from a branch. */
function returnsThis(
  body: Deno.lint.BlockStatement | Deno.lint.Expression,
): boolean {
  if (body.type === "ThisExpression") return true;
  if (body.type !== "BlockStatement") return false;
  for (const statement of body.body) {
    if (statement.type !== "ReturnStatement") continue;
    if (statement.argument?.type === "ThisExpression") return true;
  }
  return false;
}

function check(
  ctx: Deno.lint.RuleContext,
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): void {
  if (!isLitComponent(node)) return;
  for (const member of node.body.body) {
    if (member.type !== "MethodDefinition") continue;
    if (keyName(member.key) !== "createRenderRoot") continue;
    const body = member.value.body;
    if (!body || !returnsThis(body)) continue;
    ctx.report({
      node: member,
      message:
        "createRenderRoot() returns this, so the component has no shadow root.",
      hint:
        "Light DOM loses style encapsulation and exposes internals to outside selectors. Keep the default shadow root.",
    });
  }
}

export const noLightDom: Deno.lint.Rule = {
  create(ctx) {
    return {
      ClassDeclaration(node) {
        check(ctx, node);
      },
      ClassExpression(node) {
        check(ctx, node);
      },
    };
  },
};
