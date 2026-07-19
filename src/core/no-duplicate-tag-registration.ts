/**
 * `no-duplicate-tag-registration`
 *
 * `customElements.define` throws `NotSupportedError` when a tag is already
 * registered, and `@customElement` is just a wrapper around it. Two
 * registrations of the same tag in one file is a copy-paste slip that takes the
 * whole module down at import time — before any of it has rendered.
 */

import { classDecorators, memberPath } from "#helpers";

/** A tag registration found in the file. */
interface Registration {
  readonly tag: string;
  readonly node: Deno.lint.Node;
}

/** The `"x-y"` literal passed to `@customElement`, if the class has one. */
function customElementTagNode(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): Deno.lint.Literal | null {
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

/** Whether a call is `customElements.define(…)`, however it is qualified. */
function isDefineCall(node: Deno.lint.CallExpression): boolean {
  const path = memberPath(node.callee);
  if (path === null) return false;
  return path === "customElements.define" ||
    path.endsWith(".customElements.define");
}

/**
 * Rejects registering the same custom element tag twice in one file.
 */
export const noDuplicateTagRegistration: Deno.lint.Rule = {
  create(ctx) {
    const registrations: Registration[] = [];

    function collectClass(
      node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
    ): void {
      const tagNode = customElementTagNode(node);
      if (tagNode === null) return;
      if (typeof tagNode.value !== "string") return;
      registrations.push({ tag: tagNode.value, node: tagNode });
    }

    return {
      ClassDeclaration(node) {
        collectClass(node);
      },
      ClassExpression(node) {
        collectClass(node);
      },
      CallExpression(node) {
        if (!isDefineCall(node)) return;
        const first = node.arguments[0];
        if (!first || first.type !== "Literal") return;
        if (typeof first.value !== "string") return;
        registrations.push({ tag: first.value, node: first });
      },
      "Program:exit"() {
        // Order of collection across visitor kinds is not guaranteed, so sort
        // by position to make "the first one wins" mean the first in the file.
        const ordered = [...registrations].sort(
          (a, b) => a.node.range[0] - b.node.range[0],
        );
        const seen = new Set<string>();
        for (const registration of ordered) {
          if (seen.has(registration.tag)) {
            ctx.report({
              node: registration.node,
              message:
                `"${registration.tag}" is registered twice in this file.`,
              hint:
                "A custom element tag can only be defined once; remove one registration.",
            });
            continue;
          }
          seen.add(registration.tag);
        }
      },
    };
  },
};
