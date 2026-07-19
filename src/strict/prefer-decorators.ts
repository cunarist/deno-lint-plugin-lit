/**
 * `prefer-decorators`
 *
 * Declare reactive properties with `@property`/`@state`, not a
 * `static properties` object. The decorator keeps the declaration next to the
 * field it configures and its TypeScript type.
 */

import { isLitComponent, keyName } from "#helpers";

function check(
  ctx: Deno.lint.RuleContext,
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): void {
  if (!isLitComponent(node)) return;
  for (const member of node.body.body) {
    if (
      member.type !== "PropertyDefinition" &&
      member.type !== "MethodDefinition" &&
      member.type !== "AccessorProperty"
    ) {
      continue;
    }
    if (!member.static) continue;
    if (keyName(member.key) !== "properties") continue;
    ctx.report({
      node: member.key,
      message: "Reactive properties declared with `static properties`.",
      hint:
        "Use the `@property()` and `@state()` decorators on the fields themselves.",
    });
  }
}

/**
 * Rejects a `static properties` declaration on a Lit component.
 */
export const preferDecorators: Deno.lint.Rule = {
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
