/**
 * `self-registration`
 *
 * A reactive controller registers itself. The host constructs it and forgets
 * about it; the controller calls `host.addController(this)` in its constructor
 * so the host hooks fire without the host wiring anything up.
 */

import {
  controllerHostField,
  controllerHostParam,
  enclosingClass,
  enclosingMethod,
  findConstructor,
  isLitComponent,
  isReactiveController,
  memberPath,
} from "#helpers";

/** A class in scope for the controller rules. */
function isControllerClass(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): boolean {
  return !isLitComponent(node) && isReactiveController(node);
}

/**
 * Spellings that name the host inside a controller: the parameter itself, and
 * whatever field the constructor stores it in. The parameter and field are
 * found by type, so registering through a renamed host still counts.
 */
function hostReceivers(
  owner: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): string[] {
  const receivers = ["host", "this.host", "this.#host"];
  const param = controllerHostParam(owner);
  if (param) receivers.push(param.name);
  const field = controllerHostField(owner);
  if (field) receivers.push(`this.${field}`);
  return receivers;
}

/** Whether a call is `host.addController(this)` in any accepted spelling. */
function isSelfRegistration(
  node: Deno.lint.CallExpression,
  owner: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): boolean {
  const callee = node.callee;
  if (callee.type !== "MemberExpression" || callee.computed) return false;
  if (memberPath(callee.property) !== "addController") return false;
  const receiver = memberPath(callee.object);
  if (receiver === null || !hostReceivers(owner).includes(receiver)) {
    return false;
  }
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
        const owner = enclosingClass(node);
        if (owner === null) return;
        if (!isSelfRegistration(node, owner)) return;
        const method = enclosingMethod(node);
        if (method === null || method.kind !== "constructor") return;
        registered.add(owner);
      },
      "ClassDeclaration:exit": check,
      "ClassExpression:exit": check,
    };
  },
};
