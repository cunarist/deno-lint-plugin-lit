/**
 * `no-native-attributes`
 *
 * A reactive property named after a global HTML attribute shadows the accessor
 * `HTMLElement` already defines for it. Lit's accessor then fights the platform:
 * `id`, `title`, `role` and friends stop behaving the way the DOM, CSS and
 * assistive technology expect.
 */

import {
  classMembers,
  isLitComponent,
  isReactiveProperty,
  keyName,
} from "#helpers";

/** Global attributes with existing platform semantics. */
const NATIVE_ATTRIBUTES: readonly string[] = [
  "role",
  "title",
  "id",
  "slot",
  "style",
  "class",
  "hidden",
  "lang",
  "dir",
  "tabindex",
];

type ClassNode = Deno.lint.ClassDeclaration | Deno.lint.ClassExpression;

/** Name of an object-literal key, for `static properties` entries. */
function objectKeyName(key: Deno.lint.Property["key"]): string | null {
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;
  return null;
}

/** Whether a name collides with a native global attribute. */
function isNative(name: string): boolean {
  return NATIVE_ATTRIBUTES.includes(name.toLowerCase());
}

/**
 * Rejects a reactive property named after a global HTML attribute.
 */
export const noNativeAttributes: Deno.lint.Rule = {
  create(ctx) {
    /** Report a collision on the node that names the property. */
    function report(node: Deno.lint.Node, name: string): void {
      ctx.report({
        node,
        message: `"${name}" is a native HTML attribute.`,
        hint:
          "Declaring it as a reactive property overrides the platform's own accessor. Pick a different name.",
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

        if (isReactiveProperty(member)) {
          const name = keyName(member.key);
          if (name !== null && isNative(name)) report(member.key, name);
          continue;
        }

        if (!member.static || keyName(member.key) !== "properties") continue;
        const value = member.value;
        if (!value || value.type !== "ObjectExpression") continue;
        for (const entry of value.properties) {
          if (entry.type !== "Property") continue;
          const name = objectKeyName(entry.key);
          if (name !== null && isNative(name)) report(entry.key, name);
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
