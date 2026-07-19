/**
 * `no-manual-update`
 *
 * `requestUpdate`, `performUpdate`, and `scheduleUpdate` are scheduling escape
 * hatches. The only legitimate caller is a `ReactiveController` nudging its own
 * host, so the call must go through `this.host.*` or `this.#host.*`.
 *
 * Deliberately not gated on `isLitComponent`: the permitted form lives in a
 * controller, which is not a component, and inside a component every such call
 * is a violation anyway.
 */

import { memberPath } from "#helpers";

/** Update-scheduling methods Lit exposes on `ReactiveElement`. */
const SCHEDULING_METHODS: readonly string[] = [
  "requestUpdate",
  "performUpdate",
  "scheduleUpdate",
];

/** Receivers a controller may legitimately schedule an update on. */
const ALLOWED_RECEIVERS: readonly string[] = ["this.host", "this.#host"];

/**
 * Rejects `requestUpdate`, `performUpdate`, and `scheduleUpdate` unless
 * called on `this.host` or `this.#host`.
 */
export const noManualUpdate: Deno.lint.Rule = {
  create(ctx) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "MemberExpression" || callee.computed) return;
        const property = callee.property;
        if (property.type !== "Identifier") return;
        if (!SCHEDULING_METHODS.includes(property.name)) return;

        const receiver = memberPath(callee.object);
        if (receiver !== null && ALLOWED_RECEIVERS.includes(receiver)) return;

        ctx.report({
          node: callee,
          message: `Manual update scheduling via \`${property.name}\`.`,
          hint:
            "Let reactive properties drive rendering. Only a ReactiveController may call `this.host." +
            `${property.name}()\`.`,
        });
      },
    };
  },
};
