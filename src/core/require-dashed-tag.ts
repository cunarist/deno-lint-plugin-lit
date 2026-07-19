/**
 * `require-dashed-tag`
 *
 * A custom element name has to contain a hyphen and cannot contain uppercase.
 * The registry rejects anything else outright, so the component never exists.
 */

import { classDecorators, isLitComponent, memberPath } from "#helpers";

/** Names the spec reserves, which the registry rejects despite the hyphen. */
const RESERVED_NAMES: readonly string[] = [
  "annotation-xml",
  "color-profile",
  "font-face",
  "font-face-src",
  "font-face-uri",
  "font-face-format",
  "font-face-name",
  "missing-glyph",
];

/** Why the registry would reject this name, or null when it accepts it. */
function rejection(tag: string): string | null {
  if (!tag.includes("-")) return "contains no hyphen";
  if (!/^[a-z]/.test(tag)) return "does not start with a lowercase letter";
  if (/[A-Z]/.test(tag)) return "contains an uppercase letter";
  if (RESERVED_NAMES.includes(tag)) return "is reserved by the HTML spec";
  return null;
}

/** The `"x-y"` literal passed to `@customElement`, and its value. */
function tagLiteral(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): { node: Deno.lint.Node; value: string } | null {
  for (const decorator of classDecorators(node)) {
    const expression = decorator.expression;
    if (expression.type !== "CallExpression") continue;
    if (memberPath(expression.callee) !== "customElement") continue;
    const first = expression.arguments[0];
    if (first && first.type === "Literal" && typeof first.value === "string") {
      return { node: first, value: first.value };
    }
  }
  return null;
}

/**
 * Rejects a custom element name the registry will not accept.
 */
export const requireDashedTag: Deno.lint.Rule = {
  create(ctx) {
    function check(
      node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
    ): void {
      if (!isLitComponent(node)) return;
      const tag = tagLiteral(node);
      if (tag === null) return;
      const reason = rejection(tag.value);
      if (reason === null) return;
      ctx.report({
        node: tag.node,
        message: `Custom element name "${tag.value}" ${reason}.`,
        hint:
          "customElements.define() throws on this name, so the element is never registered and the tag renders as an unknown element.",
      });
    }

    return {
      ClassDeclaration: check,
      ClassExpression: check,
    };
  },
};
