/**
 * `event-name-case`
 *
 * Every built-in DOM event name is lowercase (`click`, `pointerdown`,
 * `animationend`). Event names are matched as plain strings, so
 * `addEventListener("itemselected")` silently never fires against an event
 * dispatched as `"itemSelected"` — there is no compiler, and no runtime warning.
 * Staying lowercase, or lowercase with dashes, removes the whole class of typo.
 */

/** Event names that are legitimately mixed-case in the platform. */
const ALLOWED_MIXED_CASE: ReadonlySet<string> = new Set([
  "DOMContentLoaded",
]);

/** Constructors whose first argument is an event name. */
const EVENT_CONSTRUCTORS: ReadonlySet<string> = new Set([
  "Event",
  "CustomEvent",
]);

/** Lowercase form of a name, with camel humps turned into dashes. */
function suggest(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

export const eventNameCase: Deno.lint.Rule = {
  create(ctx) {
    return {
      NewExpression(node) {
        const callee = node.callee;
        if (callee.type !== "Identifier") return;
        if (!EVENT_CONSTRUCTORS.has(callee.name)) return;
        const first = node.arguments[0];
        if (!first || first.type !== "Literal") return;
        const name = first.value;
        if (typeof name !== "string") return;
        if (name === name.toLowerCase()) return;
        if (ALLOWED_MIXED_CASE.has(name)) return;
        ctx.report({
          node: first,
          message: `Event name "${name}" is not lowercase.`,
          hint: `Use "${suggest(name)}" instead.`,
        });
      },
    };
  },
};
