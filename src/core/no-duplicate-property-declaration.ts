/**
 * `no-duplicate-property-declaration`
 *
 * `@property()` and `static properties` are two spellings of the same call:
 * both end up in `ReactiveElement.createProperty`. Declaring one property both
 * ways means one set of options silently wins — whichever the decorator
 * transform and the static initialiser happen to apply last — so the `type`,
 * `reflect`, and `converter` written in the losing declaration have no effect
 * while still reading as though they do.
 *
 * Pick one declaration style per class and keep each property in exactly one.
 */

import {
  classMembers,
  isLitComponent,
  isReactiveProperty,
  keyName,
} from "#helpers";

type ClassNode = Deno.lint.ClassDeclaration | Deno.lint.ClassExpression;

/** Name of an object-literal key. */
function objectKeyName(key: Deno.lint.Property["key"]): string | null {
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;
  return null;
}

/** Names declared by `@property`/`@state` decorators on a class. */
function decoratedNames(node: ClassNode): Set<string> {
  const names = new Set<string>();
  for (const member of classMembers(node)) {
    if (
      member.type !== "PropertyDefinition" &&
      member.type !== "AccessorProperty"
    ) {
      continue;
    }
    if (!isReactiveProperty(member)) continue;
    const name = keyName(member.key);
    if (name !== null) names.add(name);
  }
  return names;
}

export const noDuplicatePropertyDeclaration: Deno.lint.Rule = {
  create(ctx) {
    function check(node: ClassNode): void {
      if (!isLitComponent(node)) return;
      const decorated = decoratedNames(node);
      if (decorated.size === 0) return;

      for (const member of classMembers(node)) {
        if (member.type !== "PropertyDefinition") continue;
        if (!member.static || keyName(member.key) !== "properties") continue;
        const value = member.value;
        if (!value || value.type !== "ObjectExpression") continue;

        for (const entry of value.properties) {
          if (entry.type !== "Property") continue;
          const name = objectKeyName(entry.key);
          if (name === null || !decorated.has(name)) continue;
          ctx.report({
            node: entry.key,
            message:
              `Property "${name}" is declared both by a decorator and by static properties.`,
            hint:
              "Both call createProperty, so one options object silently overrides the other. Remove one of the two declarations.",
          });
        }
      }
    }

    return {
      ClassDeclaration(node) {
        check(node);
      },
      ClassExpression(node) {
        check(node);
      },
    };
  },
};
