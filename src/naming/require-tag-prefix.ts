/**
 * `require-tag-prefix`
 *
 * A custom element name is global to the page. Without a namespace segment two
 * libraries that both ship a `<button-group>` cannot be used together, and the
 * second registration throws.
 */

import { customElementTag, isLitComponent, kebabToPascal } from "#helpers";

/** The `"x-y"` literal passed to `@customElement`, for reporting. */
function tagNode(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): Deno.lint.Node | null {
  const decorators =
    (node as unknown as { decorators?: Deno.lint.Decorator[] }).decorators ??
      [];
  for (const decorator of decorators) {
    const expression = decorator.expression;
    if (expression.type !== "CallExpression") continue;
    const first = expression.arguments[0];
    if (first && first.type === "Literal" && typeof first.value === "string") {
      return first;
    }
  }
  return null;
}

/**
 * Whether the tag carries a namespace segment ahead of the class name.
 *
 * The prefix itself is not known — a lint rule takes no options — so the test
 * is whether any leading segments remain once the class name is accounted for.
 */
function hasPrefix(tag: string, className: string): boolean {
  const segments = tag.split("-").filter((segment) => segment.length > 0);
  const bare = className.replace(/Element$/, "");
  for (let start = 1; start < segments.length; start += 1) {
    const rest = kebabToPascal(segments.slice(start).join("-"));
    if (rest === className || rest === bare) return true;
  }
  return false;
}

/**
 * Requires a custom element name to carry a namespace prefix.
 */
export const requireTagPrefix: Deno.lint.Rule = {
  create(ctx) {
    function check(
      node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
    ): void {
      if (!isLitComponent(node)) return;
      const tag = customElementTag(node);
      const id = node.id;
      if (tag === null || !id) return;
      if (hasPrefix(tag, id.name)) return;
      ctx.report({
        node: tagNode(node) ?? id,
        message: `Custom element name "${tag}" carries no prefix.`,
        hint:
          "Prefix the tag with a segment that names the project or package, so it cannot collide with another library's element.",
      });
    }

    return {
      ClassDeclaration: check,
      ClassExpression: check,
    };
  },
};
