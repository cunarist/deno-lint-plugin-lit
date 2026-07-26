/**
 * `no-property-named-like-lifecycle`
 *
 * `render`, `update`, `updated`, `requestUpdate` and their siblings are methods
 * on `ReactiveElement.prototype`. A class *field* of the same name is an own
 * property installed by `Object.defineProperty` at construction time, so it
 * hides the prototype method rather than overriding it. Lit then calls the
 * field: `render` returns whatever the field holds instead of a template, and
 * `requestUpdate` throws because a string is not callable. The component
 * usually dies on its first update, far from the declaration.
 *
 * Methods are untouched — overriding a lifecycle method is the supported way to
 * hook it. Only field and `accessor` declarations are reported.
 */

import {
  classMembers,
  isLitComponent,
  keyName,
  LIT_LIFECYCLE_MEMBERS,
} from "#helpers";

type ClassNode = Deno.lint.ClassDeclaration | Deno.lint.ClassExpression;

/** Name of an object-literal key. */
function objectKeyName(key: Deno.lint.Property["key"]): string | null {
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;
  return null;
}

/** Whether a name collides with a Lit lifecycle member. */
function isLifecycleName(name: string): boolean {
  return LIT_LIFECYCLE_MEMBERS.includes(name);
}

/**
 * Rejects a class field or reactive property named after a Lit lifecycle
 * member.
 */
export const noPropertyNamedLikeLifecycle: Deno.lint.Rule = {
  create(ctx) {
    function report(node: Deno.lint.Node, name: string): void {
      ctx.report({
        node,
        message: `"${name}" is a Lit lifecycle member, not a property name.`,
        hint:
          "A class field shadows the prototype method instead of overriding it, so Lit calls the field value. Rename the property.",
      });
    }

    function check(node: ClassNode): void {
      if (!isLitComponent(node, ctx)) return;

      for (const member of classMembers(node)) {
        if (member.type === "PropertyDefinition" && member.static) {
          // `static properties` may still *name* a lifecycle member.
          if (keyName(member.key) === "properties") {
            const value = member.value;
            if (!value || value.type !== "ObjectExpression") continue;
            for (const entry of value.properties) {
              if (entry.type !== "Property") continue;
              const name = objectKeyName(entry.key);
              if (name !== null && isLifecycleName(name)) {
                report(entry.key, name);
              }
            }
          }
          continue;
        }

        if (
          member.type !== "PropertyDefinition" &&
          member.type !== "AccessorProperty"
        ) {
          continue;
        }
        // `declare` is type-only and emits nothing, so it shadows nothing.
        if (member.type === "PropertyDefinition" && member.declare) continue;

        const name = keyName(member.key);
        if (name === null || !isLifecycleName(name)) continue;
        report(member.key, name);
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
