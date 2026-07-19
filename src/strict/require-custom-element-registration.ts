/**
 * `require-custom-element-registration`
 *
 * A `LitElement` subclass that is never registered has no tag, so it can never
 * appear in a template. The class compiles, the module imports, and the element
 * simply never renders — the failure shows up as an empty area on screen with
 * nothing in the console.
 *
 * Abstract classes and in-file base classes are exempt: a class that another
 * class in this file extends is a base, not a component.
 */

import { classDecorators, isLitComponent, memberPath } from "#helpers";

/** A candidate component awaiting proof that it is registered. */
interface Candidate {
  readonly name: string;
  readonly node: Deno.lint.Node;
}

/** Structural view of the `abstract` flag, absent from some typings. */
interface WithAbstract {
  readonly abstract?: boolean;
}

/** Whether a class carries `@customElement(…)`. */
function hasCustomElementDecorator(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): boolean {
  for (const decorator of classDecorators(node)) {
    const expression = decorator.expression;
    const source = expression.type === "CallExpression"
      ? memberPath(expression.callee)
      : memberPath(expression);
    if (source === "customElement") return true;
  }
  return false;
}

/** Whether a call is `customElements.define(…)`, however it is qualified. */
function isDefineCall(node: Deno.lint.CallExpression): boolean {
  const path = memberPath(node.callee);
  if (path === null) return false;
  return path === "customElements.define" ||
    path.endsWith(".customElements.define");
}

/**
 * Requires every `LitElement` subclass in a file to be registered, either
 * with `@customElement` or with `customElements.define`.
 */
export const requireCustomElementRegistration: Deno.lint.Rule = {
  create(ctx) {
    const candidates: Candidate[] = [];
    /** Names appearing as `extends X` anywhere in this file. */
    const extendedNames = new Set<string>();
    /** Names exported from this file. */
    const exportedNames = new Set<string>();
    /** Names passed to `customElements.define`. */
    const definedNames = new Set<string>();

    function noteSuperClass(
      node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
    ): void {
      const superClass = node.superClass;
      if (!superClass) return;
      const path = memberPath(superClass);
      if (path !== null) extendedNames.add(path.split(".").pop() ?? path);
    }

    return {
      ExportNamedDeclaration(node) {
        const declaration = node.declaration;
        if (!declaration || declaration.type !== "ClassDeclaration") return;
        const name = declaration.id?.name;
        if (name !== undefined) exportedNames.add(name);
      },
      ClassExpression(node) {
        noteSuperClass(node);
      },
      ClassDeclaration(node) {
        noteSuperClass(node);
        if (!isLitComponent(node)) return;
        if ((node as unknown as WithAbstract).abstract === true) return;
        if (hasCustomElementDecorator(node)) return;
        const id = node.id;
        if (!id) return;
        candidates.push({ name: id.name, node: id });
      },
      CallExpression(node) {
        if (!isDefineCall(node)) return;
        const target = node.arguments[1];
        if (!target || target.type === "SpreadElement") return;
        const path = memberPath(target);
        if (path !== null) definedNames.add(path.split(".").pop() ?? path);
      },
      "Program:exit"() {
        for (const candidate of candidates) {
          if (definedNames.has(candidate.name)) continue;
          // Exported and extended in this file: a base class, not a component.
          if (
            exportedNames.has(candidate.name) &&
            extendedNames.has(candidate.name)
          ) {
            continue;
          }
          ctx.report({
            node: candidate.node,
            message:
              `\`${candidate.name}\` is never registered as a custom element.`,
            hint:
              `Add \`@customElement("…")\` or call \`customElements.define("…", ${candidate.name})\`.`,
          });
        }
      },
    };
  },
};
