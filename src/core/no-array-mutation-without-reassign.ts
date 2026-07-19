/**
 * `no-array-mutation-without-reassign`
 *
 * Lit's default `hasChanged` compares with `!==`. A mutating array method
 * leaves the array identity untouched, so the property never looks changed and
 * no re-render is scheduled. Replace the array instead.
 */

import {
  classMembers,
  enclosingClass,
  isLitComponent,
  isReactiveProperty,
  keyName,
} from "#helpers";

/** Array methods that mutate the receiver in place. */
const MUTATING_METHODS: readonly string[] = [
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "sort",
  "reverse",
  "fill",
  "copyWithin",
];

/** Name of an object-literal key, for `static properties` entries. */
function objectKeyName(key: Deno.lint.Property["key"]): string | null {
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;
  return null;
}

/** Reactive property names, from decorators and from `static properties`. */
function reactivePropertyNames(
  node: Deno.lint.ClassDeclaration | Deno.lint.ClassExpression,
): Set<string> {
  const names = new Set<string>();
  for (const member of classMembers(node)) {
    if (
      member.type !== "PropertyDefinition" &&
      member.type !== "AccessorProperty"
    ) {
      continue;
    }
    if (isReactiveProperty(member)) {
      const name = keyName(member.key);
      if (name !== null) names.add(name);
      continue;
    }
    if (!member.static || keyName(member.key) !== "properties") continue;
    const value = member.value;
    if (!value || value.type !== "ObjectExpression") continue;
    for (const entry of value.properties) {
      if (entry.type !== "Property") continue;
      const name = objectKeyName(entry.key);
      if (name !== null) names.add(name);
    }
  }
  return names;
}

/** Name of the property in `this.<name>`, or null for anything else. */
function thisPropertyName(node: Deno.lint.Node): string | null {
  if (node.type !== "MemberExpression") return null;
  if (node.computed) return null;
  if (node.object.type !== "ThisExpression") return null;
  const property = node.property;
  if (property.type === "Identifier") return property.name;
  if (property.type === "PrivateIdentifier") return `#${property.name}`;
  return null;
}

export const noArrayMutationWithoutReassign: Deno.lint.Rule = {
  create(ctx) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "MemberExpression" || callee.computed) return;
        const method = callee.property;
        if (method.type !== "Identifier") return;
        if (!MUTATING_METHODS.includes(method.name)) return;

        const receiver = thisPropertyName(callee.object);
        if (receiver === null) return;

        const classNode = enclosingClass(node);
        if (!classNode || !isLitComponent(classNode)) return;
        if (!reactivePropertyNames(classNode).has(receiver)) return;

        ctx.report({
          node,
          message:
            `this.${receiver}.${method.name}() mutates a reactive property in place.`,
          hint:
            `The array identity does not change, so Lit does not re-render. ` +
            `Assign a new array: this.${receiver} = [...this.${receiver}].`,
        });
      },
    };
  },
};
