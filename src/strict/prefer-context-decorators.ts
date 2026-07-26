/**
 * `prefer-context-decorators`
 *
 * Use the `@provide` / `@consume` decorators rather than constructing a
 * `ContextProvider` or `ContextConsumer` by hand.
 */

import { isLitComponent, memberPath } from "#helpers";

/** The imperative context classes this rule steers away from. */
const IMPERATIVE_CLASSES: Record<string, string> = {
  ContextProvider: "@provide",
  ContextConsumer: "@consume",
};

/** Last segment of a dotted path, so `context.ContextProvider` still matches. */
function lastSegment(path: string): string {
  return path.split(".").pop() ?? path;
}

/**
 * Rejects constructing a `ContextProvider` or `ContextConsumer` by hand
 * inside a Lit component.
 */
export const preferContextDecorators: Deno.lint.Rule = {
  create(ctx) {
    /** Local names bound to an imperative context class by an import. */
    const localNames = new Map<string, string>();

    return {
      ImportDeclaration(node) {
        if (node.source.value !== "@lit/context") return;
        for (const specifier of node.specifiers) {
          if (specifier.type !== "ImportSpecifier") continue;
          const imported = specifier.imported;
          const name = imported.type === "Identifier"
            ? imported.name
            : typeof imported.value === "string"
            ? imported.value
            : null;
          if (name === null) continue;
          const decorator = IMPERATIVE_CLASSES[name];
          if (decorator) localNames.set(specifier.local.name, decorator);
        }
      },

      NewExpression(node) {
        const path = memberPath(node.callee);
        if (path === null) return;
        const decorator = localNames.get(path) ??
          IMPERATIVE_CLASSES[lastSegment(path)];
        if (!decorator) return;

        // Only steer components; a non-Lit class has no decorator to use.
        const classNode = (() => {
          let current: Deno.lint.Node | undefined = node;
          while (current) {
            if (
              current.type === "ClassDeclaration" ||
              current.type === "ClassExpression"
            ) {
              return current;
            }
            current =
              (current as unknown as { parent?: Deno.lint.Node }).parent;
          }
          return null;
        })();
        if (!classNode || !isLitComponent(classNode, ctx)) return;

        ctx.report({
          node,
          message: `${lastSegment(path)} is constructed by hand.`,
          hint:
            `Use the ${decorator} decorator on a field instead; it wires the host for you.`,
        });
      },
    };
  },
};
