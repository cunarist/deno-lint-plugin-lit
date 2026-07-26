/**
 * `no-private-properties`
 *
 * `@property` declares part of a component's public API: an observed attribute
 * anyone can set from markup. Marking a field private — `#count`, or `_count` by
 * convention — and then exposing it as an attribute contradicts itself. Use
 * `@state` for internal reactive state; it triggers updates without an
 * attribute.
 */

import { classMembers, findDecorator, isLitComponent, keyName } from "#helpers";

type ClassNode = Deno.lint.ClassDeclaration | Deno.lint.ClassExpression;

/** Name of an object-literal key, for `static properties` entries. */
function objectKeyName(key: Deno.lint.Property["key"]): string | null {
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;
  return null;
}

/** Whether a member name reads as private. */
function isPrivateName(name: string): boolean {
  return name.startsWith("#");
}

/**
 * Rejects `@property` on a field whose name reads as private — `#count` or
 * `_count`.
 */
export const noPrivateProperties: Deno.lint.Rule = {
  create(ctx) {
    function report(node: Deno.lint.Node, name: string): void {
      ctx.report({
        node,
        message: `Private field "${name}" is declared as a public property.`,
        hint:
          "Use @state for internal reactive state, or drop the private name.",
      });
    }

    function check(node: ClassNode): void {
      if (!isLitComponent(node, ctx)) return;
      for (const member of classMembers(node)) {
        if (
          member.type !== "PropertyDefinition" &&
          member.type !== "AccessorProperty"
        ) {
          continue;
        }

        if (findDecorator(member.decorators ?? [], "property")) {
          const name = keyName(member.key);
          if (name !== null && isPrivateName(name)) report(member.key, name);
          continue;
        }

        if (!member.static || keyName(member.key) !== "properties") continue;
        const value = member.value;
        if (!value || value.type !== "ObjectExpression") continue;
        for (const entry of value.properties) {
          if (entry.type !== "Property") continue;
          const name = objectKeyName(entry.key);
          if (name !== null && isPrivateName(name)) report(entry.key, name);
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
