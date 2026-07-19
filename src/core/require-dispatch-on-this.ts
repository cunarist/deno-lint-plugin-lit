/**
 * `require-dispatch-on-this`
 *
 * A component's own events must be dispatched on the component. A listener
 * bound with `@event=` sits on that element, so an event sent anywhere else
 * never reaches it.
 */

import { enclosingClass, isLitComponent, memberPath } from "#helpers";

/** Receivers that are the component itself. */
const SELF_RECEIVERS: readonly string[] = ["this", "this.renderRoot"];

export const requireDispatchOnThis: Deno.lint.Rule = {
  create(ctx) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "MemberExpression" || callee.computed) return;
        if (memberPath(callee.property) !== "dispatchEvent") return;

        const receiver = memberPath(callee.object);
        // An unresolvable receiver (a call result, an index) is not judged.
        if (receiver === null) return;
        if (SELF_RECEIVERS.includes(receiver)) return;

        const classNode = enclosingClass(node);
        if (!classNode || !isLitComponent(classNode)) return;

        ctx.report({
          node,
          message: `Event dispatched on ${receiver}, not on the component.`,
          hint:
            "Use this.dispatchEvent(...); a parent's `@event=` binding listens on this element.",
        });
      },
    };
  },
};
