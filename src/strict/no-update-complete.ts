/**
 * `no-update-complete`
 *
 * `updateComplete` is hidden scheduling: awaiting it makes DOM state "settle"
 * instead of deriving it. Ban the access outright rather than the `await` or
 * `.then` around it, so no spelling slips through.
 */

export const noUpdateComplete: Deno.lint.Rule = {
  create(ctx) {
    return {
      MemberExpression(node) {
        if (node.computed) return;
        const property = node.property;
        if (property.type !== "Identifier") return;
        if (property.name !== "updateComplete") return;
        ctx.report({
          node,
          message: "Access to `updateComplete`.",
          hint:
            "Do not wait for the DOM to settle. Derive what you need from reactive state, or use a ReactiveController.",
        });
      },
    };
  },
};
