/**
 * `no-async-lifecycle`
 *
 * Lit calls its lifecycle hooks synchronously and never awaits the returned
 * Promise. An `async` hook therefore resumes after the render it was meant to
 * affect has already been committed.
 */

import { enclosingClass, isLitComponent, keyName } from "#helpers";

/**
 * Lifecycle hooks Lit never awaits.
 *
 * `performUpdate` is deliberately absent: Lit explicitly supports an async
 * override there to defer the update, and awaits it.
 */
const SYNC_LIFECYCLE: readonly string[] = [
  "willUpdate",
  "update",
  "shouldUpdate",
  "firstUpdated",
  "updated",
  "connectedCallback",
  "disconnectedCallback",
];

export const noAsyncLifecycle: Deno.lint.Rule = {
  create(ctx) {
    return {
      MethodDefinition(node) {
        if (node.static || node.kind !== "method") return;
        const name = keyName(node.key);
        if (name === null || !SYNC_LIFECYCLE.includes(name)) return;
        if (!node.value.async) return;
        const classNode = enclosingClass(node);
        if (!classNode || !isLitComponent(classNode)) return;
        ctx.report({
          node: node.key,
          message: `${name}() is async.`,
          hint:
            `Lit does not await ${name}(), so the work lands after the update ` +
            "it was meant to affect. Move it to a controller and write the " +
            "result to a reactive property.",
        });
      },
    };
  },
};
