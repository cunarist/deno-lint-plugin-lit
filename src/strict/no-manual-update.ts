/**
 * `no-manual-update`
 *
 * A Lit component does not schedule its own renders. `requestUpdate`,
 * `performUpdate`, and `scheduleUpdate` on `this` mean some state driving the
 * template is not a reactive property; make it one instead of nudging the
 * scheduler.
 *
 * A `ReactiveController` nudging its host is a different call on a different
 * object, and a controller is not a component, so it never reaches this rule —
 * the host escape hatch is automatic, not a spelling exception. `super.` calls
 * are delegation, not manual scheduling, and are left alone.
 */

import { enclosingClass, isLitComponent } from "#helpers";

/** Update-scheduling methods Lit exposes on `ReactiveElement`. */
const SCHEDULING_METHODS: readonly string[] = [
  "requestUpdate",
  "performUpdate",
  "scheduleUpdate",
];

/**
 * Rejects `this.requestUpdate()`, `this.performUpdate()`, and
 * `this.scheduleUpdate()` inside a Lit component.
 */
export const noManualUpdate: Deno.lint.Rule = {
  create(ctx) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "MemberExpression" || callee.computed) return;
        // `this.x()` only: `super.x()` is delegation, a bare `x()` is a local.
        if (callee.object.type !== "ThisExpression") return;
        const property = callee.property;
        if (property.type !== "Identifier") return;
        if (!SCHEDULING_METHODS.includes(property.name)) return;

        const owner = enclosingClass(node);
        if (owner === null || !isLitComponent(owner, ctx)) return;

        ctx.report({
          node: callee,
          message:
            `Component schedules its own update via \`${property.name}\`.`,
          hint:
            "Drive rendering with a reactive property (`@state`/`@property`) instead of calling `this." +
            `${property.name}()\`.`,
        });
      },
    };
  },
};
