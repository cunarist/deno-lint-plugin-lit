/**
 * `no-query-decorators`
 *
 * Bans the `@query` family and its imports. This deliberately inverts
 * A query decorator is a
 * selector against the render root, evaluated lazily, with no compile-time
 * link to the template. A named `ref` callback has both.
 */

import { enclosingClass, isLitComponent, keyName } from "#helpers";

/** Decorators that resolve elements by selector or slot. */
const QUERY_DECORATORS: readonly string[] = [
  "query",
  "queryAll",
  "queryAsync",
  "queryAssignedElements",
  "queryAssignedNodes",
];

/** Module specifiers that export the Lit decorators. */
const DECORATOR_SOURCES: readonly string[] = [
  "lit/decorators.js",
  "lit/decorators",
  "lit-element/decorators.js",
];

/** Whether the node sits inside a Lit component class body. */
function inLitComponent(node: Deno.lint.Node): boolean {
  const owner = enclosingClass(node);
  return owner !== null && isLitComponent(owner);
}

/** The exported name a decorator is bound to on a class member. */
function decoratorName(decorator: Deno.lint.Decorator): string | null {
  const expression = decorator.expression;
  const callee = expression.type === "CallExpression"
    ? expression.callee
    : expression;
  return callee.type === "Identifier" ? callee.name : null;
}

function checkMember(
  ctx: Deno.lint.RuleContext,
  node: Deno.lint.Node,
  decorators: readonly Deno.lint.Decorator[] | undefined,
): void {
  if (!decorators || decorators.length === 0) return;
  if (!inLitComponent(node)) return;
  for (const decorator of decorators) {
    const name = decoratorName(decorator);
    if (name === null || !QUERY_DECORATORS.includes(name)) continue;
    ctx.report({
      node: decorator,
      message: `Query decorator \`@${name}\`.`,
      hint:
        "Use the `ref` directive with a named ref callback so the element reference comes from the template.",
    });
  }
}

/**
 * Rejects `@query`, `@queryAll`, `@queryAsync`, `@queryAssignedElements`,
 * and `@queryAssignedNodes`, and their imports from the Lit decorator
 * modules.
 */
export const noQueryDecorators: Deno.lint.Rule = {
  create(ctx) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== "string") return;
        if (!DECORATOR_SOURCES.includes(source)) return;
        for (const specifier of node.specifiers) {
          if (specifier.type !== "ImportSpecifier") continue;
          const name = keyName(specifier.imported);
          if (name === null || !QUERY_DECORATORS.includes(name)) continue;
          ctx.report({
            node: specifier,
            message: `Import of query decorator \`${name}\`.`,
            hint:
              "Use the `ref` directive with a named ref callback instead of the query decorators.",
          });
        }
      },
      PropertyDefinition(node) {
        checkMember(ctx, node, node.decorators);
      },
      AccessorProperty(node) {
        checkMember(ctx, node, node.decorators);
      },
      MethodDefinition(node) {
        checkMember(ctx, node, node.decorators);
      },
    };
  },
};
