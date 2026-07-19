/**
 * `no-async-render`
 *
 * `render()` must return something Lit can commit synchronously. An `async`
 * render returns a Promise, which Lit renders as nothing.
 */

import { enclosingClass, isLitComponent, keyName } from "#helpers";

export const noAsyncRender: Deno.lint.Rule = {
  create(ctx) {
    return {
      MethodDefinition(node) {
        if (node.static || node.kind !== "method") return;
        if (keyName(node.key) !== "render") return;
        if (!node.value.async) return;
        const classNode = enclosingClass(node);
        if (!classNode || !isLitComponent(classNode)) return;
        ctx.report({
          node: node.key,
          message: "render() is async.",
          hint:
            "Lit cannot render a Promise, so the component renders nothing. " +
            "Await the data in a controller or willUpdate(), store it in a " +
            "reactive property, and render that synchronously.",
        });
      },
    };
  },
};
