/**
 * `no-timers`
 *
 * Timers inside a component are hidden scheduling: they make DOM or editor
 * state "settle" instead of deriving it, and they create a handle nobody
 * releases on disconnect.
 */

import { enclosingClass, isLitComponent } from "#helpers";

/** Scheduling primitives banned inside a component. */
const TIMER_NAMES: readonly string[] = [
  "setTimeout",
  "setInterval",
  "requestAnimationFrame",
  "queueMicrotask",
];

/** Whether the node sits inside a Lit component class body. */
function inLitComponent(
  node: Deno.lint.Node,
  ctx: Deno.lint.RuleContext,
): boolean {
  const owner = enclosingClass(node);
  return owner !== null && isLitComponent(owner, ctx);
}

/** The bare name a callee resolves to, e.g. `globalThis.setTimeout` -> `setTimeout`. */
function calleeBareName(callee: Deno.lint.Expression): string | null {
  if (callee.type === "Identifier") return callee.name;
  if (callee.type === "MemberExpression" && !callee.computed) {
    const property = callee.property;
    if (property.type === "Identifier") return property.name;
  }
  return null;
}

/**
 * Rejects `setTimeout`, `setInterval`, `requestAnimationFrame`, and
 * `queueMicrotask` inside a Lit component.
 */
export const noTimers: Deno.lint.Rule = {
  create(ctx) {
    return {
      CallExpression(node) {
        const name = calleeBareName(node.callee);
        if (name === null || !TIMER_NAMES.includes(name)) return;
        if (!inLitComponent(node, ctx)) return;
        ctx.report({
          node: node.callee,
          message: `Timer \`${name}\` inside a Lit component.`,
          hint:
            "Avoid hidden scheduling. Move the timer into a ReactiveController that clears it in `hostDisconnected`.",
        });
      },
    };
  },
};
