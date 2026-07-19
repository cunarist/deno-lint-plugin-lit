/**
 * `no-inner-html-assignment`
 *
 * Assigning to `innerHTML` or `outerHTML` parses whatever string it is given as
 * markup, which is the classic XSS sink. Inside a Lit component it is also a
 * correctness bug: Lit tracks the DOM it created through marker nodes, and
 * replacing the subtree out from under it means the next render either wipes
 * the injected markup or throws on a marker that is no longer there.
 */

import { memberPath } from "#helpers";

/** Properties that parse their assigned string as markup. */
const MARKUP_SINKS: ReadonlySet<string> = new Set([
  "innerHTML",
  "outerHTML",
]);

/** The sink name a member expression writes to, if it writes to one. */
function sinkName(target: Deno.lint.MemberExpression): string | null {
  const property = target.property;
  if (target.computed) {
    if (property.type !== "Literal") return null;
    if (typeof property.value !== "string") return null;
    return MARKUP_SINKS.has(property.value) ? property.value : null;
  }
  if (property.type !== "Identifier") return null;
  return MARKUP_SINKS.has(property.name) ? property.name : null;
}

/**
 * Rejects assignment to `innerHTML` or `outerHTML` on any receiver.
 */
export const noInnerHtmlAssignment: Deno.lint.Rule = {
  create(ctx) {
    return {
      AssignmentExpression(node) {
        const target = node.left;
        if (target.type !== "MemberExpression") return;
        const sink = sinkName(target);
        if (sink === null) return;
        const receiver = memberPath(target.object) ?? "the element";
        ctx.report({
          node: target,
          message: `Assignment to \`${sink}\` on \`${receiver}\`.`,
          hint:
            "Render the content from a template instead; `innerHTML` is an XSS sink and breaks Lit's DOM tracking.",
        });
      },
    };
  },
};
