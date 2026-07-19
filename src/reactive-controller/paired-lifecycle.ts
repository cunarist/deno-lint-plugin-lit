/**
 * `paired-lifecycle`
 *
 * `hostConnected` and `hostDisconnected` come as a pair. Whatever the first
 * one starts — listeners, subscriptions, timers — the second one has to stop,
 * or the controller leaks every time its host is detached. Defining neither is
 * fine; defining one is not.
 */

import { isLitComponent, isReactiveController, keyName } from "#helpers";

/** A class in scope for the controller rules. */
function isControllerClass(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): boolean {
  return !isLitComponent(node) && isReactiveController(node);
}

/**
 * Find a member by name, whether it is written as a method or as a property
 * holding an arrow function.
 */
function findMember(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
  name: string,
): Deno.lint.MethodDefinition | Deno.lint.PropertyDefinition | null {
  for (const member of node.body.body) {
    if (
      member.type !== "MethodDefinition" && member.type !== "PropertyDefinition"
    ) {
      continue;
    }
    if (member.static) continue;
    if (keyName(member.key) === name) return member;
  }
  return null;
}

/**
 * Rejects a controller that defines `hostConnected` or `hostDisconnected`
 * but not both.
 */
export const pairedLifecycle: Deno.lint.Rule = {
  create(ctx) {
    function check(
      node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
    ): void {
      if (!isControllerClass(node)) return;
      const connected = findMember(node, "hostConnected");
      const disconnected = findMember(node, "hostDisconnected");
      if ((connected === null) === (disconnected === null)) return;

      const present = connected ?? disconnected;
      if (!present) return;
      const missing = connected === null ? "hostConnected" : "hostDisconnected";
      ctx.report({
        range: present.key.range,
        message: `Reactive controller defines ${
          keyName(present.key)
        } without ${missing}.`,
        hint:
          "Define both host lifecycle hooks so everything set up on connect is torn down on disconnect.",
      });
    }

    return {
      ClassDeclaration: check,
      ClassExpression: check,
    };
  },
};
