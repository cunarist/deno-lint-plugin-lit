/**
 * `lifecycle-allowlist`
 *
 * On a Lit component only `styles` and `render` may be overridden. Every other reactive-update lifecycle hook belongs in a
 * `ReactiveController`, where the work is paired with an explicit release.
 */

import { isLitComponent, keyName } from "#helpers";

/** Lifecycle members a component may never override. */
const BANNED_LIFECYCLE: readonly string[] = [
  "connectedCallback",
  "willUpdate",
  "disconnectedCallback",
  "firstUpdated",
  "updated",
  "shouldUpdate",
  "update",
  "performUpdate",
  "requestUpdate",
  "scheduleUpdate",
];

function check(
  ctx: Deno.lint.RuleContext,
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): void {
  if (!isLitComponent(node, ctx)) return;
  for (const member of node.body.body) {
    if (
      member.type !== "MethodDefinition" &&
      member.type !== "PropertyDefinition" &&
      member.type !== "AccessorProperty"
    ) {
      continue;
    }
    const name = keyName(member.key);
    if (name === null || !BANNED_LIFECYCLE.includes(name)) continue;
    ctx.report({
      node: member.key,
      message: `Lit component overrides \`${name}\`.`,
      hint:
        "Only `styles` and `render` may be overridden. Move the work into a ReactiveController.",
    });
  }
}

/**
 * Rejects any lifecycle override on a Lit component other than `styles` and
 * `render`.
 */
export const lifecycleAllowlist: Deno.lint.Rule = {
  create(ctx) {
    return {
      ClassDeclaration(node) {
        check(ctx, node);
      },
      ClassExpression(node) {
        check(ctx, node);
      },
    };
  },
};
