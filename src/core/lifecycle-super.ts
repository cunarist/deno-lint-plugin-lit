/**
 * `lifecycle-super`
 *
 * Lit's lifecycle callbacks are not empty hooks — `ReactiveElement` does real
 * work in each of them (registering the element, applying attribute changes,
 * committing the render). An override that never calls `super` silently removes
 * that work, and the component fails in ways that look unrelated.
 */

import { enclosingMethod, isLitComponent, keyName } from "#helpers";

/**
 * Lifecycle methods whose overrides must chain to `super`.
 *
 * Only hooks whose base implementation does real work are listed.
 * `willUpdate`, `firstUpdated`, and `updated` are deliberately excluded:
 * `ReactiveElement` defines them as empty hooks precisely so subclasses can
 * override them without chaining, and requiring `super` there flags idiomatic
 * code. `shouldUpdate` and `render` are excluded for the same reason — they
 * are meant to be replaced, not extended.
 */
const REQUIRES_SUPER: readonly string[] = [
  "connectedCallback",
  "disconnectedCallback",
  "attributeChangedCallback",
  "adoptedCallback",
  "update",
  "performUpdate",
];

/** The method a `super.x()` call chains to, or null. */
function superCallName(node: Deno.lint.CallExpression): string | null {
  const callee = node.callee;
  if (callee.type !== "MemberExpression") return null;
  if (callee.computed) return null;
  if (callee.object.type !== "Super") return null;
  return callee.property.type === "Identifier" ? callee.property.name : null;
}

export const lifecycleSuper: Deno.lint.Rule = {
  create(ctx) {
    /** Methods seen calling their own `super` implementation. */
    const chained = new Set<Deno.lint.MethodDefinition>();

    return {
      CallExpression(node) {
        const name = superCallName(node);
        if (name === null) return;
        const method = enclosingMethod(node);
        if (!method || keyName(method.key) !== name) return;
        chained.add(method);
      },

      "MethodDefinition:exit"(node: Deno.lint.MethodDefinition) {
        if (node.static || node.kind !== "method") return;
        const name = keyName(node.key);
        if (name === null || !REQUIRES_SUPER.includes(name)) return;

        const parent = (node as { parent?: Deno.lint.Node }).parent;
        const classNode = parent && parent.type === "ClassBody"
          ? (parent as { parent?: Deno.lint.Node }).parent
          : undefined;
        if (
          !classNode ||
          (classNode.type !== "ClassDeclaration" &&
            classNode.type !== "ClassExpression")
        ) {
          return;
        }
        if (!isLitComponent(classNode)) return;
        if (chained.has(node)) return;

        ctx.report({
          node: node.key,
          message: `${name}() does not call super.${name}().`,
          hint:
            `Lit's own ${name}() must still run. Call super.${name}() from the override.`,
        });
      },
    };
  },
};
