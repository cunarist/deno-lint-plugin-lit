/**
 * `no-property-change-in-updated`
 *
 * Assigning to a reactive property from `updated()` or `firstUpdated()` marks
 * the component dirty again, so Lit schedules another update — which calls
 * `updated()` again. Derive the value in the setter that receives the input.
 */

import {
  classMembers,
  enclosingClass,
  isInsideMethod,
  isLitComponent,
  isReactiveProperty,
  keyName,
} from "#helpers";

/** Hooks that run after the update has been committed. */
const POST_UPDATE_HOOKS: readonly string[] = ["updated", "firstUpdated"];

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

/** The post-update hook enclosing `node`, or null. */
function enclosingPostUpdateHook(node: Deno.lint.Node): string | null {
  for (const hook of POST_UPDATE_HOOKS) {
    if (isInsideMethod(node, hook)) return hook;
  }
  return null;
}

/**
 * Rejects assigning to a reactive property inside `updated()` or
 * `firstUpdated()`.
 */
export const noPropertyChangeInUpdated: Deno.lint.Rule = {
  create(ctx) {
    /** Report if `target` is `this.<reactiveProperty>` in a post-update hook. */
    function check(node: Deno.lint.Node, target: Deno.lint.Node): void {
      const hook = enclosingPostUpdateHook(node);
      if (hook === null) return;
      const classNode = enclosingClass(node);
      if (!classNode || !isLitComponent(classNode)) return;
      const name = thisPropertyName(target);
      if (name === null) return;
      if (!reactivePropertyNames(classNode).has(name)) return;
      ctx.report({
        node,
        message: `Reactive property "${name}" is changed inside ${hook}().`,
        hint:
          "This re-enters the update cycle. Derive the value in the setter " +
          "that receives the input, before the update is committed.",
      });
    }

    return {
      AssignmentExpression(node) {
        check(node, node.left);
      },
      UpdateExpression(node) {
        check(node, node.argument);
      },
    };
  },
};
