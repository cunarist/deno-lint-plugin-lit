/**
 * `event-name-case`
 *
 * Every built-in DOM event name is lowercase (`click`, `pointerdown`,
 * `animationend`). Event names are matched as plain strings, so
 * `addEventListener("itemselected")` silently never fires against an event
 * dispatched as `"itemSelected"` — there is no compiler, and no runtime warning.
 * Requiring kebab-case — lowercase words joined by dashes, no underscores —
 * removes the whole class of typo and keeps one spelling for every event.
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

/** Kebab-case form: camel humps and underscores turned into dashes. */
function suggest(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
}

/**
 * Requires the name given to `new CustomEvent(...)` or `new Event(...)` to
 * be kebab-case — no uppercase letters and no underscores.
 */
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
        if (ALLOWED_MIXED_CASE.has(name)) return;
        if (name === name.toLowerCase() && !name.includes("_")) return;
        ctx.report({
          node: first,
          message: `Event name "${name}" is not kebab-case.`,
          hint: `Use "${suggest(name)}" instead.`,
        });
      },
    };
  },
};
