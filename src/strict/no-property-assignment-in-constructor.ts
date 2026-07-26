/**
 * `no-property-assignment-in-constructor`
 *
 * Writing a reactive property in the constructor happens before the element is
 * connected, so Lit records it as a change with `undefined` as the old value
 * and schedules an update that has nothing to react to. Worse, it is the one
 * write SSR hydration cannot see: the server rendered from the values the
 * markup carried, and the client constructor then overwrites them before the
 * first `update()`, so hydration mismatches and the DOM is thrown away and
 * rebuilt.
 *
 * Use a field initialiser instead. It runs at the same moment, but Lit treats
 * it as the property's default rather than as a change.
 */

import {
  classMembers,
  enclosingClass,
  isLitComponent,
  isReactiveProperty,
  keyName,
} from "#helpers";

type ClassNode = Deno.lint.ClassDeclaration | Deno.lint.ClassExpression;

/** Any node reachable while walking up `parent` links. */
type WithParent = { readonly parent?: unknown };

/** Name of an object-literal key. */
function objectKeyName(key: Deno.lint.Property["key"]): string | null {
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;
  return null;
}

/** Every reactive property a class declares, decorated or static. */
function reactivePropertyNames(node: ClassNode): Set<string> {
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
    if (member.type !== "PropertyDefinition") continue;
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

/**
 * The constructor this node sits directly inside, or null. "Directly" means no
 * intervening function: an assignment inside a callback registered by the
 * constructor runs later, and is not this rule's business.
 */
function directlyInConstructor(
  node: Deno.lint.Node,
): Deno.lint.MethodDefinition | null {
  let current: Deno.lint.Node | undefined = node;
  let previous: Deno.lint.Node | undefined;
  while (current) {
    if (current.type === "MethodDefinition") {
      if (current.kind !== "constructor") return null;
      // Reached through the constructor's own function body, not a nested one.
      return previous && previous.type === "FunctionExpression"
        ? current
        : null;
    }
    if (
      current.type === "ArrowFunctionExpression" ||
      current.type === "FunctionDeclaration"
    ) {
      return null;
    }
    if (
      current.type === "ClassDeclaration" || current.type === "ClassExpression"
    ) {
      return null;
    }
    previous = current;
    current = (current as WithParent).parent as Deno.lint.Node | undefined;
  }
  return null;
}

/** The property name of a `this.foo = …` target, if that is the shape. */
function thisPropertyName(node: Deno.lint.Expression): string | null {
  if (node.type !== "MemberExpression") return null;
  if (node.computed) return null;
  if (node.object.type !== "ThisExpression") return null;
  const property = node.property;
  if (property.type === "Identifier") return property.name;
  if (property.type === "PrivateIdentifier") return `#${property.name}`;
  return null;
}

/**
 * Rejects assigning a reactive property inside `constructor()`.
 */
export const noPropertyAssignmentInConstructor: Deno.lint.Rule = {
  create(ctx) {
    return {
      AssignmentExpression(node) {
        const left = node.left as Deno.lint.Expression;
        const name = thisPropertyName(left);
        if (name === null) return;
        if (!directlyInConstructor(node)) return;

        const klass = enclosingClass(node);
        if (!klass || !isLitComponent(klass, ctx)) return;
        if (!reactivePropertyNames(klass).has(name)) return;

        ctx.report({
          node: left,
          message:
            `Reactive property "${name}" is assigned in the constructor.`,
          hint:
            "This runs before the first update and breaks SSR hydration. Give the field an initialiser instead.",
        });
      },
    };
  },
};
