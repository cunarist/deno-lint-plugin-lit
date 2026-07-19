/**
 * `no-context-mutation-by-consumer`
 *
 * A field declared with `@consume` is a view of a value the provider owns.
 * Writing to it replaces the local copy only: the provider never sees the
 * change, no other consumer sees it, and the next time the provider publishes
 * the write is overwritten without warning. Ask the provider to change the
 * value — usually through a callback carried on the context object itself.
 */

import { classMembers, enclosingClass, keyName, memberPath } from "#helpers";
import type { ClassMember } from "#helpers";

/** Anything that can be written to by an assignment or an update. */
type AssignTarget =
  | Deno.lint.AssignmentExpression["left"]
  | Deno.lint.UpdateExpression["argument"];

/** Whether a class member carries the `@consume` decorator. */
function hasConsumeDecorator(member: ClassMember): boolean {
  if (
    member.type !== "PropertyDefinition" && member.type !== "AccessorProperty"
  ) {
    return false;
  }
  for (const decorator of member.decorators ?? []) {
    const expression = decorator.expression;
    const source = expression.type === "CallExpression"
      ? memberPath(expression.callee)
      : memberPath(expression);
    if (source === null) continue;
    if ((source.split(".").pop() ?? source) === "consume") return true;
  }
  return false;
}

/** `this.…` paths of every `@consume` field on a class. */
function consumedPaths(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): ReadonlySet<string> {
  const paths = new Set<string>();
  for (const member of classMembers(node)) {
    if (!hasConsumeDecorator(member)) continue;
    if (
      member.type !== "PropertyDefinition" && member.type !== "AccessorProperty"
    ) {
      continue;
    }
    const name = keyName(member.key);
    if (name !== null) paths.add(`this.${name}`);
  }
  return paths;
}

export const noContextMutationByConsumer: Deno.lint.Rule = {
  create(ctx) {
    function check(
      target: AssignTarget,
      node: Deno.lint.Node,
    ): void {
      if (target.type !== "MemberExpression") return;
      const path = memberPath(target);
      if (path === null) return;
      const owner = enclosingClass(node);
      if (owner === null) return;
      if (!consumedPaths(owner).has(path)) return;
      ctx.report({
        node: target,
        message: `\`${path}\` is provided by \`@consume\`, not owned here.`,
        hint:
          "Change the value through the provider instead of assigning to the consumed field.",
      });
    }

    return {
      AssignmentExpression(node) {
        check(node.left, node);
      },
      UpdateExpression(node) {
        check(node.argument, node);
      },
    };
  },
};
