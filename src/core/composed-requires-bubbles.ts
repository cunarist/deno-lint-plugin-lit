/**
 * `composed-requires-bubbles`
 *
 * `composed: true` means "keep propagating once you reach a shadow boundary".
 * Propagation upward is what `bubbles: true` turns on in the first place, so a
 * composed event that does not bubble stops at the element that dispatched it
 * and never crosses out of the shadow root. `composed` is then silently
 * pointless — the event looks like it should escape the component and does not.
 */

import { keyName } from "#helpers";

/** Constructors that take an event-init object as their second argument. */
const EVENT_CONSTRUCTORS: ReadonlySet<string> = new Set([
  "Event",
  "CustomEvent",
]);

/** Whether an object literal member is a plain `name: value` pair. */
function isNamedProperty(
  property: Deno.lint.ObjectExpression["properties"][number],
): property is Deno.lint.Property {
  return property.type === "Property" && !property.computed;
}

/** The value node of a named key in an object literal, if written literally. */
function optionValue(
  options: Deno.lint.ObjectExpression,
  name: string,
): Deno.lint.Property["value"] | null {
  for (const property of options.properties) {
    if (!isNamedProperty(property)) continue;
    if (keyName(property.key) !== name) continue;
    return property.value;
  }
  return null;
}

/** The `name: value` node itself, for reporting. */
function optionNode(
  options: Deno.lint.ObjectExpression,
  name: string,
): Deno.lint.Node | null {
  for (const property of options.properties) {
    if (!isNamedProperty(property)) continue;
    if (keyName(property.key) === name) return property;
  }
  return null;
}

/** Whether a node is the literal `true`. */
function isLiteralTrue(node: Deno.lint.Property["value"] | null): boolean {
  return node !== null && node.type === "Literal" && node.value === true;
}

export const composedRequiresBubbles: Deno.lint.Rule = {
  create(ctx) {
    return {
      NewExpression(node) {
        const callee = node.callee;
        if (callee.type !== "Identifier") return;
        if (!EVENT_CONSTRUCTORS.has(callee.name)) return;
        const options = node.arguments[1];
        if (!options || options.type !== "ObjectExpression") return;
        // A spread could carry `bubbles` in from elsewhere; do not guess.
        for (const property of options.properties) {
          if (!isNamedProperty(property)) return;
        }
        if (!isLiteralTrue(optionValue(options, "composed"))) return;
        const bubbles = optionValue(options, "bubbles");
        // Only a literal `false` or an absent key is a definite mistake; an
        // expression could be `true` at runtime.
        if (bubbles !== null) {
          if (bubbles.type !== "Literal" || bubbles.value !== false) return;
        }
        const target = optionNode(options, "composed") ?? options;
        ctx.report({
          node: target,
          message: "`composed: true` without `bubbles: true`.",
          hint:
            "Add `bubbles: true`, or drop `composed` — a non-bubbling event never crosses the shadow boundary.",
        });
      },
    };
  },
};
