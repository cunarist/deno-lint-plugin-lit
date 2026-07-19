/**
 * `no-duplicate-context-provider`
 *
 * Two `@provide({ context: x })` declarations on one class both register a
 * provider for the same context on the same element. Only one can answer a
 * consumer's request, and which one wins is an implementation detail. The
 * second field looks live but is never read.
 */

import { classMembers, keyName, memberPath } from "#helpers";
import type { ClassMember } from "#helpers";

/** The `context:` expression of a `@provide({ context: x })` decorator. */
function providedContext(decorator: Deno.lint.Decorator): string | null {
  const expression = decorator.expression;
  if (expression.type !== "CallExpression") return null;
  const callee = memberPath(expression.callee);
  if (callee === null) return null;
  if ((callee.split(".").pop() ?? callee) !== "provide") return null;
  const options = expression.arguments[0];
  if (!options || options.type !== "ObjectExpression") return null;
  for (const property of options.properties) {
    if (property.type !== "Property") continue;
    if (property.computed) continue;
    if (keyName(property.key) !== "context") continue;
    const value = property.value;
    if (value.type === "AssignmentPattern") return null;
    if (value.type === "TSEmptyBodyFunctionExpression") return null;
    return memberPath(value);
  }
  return null;
}

/** Decorators on a class member, or an empty list for members without any. */
function memberDecorators(
  member: ClassMember,
): readonly Deno.lint.Decorator[] {
  switch (member.type) {
    case "PropertyDefinition":
    case "AccessorProperty":
    case "MethodDefinition":
      return member.decorators ?? [];
    default:
      return [];
  }
}

/**
 * Rejects two `@provide` declarations for the same context object on one
 * class.
 */
export const noDuplicateContextProvider: Deno.lint.Rule = {
  create(ctx) {
    function check(
      node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
    ): void {
      const seen = new Set<string>();
      for (const member of classMembers(node)) {
        for (const decorator of memberDecorators(member)) {
          const context = providedContext(decorator);
          if (context === null) continue;
          if (seen.has(context)) {
            ctx.report({
              node: decorator,
              message: `\`${context}\` is already provided by this class.`,
              hint:
                "Provide each context once; remove the duplicate `@provide`.",
            });
            continue;
          }
          seen.add(context);
        }
      }
    }

    return {
      ClassDeclaration(node) {
        check(node);
      },
      ClassExpression(node) {
        check(node);
      },
    };
  },
};
