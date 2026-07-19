/**
 * `tag-matches-class-name`
 *
 * The registered tag must name the class. Strip any leading prefix segments
 * (`cl-`, `cl-md-`, …) and the remaining kebab segments must PascalCase to the
 * class name, so `cl-path-bar` belongs to `PathBar`.
 *
 * This replaces a configurable `element-tag-prefix` rule: Deno lint rules take
 * no options, so the prefix cannot be configured. Accepting *any* leading
 * segments keeps the rule useful without a config — it still catches the real
 * failure, a tag that names a different class.
 */

import {
  classDecorators,
  customElementTag,
  isLitComponent,
  kebabToPascal,
  memberPath,
  pascalToKebab,
} from "#helpers";

/** The `"x-y"` literal node passed to `@customElement`, for reporting. */
function customElementTagNode(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): Deno.lint.Node | null {
  for (const decorator of classDecorators(node)) {
    const expression = decorator.expression;
    if (expression.type !== "CallExpression") continue;
    if (memberPath(expression.callee) !== "customElement") continue;
    const first = expression.arguments[0];
    if (first && first.type === "Literal" && typeof first.value === "string") {
      return first;
    }
  }
  return null;
}

/** Whether some suffix of the tag's segments PascalCases to the class name. */
function tagNamesClass(tag: string, className: string): boolean {
  const segments = tag.split("-").filter((segment) => segment.length > 0);
  for (let start = 0; start < segments.length; start += 1) {
    if (kebabToPascal(segments.slice(start).join("-")) === className) {
      return true;
    }
  }
  return false;
}

function check(
  ctx: Deno.lint.RuleContext,
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): void {
  if (!isLitComponent(node)) return;
  const tag = customElementTag(node);
  if (tag === null) return;
  const className = node.id?.name;
  if (className === undefined || className.length === 0) return;
  if (tagNamesClass(tag, className)) return;
  ctx.report({
    node: customElementTagNode(node) ?? node,
    message: `Tag "${tag}" does not name class \`${className}\`.`,
    hint: `Drop the prefix and the tag must be \`${
      pascalToKebab(className)
    }\` — e.g. "cl-${pascalToKebab(className)}".`,
  });
}

/**
 * Rejects a `@customElement` tag whose segments, after any leading prefix,
 * do not PascalCase to the class name.
 */
export const tagMatchesClassName: Deno.lint.Rule = {
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
