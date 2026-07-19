/**
 * `self-registration`
 *
 * A reactive controller registers itself. The host constructs it and forgets
 * about it; the controller calls `host.addController(this)` in its constructor
 * so the host hooks fire without the host wiring anything up.
 */

import {
  enclosingClass,
  enclosingMethod,
  isLitComponent,
  looksLikeReactiveController,
  memberPath,
} from "#helpers";

/** Receivers a controller may legitimately register itself on. */
const HOST_PATHS: readonly string[] = ["host", "this.host", "this.#host"];

/** A class in scope for the controller rules. */
function isControllerClass(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): boolean {
  return !isLitComponent(node) && looksLikeReactiveController(node);
}

/** The constructor of a class, if it defines one. */
function findConstructor(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): Deno.lint.MethodDefinition | null {
  for (const member of node.body.body) {
    if (member.type === "MethodDefinition" && member.kind === "constructor") {
      return member;
    }
  }
  return null;
}

/** Whether a call is `host.addController(this)` in any accepted spelling. */
function isSelfRegistration(node: Deno.lint.CallExpression): boolean {
  const callee = node.callee;
  if (callee.type !== "MemberExpression" || callee.computed) return false;
  if (memberPath(callee.property) !== "addController") return false;
  const receiver = memberPath(callee.object);
  if (receiver === null || !HOST_PATHS.includes(receiver)) return false;
  const first = node.arguments[0];
  return node.arguments.length === 1 && first?.type === "ThisExpression";
}

/**
 * Rejects a controller that does not call `host.addController(this)` in its
 * constructor.
 */
export const selfRegistration: Deno.lint.Rule = {
  create(ctx) {
    const registered = new Set<Deno.lint.Node>();

    function check(
      node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
    ): void {
      if (!isControllerClass(node)) return;
      if (registered.has(node)) return;
      const constructor = findConstructor(node);
      ctx.report({
        range: constructor?.key.range ?? node.id?.range ?? node.range,
        message: "Reactive controller never registers itself with its host.",
        hint: "Call `host.addController(this)` in the constructor.",
      });
    }

    return {
      CallExpression(node) {
        if (!isSelfRegistration(node)) return;
        const method = enclosingMethod(node);
        if (method === null || method.kind !== "constructor") return;
        const owner = enclosingClass(node);
        if (owner !== null) registered.add(owner);
      },
      "ClassDeclaration:exit": check,
      "ClassExpression:exit": check,
    };
  },
};
