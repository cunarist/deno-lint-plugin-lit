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
  // Only the value being returned counts. `if (this.flat)` mentions `this` in
  // a test, which says nothing about the render root — an earlier version
  // walked the whole subtree and reported that as light DOM.
  const returnsIt = (value: unknown): boolean => {
    if (value === null || typeof value !== "object") return false;
    const node = value as {
      type?: string;
      consequent?: unknown;
      alternate?: unknown;
    };
    if (node.type === "ThisExpression") return true;
    // `return cond ? this : super.createRenderRoot()`
    if (node.type === "ConditionalExpression") {
      return returnsIt(node.consequent) || returnsIt(node.alternate);
    }
    return false;
  };

  let found = false;

  // Collect returns anywhere in the body, but never inside a nested function:
  // that one has its own `this`.
  const walk = (value: unknown): void => {
    if (found || value === null || typeof value !== "object") return;
    const node = value as { type?: string; argument?: unknown };
    if (
      node.type === "FunctionExpression" ||
      node.type === "FunctionDeclaration" ||
      node.type === "ArrowFunctionExpression"
    ) {
      return;
    }
    if (node.type === "ReturnStatement") {
      if (returnsIt(node.argument)) found = true;
      return;
    }
    for (const key of ["body", "consequent", "alternate", "block", "cases"]) {
      const child = (value as Record<string, unknown>)[key];
      if (Array.isArray(child)) child.forEach(walk);
      else if (child) walk(child);
    }
  };

  if (body.type === "ThisExpression") return true;
  if (body.type !== "BlockStatement") return false;
  for (const statement of body.body) walk(statement);
  return found;
}

function check(
  ctx: Deno.lint.RuleContext,
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): void {
  if (!isLitComponent(node, ctx)) return;
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

/**
 * Rejects `createRenderRoot()` returning `this`, which renders the component
 * into the light DOM.
 */
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
